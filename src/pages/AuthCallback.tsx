import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { consumeAuthReturnTo } from '@/components/auth/AuthShell';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Landing route for social sign-in. The backend redirects here with the JWT (or
 * an error) in the URL FRAGMENT — `/oauth/callback#token=…` or `#error=…` — so
 * the credential never hits server/proxy logs. We read it, hydrate auth, and
 * forward into the app.
 */
const ERROR_COPY: Record<string, string> = {
  invalid_state: 'Your sign-in link expired. Please try again.',
  no_email: 'We couldn’t get a verified email from that provider. Try a different method.',
  oauth_failed: 'Sign-in failed. Please try again.',
  provider_not_configured: 'That sign-in method isn’t available right now.',
  unknown_provider: 'That sign-in method isn’t available right now.',
  access_denied: 'Sign-in was cancelled.',
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const { hydrateFromToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const errCode = params.get('error');

    // Clear the fragment so the token isn't left in the address bar / history.
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (errCode) {
      const msg = ERROR_COPY[errCode] || 'Sign-in failed. Please try again.';
      setError(msg);
      toast.error('Sign-in failed', { description: msg });
      const t = window.setTimeout(() => navigate('/login', { replace: true }), 2200);
      return () => window.clearTimeout(t);
    }

    if (!token) {
      setError('Sign-in could not be completed. Please try again.');
      const t = window.setTimeout(() => navigate('/login', { replace: true }), 2200);
      return () => window.clearTimeout(t);
    }

    hydrateFromToken(token).then((res) => {
      if (res.error) {
        setError(res.error);
        toast.error('Sign-in failed', { description: res.error });
        window.setTimeout(() => navigate('/login', { replace: true }), 2200);
      } else {
        toast.success('Signed in');
        // Honor a deep link stashed before the OAuth round-trip (the provider
        // redirect drops router state); falls back to the post-login default.
        navigate(consumeAuthReturnTo() ?? '/next/today', { replace: true });
      }
    });
  }, [hydrateFromToken, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Taking you back to sign in…</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Completing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
