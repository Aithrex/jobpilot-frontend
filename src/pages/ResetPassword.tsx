import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordChecklist, isPasswordValid } from '@/components/auth/PasswordChecklist';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

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
  const [requestOpen, setRequestOpen] = useState(false);
  const [deadLink, setDeadLink] = useState(false);

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
        if (/expired|invalid/i.test(resp.error)) setDeadLink(true);
        return;
      }
      setDone(true);
      toast.success('Password saved. Redirecting to sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch {
      setError('We could not reach Aspirely. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password. You will sign in fresh once it is saved."
      footer={
        <Link
          to="/login"
          className="pub-auth-link inline-flex min-h-11 items-center px-2"
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
          <button
            type="button"
            className="pub-btn pub-btn-primary"
            onClick={() => navigate('/login', { replace: true })}
          >
            Continue to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-sm font-semibold text-foreground">
                New password
              </label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="pub-auth-field"
                autoComplete="new-password"
                enterKeyHint="next"
                capsLockWarning
                required
                disabled={submitting || !token}
              />
              <PasswordChecklist password={password} className="pt-1" />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-foreground">
                Confirm password
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                className="pub-auth-field"
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
                <p id="confirm-error" className="text-sm text-destructive" role="alert">
                  Passwords do not match. Re-enter the same password in both fields.
                </p>
              )}
            </div>

            {error && <AuthNotice variant="error">{error}</AuthNotice>}

            {/* A dead or tokenless link is recoverable from right here: the
                way forward is a fresh link, not a disabled button. */}
            {!token || deadLink ? (
              <button type="button" className="pub-btn pub-btn-primary" onClick={() => setRequestOpen(true)}>
                Request a new link
              </button>
            ) : (
              <button type="submit" className="pub-btn pub-btn-primary" disabled={!canSubmit}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {submitting ? 'Saving...' : 'Save new password'}
              </button>
            )}
          </div>
        </form>
      )}

      <ForgotPasswordDialog open={requestOpen} onClose={() => setRequestOpen(false)} />
    </AuthShell>
  );
}
