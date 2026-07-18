import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link, type Location } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AuthShell,
  AUTH_EASE,
  consumeAuthReturnTo,
  sanitizeReturnTo,
  stashAuthReturnTo,
} from '@/components/auth/AuthShell';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { SocialQuietRow } from '@/components/auth/SocialQuietRow';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [params] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Deep link preserved by AppShell's redirect (state.from). Sanitized to
  // same-app paths; falls back to the post-login default.
  const from = (location.state as { from?: Partial<Location> } | null)?.from;
  const returnTo = sanitizeReturnTo(
    from ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` : null,
  );
  const destination = returnTo ?? '/next/today';

  // Social sign-in leaves the SPA entirely — stash the deep link so
  // AuthCallback can honor it when the OAuth round-trip returns.
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

  // Surface a gentle "your session ended" notice when we arrive here after a
  // forced logout (401 → auth:session-expired) or via ?expired=1.
  useEffect(() => {
    if (params.get('expired') || params.get('reason') === 'session-expired') {
      setSessionExpired(true);
    }
    const onExpired = () => setSessionExpired(true);
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Inline, per-field validation — the notice banner stays reserved for
    // server responses (400/409/429 — never a 401 here).
    const fe: { email?: string; password?: string } = {};
    if (!email.trim()) fe.email = 'Enter your email to sign in.';
    if (!password.trim()) fe.password = 'Enter your password.';
    setFieldErrors(fe);
    if (fe.email || fe.password) return;
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        setError(result.error);
        toast.error('Sign in failed', { description: result.error });
      } else {
        setSessionExpired(false);
        toast.success('Welcome back!');
        consumeAuthReturnTo(); // clear the OAuth stash — we're honoring state directly
        navigate(destination);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Beat 2 of the staged pane: the password reveals once the email holds
  // something. Purely presentational — the field stays part of the same form.
  // Under reduced motion both fields simply show; once the password has
  // content (or an error), it stays visible even if the email is cleared.
  const passwordVisible =
    !!reduce || email.trim().length > 0 || password.length > 0 || !!fieldErrors.password;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue where you left off."
      banner={
        sessionExpired && !error ? (
          <AuthNotice variant="info">
            Your session ended for your security. Sign in to pick up where you left off.
          </AuthNotice>
        ) : undefined
      }
      footer={
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Forgot password?
          </button>
          <span className="inline-flex min-h-11 items-center gap-1.5">
            New here?{' '}
            <Link
              to="/register"
              state={from ? { from } : undefined}
              className="rounded font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Create your account
            </Link>
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
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
            autoComplete="username"
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

        {/* Staged reveal — height/fade only, gated by useReducedMotion. The
            negative margin + inner padding keep the focus ring unclipped. */}
        <AnimatePresence initial={false}>
          {passwordVisible && (
            <motion.div
              key="password-beat"
              className="-mx-2 overflow-hidden"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: AUTH_EASE }}
            >
              <div
                className="space-y-2 px-2 pb-1 pt-5"
                onKeyDown={(e) => {
                  // Escape steps back to the email beat without losing input.
                  if (e.key === 'Escape') emailRef.current?.focus();
                }}
              >
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  className="h-11"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  capsLockWarning
                  required
                  disabled={isLoading}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                {fieldErrors.password && (
                  <p id="password-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 space-y-4">
          {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <SocialQuietRow verb="Continue with" />
      </div>

      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </AuthShell>
  );
}
