import { useState } from 'react';
import { Building2, Globe, Landmark } from 'lucide-react';
import { WorkdayJobsPanel } from '@/components/job-search/WorkdayJobsPanel';
import { ApplyConfirmDialog } from '@/components/job-search/JobCard';
import { useJobSearch } from '@/hooks/useJobSearch';
import { cn } from '@/lib/utils';
import type { CareerPortalVariant } from '@/types/jobs';

const SEGMENTS: Array<{
  key: CareerPortalVariant;
  label: string;
  icon: typeof Building2;
}> = [
  { key: 'workday', label: 'Enterprise (Workday)', icon: Building2 },
  { key: 'careers', label: 'Startups & scale-ups (career pages)', icon: Globe },
  { key: 'mncs', label: 'MNCs · Big Tech', icon: Landmark },
];

/**
 * Career portals - one workspace tab, three catalogs behind the same engine:
 * the Workday enterprise universe, the non-Workday ATS universe
 * (Greenhouse / Lever / Ashby / ...) and a curated FAANG+ / Fortune-500 MNC
 * universe grouped by sector. Panels stay mounted once visited so switching
 * preserves results and in-flight scans.
 */
export default function CareerPortalsTab() {
  const [active, setActive] = useState<CareerPortalVariant>('workday');
  const [visited, setVisited] = useState<Set<CareerPortalVariant>>(
    () => new Set<CareerPortalVariant>(['workday']),
  );
  // One saved-jobs store for both variants - save/apply state stays in sync
  // when the same posting shows up in either catalog.
  const {
    isJobSaved, getJobStatus, saveJob, unsaveJob, quickApply,
    isApplyConfirmPending, confirmApplied, dismissApplyConfirm,
    applyConfirmJob, closeApplyConfirmDialog,
    autoApply, autoApplyingId,
  } = useJobSearch();

  const select = (key: CareerPortalVariant) => {
    setActive(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set([...prev, key])));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Discover · Career portals
        </p>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Career portals</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Search live openings straight from company career portals: Workday enterprises,
          Greenhouse, Lever, Ashby and more, plus curated FAANG+ / Fortune-500 MNC boards.
        </p>
      </div>

      {/* Variant segmented control */}
      <div className="inline-flex max-w-full flex-wrap rounded-xl border border-border bg-muted/40 p-1">
        {SEGMENTS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => select(key)}
              aria-pressed={isActive}
              aria-controls={`career-portals-panel-${key}`}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-background text-primary shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* Panels - kept mounted once visited; the inactive one hides via CSS so
          switching preserves results and lets an in-flight scan finish. */}
      {SEGMENTS.map(({ key }) =>
        visited.has(key) ? (
          <div
            key={key}
            id={`career-portals-panel-${key}`}
            aria-hidden={active !== key}
            style={{ display: active === key ? undefined : 'none' }}
          >
            <WorkdayJobsPanel
              variant={key}
              active={active === key}
              isJobSaved={isJobSaved}
              getJobStatus={getJobStatus}
              saveJob={saveJob}
              unsaveJob={unsaveJob}
              quickApply={quickApply}
              isApplyConfirmPending={isApplyConfirmPending}
              confirmApplied={confirmApplied}
              dismissApplyConfirm={dismissApplyConfirm}
              autoApply={autoApply}
              autoApplyingId={autoApplyingId}
            />
          </div>
        ) : null,
      )}
      <ApplyConfirmDialog
        job={applyConfirmJob}
        onApplied={() => {
          if (applyConfirmJob) void confirmApplied(applyConfirmJob.job_id);
        }}
        onNotYet={() => {
          if (applyConfirmJob) dismissApplyConfirm(applyConfirmJob.job_id);
        }}
        onDismiss={closeApplyConfirmDialog}
      />
    </div>
  );
}
