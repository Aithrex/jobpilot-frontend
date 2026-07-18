import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordChecklist, isPasswordValid } from '@/components/auth/PasswordChecklist';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';

const ROLE_OPTIONS = [
  'Software Engineer', 'Data Scientist', 'Product Manager',
  'Designer', 'DevOps Engineer', 'Student', 'Other',
];

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
  const emailRef = useRef<HTMLInputElement | null>(null);
  const { register, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const id = window.setTimeout(() => emailRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, []);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  // Live mismatch feedback merges with the on-submit field error so the same
  // message never renders twice.
  const confirmError =
    fieldErrors.confirm ??
    (confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match.' : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (fe.email || fe.password || fe.confirm) return;
    setIsLoading(true);
    try {
      const result = await register(email, password, role || undefined);
      if (result.error) {
        setError(result.error);
        toast.error('Registration failed', { description: result.error });
        return;
      }
      // register() intentionally does not keep a token — sign in to enter.
      const loginResult = await login(email, password);
      if (loginResult.error) {
        toast.success('Account created! Please sign in.');
        navigate('/login');
        return;
      }
      toast.success('Account created — welcome to Aspirely!');
      navigate('/app');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your Aspirely account"
      subtitle="Free to start — your plan takes shape in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-5">
        <SocialAuthButtons verb="Sign up with" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

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
            What role are you targeting? <span className="text-muted-foreground">(optional)</span>
          </Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoading}
            className="flex h-11 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a role…</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used to rank roles for your field — you can change it later.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
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

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to use Aspirely responsibly.
        </p>
      </form>
    </AuthShell>
  );
}
