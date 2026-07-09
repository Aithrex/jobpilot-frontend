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
      toast.success('Password updated — redirecting to sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password. You'll sign in fresh once it's saved."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <AuthNotice variant="success">
          Password updated. Redirecting you to sign in…
        </AuthNotice>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && <AuthNotice variant={errorVariant(error)}>{error}</AuthNotice>}

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
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
              autoComplete="new-password"
              enterKeyHint="go"
              required
              disabled={submitting || !token}
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive" role="alert">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
