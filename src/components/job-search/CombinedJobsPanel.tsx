import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  FileText,
  Loader2,
  Radar,
  Rocket,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplyConfirmDialog, JOB_FEED_GRID_CLASS, JobCard, JOB_CARD_CLASS } from '@/components/job-search/JobCard';
import { JobFeedPager } from '@/components/job-search/JobFeedPager';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { useJobTitles } from '@/hooks/useJobTitles';
import { timeZoneName, useViewerTimeZone } from '@/lib/viewerTimezone';
import { JOB_FEED_PAGE_SIZE, RECENCY_OPTIONS, toJob } from '@/lib/careerJobs';
import { isHiddenJob } from '@/lib/hiddenJobs';
import { clearImpression, recordFirstPageImpressions } from '@/lib/boardImpressions';
import { JobQuickLook } from '@/components/job-search/JobQuickLook';
import { COMPARE_MAX, CompareTray } from '@/components/job-search/CompareTray';
import { ShortcutsButton, SwipeableCard, useCoarsePointer } from '@/components/job-search/BoardTriage';
import { cn } from '@/lib/utils';
import type { Job, WorkdayJob } from '@/types/jobs';

// ONE page size, shared with `diversifyByBoard`. When these two disagreed the
// board cap was applied on a different boundary than the one rendered, and a
// cap of 3 showed 6 cards from one employer. Do not re-declare it locally.
const PAGE_SIZE = JOB_FEED_PAGE_SIZE;

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, '0')}`;
}

interface CombinedJobsPanelProps {
  isJobSaved: (jobId: string) => boolean;
  getJobStatus: (jobId: string, applyLink?: string) => string | null;
  saveJob: (job: Job) => void | Promise<unknown>;
  unsaveJob: (jobId: string) => void | Promise<unknown>;
  quickApply: (job: Job, opts?: { skipOpen?: boolean }) => void | Promise<unknown>;
  isApplyConfirmPending?: (jobId: string) => boolean;
  confirmApplied?: (jobId: string) => void | Promise<unknown>;
  dismissApplyConfirm?: (jobId: string) => void;
  applyConfirmJob?: Job | null;
  closeApplyConfirmDialog?: () => void;
  beginApplyWithTailor?: (job: Job) => void | Promise<unknown>;
  markAlreadyApplied?: (job: Job) => void | Promise<unknown>;
  autoApply?: (job: Job) => void | Promise<unknown>;
  autoApplyingId?: string | null;
  onHideJob?: (jobId: string, applyLink?: string) => void;
  showApplyOverlay?: boolean;
}

const SOURCE_LABEL = { workday: 'Workday', careers: 'company career pages', mncs: 'large employers' } as const;

/** The card element for a job id (`data-job-card`). */
function cardEl(id: string): HTMLElement | null {
  const safe = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
  return document.querySelector<HTMLElement>(`[data-job-card="${safe}"]`);
}

export function CombinedJobsPanel({
  isJobSaved,
  getJobStatus,
  saveJob,
  unsaveJob,
  quickApply,
  isApplyConfirmPending,
  confirmApplied,
  dismissApplyConfirm,
  applyConfirmJob,
  closeApplyConfirmDialog,
  beginApplyWithTailor,
  markAlreadyApplied,
  autoApply,
  autoApplyingId,
  onHideJob,
  showApplyOverlay = true,
}: CombinedJobsPanelProps) {
  const reduceMotion = useReducedMotion();
  // Feed state + view filters live in a provider ABOVE the router outlet, so a
  // running scan (and its 30-min auto-sync) survive navigating between pages.
  const {
    jobs,
    visibleJobs,
    loading,
    progress,
    ready,
    resumeSkillCount,
    hasResult,
    canSearch,
    titlesPending,
    lastSyncedAt,
    secondsUntilNext,
    sync,
    ensureStarted,
    setCustomizeOpen,
    search,
    recency,
    setRecency,
    seniorityLevels,
    minScore,
    sponsorFilter,
    showApplied,
    sortBy,
    page,
    setPage,
    states,
    showWeaker,
    setShowWeaker,
    weakerMatchCount,
    isNewJob,
    newOnly,
    unhideJob,
    companies,
    collapseReposts,
    setCollapseReposts,
    repostsFolded,
  } = useCombinedJobsCtx();
  const coarse = useCoarsePointer();
  const rootRef = useRef<HTMLDivElement>(null);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** Marked applied from the keyboard and waiting out its Undo window. */
  const [pendingApplied, setPendingApplied] = useState<Set<string>>(new Set());
  // The store, read without starting hydration - the provider owns that.
  const { reviewTitles, resolveReview } = useJobTitles(false);
  const viewerZone = useViewerTimeZone();
  // A source whose scan failed is SAID, never silently dropped: on 2026-10-22
  // two of the three lists failed to download and the page quietly showed the
  // third, which read as "the jobs got worse".
  const failedSources = (['workday', 'careers', 'mncs'] as const).filter(
    (key) => !!states?.[key] && !states[key].loading && !!states[key].error,
  );
  // A string, so the effects below re-run when the CHOICE changes, not when
  // an equal array is rebuilt.
  const seniorityKey = seniorityLevels.join('|');

  // Kick off the very first scan when the tab opens (idempotent; the provider
  // keeps it running afterwards even if you leave the page).
  useEffect(() => {
    ensureStarted();
  }, [ensureStarted]);

  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  const maxDays = RECENCY_OPTIONS.find((option) => option.key === recency)!.maxDays;
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount, setPage]);
  // Reset to page 1 only when filters change — not on remount (returning from
  // Tailor must keep the page where the opened job lived).
  const filterResetReady = useRef(false);
  useEffect(() => {
    if (!filterResetReady.current) {
      filterResetReady.current = true;
      return;
    }
    setPage(1);
  }, [recency, search, seniorityKey, minScore, sponsorFilter, showApplied, sortBy, showWeaker,
    newOnly, companies, collapseReposts, setPage]);

  // Cards marked applied from the keyboard leave the list at once; the write
  // happens when their Undo window closes.
  const listJobs = useMemo(
    () => (pendingApplied.size ? visibleJobs.filter((j) => !pendingApplied.has(j.job_id)) : visibleJobs),
    [visibleJobs, pendingApplied],
  );
  const pagedJobs = useMemo(
    () => listJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [listJobs, page],
  );
  const byId = useMemo(() => new Map(jobs.map((j) => [j.job_id, j])), [jobs]);
  // How many reposts fold under each card, so the card can say so.
  const repostCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!collapseReposts) return counts;
    for (const j of jobs) {
      if (j.possible_duplicate_of) counts.set(j.possible_duplicate_of, (counts.get(j.possible_duplicate_of) ?? 0) + 1);
    }
    return counts;
  }, [jobs, collapseReposts]);

  // Once per visit, count the cards on the first page the user is shown.
  // A card seen on several visits with no action moves down its band next
  // time (`lib/boardImpressions`). Cards already acted on are cleared instead.
  useEffect(() => {
    if (!hasResult || page !== 1 || !pagedJobs.length) return;
    const linkOf = new Map(pagedJobs.map((j) => [j.job_id, j.apply_link]));
    recordFirstPageImpressions(pagedJobs.map((j) => j.job_id), {
      acted: (id) => !!getJobStatus(id, linkOf.get(id)),
    });
  }, [hasResult, page, pagedJobs, getJobStatus]);

  /** Any action on a card means it was not passed over. */
  const acted = <T,>(job: WorkdayJob, fn: () => T): T => {
    clearImpression(job.job_id);
    return fn();
  };

  // One entrance per board: the first time results appear, the first cards
  // rise in with a short stagger. After that (filters, pages, a re-sync) cards
  // only cross-fade - a filter change is not an event worth choreographing.
  const revealed = useRef(false);
  const firstReveal = !revealed.current && pagedJobs.length > 0;
  useEffect(() => {
    if (pagedJobs.length > 0) revealed.current = true;
  }, [pagedJobs.length]);
  const cardMotion = (index: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
      : {
          initial: firstReveal ? { opacity: 0, y: 12, scale: 0.98 } : { opacity: 0 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: 'easeOut' as const } },
          transition: {
            duration: firstReveal ? 0.3 : 0.16,
            ease: [0.23, 1, 0.32, 1] as const,
            delay: firstReveal ? Math.min(index, 6) * 0.045 : 0,
          },
        };

  // -- Triage: quick look, keyboard, swipe, compare --
  const listIndexOf = useCallback((id: string | null) =>
    (id ? listJobs.findIndex((j) => j.job_id === id) : -1), [listJobs]);
  const quickIndex = listIndexOf(quickId);
  const quickJob = quickIndex >= 0 ? listJobs[quickIndex] : null;

  /** Move the cursor (and an open quick look) to list position `i`. */
  const moveTo = useCallback((i: number) => {
    const next = listJobs[Math.max(0, Math.min(listJobs.length - 1, i))];
    if (!next) return;
    const nextPage = Math.floor(listJobs.indexOf(next) / PAGE_SIZE) + 1;
    if (nextPage !== page) setPage(nextPage);
    setCursorId(next.job_id);
    if (quickId) setQuickId(next.job_id);
    window.requestAnimationFrame(() => {
      const el = cardEl(next.job_id);
      el?.scrollIntoView({ block: 'nearest' });
      if (!quickId) el?.focus({ preventScroll: true });
    });
  }, [listJobs, page, setPage, quickId]);

  const saveWithUndo = useCallback((job: WorkdayJob) => {
    clearImpression(job.job_id);
    if (isJobSaved(job.job_id)) {
      void unsaveJob(job.job_id);
      toast('Removed from saved', {
        action: { label: 'Undo', onClick: () => void saveJob(toJob(job, 'career portal')) },
      });
      return;
    }
    void saveJob(toJob(job, 'career portal'));
    toast.success('Saved', {
      description: `${job.title} at ${job.company}`,
      action: { label: 'Undo', onClick: () => void unsaveJob(job.job_id) },
    });
  }, [isJobSaved, saveJob, unsaveJob]);

  const hideWithUndo = useCallback((job: WorkdayJob) => {
    if (!onHideJob) return;
    clearImpression(job.job_id);
    const i = listIndexOf(job.job_id);
    const after = listJobs[i + 1] ?? listJobs[i - 1];
    onHideJob(job.job_id, job.apply_link);
    if (quickId === job.job_id) setQuickId(after?.job_id ?? null);
    if (cursorId === job.job_id) setCursorId(after?.job_id ?? null);
    toast('Hidden from For you', {
      description: `${job.title} at ${job.company}`,
      action: { label: 'Undo', onClick: () => unhideJob(job.job_id, job.apply_link) },
    });
  }, [onHideJob, listIndexOf, listJobs, quickId, cursorId, unhideJob]);

  const appliedWithUndo = useCallback((job: WorkdayJob) => {
    if (!markAlreadyApplied) return;
    clearImpression(job.job_id);
    const i = listIndexOf(job.job_id);
    const after = listJobs[i + 1] ?? listJobs[i - 1];
    let undone = false;
    let committed = false;
    const release = () => setPendingApplied((prev) => {
      const next = new Set(prev);
      next.delete(job.job_id);
      return next;
    });
    const commit = () => {
      if (undone || committed) return;
      committed = true;
      void Promise.resolve(markAlreadyApplied(toJob(job, 'career portal'))).finally(release);
    };
    setPendingApplied((prev) => new Set(prev).add(job.job_id));
    if (quickId === job.job_id) setQuickId(after?.job_id ?? null);
    if (cursorId === job.job_id) setCursorId(after?.job_id ?? null);
    toast('Marking as applied', {
      description: `${job.title} at ${job.company}. It moves to Applied in 5 seconds.`,
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
          release();
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    });
  }, [markAlreadyApplied, listIndexOf, listJobs, quickId, cursorId]);

  const toggleCompare = useCallback((job: WorkdayJob) => {
    setCompareIds((prev) => {
      if (prev.includes(job.job_id)) return prev.filter((id) => id !== job.job_id);
      if (prev.length >= COMPARE_MAX) {
        toast(`Compare holds ${COMPARE_MAX} jobs`, { description: 'Remove one from the tray first.' });
        return prev;
      }
      return [...prev, job.job_id];
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      // Only while For you is on screen (the panel stays mounted under Saved/Applied).
      if (!rootRef.current || rootRef.current.offsetParent === null) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return;
      // Another dialog (apply choice, compare, AI tools) owns the keyboard.
      if (document.querySelector('[role="alertdialog"], [role="dialog"]:not([data-testid="job-quick-look"])')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const target = quickJob ?? (cursorId ? listJobs[listIndexOf(cursorId)] : undefined);
      const at = quickId ? quickIndex : listIndexOf(cursorId);
      switch (key) {
        case 'j':
          e.preventDefault();
          moveTo(at < 0 ? (page - 1) * PAGE_SIZE : at + 1);
          break;
        case 'k':
          e.preventDefault();
          moveTo(at < 0 ? (page - 1) * PAGE_SIZE : at - 1);
          break;
        case 'o':
          if (target) {
            e.preventDefault();
            setQuickId(target.job_id);
          }
          break;
        case 's':
          if (target) { e.preventDefault(); saveWithUndo(target); }
          break;
        case 'x':
          if (target) { e.preventDefault(); hideWithUndo(target); }
          break;
        case 'a':
          if (target) { e.preventDefault(); appliedWithUndo(target); }
          break;
        case 'c':
          if (target) { e.preventDefault(); toggleCompare(target); }
          break;
        case '?':
          e.preventDefault();
          setShortcutsOpen((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickJob, quickId, quickIndex, cursorId, listJobs, listIndexOf, moveTo, page, saveWithUndo,
    hideWithUndo, appliedWithUndo, toggleCompare]);

  const compareJobs = useMemo(
    () => compareIds.map((id) => byId.get(id)).filter(Boolean).map((j) => toJob(j as WorkdayJob, 'career portal')),
    [compareIds, byId],
  );

  const renderJob = (job: WorkdayJob, index: number) => (
    <motion.div
      key={job.job_id}
      layout={reduceMotion ? false : 'position'}
      {...cardMotion(index)}
      className="flex h-full flex-col gap-1.5"
    >
      {job.sponsorship === 'refused' && (
        <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-destructive">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            This posting states it won't sponsor a visa
            {job.sponsor_note ? `: ${job.sponsor_note}` : '.'}
          </span>
        </p>
      )}
      <SwipeableCard
        enabled={coarse}
        onSwipeRight={() => saveWithUndo(job)}
        onSwipeLeft={() => hideWithUndo(job)}
      >
      <JobCard
        job={toJob(job, 'career portal')}
        saved={isJobSaved(job.job_id)}
        jobStatus={getJobStatus(job.job_id, job.apply_link)}
        isNew={isNewJob(job)}
        onOpen={() => {
          setCursorId(job.job_id);
          setQuickId(job.job_id);
        }}
        isCursor={cursorId === job.job_id}
        compareSelected={compareIds.includes(job.job_id)}
        onToggleCompare={() => toggleCompare(job)}
        repostCount={repostCounts.get(job.job_id) ?? 0}
        onSave={() => acted(job, () => saveJob(toJob(job, 'career portal')))}
        onUnsave={() => unsaveJob(job.job_id)}
        onQuickApply={(opts) => acted(job, () => quickApply(toJob(job, 'career portal'), opts))}
        applyConfirmPending={isApplyConfirmPending?.(job.job_id)}
        applyConfirmModalJobId={showApplyOverlay ? applyConfirmJob?.job_id : undefined}
        onConfirmApplied={confirmApplied ? () => void confirmApplied(job.job_id, job) : undefined}
        onConfirmNotYet={dismissApplyConfirm ? () => dismissApplyConfirm(job.job_id) : undefined}
        onApplyWithTailor={beginApplyWithTailor
          ? () => acted(job, () => beginApplyWithTailor(toJob(job, 'career portal')))
          : undefined}
        onAlreadyApplied={markAlreadyApplied
          ? () => acted(job, () => markAlreadyApplied(toJob(job, 'career portal')))
          : undefined}
        onAutoApply={autoApply ? () => acted(job, () => autoApply(toJob(job, 'career portal'))) : undefined}
        autoApplying={autoApplyingId === job.job_id}
        onHide={onHideJob ? () => hideWithUndo(job) : undefined}
      />
      </SwipeableCard>
    </motion.div>
  );

  const roleCount = listJobs.length;

  return (
    <div className="space-y-5" ref={rootRef}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground" aria-live="polite">
          {loading ? (
            progress.total > 0 ? (
              `Scanning ${progress.done} of ${progress.total} companies · ${roleCount} roles so far`
            ) : (
              'Starting scan across all sources...'
            )
          ) : lastSyncedAt ? (
            <>
              Updated {formatAgo(lastSyncedAt)} · {roleCount} roles
              <span className="ml-1" data-testid="jobs-timezone">
                · days in {timeZoneName(viewerZone, 'short')}
              </span>
              {secondsUntilNext != null && (
                <span className="ml-1 font-mono tabular-nums text-primary">
                  · next sync {formatCountdown(secondsUntilNext)}
                </span>
              )}
            </>
          ) : null}
          {titlesPending && (
            <span className="ml-1.5 font-medium text-warning">Title changes need Search.</span>
          )}
        </p>
        {loading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        )}
        {hasResult && <ShortcutsButton open={shortcutsOpen} onOpenChange={setShortcutsOpen} />}
      </div>
      {pageCount > 1 && (
        <p className="text-xs tabular-nums text-muted-foreground">
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, roleCount)} of {roleCount} matching roles
        </p>
      )}
      {weakerMatchCount > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="jobs-weaker-matches">
          {showWeaker
            ? `Showing ${weakerMatchCount} weaker ${weakerMatchCount === 1 ? 'match' : 'matches'}.`
            : `${weakerMatchCount} weaker ${weakerMatchCount === 1 ? 'match' : 'matches'} hidden.`}{' '}
          <button
            type="button"
            className="font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={showWeaker}
            onClick={() => setShowWeaker(!showWeaker)}
          >
            {showWeaker ? 'Hide them' : 'Show them'}
          </button>
        </p>
      )}
      {(repostsFolded > 0 || !collapseReposts) && hasResult && (
        <p className="text-xs text-muted-foreground" data-testid="jobs-reposts-folded">
          {collapseReposts
            ? `${repostsFolded} likely ${repostsFolded === 1 ? 'repost' : 'reposts'} (same company, title and city) folded under the first copy.`
            : 'Showing every copy of reposted roles.'}{' '}
          <button
            type="button"
            className="font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={!collapseReposts}
            onClick={() => setCollapseReposts(!collapseReposts)}
          >
            {collapseReposts ? 'Show them' : 'Fold them'}
          </button>
        </p>
      )}
      {loading && (
        <Progress
          value={progress.total ? (progress.done / progress.total) * 100 : 8}
          className="h-1.5"
        />
      )}

      {reviewTitles.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-foreground/85"
          role="status"
          data-testid="jobs-title-review"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            {reviewTitles.length === 1 ? 'This job title is' : 'These job titles are'} not from your
            current resume: <span className="font-medium text-foreground">{reviewTitles.join(', ')}</span>.
            {' '}They still shape your matches.
          </span>
          <Button type="button" size="sm" className="h-7 text-xs" onClick={() => resolveReview(true)}>
            Use resume titles
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveReview(false)}>
            Keep my titles
          </Button>
        </div>
      )}

      {!loading && failedSources.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground/85"
          role="status"
          data-testid="jobs-source-failed"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            Some jobs could not load ({failedSources.map((k) => SOURCE_LABEL[k]).join(', ')}). Showing
            the rest.
          </span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => sync(false)}>
            Try again
          </Button>
        </div>
      )}

      {resumeSkillCount === 0 && hasResult && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground/85">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            No parsed resume on this account, so match scores are unavailable. Upload your resume in
            the Tailor tab, then sync again.
          </span>
        </div>
      )}

      {/* ── Loading skeleton (nothing merged yet) ── */}
      {loading && jobs.length === 0 && (
        <div className={JOB_FEED_GRID_CLASS} aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn('space-y-2.5 p-3.5', JOB_CARD_CLASS)}>
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {listJobs.length > 0 && (
        <>
          <div className={JOB_FEED_GRID_CLASS}>
            <AnimatePresence initial={false} mode="popLayout">
              {pagedJobs.map((j, i) => renderJob(j, i))}
            </AnimatePresence>
          </div>

          {pageCount > 1 && (
            <JobFeedPager page={page} pageCount={pageCount} onPageChange={setPage} />
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && hasResult && listJobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          <Radar className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden />
          <p>No roles match these filters in this window.</p>
          {maxDays < 30 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setRecency('30d')}>
              Widen to 30 days
            </Button>
          )}
        </div>
      )}

      {/* ── First-load invitation ── */}
      {!hasResult && !loading && (
        <div className="mesh-accent rounded-2xl border border-dashed border-primary/30 py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Radar className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">Your job feed is ready to set up</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Open Job feed on the right to add titles, location, then Search. Listings stay on this page.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg border-border/80 bg-background/80 font-semibold hover:border-primary/40 hover:bg-primary/10 hover:text-primary [&_svg]:h-3.5 [&_svg]:w-3.5"
              onClick={() => setCustomizeOpen(true)}
            >
              <Radar className="h-3.5 w-3.5" aria-hidden /> Open Job feed
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => sync(false)}
              disabled={!ready || !canSearch}
            >
              <Rocket className="h-3.5 w-3.5" aria-hidden /> Load my feed
            </Button>
          </div>
          {ready && !canSearch && (
            <p className="mx-auto mt-3 flex max-w-md items-center justify-center gap-1.5 px-4 text-[11px] font-medium text-warning">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Add at least one role title or upload a resume to build your job feed.
            </p>
          )}
        </div>
      )}
      <JobQuickLook
        job={quickJob ? toJob(quickJob, 'career portal') : null}
        onClose={() => {
          const id = quickId;
          setQuickId(null);
          // Back to the card the panel was showing, so the list keeps its place.
          window.requestAnimationFrame(() => {
            if (id) cardEl(id)?.focus({ preventScroll: true });
          });
        }}
        index={Math.max(0, quickIndex)}
        total={listJobs.length}
        onPrev={quickIndex > 0 ? () => moveTo(quickIndex - 1) : undefined}
        onNext={quickIndex >= 0 && quickIndex < listJobs.length - 1 ? () => moveTo(quickIndex + 1) : undefined}
        saved={quickJob ? isJobSaved(quickJob.job_id) : false}
        onSave={() => { if (quickJob) saveWithUndo(quickJob); }}
        onUnsave={() => { if (quickJob) saveWithUndo(quickJob); }}
        onApply={() => {
          if (!quickJob) return;
          clearImpression(quickJob.job_id);
          void quickApply(toJob(quickJob, 'career portal'));
        }}
        onHide={onHideJob ? () => { if (quickJob) hideWithUndo(quickJob); } : undefined}
      />
      <CompareTray
        jobs={compareJobs}
        onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
      />
      {showApplyOverlay && (
        <ApplyConfirmDialog
          job={applyConfirmJob ?? null}
          onApplied={() => {
            if (applyConfirmJob && confirmApplied) {
              void confirmApplied(applyConfirmJob.job_id, applyConfirmJob);
            }
          }}
          onNotYet={() => {
            if (applyConfirmJob && dismissApplyConfirm) dismissApplyConfirm(applyConfirmJob.job_id);
          }}
          onDismiss={() => closeApplyConfirmDialog?.()}
        />
      )}
    </div>
  );
}
