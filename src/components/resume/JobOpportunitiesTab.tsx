import { useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { useJobSearch } from '@/hooks/useJobSearch';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { ApplyConfirmDialog, JOB_FEED_GRID_CLASS, JobCard } from '@/components/job-search/JobCard';
import { Button } from '@/components/ui/button';
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

function viewFromPath(pathname: string): View {
  const leaf = pathname.split('/').filter(Boolean).pop();
  if (leaf === 'saved') return 'saved';
  if (leaf === 'applied') return 'applied';
  return 'browse';
}

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
  const { pathname } = useLocation();
  const view = viewFromPath(pathname);
  const jobSearch = useJobSearch();
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
