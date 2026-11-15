/**
 * The Gmail connection: connect, check, see what changed, reconnect.
 *
 * Every screen is chosen by one field, `status.state`, and every screen says
 * what is happening and what to do next. A check is one press: the server
 * reads batch after batch by itself, so this component only watches
 * `status.sync` and never asks the user to press Continue.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import GmailActivity from '@/components/resume/GmailActivity';
import GmailSuggestions, {
  GmailReviewLoadError,
  useGmailSuggestions,
} from '@/components/resume/GmailSuggestions';
import {
  formatDay,
  formatRelative,
  gmailErrorCode,
  gmailStateOf,
  plural,
  startGmailConnect,
} from '@/components/resume/gmailState';
import type { GmailChange, GmailStatus, GmailSyncRun, GmailSyncSummary } from '@/types/gmail';

/** Gmail mark - Google's literal brand colors (intentional; all chrome around it stays tokenized). */
const GMAIL_MARK = 'bg-gradient-to-br from-[#EA4335] via-[#FBBC05] to-[#34A853]';

const PRIMARY_BTN =
  'rounded-lg bg-primary px-3 py-2 text-label font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60';
const QUIET_BTN =
  'rounded-lg border border-border px-2.5 py-2 text-label font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60';
const TEXT_LINK =
  'rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Short waits first (a routine check takes seconds), longer ones for a first scan of a big inbox. */
function pollDelayMs(attempt: number): number {
  if (attempt < 3) return 2000;
  if (attempt < 8) return 3000;
  if (attempt < 16) return 5000;
  return 8000;
}
/** About 50 minutes. Past that the page stops watching; the check itself carries on. */
const MAX_POLLS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Notice = { tone: 'error' | 'info'; text: string };

/** What Aspirely reads, keeps and never does. In view wherever the user connects. */
function GmailPromises({ testing }: { testing: boolean }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-label text-muted-foreground">
      <li>
        <span className="font-medium text-foreground">Reads:</span> your email, to find replies
        about the jobs in your tracker. The first check covers the last 60 days in every folder
        except Promotions and Social.
      </li>
      <li>
        <span className="font-medium text-foreground">Keeps:</span> only the sender, subject, date
        and a short excerpt of email that matches one of your applications.
      </li>
      <li>
        <span className="font-medium text-foreground">Never:</span> sends, deletes, moves or marks
        email. Access is read only.
      </li>
      <li>
        <span className="font-medium text-foreground">Limited Use:</span> Gmail data is used only
        to update this tracker. It is never sold, never used for ads and never used to train AI
        models, as Google's Limited Use rules require.{' '}
        <Link to="/privacy#google-user-data" className={TEXT_LINK}>
          Privacy policy
        </Link>
      </li>
      <li>
        <span className="font-medium text-foreground">Your control:</span> disconnect at any time.
        That deletes the access Aspirely saved.
      </li>
      {testing && (
        <li>
          <span className="font-medium text-foreground">For now:</span> Google is still reviewing
          Aspirely, so Google ends each Gmail connection after 7 days. You will be asked to
          reconnect then.
        </li>
      )}
    </ul>
  );
}

/** Why the last finished check ended the way it did, in one or two sentences. */
function ResultLine({ summary, tracked }: { summary: GmailSyncSummary; tracked: number | undefined }) {
  const scanned = summary.messages_scanned ?? 0;
  const emails = plural(scanned, 'email', 'emails');
  const apps = tracked ?? summary.tracked_applications;
  switch (summary.outcome) {
    case 'no_applications':
      return (
        <>
          Your tracker is empty, so there was nothing to look for and no email was read. Gmail can
          only match replies to jobs that are in this tracker.{' '}
          <Link to="/app/jobs/for-you" className={TEXT_LINK}>
            Find jobs
          </Link>{' '}
          or{' '}
          <Link to="/app/resume/tailor" className={TEXT_LINK}>
            tailor a resume
          </Link>{' '}
          to add one, then check again.
        </>
      );
    case 'no_mail':
      return summary.window_days ? (
        <>
          Nothing to read: no email arrived in the last {summary.window_days} days outside
          Promotions and Social.
        </>
      ) : (
        <>Nothing new: no email has arrived since the last check.</>
      );
    case 'no_matches':
      return (
        <>
          Checked {emails}. None were about{' '}
          {apps ? `the ${plural(apps, 'application', 'applications')} in your tracker` : 'an application in your tracker'}
          , so nothing changed. Replies to jobs you have not added here cannot be matched.
        </>
      );
    case 'up_to_date':
      return (
        <>
          Checked {emails}. The replies found agree with what your tracker already shows, so
          nothing changed.
        </>
      );
    case 'updated':
      return (
        <>
          Checked {emails}. {plural(summary.auto_applied ?? 0, 'status', 'statuses')} updated for
          you, {summary.suggested ?? 0} waiting for your review.
        </>
      );
    default:
      // An older backend sends counts with no outcome.
      return (
        <>
          Last check: {emails} checked, {plural(summary.auto_applied ?? 0, 'status', 'statuses')}{' '}
          updated, {summary.suggested ?? 0} waiting for your review.
        </>
      );
  }
}

