import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Bookmark, Briefcase, Send } from 'lucide-react';
import { useJobSearch } from '@/hooks/useJobSearch';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { ApplyConfirmDialog, JOB_FEED_GRID_CLASS, JobCard } from '@/components/job-search/JobCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { appPath } from '@/app-shell/nav.config';
import { loadHiddenJobIds, persistHiddenJobId } from '@/lib/hiddenJobs';
import type { Job, SavedJob } from '@/types/jobs';

interface JobOpportunitiesTabProps {
  /** Mounted inside the /next app shell - the shell already renders the page
  header + SubNav, so suppress the internal hero and keep a slim toolbar. */
  embedded?: boolean;
}

type View = 'browse' | 'saved' | 'applied';

const APPLIED_STATUSES = new Set(['applied', 'interview', 'offer', 'rejected', 'withdrawn']);

function isAppliedSaved(row: SavedJob): boolean {
  return APPLIED_STATUSES.has((row.status || '').toLowerCase());
}

function JobList({
  jobs,
  emptyTitle,
  emptyBody,
  jobSearch,
  onHideJob,
}: {
  jobs: Job[];
  emptyTitle: string;
  emptyBody: string;
  jobSearch: ReturnType<typeof useJobSearch>;
  onHideJob?: (jobId: string) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }
  return (
    <div className={JOB_FEED_GRID_CLASS}>
      {jobs.map((job) => (
        <JobCard
          key={job.job_id}
          job={job}
          saved={jobSearch.isJobSaved(job.job_id)}
          jobStatus={jobSearch.getJobStatus(job.job_id)}
          onSave={() => void jobSearch.saveJob(job)}
          onUnsave={() => void jobSearch.unsaveJob(job.job_id)}
          onQuickApply={() => void jobSearch.quickApply(job)}
          applyConfirmPending={jobSearch.isApplyConfirmPending(job.job_id)}
          onConfirmApplied={() => void jobSearch.confirmApplied(job.job_id)}
          onConfirmNotYet={() => jobSearch.dismissApplyConfirm(job.job_id)}
          onApplyWithTailor={() => void jobSearch.beginApplyWithTailor(job)}
          onAlreadyApplied={() => void jobSearch.markAlreadyApplied(job)}
          onAutoApply={() => void jobSearch.autoApply(job)}
          autoApplying={jobSearch.autoApplyingId === job.job_id}
          onHide={onHideJob ? () => onHideJob(job.job_id) : undefined}
        />
      ))}
    </div>
  );
}

export default function JobOpportunitiesTab({ embedded }: JobOpportunitiesTabProps) {
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const jobSearch = useJobSearch();
  const [view, setView] = useState<View>('browse');
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(loadHiddenJobIds);

  const hideJob = (jobId: string) => {
    setHiddenJobIds(persistHiddenJobId(jobId));
  };

  const savedRows = useMemo(
    () => jobSearch.savedJobs.filter((row) => !isAppliedSaved(row)),
    [jobSearch.savedJobs],
  );
  const appliedRows = useMemo(
    () => jobSearch.savedJobs.filter(isAppliedSaved),
    [jobSearch.savedJobs],
  );

  const SEGMENTS: Array<{ key: View; label: string; icon: typeof Briefcase; count?: number }> = [
    { key: 'browse', label: 'For you', icon: Briefcase },
    { key: 'saved', label: 'Saved', icon: Bookmark, count: savedRows.length },
    { key: 'applied', label: 'Applied', icon: Send, count: appliedRows.length },
  ];

  return (
    <div className="space-y-4">
      {!isEmbedded && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Discover · Jobs
          </p>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Job Opportunities</h2>
        </div>
      )}

      <div className="inline-flex max-w-full flex-wrap rounded-xl border border-border bg-muted/40 p-1">
        {SEGMENTS.map(({ key, label, icon: Icon, count }) => {
          const isActive = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-background text-primary shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
              {count != null && (
                <span className={cn('tabular-nums', isActive ? 'text-primary/80' : 'opacity-60')}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: view === 'browse' ? undefined : 'none' }}>
        <CombinedJobsPanel
          isJobSaved={jobSearch.isJobSaved}
          getJobStatus={jobSearch.getJobStatus}
          saveJob={jobSearch.saveJob}
          unsaveJob={jobSearch.unsaveJob}
          quickApply={jobSearch.quickApply}
          isApplyConfirmPending={jobSearch.isApplyConfirmPending}
          confirmApplied={jobSearch.confirmApplied}
          dismissApplyConfirm={jobSearch.dismissApplyConfirm}
          applyConfirmJob={jobSearch.applyConfirmJob}
          closeApplyConfirmDialog={jobSearch.closeApplyConfirmDialog}
          beginApplyWithTailor={jobSearch.beginApplyWithTailor}
          markAlreadyApplied={jobSearch.markAlreadyApplied}
          autoApply={jobSearch.autoApply}
          autoApplyingId={jobSearch.autoApplyingId}
          hiddenJobIds={hiddenJobIds}
          onHideJob={hideJob}
          showApplyOverlay={view === 'browse'}
        />
      </div>

      {view === 'saved' && (
        <JobList
          jobs={savedRows.map((row) => row.job_data).filter(Boolean)}
          emptyTitle="Nothing saved yet"
          emptyBody="Save a role from For you and it lands here until you apply."
          jobSearch={jobSearch}
          onHideJob={hideJob}
        />
      )}

      {view === 'applied' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Confirmed applications.{' '}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link to={appPath('apply', 'tracker')}>Open Tracker for notes and interviews</Link>
            </Button>
          </p>
          <JobList
            jobs={appliedRows.map((row) => row.job_data).filter(Boolean)}
            emptyTitle="No applications yet"
            emptyBody="Apply from For you, then tap Yes I applied — the role shows here."
            jobSearch={jobSearch}
          />
        </div>
      )}

      <ApplyConfirmDialog
        job={view === 'browse' ? null : jobSearch.applyConfirmJob}
        onApplied={() => {
          if (jobSearch.applyConfirmJob) void jobSearch.confirmApplied(jobSearch.applyConfirmJob.job_id);
        }}
        onNotYet={() => {
          if (jobSearch.applyConfirmJob) jobSearch.dismissApplyConfirm(jobSearch.applyConfirmJob.job_id);
        }}
        onDismiss={() => jobSearch.closeApplyConfirmDialog()}
      />
    </div>
  );
}
