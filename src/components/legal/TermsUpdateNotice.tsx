import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { usePrivacy } from '@/components/privacy/usePrivacy';
import { LAST_UPDATED, LEGAL_ROUTES, MINIMUM_AGE, TERMS_VERSION } from '@/lib/legal';

const DISMISS_KEY = `aspirely.terms-notice.dismissed.${TERMS_VERSION}`;

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Non-blocking notice in the app shell for a signed-in person whose accepted
 * Terms version is not the one this build ships (including accounts that never
 * recorded one, such as provider sign-ups). Review opens the Terms; Accept
 * records `accept_terms_version` (and, when the account has no age
 * confirmation yet, `age_confirmed`). Dismiss hides it for this browser
 * session only, so the question comes back until it is answered.
 *
 * Renders nothing while loading, on any error, and when the privacy endpoint
 * is not deployed yet (404).
 */
export function TermsUpdateNotice() {
  const { state, update, isSaving } = usePrivacy();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (!state || dismissed || state.terms.version === TERMS_VERSION) return null;

  const needsAge = !state.age_confirmed;

  const accept = async () => {
    try {
      await update({
        accept_terms_version: TERMS_VERSION,
        ...(needsAge ? { age_confirmed: true } : {}),
      });
      toast.success('Thanks. Your acceptance is recorded.');
    } catch (err) {
      toast.error('We could not record that', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode: dismissal lasts until the component unmounts.
    }
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="terms-update-heading"
      className="border-b border-border bg-card text-card-foreground"
      data-testid="terms-update-notice"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <h2 id="terms-update-heading" className="font-semibold text-foreground">
            We updated our Terms of Service and Privacy Policy
          </h2>
          <p className="text-muted-foreground">
            The new versions took effect on {LAST_UPDATED}.
            {needsAge
              ? ` Please review them, then confirm you are at least ${MINIMUM_AGE} and accept.`
              : ' Please review and accept them.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={LEGAL_ROUTES.terms}>Review</Link>
          </Button>
          <Button type="button" size="sm" onClick={() => void accept()} disabled={isSaving}>
            {isSaving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {needsAge ? `I am ${MINIMUM_AGE} or older and accept` : 'Accept'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Dismiss for now"
            onClick={dismiss}
          >
            <X aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default TermsUpdateNotice;