/** The next step after a failed check, by machine code. The sentence above it comes from the server. */
function failureNextStep(code?: string | null): string {
  switch (code) {
    case 'gmail_rate_limited':
      return 'Google asked Aspirely to slow down. Wait a minute, then check again. Nothing was lost.';
    case 'gmail_unavailable':
      return 'This is a problem on our side, not with your account. Try again later.';
    case 'gmail_policy_blocked':
      return 'A school or company Google account can block this. Ask its administrator, or connect a personal Gmail instead.';
    case 'gmail_time_limit':
      return 'Check again to carry on from where it stopped.';
    default:
      return 'Your tracker was not changed by the failed check. Try again in a few minutes.';
  }
}

function reconnectReason(status: GmailStatus): string {
  switch (status.reconnect_reason) {
    case 'permission_missing':
      return "Aspirely was connected without permission to read Gmail. Reconnect, and on Google's screen tick the box that lets Aspirely view your email messages.";
    case 'expired_or_revoked':
      return status.access?.mode === 'testing'
        ? 'Google ended this connection. While Google is still reviewing Aspirely, it ends every Gmail connection after 7 days.'
        : 'Google no longer accepts the saved access. This happens when access is removed in your Google account, or after a Google password change.';
    default:
      // A reason this build does not know still gets a true sentence.
      return 'The saved access no longer works. Reconnect to create a new one.';
  }
}

