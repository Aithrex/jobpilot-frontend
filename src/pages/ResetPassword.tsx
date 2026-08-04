import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordChecklist, isPasswordValid } from '@/components/auth/PasswordChecklist';
import { AuthShield } from '@/components/auth/AuthShield';
import { AuthNotice, errorVariant } from '@/components/auth/AuthNotice';

/**
 * Consumes a `?token=` query param from the reset email and posts the new
 * password to /api/auth/reset-password (field is snake_case `new_password`,
 * handled inside apiService.resetPassword). On success, redirects to /login
 * after a short pause so the user sees the confirmation.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => (params.get('token') || '').trim(), [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('This reset link is missing its token. Request a fresh link to continue.');
  }, [token]);

  const passwordsMatch = password.length > 0 && password === confirm;
  const strongEnough = isPasswordValid(password);
  const canSubmit = !!token && strongEnough && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const resp = await apiService.resetPassword(token, password);
      if (resp.error) {
        setError(resp.error);
        toast.error('Reset failed', { description: resp.error });
        return;
      }
      setDone(true);
      toast.success('Password saved. Redirecting to sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password. You will sign in fresh once it is saved."
      // Same task as register's password beat, against the same five rules from
      // the same checkPasswordRules - so it gets the same shield rather than the
      // product journey. Suppressed once saved (the form is gone) and when the
      // link has no token (there is nothing to type into).
      aside={!done && token ? <AuthShield password={password} /> : undefined}
      footer={
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded px-2 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <AuthNotice variant="success">
            Password saved. Redirecting you to sign in...
          </AuthNotice>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate('/login', { replace: true })}
          >
            Continue to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="h-11"
                autoComplete="new-password"
                enterKeyHint="next"
                capsLockWarning
                required
                disabled={submitting || !token}
              />
              <PasswordChecklist password={password} className="pt-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                className="h-11"
                autoComplete="new-password"
                enterKeyHint="go"
                required
                disabled={submitting || !token}
                aria-invalid={confirm.length > 0 && !passwordsMatch ? true : undefined}
                aria-describedby={
                  confirm.length > 0 && !passwordsMatch ? 'confirm-error' : undefined
                }
              />
              {confirm.length > 0 && !passwordsMatch && (
                <p id="confirm-error" className="text-xs text-destructive" role="alert">
                  Passwords do not match. Re-enter the same password in both fields.
                </p>
              )}
            </div>

            {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? 'Saving...' : 'Save new password'}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
