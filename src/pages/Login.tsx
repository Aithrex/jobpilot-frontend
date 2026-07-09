import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [params] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

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
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        setError(result.error);
        toast.error('Sign in failed', { description: result.error });
      } else {
        setSessionExpired(false);
        toast.success('Welcome back!');
        navigate('/app');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to Aspirely"
      subtitle="Welcome back — your plan is right where you left it."
      banner={
        sessionExpired && !error ? (
          <AuthNotice variant="info">
            Your session ended for your security. Sign in to pick up where you left off.
          </AuthNotice>
        ) : undefined
      }
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5">
        <SocialAuthButtons verb="Continue with" />
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="email"
            enterKeyHint="next"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            enterKeyHint="go"
            capsLockWarning
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </AuthShell>
  );
}
