import { Suspense, lazy, useState } from 'react';
import { Building2, Globe, Landmark, Loader2 } from 'lucide-react';
import { WorkdayJobsPanel } from '@/components/job-search/WorkdayJobsPanel';
import { ApplyConfirmDialog } from '@/components/job-search/JobCard';
import { PillSwitch } from '@/components/ui/pill-switch';
import { useJobSearch } from '@/hooks/useJobSearch';
import { isTechFeedEnabled } from '@/lib/techFeedFlag';
import type { CareerPortalVariant } from '@/types/jobs';

// Lazy on purpose: the flag ships OFF, so the unified feed must not weigh down
// the chunk that the legacy three-tab path loads.
const TechFeedPanel = lazy(() =>
  import('@/components/job-search/tech-feed/TechFeedPanel').then((m) => ({
    default: m.TechFeedPanel,
  })),
);

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
  // Read once at mount: the flag must not flip mid-session and swap the whole
  // surface out from under an in-flight scan. Clearing the localStorage
  // override (or VITE_TECH_FEED) and reloading is the rollback.
  const [techFeed] = useState(isTechFeedEnabled);
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
    beginApplyWithTailor, markAlreadyApplied,
    autoApply, autoApplyingId,
  } = useJobSearch();

  const select = (key: CareerPortalVariant) => {
    setActive(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set([...prev, key])));
  };

  // Flag ON: one unified indexed feed instead of three fan-out catalogs. The
  // legacy path below is untouched and is exactly what renders when it is OFF.
  // (The hooks above stay unconditional - this branch is after all of them.)
  if (techFeed) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="ml-2 text-sm">Loading the job feed...</span>
          </div>
        }
      >
        <TechFeedPanel />
      </Suspense>
    );
  }

  return (
    <div className="space-y-4">
      <PillSwitch
        aria-label="Career portal catalog"
        layoutId="career-portals-catalog-pill"
        size="md"
        className="max-w-full"
        value={active}
        onValueChange={select}
        options={SEGMENTS.map(({ key, label, icon: Icon }) => ({
          value: key,
          label: (
            <>
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </>
          ),
        }))}
      />

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
              applyConfirmJobId={applyConfirmJob?.job_id}
              beginApplyWithTailor={beginApplyWithTailor}
              markAlreadyApplied={markAlreadyApplied}
              autoApply={autoApply}
              autoApplyingId={autoApplyingId}
            />
          </div>
        ) : null,
      )}
      <ApplyConfirmDialog
        job={applyConfirmJob}
        onApplied={() => {
          if (applyConfirmJob) {
            void confirmApplied(applyConfirmJob.job_id, applyConfirmJob);
          }
        }}
        onNotYet={() => {
          if (applyConfirmJob) dismissApplyConfirm(applyConfirmJob.job_id);
        }}
        onDismiss={closeApplyConfirmDialog}
      />
    </div>
  );
}
