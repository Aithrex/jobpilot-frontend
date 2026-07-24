import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * /start - legacy guest-onboarding entry, kept for backward-compatible links.
 * The live guest experience now runs directly on the landing (`/#try`) with a
 * single useGuestFlow controller, so this route only routes:
 *
 * - authed users → /next/today (unchanged)
 * - guests → /#try (guest state lives in localStorage + the backend session,
 *   so nothing is lost by redirecting)
 * - feature off → / (the account-first landing)
 */
export default function Start() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/next/today" replace />;
  if (!isGuestOnboardingEnabled()) return <Navigate to="/" replace />;
  return <Navigate to={{ pathname: '/', hash: '#try' }} replace />;
}
