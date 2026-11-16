import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell, consumeAuthReturnTo } from '@/components/auth/AuthShell';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { providerLabel } from '@/components/auth/SocialQuietRow';

/**
 * Landing route for a provider sign-in. The backend redirects here with the
 * session token, or an error code, in the URL FRAGMENT
 * (`/oauth/callback#token=...` or `#error=...&provider=google`), so the token
 * never reaches a server or proxy log. This page reads it, clears it from the
 * address bar, and either enters the app or says plainly what happened.
 *
 * A failure STAYS on screen until the person chooses what to do next. It used
 * to bounce back to sign-in after two seconds, before anyone could read it.
 */

type Failure = { title: string; body: string; cancelled?: boolean };

const CANCELLED = new Set(['access_denied', 'user_cancelled_authorize', 'user_cancelled_login', 'consent_required']);

export function describeProviderError(code: string, provider: string): Failure {
  const name = provider ? providerLabel(provider) : 'that provider';
  if (CANCELLED.has(code)) {
    return {
      cancelled: true,
      title: 'Sign-in was cancelled',
      body: `You left ${name} before finishing. Nothing was changed. You can try again or use your email.`,
    };
  }
  switch (code) {
    case 'invalid_state':
      return {
        title: 'That sign-in attempt expired',
        body: 'It took longer than 10 minutes, or it was finished in a different browser than it started in. Please start again.',
      };
    case 'email_unverified':
      return {
        title: `${name} has not confirmed your email`,
        body: `${name} did not tell us this email address is verified, so we cannot sign you in with it. Use your email and a code instead.`,
      };
    case 'no_email':
      return {
        title: `${name} did not share an email`,
        body: 'We need an email address to find or create your account. Use your email and a code instead.',
      };
    case 'link_not_allowed':
      return {
        title: 'This email already has an account',
        body: `Sign in with your email first. ${name} cannot be attached to an existing account automatically.`,
      };
    case 'account_closed':
      return {
        title: 'This account has been closed',
        body: 'Write to us if you think that is a mistake.',
      };
    case 'rate_limited':
      return {
        title: 'Too many attempts',
        body: 'Please wait a few minutes and try again.',
      };
    case 'provider_not_configured':
    case 'unknown_provider':
      return {
        title: 'That sign-in method is not available',
        body: 'Use your email and a code instead.',
      };
    default:
      return {
        title: `We could not sign you in with ${name}`,
        body: 'Something went wrong on the way back. Please try again, or use your email and a code.',
      };
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { hydrateFromToken } = useAuth();
  const [failure, setFailure] = useState<Failure | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const errCode = params.get('error');
    const provider = params.get('provider') ?? '';

    // Clear the fragment so the token is not left in the address bar or history.
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (errCode) {
      setFailure(describeProviderError(errCode, provider));
      return;
    }
    if (!token) {
      // Opened directly, or reached again with Back: there is nothing to finish.
      setFailure({
        title: 'There is no sign-in to finish',
        body: 'This page completes a sign-in that starts on the sign-in page.',
      });
      return;
    }

    hydrateFromToken(token).then((res) => {
      if (res.error) {
        setFailure({ title: 'We could not finish signing you in', body: res.error });
        return;
      }
      // Honour a deep link stashed before the provider round-trip.
      navigate(consumeAuthReturnTo() ?? '/app/home', { replace: true });
    });
  }, [hydrateFromToken, navigate]);

  if (!failure) {
    return (
      <AuthShell title="Signing you in" subtitle="One moment.">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          <span>Finishing sign-in...</span>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={failure.title}>
      <div className="space-y-5">
        <AuthNotice variant={failure.cancelled ? 'info' : 'error'}>{failure.body}</AuthNotice>
        <Link to="/login" replace className="pub-btn pub-btn-primary">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
