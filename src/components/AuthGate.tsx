import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordChecklist, isPasswordValid } from '@/components/auth/PasswordChecklist';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

interface AuthGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

type Step = 'email' | 'login' | 'register';

const ROLE_OPTIONS = [
  'Software Engineer', 'Data Scientist', 'Product Manager',
  'Designer', 'DevOps Engineer', 'Student', 'Other',
];

const SECTOR_OPTIONS = [
  'Technology', 'Finance', 'Healthcare', 'Education',
  'Government', 'Consulting', 'Other',
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const selectClasses =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

/**
 * AuthGate — the sign-in wall for the /app workspace. Calm, token-driven, and
 * theme-correct: an email-first flow (check email → sign in or register) that
 * reuses the shared AuthShell so it matches the standalone /login + /register
 * routes exactly.
 *
 * Auth behaviour is unchanged: it drives everything through `useAuth`
 * (login/register with session_id + fingerprint) and `apiService.checkEmail`.
 * Failures are surfaced inline (never a logout — the 401→session-expired
 * contract lives in api.ts).
 */
export default function AuthGate({ children, description }: AuthGateProps) {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [sector, setSector] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // A forced logout (401) while inside the app re-renders this gate — greet the
  // returning user gently rather than dumping them at a blank form.
  useEffect(() => {
    const onExpired = () => setSessionExpired(true);
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, []);

  // Focus the right field as steps change (after the transition settles).
  useEffect(() => {
    if (step !== 'email') return;
    const id = window.setTimeout(() => emailInputRef.current?.focus(), 160);
    return () => window.clearTimeout(id);
  }, [step]);

  useEffect(() => {
    if (step !== 'login') return;
    const id = window.setTimeout(() => passwordInputRef.current?.focus(), 300);
    return () => window.clearTimeout(id);
  }, [step]);

  const readContext = () => ({
    sessionId: sessionStorage.getItem('portfolio_session_id') || undefined,
    fingerprint: localStorage.getItem('portfolio_fingerprint_hash') || undefined,
  });

  // Step 1 — does this email already have an account?
  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setCheckingEmail(true);
    try {
      const resp = await apiService.checkEmail(email);
      if (resp.error) {
        setError(resp.error);
        return;
      }
      setSessionExpired(false);
      setStep(resp.data?.exists ? 'login' : 'register');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setCheckingEmail(false);
    }
  };

  // Step 2a — sign in
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    const { sessionId, fingerprint } = readContext();
    const result = await login(email, password, sessionId, fingerprint);
    setSubmitting(false);
    if (result.error) setError(result.error);
    // On success isAuthenticated flips and the workspace renders.
  };

  // Step 2b — register, then sign in
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isPasswordValid(password)) {
      setError('Password must be 8+ characters with upper- and lower-case letters, a number, and a symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { sessionId, fingerprint } = readContext();
    const result = await register(
      email, password, role || undefined, sector || undefined, sessionId, fingerprint,
    );
    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    setSuccessMsg('Account created. Signing you in…');
    const loginResult = await login(email, password, sessionId, fingerprint);
    setSubmitting(false);
    if (loginResult.error) {
      setSuccessMsg('Account created! Please sign in.');
      setStep('login');
      setPassword('');
      setConfirmPassword('');
      setRole('');
      setSector('');
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setSector('');
    setError('');
    setSuccessMsg('');
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const heading =
    step === 'login' ? 'Welcome back'
    : step === 'register' ? 'Create your Aspirely account'
    : 'Continue to Aspirely';

  const subtitle =
    step === 'login' ? 'Enter your password. Your plan is right where you left it.'
    : step === 'register' ? "You're new here. Let's set up your plan."
    : (description || "Enter your email. We'll find your account or start a new one.");

  const stepMotion = {
    initial: { opacity: 0, x: reduce ? 0 : 14 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -14 },
    transition: { duration: 0.22, ease: EASE },
  };

  return (
    <>
      <AuthShell
        title={heading}
        subtitle={subtitle}
        footer={
          step === 'email' ? (
            <span>Returning or brand new. One field to get started.</span>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="rounded font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              Use a different email
            </button>
          )
        }
      >
        {sessionExpired && step === 'email' && !error && (
          <div className="mb-5">
            <AuthNotice variant="info">
              Your session ended for your security. Sign in to pick up where you left off.
            </AuthNotice>
          </div>
        )}

        {step === 'email' && (
          <div className="mb-5">
            <SocialAuthButtons verb="Continue with" />
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...stepMotion} className="space-y-5">
            {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}
            {successMsg && !error && <AuthNotice variant="success">{successMsg}</AuthNotice>}

            {/* Identity chip for login/register steps */}
            {step !== 'email' && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Change email"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-foreground">
                    {step === 'login' ? maskEmail(email) : email}
                  </span>
                  {step === 'register' && (
                    <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      New
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 1: Email ─────────────────────────────────────────── */}
            {step === 'email' && (
              <form onSubmit={handleEmailNext} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    ref={emailInputRef}
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    enterKeyHint="next"
                    required
                    disabled={checkingEmail}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={checkingEmail}>
                  {checkingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Checking…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ── Step 2a: Login ────────────────────────────────────────── */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    ref={passwordInputRef}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    enterKeyHint="go"
                    capsLockWarning
                    required
                    disabled={submitting}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}

            {/* ── Step 2b: Register ─────────────────────────────────────── */}
            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <PasswordInput
                    id="reg-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    enterKeyHint="next"
                    capsLockWarning
                    required
                    disabled={submitting}
                  />
                  <PasswordChecklist password={password} className="pt-1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm password</Label>
                  <PasswordInput
                    id="reg-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    enterKeyHint="go"
                    required
                    disabled={submitting}
                  />
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs text-destructive" role="alert">Passwords do not match</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reg-role">
                      Role <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <select
                      id="reg-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={submitting}
                      className={selectClasses}
                    >
                      <option value="">Select…</option>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-sector">
                      Sector <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <select
                      id="reg-sector"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      disabled={submitting}
                      className={selectClasses}
                    >
                      <option value="">Select…</option>
                      {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Used to rank roles for your field. You can change these later.
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {submitting ? 'Creating account…' : 'Create account'}
                </Button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </AuthShell>

      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </>
  );
}
