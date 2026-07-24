import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link, type Location } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check, ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AuthShell,
  AUTH_EASE,
  consumeAuthReturnTo,
  sanitizeReturnTo,
  stashAuthReturnTo,
} from '@/components/auth/AuthShell';
import { SocialQuietRow } from '@/components/auth/SocialQuietRow';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordChecklist, isPasswordValid } from '@/components/auth/PasswordChecklist';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';

const ROLE_OPTIONS = [
  'Software Engineer', 'Data Scientist', 'Product Manager',
  'Designer', 'DevOps Engineer', 'Student', 'Other',
];

/** Presentation-only staging: 0 = identity (email + role), 1 = password. */
type Beat = 0 | 1;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [beat, setBeat] = useState<Beat>(0);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const prevBeatRef = useRef<Beat>(0);
  const { register, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Deep link forwarded from AppShell's login redirect (via the sign-in ↔
  // sign-up cross-links). Sanitized to same-app paths.
  const from = (location.state as { from?: Partial<Location> } | null)?.from;
  const returnTo = sanitizeReturnTo(
    from ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` : null,
  );
  const destination = returnTo ?? '/next/today';

  // Social sign-up leaves the SPA - stash the deep link for AuthCallback.
  useEffect(() => {
    stashAuthReturnTo(returnTo);
  }, [returnTo]);

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [isAuthenticated, navigate, destination]);

  useEffect(() => {
    const id = window.setTimeout(() => emailRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, []);

  // Move focus with the beat (skip the initial mount - the effect above
  // already autofocuses the email). Values are never cleared on beat change.
  useEffect(() => {
    if (prevBeatRef.current === beat) return;
    prevBeatRef.current = beat;
    const id = window.setTimeout(() => {
      (beat === 1 ? passwordRef : emailRef).current?.focus();
    }, reduce ? 0 : 260);
    return () => window.clearTimeout(id);
  }, [beat, reduce]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  // Live mismatch feedback merges with the on-submit field error so the same
  // message never renders twice.
  const confirmError =
    fieldErrors.confirm ??
    (confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match.' : undefined);

  // Advance from the identity beat - same email rule and message the final
  // submit uses, so the gate never disagrees with the real validation.
  const handleContinue = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors((f) => ({ ...f, email: 'Please enter a valid email address.' }));
      return;
    }
    setFieldErrors((f) => ({ ...f, email: undefined }));
    setBeat(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter on the identity beat advances instead of submitting a half-empty
    // form; the full validation below still runs before any request.
    if (beat === 0) {
      handleContinue();
      return;
    }
    setError('');
    // Inline, per-field validation (the checklist mirrors the backend's
    // password policy); the notice banner stays reserved for server responses.
    const fe: { email?: string; password?: string; confirm?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fe.email = 'Please enter a valid email address.';
    }
    if (!isPasswordValid(password)) {
      fe.password = "Your password doesn't meet all the requirements above yet.";
    }
    if (password !== confirmPassword) {
      fe.confirm = 'Passwords do not match.';
    }
    setFieldErrors(fe);
    if (fe.email) setBeat(0); // show the email error on the beat that owns it
    if (fe.email || fe.password || fe.confirm) return;
    setIsLoading(true);
    try {
      const result = await register(email, password, role || undefined);
      if (result.error) {
        setError(result.error);
        toast.error('Registration failed', { description: result.error });
        return;
      }
      // register() intentionally does not keep a token - sign in to enter.
      const loginResult = await login(email, password);
      if (loginResult.error) {
        toast.success('Account created! Please sign in.');
        navigate('/login', { state: from ? { from } : undefined });
        return;
      }
      toast.success('Account created. Welcome to Aspirely!');
      consumeAuthReturnTo(); // clear the OAuth stash - we're honoring state directly
      navigate(destination);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const beatMotion = {
    initial: { opacity: 0, x: reduce ? 0 : 14 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -14 },
    transition: { duration: reduce ? 0 : 0.22, ease: AUTH_EASE },
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. Your plan takes shape in minutes."
      footer={
        <span className="inline-flex min-h-11 items-center gap-1.5">
          Already have an account?{' '}
          <Link
            to="/login"
            state={from ? { from } : undefined}
            className="rounded font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in
          </Link>
        </span>
      }
    >
      {/* Hairline progress hint for the two beats. */}
      <div className="mb-6">
        <p className="sr-only" aria-live="polite">
          Step {beat + 1} of 2: {beat === 0 ? 'Identity' : 'Password'}
        </p>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-0.5 flex-1 rounded-full bg-primary" />
          <span
            className={cn(
              'h-0.5 flex-1 rounded-full transition-colors',
              beat === 1 ? 'bg-primary' : 'bg-border',
            )}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <AnimatePresence mode="wait" initial={false}>
          {beat === 0 ? (
            /* ── Beat 1: identity (email + role) ─────────────────────────── */
            <motion.div key="identity" {...beatMotion} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  className="h-11"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  inputMode="email"
                  enterKeyHint="next"
                  required
                  disabled={isLoading}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  What role are you targeting?{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isLoading}
                  className="flex h-11 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a role...</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used to rank roles for your field. You can change it later.
                </p>
              </div>

              {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

              <Button
                type="button"
                onClick={handleContinue}
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </motion.div>
          ) : (
            /* ── Beat 2: password ────────────────────────────────────────── */
            <motion.div
              key="password"
              {...beatMotion}
              className="space-y-5"
              onKeyDown={(e) => {
                // Escape steps back to the identity beat, values intact.
                if (e.key === 'Escape' && !isLoading) {
                  e.preventDefault();
                  setBeat(0);
                }
              }}
            >
              {/* Keeps the email in the form for password managers while the
                  visible field lives on the previous beat. */}
              <input
                type="email"
                autoComplete="email"
                value={email}
                readOnly
                aria-hidden
                tabIndex={-1}
                className="sr-only"
              />

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setBeat(0)}
                  aria-label="Back to email and role"
                  disabled={isLoading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </button>
                <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-foreground">{email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  ref={passwordRef}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password || fieldErrors.confirm) {
                      setFieldErrors((f) => ({ ...f, password: undefined, confirm: undefined }));
                    }
                  }}
                  placeholder="Create a strong password"
                  className="h-11"
                  autoComplete="new-password"
                  enterKeyHint="next"
                  capsLockWarning
                  required
                  disabled={isLoading}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <PasswordChecklist password={password} className="pt-1" />
                {fieldErrors.password && (
                  <p id="password-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <PasswordInput
                  id="confirm"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm) setFieldErrors((f) => ({ ...f, confirm: undefined }));
                  }}
                  placeholder="Re-enter your password"
                  className="h-11"
                  autoComplete="new-password"
                  enterKeyHint="go"
                  required
                  disabled={isLoading}
                  aria-invalid={confirmError ? true : undefined}
                  aria-describedby={confirmError ? 'confirm-error' : undefined}
                />
                {confirmError ? (
                  <p id="confirm-error" className="text-xs text-destructive" role="alert">
                    {confirmError}
                  </p>
                ) : passwordsMatch ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-success" role="status">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Passwords match
                  </p>
                ) : null}
              </div>

              {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to use Aspirely responsibly.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {beat === 0 && (
        <div className="mt-6">
          <SocialQuietRow verb="Sign up with" />
        </div>
      )}
    </AuthShell>
  );
}
