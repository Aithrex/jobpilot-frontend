import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { appPath } from '@/app-shell/nav.config';
import { apiService } from '@/lib/api';
import {
  clearActiveTailorSession,
  getActiveTailorSession,
  roleLabel,
  setActiveTailorSession,
  subscribeActiveTailorSession,
  type ActiveTailorSession,
} from '@/lib/activeTailorSession';

/**
 * Persistent Jobs chrome while a tailor handoff or backend tailor job is open.
 * Survives leaving the Tailor tab: the worker keeps running; we poll status here.
 */
export function JobsTailorBanner() {
  const [session, setSession] = useState<ActiveTailorSession | null>(() =>
    getActiveTailorSession(),
  );

  useEffect(() => subscribeActiveTailorSession(() => setSession(getActiveTailorSession())), []);

  useEffect(() => {
    if (!session?.backendJobId) return;
    if (session.status !== 'running' && session.status !== 'handed_off') return;

    let cancelled = false;
    const jobId = session.backendJobId;

    const tick = async () => {
      const resp = await apiService.pollJobStatus<{
        status: string;
        error?: string;
        result?: unknown;
      }>(jobId);
      if (cancelled) return;
      const status = resp.data?.status;
      if (status === 'completed') {
        setActiveTailorSession({
          sourceJobId: session.sourceJobId,
          title: session.title,
          company: session.company,
          backendJobId: jobId,
          status: 'ready',
        });
        toast.success(`Tailored resume ready for ${roleLabel(session)}`, {
          description: 'Open Tailor to review and download.',
          action: {
            label: 'Open Tailor',
            onClick: () => {
              window.location.assign(appPath('resume', 'tailor'));
            },
          },
        });
        return;
      }
      if (status === 'failed') {
        setActiveTailorSession({
          sourceJobId: session.sourceJobId,
          title: session.title,
          company: session.company,
          backendJobId: jobId,
          status: 'error',
          error: resp.data?.error || resp.error || 'Tailoring failed',
        });
        return;
      }
      if (session.status === 'handed_off') {
        setActiveTailorSession({
          sourceJobId: session.sourceJobId,
          title: session.title,
          company: session.company,
          backendJobId: jobId,
          status: 'running',
        });
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    session?.backendJobId,
    session?.status,
    session?.sourceJobId,
    session?.title,
    session?.company,
  ]);

  if (!session) return null;

  const label = roleLabel(session);
  const running = session.status === 'running' || session.status === 'handed_off';
  const ready = session.status === 'ready';
  const failed = session.status === 'error';

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs text-foreground"
    >
      {running ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
      ) : (
        <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      )}
      <p className="min-w-0 flex-1 font-medium leading-snug">
        {running && (
          <>
            Tailoring in the background for <span className="text-foreground">{label}</span>
            . You can keep browsing Jobs — open Tailor anytime to check progress.
          </>
        )}
        {ready && (
          <>
            Tailored resume ready for <span className="text-foreground">{label}</span>
            . Open Tailor to review and download.
          </>
        )}
        {failed && (
          <>
            Tailoring failed for <span className="text-foreground">{label}</span>
            {session.error ? `: ${session.error}` : '.'} Open Tailor to try again.
          </>
        )}
      </p>
      <Button asChild size="sm" className="h-8 shrink-0 gap-1.5">
        <Link to={appPath('resume', 'tailor')}>
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {ready ? 'Open Tailor' : 'Go to Tailor'}
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 shrink-0 px-0"
        aria-label="Dismiss tailor notice"
        onClick={() => clearActiveTailorSession()}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
