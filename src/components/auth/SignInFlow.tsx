import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, type Location } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, type SignInResult } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { MINIMUM_AGE, TERMS_VERSION } from '@/lib/legal';
import type { SignupConsent } from '@/types/privacy';
import { ClickwrapConsent } from '@/components/legal/ClickwrapConsent';
import { OAuthAgreement } from '@/components/legal/OAuthAgreement';
import { AuthShell, consumeAuthReturnTo, sanitizeReturnTo, stashAuthReturnTo } from './AuthShell';
import { AuthNotice, formatWait, useSecondsUntil, type AuthNoticeVariant } from './AuthNotice';
import { CodeInput, CODE_LENGTH } from './CodeInput';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { PasswordInput } from './PasswordInput';
import { PasswordChecklist, isPasswordValid } from './PasswordChecklist';
import { SocialQuietRow, providerLabel } from './SocialQuietRow';

/**
 * Sign in and sign up, as ONE screen that starts with the email address.
 *
 *   email ──> password   the address has an account with a password
 *         ──> method     it has an account with no password (Google, or codes)
 *         ──> create     it has no account yet
 *   any of those ──> code   a 6-digit code was mailed; entering it signs in
 *
 * `/login` and `/register` both render this; they differ only in the words on
 * the first step. Whichever page someone lands on, an address that already
 * has an account is signed in and one that does not is offered an account.
 *
 * The step lives in the history entry (router state), so the browser's Back
 * button walks back through the steps instead of leaving the page. Secrets
 * (the password, the code) are held in memory only and never enter history.
 */

type Step = 'email' | 'password' | 'method' | 'create' | 'code';

interface Flow {
  step: Step;
  email: string;
  /** How an existing account signs in, e.g. ['password', 'google']. */
  methods?: string[];
}

/** What the code, once entered, should carry with it. Memory only. */
interface Pending {
  password?: string;
  consent?: SignupConsent;
  purpose: 'signin' | 'signup' | 'verify';
}

