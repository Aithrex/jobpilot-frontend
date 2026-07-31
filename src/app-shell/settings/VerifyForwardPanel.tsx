import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Loader2, MailWarning } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { navHref } from '@/app-shell/nav.config';

type VerifyState = 'verifying' | 'ok' | 'error' | 'missing';

/**
 * Forwarding-verification landing (`/app/settings/mailbox/verify-forward?token=`).
 * The link mailed to the user's inbox lands here; we POST the token via
 * apiService.verifyForwarding and report success or failure. Runs exactly once
 * per token. A failure is 400/404/409 (never 401) - a bad token is not a
 * session problem.
 *
 * This is now the OVERRIDE path only: per AUTOAPPLY_REPAIR_SPEC §6 the default
 * destination is the user's own registered email, already verified at sign-up,
 * so nobody reaches this page unless a destination was changed to some other
 * address (which the backend still re-verifies - `set_forwarding`).
 */
export default function VerifyForwardPanel() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const token = params.get('token');
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'missing');
  const [message, setMessage] = useState<string>('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token) {
      setState('missing');
      return;
    }
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const res = await apiService.verifyForwarding(token);
      if (res.error) {
        setState('error');
        setMessage(res.error);
        return;
      }
      setState('ok');
      // Refresh the settings/inbox surfaces so the "verified" badge appears.
      queryClient.invalidateQueries({ queryKey: ['mailbox'] });
    })();
  }, [token, queryClient]);

  return (
    <div className="mx-auto max-w-md rounded-container border border-border bg-card p-8 text-center shadow-soft">
      {state === 'verifying' && (
        <>
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground" aria-live="polite">
            Verifying your forwarding address...
          </p>
        </>
      )}

      {state === 'ok' && (
        <>
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-base font-semibold text-foreground">Forwarding verified</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            When an employer gets back to you, we'll email this address a short heads-up
            with a link. The full message stays in your Inbox.
          </p>
          <Button asChild className="mt-4">
            <Link to={`${navHref('settings')}/mailbox`}>Back to mailbox settings</Link>
          </Button>
        </>
      )}

      {(state === 'error' || state === 'missing') && (
        <>
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-warning">
            <MailWarning className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-base font-semibold text-foreground">
            {state === 'missing' ? 'Missing verification token' : "Couldn't verify forwarding"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === 'missing'
              ? 'This link is incomplete. Open the most recent verification email again.'
              : message || 'The link may have expired. Send yourself a fresh verification email.'}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={`${navHref('settings')}/mailbox`}>Go to mailbox settings</Link>
          </Button>
        </>
      )}
    </div>
  );
}