export default function GmailIntegration({
  onSyncComplete,
  showReviewQueue = true,
  inline = false,
}: {
  onSyncComplete?: () => void;
  showReviewQueue?: boolean;
  /**
   * No card of its own, for a parent that already draws the box (the tracker
   * header). Same states and same words as Settings, in less space.
   */
  inline?: boolean;
}) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [linking, setLinking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [changes, setChanges] = useState<GmailChange[]>([]);
  const [undoBusyId, setUndoBusyId] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

  const onChangedRef = useRef(onSyncComplete);
  onChangedRef.current = onSyncComplete;

  const loadStatus = useCallback(async (): Promise<GmailStatus | null> => {
    const resp = await apiService.getGmailStatus();
    setLoading(false);
    if (resp.data) {
      setStatus(resp.data);
      setStatusError(false);
      return resp.data;
    }
    if (resp.error) setStatusError(true);
    return null;
  }, []);

  /** An older backend has no activity route; that is "no changes", not an error. */
  const loadActivity = useCallback(async () => {
    const resp = await apiService.getGmailActivity?.();
    if (resp?.data && Array.isArray(resp.data.changes)) setChanges(resp.data.changes);
  }, []);

  const {
    suggestions,
    busyId,
    apply: handleApply,
    dismiss: handleDismiss,
    reload: loadSuggestions,
    setSuggestions,
    loadError: suggestionsError,
  } = useGmailSuggestions(showReviewQueue && Boolean(status?.connected), onSyncComplete);

  // One watcher at a time; a newer one, or unmount, retires the older.
  const watchRef = useRef<{ cancelled: boolean } | null>(null);
  useEffect(
    () => () => {
      if (watchRef.current) watchRef.current.cancelled = true;
      watchRef.current = null;
    },
    [],
  );

  const finishWatching = useCallback(async () => {
    watchRef.current = null;
    setFollowing(false);
    await Promise.all([loadStatus(), loadSuggestions(), loadActivity()]);
    onChangedRef.current?.();
  }, [loadStatus, loadSuggestions, loadActivity]);

  /** Watch a run until it stops running. Progress comes from the status, not from a job. */
  const watchRun = useCallback(
    async (runId: string | null) => {
      if (watchRef.current) watchRef.current.cancelled = true;
      const me = { cancelled: false };
      watchRef.current = me;
      setFollowing(true);
      let lastCounts: string | null = null;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(pollDelayMs(attempt));
        if (me.cancelled) return;
        const resp = await apiService.getGmailStatus(true);
        if (me.cancelled) return;
        // A network blip during a long check is not the check failing.
        if (!resp.data) continue;
        const next = resp.data;
        setStatus((prev) => ({
          ...next,
          pending_suggestions: next.pending_suggestions ?? prev?.pending_suggestions ?? 0,
        }));
        const run = next.sync;
        const counts = `${run?.auto_applied ?? 0}:${run?.suggested ?? 0}`;
        const running = run?.state === 'running' || gmailStateOf(next) === 'syncing';
        // The tracker catches up while the check is still reading. Once it has
        // stopped, the refresh below does that.
        if (running && lastCounts !== null && counts !== lastCounts) onChangedRef.current?.();
        lastCounts = counts;
        // The run we started may not be visible on the very first read.
        const ours = !runId || run?.run_id === runId;
        if (!running && (ours || attempt >= 3)) break;
      }
      if (me.cancelled) return;
      await finishWatching();
    },
    [finishWatching],
  );

  /** An older backend answers with a job and no run: watch the job instead. */
  const watchJob = useCallback(
    async (jobId: string) => {
      if (watchRef.current) watchRef.current.cancelled = true;
      const me = { cancelled: false };
      watchRef.current = me;
      setFollowing(true);
      let failure: string | null = null;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(pollDelayMs(attempt));
        if (me.cancelled) return;
        const poll = await apiService.pollGmailSyncJob(jobId);
        if (me.cancelled) return;
        if (poll.error) continue;
        if (poll.data?.status === 'completed') break;
        if (poll.data?.status === 'failed') {
          failure = poll.data.error || 'The check failed.';
          break;
        }
      }
      if (me.cancelled) return;
      if (failure) setNotice({ tone: 'error', text: `${failure} ${failureNextStep(null)}` });
      await finishWatching();
    },
    [finishWatching],
  );

  const handleSync = useCallback(async () => {
    setStarting(true);
    setNotice(null);
    const resp = await apiService.syncGmail();
    setStarting(false);
    if (resp.error || !resp.data) {
      const code = gmailErrorCode(resp);
      if (code === 'gmail_reconnect_required' || code === 'gmail_not_connected') {
        // The status now says so, with the reason and a Reconnect button.
        await loadStatus();
        return;
      }
      if (resp.status === 429 || code === 'rate_limited') {
        setNotice({
          tone: 'info',
          text: 'You have started several checks in the last few minutes. Wait about 5 minutes, then try again. Your tracker and the last results are unchanged.',
        });
        return;
      }
      if (code === 'gmail_unavailable') {
        setNotice({
          tone: 'error',
          text: 'Gmail checks are switched off on Aspirely right now. This is on our side. Try again later.',
        });
        await loadStatus();
        return;
      }
      setNotice({
        tone: 'error',
        text: 'The check could not start. Nothing was changed. Try again in a moment.',
      });
      return;
    }
    if (resp.data.run_id || resp.data.already_running) {
      void watchRun(resp.data.run_id ?? null);
    } else if (resp.data.job_id) {
      void watchJob(resp.data.job_id);
    } else {
      await loadStatus();
    }
  }, [loadStatus, watchRun, watchJob]);

  // First load. A check may already be running (the background check, or
  // another tab), so pick its progress up. Arriving from Google's screen, start
  // the first check without a second press.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const url = new URL(window.location.href);
    const justLinked = url.searchParams.get('gmail') === 'linked';
    if (justLinked) {
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.toString());
    }
    void (async () => {
      const first = await loadStatus();
      void loadActivity();
      if (!first) return;
      const state = gmailStateOf(first);
      if (state === 'syncing') {
        void watchRun(first.sync?.run_id ?? null);
      } else if (justLinked && first.connected) {
        toast.success('Gmail connected.');
        if (state === 'never_synced' && first.tracked_applications !== 0) void handleSync();
      }
    })();
  }, [loadStatus, loadActivity, watchRun, handleSync]);

  const handleConnect = useCallback(async () => {
    setLinking(true);
    setNotice(null);
    const error = await startGmailConnect(() => apiService.getGmailAuthUrl());
    if (error) {
      setLinking(false);
      setNotice({ tone: 'error', text: error });
    }
    // On success the browser is leaving for Google; keep the button busy.
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (
      !window.confirm(
        'Disconnect Gmail? Aspirely deletes the access it saved and stops reading your email. Updates still waiting for your review are discarded. Your applications stay as they are.',
      )
    )
      return;
    const resp = await apiService.disconnectGmail();
    if (resp.error) {
      setNotice({ tone: 'error', text: 'Gmail could not be disconnected. Try again in a moment.' });
      return;
    }
    if (watchRef.current) watchRef.current.cancelled = true;
    watchRef.current = null;
    setFollowing(false);
    setSuggestions([]);
    setNotice(null);
    await loadStatus();
    onChangedRef.current?.();
    toast.success('Gmail disconnected.');
  }, [loadStatus, setSuggestions]);

  const handleUndo = useCallback(
    async (change: GmailChange) => {
      setUndoBusyId(change.suggestion_id);
      setUndoError(null);
      const resp = await apiService.undoGmailChange(change.suggestion_id);
      setUndoBusyId(null);
      if (resp.error) {
        const code = gmailErrorCode(resp);
        setUndoError(
          code === 'status_changed'
            ? 'This application was changed again after Gmail moved it, so there is nothing to undo. Set its status in the tracker instead.'
            : code === 'not_undoable'
              ? 'This change was already undone.'
              : 'The change could not be undone. Try again, or set the status in the tracker.',
        );
        await loadActivity();
        return;
      }
      const role = change.title || 'the application';
      toast.success(`Undone. ${role} is back to its earlier status.`);
      await loadActivity();
      onChangedRef.current?.();
    },
    [loadActivity],
  );

  const shell = inline ? 'px-4 py-3' : 'rounded-2xl border border-border bg-card p-4 shadow-soft';

  // Loading - a stable-height stand-in so nothing shifts.
  if (loading) {
    return (
      <div className={shell} aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-56 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (statusError && !status) {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 text-label text-muted-foreground', shell)}>
        <span>Couldn't check your Gmail connection. Your tracker is not affected.</span>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadStatus();
          }}
          className="font-semibold text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  const state = gmailStateOf(status);
  const run: GmailSyncRun | null = status.sync ?? null;
  const testing = status.access?.mode === 'testing';
  const expires = formatDay(status.access?.expires_at);
  const tracked = status.tracked_applications;
  const busy = starting || following || state === 'syncing';
  const failedRun = !busy && state !== 'needs_reconnect' && run?.state === 'failed' ? run : null;
  const summary = status.last_sync_summary ?? null;
  const autoSync = status.auto_sync?.enabled ? status.auto_sync : null;

  const icon = (
    <div
      className={cn(
        GMAIL_MARK,
        'flex shrink-0 items-center justify-center font-bold text-white shadow-soft',
        inline ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl',
      )}
      aria-hidden="true"
    >
      <Mail className={inline ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </div>
  );

  const row = (title: string, sub: ReactNode, actions: ReactNode) => (
    <div className="flex flex-wrap items-start gap-3">
      {icon}
      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
        <p className={cn('font-semibold text-foreground', inline ? 'text-label' : 'text-body')}>{title}</p>
        <div className="mt-0.5 break-words text-label text-muted-foreground">{sub}</div>
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );

  const noticeBlock = notice && (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={cn('mt-3 text-label', notice.tone === 'error' ? 'text-destructive' : 'text-foreground')}
    >
      {notice.text}
    </p>
  );

  if (state === 'unavailable') {
    return (
      <section aria-label="Gmail connection" className={shell}>
        {row(
          'Gmail connection is switched off',
          <>
            Connecting Gmail is not available on Aspirely right now, so nothing is read from your
            email. You can still set stages, notes and follow ups by hand in the tracker. There is
            nothing you need to do.
          </>,
          <button type="button" disabled className="rounded-lg bg-muted px-3 py-2 text-label font-semibold text-muted-foreground">
            Connect Gmail
          </button>,
        )}
      </section>
    );
  }

  if (state === 'not_connected') {
    return (
      <section aria-label="Gmail connection" className={shell}>
        {row(
          'Let Gmail keep this tracker up to date',
          <>
            Connect Gmail and Aspirely finds the replies to your applications: confirmations,
            interview invites and rejections. Clear ones move the application for you. Unclear ones
            wait for your review. Read only: Aspirely never sends, deletes or changes email.
          </>,
          <button type="button" onClick={handleConnect} disabled={linking} className={PRIMARY_BTN}>
            {linking ? 'Opening Google...' : 'Connect Gmail'}
          </button>,
        )}
        {linking && (
          <p role="status" className="mt-3 text-label text-muted-foreground">
            Taking you to Google to choose an account and allow read only access. You come back
            here afterwards.
          </p>
        )}
        {noticeBlock}
        {inline ? (
          <details className="mt-3 text-label text-muted-foreground">
            <summary className="cursor-pointer rounded font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              What Aspirely reads, and what it never does
            </summary>
            <GmailPromises testing={testing} />
          </details>
        ) : (
          <div className="mt-3">
            <p className="text-label font-medium text-foreground">
              What Aspirely reads, and what it never does
            </p>
            <GmailPromises testing={testing} />
          </div>
        )}
        {inline && testing && (
          <p className="mt-2 text-label text-muted-foreground">
            For now Google ends each Gmail connection after 7 days, while it reviews Aspirely. You
            will be asked to reconnect then.
          </p>
        )}
      </section>
    );
  }

  const address = status.gmail_address || 'your Gmail account';
  const disconnectButton = (
    <button type="button" onClick={handleDisconnect} disabled={starting} className={QUIET_BTN}>
      Disconnect
    </button>
  );

  if (state === 'needs_reconnect') {
    return (
      <section aria-label="Gmail connection" className={shell}>
        {row(
          'Reconnect Gmail to keep updates coming',
          <>
            <span role="alert" className="text-foreground">
              Aspirely can no longer read {address}. {reconnectReason(status)}
            </span>{' '}
            Your tracker and earlier updates are safe. No new email is read until you reconnect.
          </>,
          <>
            <button type="button" onClick={handleConnect} disabled={linking} className={PRIMARY_BTN}>
              {linking ? 'Opening Google...' : 'Reconnect Gmail'}
            </button>
            {disconnectButton}
          </>,
        )}
        {noticeBlock}
        <GmailActivity
          changes={changes}
          busyId={undoBusyId}
          error={undoError}
          onUndo={handleUndo}
          className="mt-4"
        />
      </section>
    );
  }

  // Connected: never_synced, syncing, paused or synced.
  const scanned = run?.messages_scanned ?? 0;
  let title = 'Gmail connected';
  let sub: ReactNode;
  let primaryLabel = 'Check Gmail now';

  if (busy) {
    title = 'Checking your Gmail';
    sub = <>{address}</>;
  } else if (state === 'paused') {
    title = 'Gmail check paused, more email to read';
    primaryLabel = 'Continue now';
    sub = (
      <>
        {address} · {plural(scanned || (summary?.messages_scanned ?? 0), 'email', 'emails')} read so
        far
      </>
    );
  } else if (state === 'never_synced') {
    sub = <>{address} · Not checked yet</>;
  } else {
    sub = (
      <>
        {address} · Last checked {formatRelative(status.last_synced_at)}
      </>
    );
  }

  return (
    <section aria-label="Gmail connection" className="space-y-3">
      <div className={shell}>
        {row(
          title,
          sub,
          <>
            <button
              type="button"
              onClick={handleSync}
              disabled={busy}
              className={
                inline
                  ? 'rounded-lg border border-border bg-card px-3 py-1.5 text-label font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-60'
                  : PRIMARY_BTN
              }
            >
              {busy ? 'Checking...' : primaryLabel}
            </button>
            {disconnectButton}
          </>,
        )}

        {busy && (
          <div className="mt-3" role="status" aria-live="polite">
            <div
              role="progressbar"
              aria-label="Checking Gmail"
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-label text-foreground">
              {scanned > 0
                ? `${plural(scanned, 'email', 'emails')} read so far. ${plural(run?.auto_applied ?? 0, 'status', 'statuses')} updated, ${run?.suggested ?? 0} waiting for your review.`
                : 'Starting. Aspirely reads about one email a second, so a first check of a busy inbox can take several minutes.'}
            </p>
            <p className="mt-1 text-label text-muted-foreground">
              You can leave this page or close the tab. The check keeps running and the results
              will be here when you come back.
            </p>
          </div>
        )}

        {!busy && state === 'paused' && (
          <p role="status" className="mt-3 text-label text-foreground">
            The check stopped part way and there is more email to read. Aspirely carries on by
            itself within about 30 minutes, or press Continue now. Nothing read so far is lost.
          </p>
        )}

        {!busy && state === 'never_synced' && !failedRun && (
          <p role="status" className="mt-3 text-label text-foreground">
            {tracked === 0 ? (
              <>
                Your tracker is empty, so there is nothing for Gmail to match yet.{' '}
                <Link to="/app/jobs/for-you" className={TEXT_LINK}>
                  Find jobs
                </Link>{' '}
                or{' '}
                <Link to="/app/resume/tailor" className={TEXT_LINK}>
                  tailor a resume
                </Link>{' '}
                to add an application, then check Gmail.
              </>
            ) : (
              <>
                Nothing has been read yet. Press Check Gmail now to look through the last 60 days
                of email for replies to{' '}
                {tracked ? `your ${plural(tracked, 'application', 'applications')}` : 'your applications'}
                . One press does the whole check.
              </>
            )}
          </p>
        )}

        {!busy && state === 'synced' && summary && !failedRun && (
          <p role="status" className="mt-3 text-label text-foreground">
            <ResultLine summary={summary} tracked={tracked} />
          </p>
        )}

        {failedRun && (
          <p role="alert" className="mt-3 text-label text-destructive">
            {failedRun.error || 'The last check did not finish.'} {failureNextStep(failedRun.error_code)}
          </p>
        )}

        {noticeBlock}

        {statusError && (
          <p role="alert" className="mt-3 text-label text-destructive">
            Couldn't refresh your Gmail connection.{' '}
            <button type="button" className="underline" onClick={() => void loadStatus()}>
              Retry
            </button>
          </p>
        )}

        <p className="mt-3 text-label text-muted-foreground">
          {autoSync
            ? `Aspirely also checks by itself about every ${plural(autoSync.interval_hours, 'hour', 'hours')}, so you do not have to press anything. `
            : ''}
          {testing &&
            (expires
              ? `Google will end this connection on ${expires} and you will be asked to reconnect. That is Google's 7 day limit while it reviews Aspirely. `
              : 'Google ends each connection after 7 days while it reviews Aspirely. You will be asked to reconnect then. ')}
          Read only: Aspirely never sends, deletes or changes email.
        </p>

        <details className="mt-2 text-label text-muted-foreground">
          <summary className="cursor-pointer rounded font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            What Aspirely reads, and what it never does
          </summary>
          <GmailPromises testing={testing} />
          <p className="mt-2">
            A status moves by itself only when the email clearly names one of your applications and
            its outcome. Anything less certain waits for your review, and every automatic move can
            be undone.
          </p>
        </details>

        <GmailActivity
          changes={changes}
          busyId={undoBusyId}
          error={undoError}
          onUndo={handleUndo}
          className="mt-4"
        />
      </div>

      {showReviewQueue && (
        <GmailReviewLoadError error={suggestionsError} onRetry={() => void loadSuggestions()} />
      )}
      {showReviewQueue && suggestions.length > 0 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="overline text-primary">Waiting for your review · {suggestions.length}</p>
            <button
              type="button"
              onClick={() => setShowSuggestions((s) => !s)}
              className="text-caption-sm font-medium text-primary hover:underline"
            >
              {showSuggestions ? 'Hide' : 'Show'}
            </button>
          </div>
          {showSuggestions && (
            <GmailSuggestions
              suggestions={suggestions}
              busyId={busyId}
              onApply={handleApply}
              onDismiss={handleDismiss}
              className="rounded-lg border border-border/70 bg-background/60"
            />
          )}
        </div>
      )}
    </section>
  );
}
