import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
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
import { EmployerFilteredEmptyState, EmployerPolicySummary } from '@/components/job-search/EmployerPolicyNotice';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { JOB_FEED_PAGE_SIZE, RECENCY_OPTIONS, inRecencyWindow, matchesSeniorityLevels, sortJobsByMode, isAppliedPipelineStatus, toJob } from '@/lib/careerJobs';
import { excludedBreakdown } from '@/lib/employerPolicy';
import { isHiddenJob } from '@/lib/hiddenJobs';
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
  /** Job ids and `url:` apply-URL keys - see `lib/hiddenJobs.ts`. */
  hiddenJobIds?: Set<string>;
  onHideJob?: (jobId: string, applyLink?: string) => void;
  showApplyOverlay?: boolean;
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
  hiddenJobIds,
  onHideJob,
  showApplyOverlay = true,
}: CombinedJobsPanelProps) {
  const reduceMotion = useReducedMotion();
  // Feed state + view filters live in a provider ABOVE the router outlet, so a
  // running scan (and its 30-min auto-sync) survive navigating between pages.
  const {
    jobs,
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
    policy,
  } = useCombinedJobsCtx();
  // The server removed every row for the user's employer-type choice. Said as
  // such, with the way to change it - never answered by widening on our own.
  const allExcludedByPolicy = jobs.length === 0 && excludedBreakdown(policy).total > 0;
  // A string, so the effects below re-run when the CHOICE changes, not when
  // an equal array is rebuilt.
  const seniorityKey = seniorityLevels.join('|');

  // Kick off the very first scan when the tab opens (idempotent; the provider
  // keeps it running afterwards even if you leave the page).
  useEffect(() => {
    ensureStarted();
  }, [ensureStarted]);

  const maxDays = RECENCY_OPTIONS.find((o) => o.key === recency)?.maxDays ?? 3;

  const visibleJobs = useMemo(() => {
    const isApplied = (j: WorkdayJob) => isAppliedPipelineStatus(getJobStatus(j.job_id, j.apply_link));
    // Undated postings are judged by when we first saw them - see
    // `recencyAgeOf`. Only a row with no age at all is kept unconditionally.
    let out = jobs.filter((j) => inRecencyWindow(j, maxDays));
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((j) => `${j.title} ${j.company}`.toLowerCase().includes(q));
    if (seniorityKey) {
      const levels = seniorityKey.split('|');
      out = out.filter((j) => matchesSeniorityLevels(j, levels));
    }
    if (minScore > 0) out = out.filter((j) => (j.match_score ?? 0) >= minScore);
    if (sponsorFilter === 'friendly') out = out.filter((j) => j.sponsorship !== 'refused');
    else if (sponsorFilter === 'proven') out = out.filter((j) => j.sponsorship === 'likely');
    if (hiddenJobIds?.size) out = out.filter((j) => !isHiddenJob(hiddenJobIds, j));
    if (!showApplied) out = out.filter((j) => !isApplied(j));
    return sortJobsByMode(out, sortBy, { isApplied });
  }, [
    jobs,
    maxDays,
    search,
    seniorityKey,
    minScore,
    sponsorFilter,
    sortBy,
    hiddenJobIds,
    showApplied,
    getJobStatus,
  ]);

  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
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
  }, [recency, search, seniorityKey, minScore, sponsorFilter, showApplied, sortBy, setPage]);

  const pagedJobs = useMemo(
    () => visibleJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleJobs, page],
  );

  const cardMotion = (index: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: {
            duration: 0.34,
            ease: [0.22, 1, 0.36, 1] as const,
            delay: Math.min(index * 0.03, 0.3),
          },
        };

  const renderJob = (job: WorkdayJob, index: number) => (
    <motion.div
      key={job.job_id}
      layout={!reduceMotion}
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
      <JobCard
        job={toJob(job, 'career portal')}
        saved={isJobSaved(job.job_id)}
        jobStatus={getJobStatus(job.job_id, job.apply_link)}
        onSave={() => saveJob(toJob(job, 'career portal'))}
        onUnsave={() => unsaveJob(job.job_id)}
        onQuickApply={(opts) => quickApply(toJob(job, 'career portal'), opts)}
        applyConfirmPending={isApplyConfirmPending?.(job.job_id)}
        applyConfirmModalJobId={showApplyOverlay ? applyConfirmJob?.job_id : undefined}
        onConfirmApplied={confirmApplied ? () => void confirmApplied(job.job_id, job) : undefined}
        onConfirmNotYet={dismissApplyConfirm ? () => dismissApplyConfirm(job.job_id) : undefined}
        onApplyWithTailor={beginApplyWithTailor ? () => beginApplyWithTailor(toJob(job, 'career portal')) : undefined}
        onAlreadyApplied={markAlreadyApplied ? () => markAlreadyApplied(toJob(job, 'career portal')) : undefined}
        onAutoApply={autoApply ? () => autoApply(toJob(job, 'career portal')) : undefined}
        autoApplying={autoApplyingId === job.job_id}
        onHide={onHideJob ? () => onHideJob(job.job_id, job.apply_link) : undefined}
      />
    </motion.div>
  );

  const roleCount = visibleJobs.length;

  return (
    <div className="space-y-5">
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
      </div>
      {loading && (
        <Progress
          value={progress.total ? (progress.done / progress.total) * 100 : 8}
          className="h-1.5"
        />
      )}

      {!loading && !allExcludedByPolicy && <EmployerPolicySummary policy={policy} />}

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
      {visibleJobs.length > 0 && (
        <>
          <motion.div layout={!reduceMotion} className={JOB_FEED_GRID_CLASS}>
            <AnimatePresence initial={false}>
              {pagedJobs.map((j, i) => renderJob(j, i))}
            </AnimatePresence>
          </motion.div>

          {pageCount > 1 && (
            <JobFeedPager page={page} pageCount={pageCount} onPageChange={setPage} />
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && hasResult && allExcludedByPolicy && <EmployerFilteredEmptyState policy={policy} />}
      {!loading && hasResult && visibleJobs.length === 0 && !allExcludedByPolicy && (
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