interface Notice {
  variant: AuthNoticeVariant;
  text: string;
  /** For a wait: when it ends (`Date.now()` based). */
  until?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAIT_CODES = new Set(['rate_limited', 'account_locked', 'code_cooldown']);

function noticeFor(result: SignInResult | { error?: string; code?: string; payload?: Record<string, unknown> }): Notice {
  const retry = Number(result.payload?.retry_after);
  if (result.code && WAIT_CODES.has(result.code) && retry > 0) {
    return { variant: 'wait', text: result.error ?? 'Too many attempts.', until: Date.now() + retry * 1000 };
  }
  if (result.code === 'account_closed') {
    return {
      variant: 'error',
      text: 'This account has been closed. Write to us if you think that is a mistake.',
    };
  }
  return { variant: 'error', text: result.error ?? 'Something went wrong. Please try again.' };
}

function fromApi(response: { error?: string; status?: number; errorPayload?: Record<string, unknown> }) {
  return {
    error: (response.errorPayload?.message as string | undefined) ?? response.error,
    code: response.errorPayload?.code as string | undefined,
    payload: response.errorPayload,
  };
}

function Identity({ email, onChange, disabled }: { email: string; onChange: () => void; disabled: boolean }) {
  return (
    <div className="pub-auth-identity">
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-foreground">{email}</span>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="pub-auth-link inline-flex min-h-11 shrink-0 items-center px-2 text-sm"
      >
        Change
      </button>
    </div>
  );
}

function Spinner({ show }: { show: boolean }) {
  return show ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null;
}

export function SignInFlow({ mode }: { mode: 'signin' | 'signup' }) {
  const { login, signInWithCode, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const routerState = (location.state ?? {}) as { from?: Partial<Location>; flow?: Flow };
  const from = routerState.from;
  const flow: Flow = routerState.flow ?? { step: 'email', email: '' };
  const returnTo = sanitizeReturnTo(
    from ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` : null,
  );
  const destination = returnTo ?? '/app/home';

  const [email, setEmail] = useState(flow.email);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'continue' | 'password' | 'code' | 'verify' | 'resend'>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const pending = useRef<Pending | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  const waitLeft = useSecondsUntil(notice?.variant === 'wait' ? (notice.until ?? null) : null);
  const resendLeft = useSecondsUntil(resendAt);
  const waiting = notice?.variant === 'wait' && waitLeft > 0;

  const go = useCallback(
    (next: Flow, replace = false) => {
      setFieldError(null);
      navigate(location.pathname + location.search, { state: { from, flow: next }, replace });
    },
    [navigate, location.pathname, location.search, from],
  );

  // A provider sign-in leaves the app entirely: keep the deep link for it.
  useEffect(() => {
    stashAuthReturnTo(returnTo);
  }, [returnTo]);

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [isAuthenticated, navigate, destination]);

  // "Your session ended": after a forced sign-out, or via ?expired=1.
  useEffect(() => {
    if (params.get('expired') || params.get('reason') === 'session-expired') setSessionEnded(true);
    const onExpired = () => setSessionEnded(true);
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, [params]);

  // The code step only makes sense with what it carries still in memory. A
  // reload, or Forward into it after leaving, starts again from the address.
  useEffect(() => {
    if (flow.step === 'code' && !pending.current) go({ step: 'email', email: flow.email }, true);
  }, [flow.step, flow.email, go]);

  // Each step starts clean, with focus in its field. Focus only moves by
  // itself on a pointer device: on a phone it would throw the keyboard up
  // over a page the person has not read yet.
  useEffect(() => {
    setEmail(flow.email);
    setCode('');
    if (flow.step === 'email') {
      setPassword('');
      setNewPassword('');
    }
    const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (!fine && flow.step === 'email') return;
    const id = window.setTimeout(() => {
      const target =
        flow.step === 'email' ? emailRef : flow.step === 'code' ? codeRef : passwordRef;
      target.current?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [flow.step, flow.email]);

  const finish = (result: SignInResult) => {
    consumeAuthReturnTo(); // the router state is being honoured directly
    if (result.passwordRemoved) {
      toast.info('Your old password was removed', {
        description: 'It was set before this email was confirmed. You can set a new one in Settings.',
      });
    } else {
      toast.success(result.created ? 'Welcome to Aspirely' : 'Welcome back');
    }
    navigate(destination, { replace: true });
  };

  // ── Step 1: the address ────────────────────────────────────────────────
  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setFieldError('Enter your email address, like name@example.com.');
      return;
    }
    setFieldError(null);
    setNotice(null);
    setBusy('continue');
    const res = await apiService.checkEmail(clean);
    setBusy(null);
    if (res.error || !res.data) {
      setNotice(noticeFor(fromApi(res)));
      return;
    }
    if (res.data.closed) {
      setNotice(noticeFor({ code: 'account_closed' }));
      return;
    }
    if (!res.data.exists) {
      go({ step: 'create', email: clean });
      return;
    }
    const methods = res.data.methods ?? [];
    if (mode === 'signup') {
      setNotice({ variant: 'info', text: 'You already have an account with this email. Sign in instead.' });
    }
    go({ step: methods.includes('password') ? 'password' : 'method', email: clean, methods });
  };

  // ── Asking for a code ──────────────────────────────────────────────────
  const sendCode = async (next: Pending, which: 'code' | 'resend' = 'code') => {
    setNotice(null);
    setFieldError(null);
    setBusy(which);
    const res =
      next.purpose === 'signup' && next.password && which === 'code'
        ? await apiService.register(flow.email, next.password, next.consent)
        : await apiService.requestEmailCode(flow.email);
    setBusy(null);

    if (res.data) {
      pending.current = next;
      setResendAt(Date.now() + (res.data.resend_after ?? 60) * 1000);
      setCode('');
      if (which === 'resend') {
        setNotice({ variant: 'success', text: 'A new code is on its way. The earlier one no longer works.' });
        codeRef.current?.focus();
      } else {
        if (next.purpose === 'verify') {
          setNotice({
            variant: 'info',
            text: 'Your password is right. This email has not been confirmed yet, so enter the code to finish.',
          });
        }
        go({ ...flow, step: 'code' });
      }
      return;
    }

    const failure = fromApi(res);
    if (failure.code === 'code_cooldown') {
      // A code went out moments ago. Take them to it instead of refusing.
      pending.current = next;
      setResendAt(Date.now() + Number(failure.payload?.retry_after ?? 60) * 1000);
      if (which === 'code') go({ ...flow, step: 'code' });
      return;
    }
    if (failure.code === 'account_exists') {
      const methods = (failure.payload?.methods as string[] | undefined) ?? [];
      setNotice({ variant: 'info', text: 'You already have an account with this email. Sign in instead.' });
      go({ step: methods.includes('password') ? 'password' : 'method', email: flow.email, methods }, true);
      return;
    }
    if (failure.code === 'age_requirement') setAgreed(false);
    setNotice(noticeFor(failure));
  };

  // ── Password sign-in ───────────────────────────────────────────────────
  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setFieldError('Enter your password.');
      return;
    }
    setFieldError(null);
    setNotice(null);
    setBusy('password');
    const result = await login(flow.email, password);
    setBusy(null);
    if (!result.error) {
      finish(result);
      return;
    }
    switch (result.code) {
      case 'invalid_credentials':
        setFieldError('That password is not right. Try again, or use an emailed code.');
        passwordRef.current?.select();
        return;
      case 'no_password':
        go({ step: 'method', email: flow.email, methods: (result.payload?.methods as string[]) ?? [] }, true);
        return;
      case 'email_unverified':
        // Right password, address never confirmed: one code settles it, and
        // the same password rides along so it is kept.
        await sendCode({ password, purpose: 'verify' });
        return;
      default:
        setNotice(noticeFor(result));
    }
  };

  // ── New account ────────────────────────────────────────────────────────
  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (usePassword && !isPasswordValid(newPassword)) {
      setFieldError('Your password does not meet every rule below yet.');
      return;
    }
    if (!agreed) {
      setFieldError(`Confirm you are at least ${MINIMUM_AGE} and agree to the Terms to create your account.`);
      return;
    }
    await sendCode({
      password: usePassword ? newPassword : undefined,
      consent: { age_confirmed: true, terms_version: TERMS_VERSION },
      purpose: 'signup',
    });
  };

  // ── Entering the code ──────────────────────────────────────────────────
  const verify = async (value: string) => {
    const carried = pending.current;
    if (!carried || value.length !== CODE_LENGTH || busy) return;
    setFieldError(null);
    setNotice(null);
    setBusy('verify');
    const result = await signInWithCode({
      email: flow.email,
      code: value,
      password: carried.password,
      consent: carried.consent,
    });
    setBusy(null);
    if (!result.error) {
      pending.current = null;
      finish(result);
      return;
    }
    setCode('');
    switch (result.code) {
      case 'code_invalid':
        setFieldError(result.error ?? 'That code is not right.');
        codeRef.current?.focus();
        return;
      case 'code_expired':
      case 'code_locked':
        setResendAt(null); // a new code can be asked for right away
        setFieldError(result.error ?? 'That code no longer works. Send a new one.');
        return;
      case 'consent_required':
      case 'weak_password':
        // The address has no account after all (or the password was refused):
        // back to the step that collects what is missing.
        setNotice({ variant: 'info', text: result.error ?? 'One more step to create your account.' });
        go({ step: 'create', email: flow.email }, true);
        return;
      default:
        setNotice(noticeFor(result));
    }
  };

  const changeEmail = () => {
    pending.current = null;
    setNotice(null);
    go({ step: 'email', email: flow.email });
  };

  const linked = (flow.methods ?? []).filter((m) => m !== 'password');
  const noticeNode: ReactNode = notice ? (
    <AuthNotice variant={waiting || notice.variant !== 'wait' ? notice.variant : 'info'}>
      {notice.variant === 'wait'
        ? waiting
          ? `${notice.text} Try again in ${formatWait(waitLeft)}.`
          : 'You can try again now.'
        : notice.text}
    </AuthNotice>
  ) : sessionEnded && flow.step === 'email' ? (
    <AuthNotice variant="info">Your session ended. Sign in to pick up where you left off.</AuthNotice>
  ) : undefined;

  const swap =
    mode === 'signin' ? (
      <>
        New to Aspirely?{' '}
        <Link to="/register" state={from ? { from } : undefined} className="pub-auth-link">
          Create your account
        </Link>
      </>
    ) : (
      <>
        Already have an account?{' '}
        <Link to="/login" state={from ? { from } : undefined} className="pub-auth-link">
          Sign in
        </Link>
      </>
    );

  const codeButton = (label: string, next: Pending, primary = false) => (
    <button
      type="button"
      className={`pub-btn ${primary ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
      disabled={busy !== null}
      onClick={() => sendCode(next)}
    >
      <Spinner show={busy === 'code'} />
      {busy === 'code' ? 'Sending your code...' : label}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  if (flow.step === 'email') {
    return (
      <AuthShell
        step="email"
        title={mode === 'signin' ? 'Sign in to Aspirely' : 'Create your account'}
        subtitle={mode === 'signin' ? 'Pick up where you left off.' : 'Free to start. It takes about a minute.'}
        banner={noticeNode}
        footer={swap}
      >
        <SocialQuietRow disabled={busy !== null} />
        <form onSubmit={submitEmail} noValidate className="mt-5 space-y-3">
          <label htmlFor="auth-email" className="block text-sm font-semibold text-foreground">
            Email
          </label>
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            name="email"
            className="pub-auth-field"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder="name@example.com"
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            enterKeyHint="next"
            disabled={busy !== null}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'auth-email-error' : undefined}
          />
          {fieldError && (
            <p id="auth-email-error" role="alert" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
          <button type="submit" className="pub-btn pub-btn-primary" disabled={busy !== null || waiting}>
            <Spinner show={busy === 'continue'} />
            {busy === 'continue' ? 'Checking...' : 'Continue'}
          </button>
        </form>
        <OAuthAgreement className="mt-5" />
      </AuthShell>
    );
  }

  if (flow.step === 'password') {
    return (
      <AuthShell step="password" title="Welcome back" subtitle="Enter your password, or get a code by email." banner={noticeNode}>
        <form onSubmit={submitPassword} noValidate className="space-y-3">
          <Identity email={flow.email} onChange={changeEmail} disabled={busy !== null} />
          {/* Lets a password manager pair the password with the address. */}
          <input type="email" name="email" autoComplete="username" value={flow.email} readOnly hidden />
          <div className="flex items-center justify-between pt-2">
            <label htmlFor="auth-password" className="text-sm font-semibold text-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="pub-auth-link inline-flex min-h-9 items-center text-sm"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            ref={passwordRef}
            id="auth-password"
            name="password"
            className="pub-auth-field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            autoComplete="current-password"
            enterKeyHint="go"
            capsLockWarning
            disabled={busy !== null}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'auth-password-error' : undefined}
          />
          {fieldError && (
            <p id="auth-password-error" role="alert" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
          <button type="submit" className="pub-btn pub-btn-primary" disabled={busy !== null || waiting}>
            <Spinner show={busy === 'password'} />
            {busy === 'password' ? 'Signing in...' : 'Sign in'}
          </button>
          {codeButton('Email me a code instead', { purpose: 'signin' })}
        </form>
        {linked.length > 0 && (
          <div className="mt-5">
            <SocialQuietRow only={linked} divider={false} disabled={busy !== null} />
          </div>
        )}
        <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={flow.email} />
      </AuthShell>
    );
  }

  if (flow.step === 'method') {
    const names = linked.map(providerLabel).join(' or ');
    return (
      <AuthShell
        step="method"
        title="Welcome back"
        subtitle={
          linked.length
            ? `This account signs in with ${names}. It has no password.`
            : 'This account has no password. We can email you a code to sign in.'
        }
        banner={noticeNode}
      >
        <div className="space-y-3">
          <Identity email={flow.email} onChange={changeEmail} disabled={busy !== null} />
          {linked.length > 0 && (
            <SocialQuietRow only={linked} divider={false} emphasis disabled={busy !== null} />
          )}
          {codeButton('Email me a code', { purpose: 'signin' }, linked.length === 0)}
        </div>
      </AuthShell>
    );
  }

  if (flow.step === 'create') {
    return (
      <AuthShell
        step="create"
        title="Create your account"
        subtitle="There is no Aspirely account for this email yet. We will send a code to confirm it is yours."
        banner={noticeNode}
        footer={mode === 'signin' ? undefined : swap}
      >
        <form onSubmit={submitCreate} noValidate className="space-y-4">
          <Identity email={flow.email} onChange={changeEmail} disabled={busy !== null} />
          <input type="email" name="email" autoComplete="username" value={flow.email} readOnly hidden />

          {usePassword ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-new-password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUsePassword(false);
                    setNewPassword('');
                    setFieldError(null);
                  }}
                  className="pub-auth-link inline-flex min-h-9 items-center text-sm"
                >
                  Skip the password
                </button>
              </div>
              <PasswordInput
                ref={passwordRef}
                id="auth-new-password"
                name="new-password"
                className="pub-auth-field"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                autoComplete="new-password"
                enterKeyHint="next"
                capsLockWarning
                disabled={busy !== null}
              />
              <PasswordChecklist password={newPassword} />
            </div>
          ) : (
            <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
              No password needed: you can sign in with a code each time.{' '}
              <button
                type="button"
                onClick={() => {
                  setUsePassword(true);
                  window.setTimeout(() => passwordRef.current?.focus(), 30);
                }}
                className="pub-auth-link"
              >
                Add a password
              </button>
            </p>
          )}

          <ClickwrapConsent
            checked={agreed}
            onCheckedChange={(v) => {
              setAgreed(v);
              if (fieldError) setFieldError(null);
            }}
            disabled={busy !== null}
          />
          {fieldError && (
            <p role="alert" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
          <button type="submit" className="pub-btn pub-btn-primary" disabled={busy !== null || waiting}>
            <Spinner show={busy === 'code'} />
            {busy === 'code' ? 'Sending your code...' : 'Email me a code'}
          </button>
        </form>
      </AuthShell>
    );
  }

  // step === 'code'
  const dead = fieldError !== null && resendAt === null;
  return (
    <AuthShell
      step="code"
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-semibold text-foreground">{flow.email}</span>.
          It works once and expires in 10 minutes.
        </>
      }
      banner={noticeNode}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
        noValidate
        className="space-y-3"
      >
        <CodeInput
          ref={codeRef}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (fieldError && v) setFieldError(null);
          }}
          onComplete={verify}
          disabled={busy === 'verify'}
          invalid={fieldError !== null}
          describedBy={fieldError ? 'auth-code-error' : undefined}
        />
        {fieldError && (
          <p id="auth-code-error" role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        )}
        {dead ? (
          <button
            type="button"
            className="pub-btn pub-btn-primary"
            disabled={busy !== null}
            onClick={() => pending.current && sendCode(pending.current, 'resend')}
          >
            <Spinner show={busy === 'resend'} />
            {busy === 'resend' ? 'Sending a new code...' : 'Send a new code'}
          </button>
        ) : (
          <button
            type="submit"
            className="pub-btn pub-btn-primary"
            disabled={busy !== null || code.length !== CODE_LENGTH || waiting}
          >
            <Spinner show={busy === 'verify'} />
            {busy === 'verify' ? 'Checking the code...' : 'Continue'}
          </button>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.9375rem] text-ink-muted">
        {!dead && (
          <button
            type="button"
            className="pub-auth-link inline-flex min-h-11 items-center"
            disabled={busy !== null || resendLeft > 0}
            onClick={() => pending.current && sendCode(pending.current, 'resend')}
          >
            {busy === 'resend'
              ? 'Sending a new code...'
              : resendLeft > 0
                ? `Send a new code in ${resendLeft}s`
                : 'Send a new code'}
          </button>
        )}
        <button
          type="button"
          className="pub-auth-link inline-flex min-h-11 items-center"
          disabled={busy !== null}
          onClick={changeEmail}
        >
          Use a different email
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-subtle">
        Nothing yet? Check spam, and that the address above is spelled right.
      </p>
    </AuthShell>
  );
}

export default SignInFlow;
