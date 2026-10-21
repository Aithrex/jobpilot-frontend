import { useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { useJobSearch } from '@/hooks/useJobSearch';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { ApplyConfirmDialog, JOB_FEED_GRID_CLASS, JobCard } from '@/components/job-search/JobCard';
import { Button } from '@/components/ui/button';
import { appPath } from '@/app-shell/nav.config';
import { loadHiddenJobIds, persistHiddenJobId } from '@/lib/hiddenJobs';
import type { Job } from '@/types/jobs';
import { Skeleton } from '@/components/ui/skeleton';
import { isAppliedSavedJob } from '@/lib/savedJobs';

interface JobOpportunitiesTabProps {
  /** Mounted inside the /next app shell - the shell already renders the page
  header + SubNav, so suppress the internal hero and keep a slim toolbar. */
  embedded?: boolean;
}

type View = 'browse' | 'saved' | 'applied';

function viewFromPath(pathname: string): View {
  const leaf = pathname.split('/').filter(Boolean).pop();
  if (leaf === 'saved') return 'saved';
  if (leaf === 'applied') return 'applied';
  return 'browse';
}

function JobList({
  jobs,
  emptyTitle,
  emptyBody,
  jobSearch,
  onHideJob,
  loading,
}: {
  jobs: Job[];
  emptyTitle: string;
  emptyBody: string;
  jobSearch: ReturnType<typeof useJobSearch>;
  onHideJob?: (jobId: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={JOB_FEED_GRID_CLASS} aria-busy="true" aria-label="Loading jobs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5 rounded-xl border border-border p-3.5">
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
    );
  }
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
          jobStatus={jobSearch.getJobStatus(job.job_id, job.apply_link)}
          onSave={() => jobSearch.saveJob(job)}
          onUnsave={() => jobSearch.unsaveJob(job.job_id)}
          onQuickApply={(opts) => void jobSearch.quickApply(job, opts)}
          applyConfirmPending={jobSearch.isApplyConfirmPending(job.job_id)}
          applyConfirmModalJobId={jobSearch.applyConfirmJob?.job_id}
          onConfirmApplied={() => void jobSearch.confirmApplied(job.job_id, job)}
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
  const { pathname } = useLocation();
  const view = viewFromPath(pathname);
  const jobSearch = useJobSearch();
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(loadHiddenJobIds);

  const hideJob = (jobId: string) => {
    setHiddenJobIds(persistHiddenJobId(jobId));
  };

  const savedRows = useMemo(
    () => jobSearch.savedJobs.filter((row) => !isAppliedSavedJob(row)),
    [jobSearch.savedJobs],
  );
  const appliedRows = useMemo(
    () => jobSearch.savedJobs.filter(isAppliedSavedJob),
    [jobSearch.savedJobs],
  );

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
          emptyBody="Save a role from For you. After you apply, it moves to Applied so it doesn't sit in both lists."
          jobSearch={jobSearch}
          onHideJob={hideJob}
          loading={jobSearch.savedJobsLoading}
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
            emptyBody="Apply from For you, then confirm you submitted. Those roles live here, not under Saved."
            jobSearch={jobSearch}
            loading={jobSearch.savedJobsLoading}
          />
        </div>
      )}

      <ApplyConfirmDialog
        job={view === 'browse' ? null : jobSearch.applyConfirmJob}
        onApplied={() => {
          if (jobSearch.applyConfirmJob) {
            void jobSearch.confirmApplied(
              jobSearch.applyConfirmJob.job_id,
              jobSearch.applyConfirmJob,
            );
          }
        }}
        onNotYet={() => {
          if (jobSearch.applyConfirmJob) jobSearch.dismissApplyConfirm(jobSearch.applyConfirmJob.job_id);
        }}
        onDismiss={() => jobSearch.closeApplyConfirmDialog()}
      />
    </div>
  );
}
