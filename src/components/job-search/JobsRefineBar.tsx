import { Sparkles } from 'lucide-react';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { timeZoneName, useViewerTimeZone } from '@/lib/viewerTimezone';
import { PillSwitch } from '@/components/ui/pill-switch';
import { ExperienceCountBreakdown, ExperienceLevelPicker } from '@/components/job-search/ExperienceLevelPicker';

/**
 * For-you listing chrome: experience level, employer types, recency windows + Newest / Best match + open vs
 * applied. Lives under the Jobs section tabs so it stays visible even before
 * the first scan result.
 */
export function JobsRefineBar() {
  const {
    recencyCounts,
    recency,
    setRecency,
    sortBy,
    setSortBy,
    showApplied,
    setShowApplied,
  } = useCombinedJobsCtx();
  const zone = timeZoneName(useViewerTimeZone());

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
        role="toolbar"
        aria-label="Listing recency and sort"
      >
        <ExperienceLevelPicker />
        <PillSwitch
          aria-label="Posting recency"
          value={recency}
          onValueChange={setRecency}
          layoutId="jobs-recency-pill"
          className="shrink-0"
          options={RECENCY_OPTIONS.map((opt) => ({
            value: opt.key,
            title:
              `Days are counted in ${zone} (Settings > Profile). Today and Yesterday are single days; "Last N days" includes today. Counts use your current filters. Roles with no known date remain included.`,
            label: (
              <>
                {opt.label}
                <span className="tabular-nums opacity-60">{recencyCounts[opt.key]}</span>
              </>
            ),
          }))}
        />
        <PillSwitch
          aria-label="Sort jobs"
          value={sortBy}
          onValueChange={setSortBy}
          layoutId="jobs-sort-pill"
          className="shrink-0"
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'score', label: 'Best match' },
          ]}
        />
        <PillSwitch
          aria-label="Applied roles visibility"
          value={showApplied ? 'all' : 'open'}
          onValueChange={(v) => setShowApplied(v === 'all')}
          layoutId="jobs-applied-pill"
          className="shrink-0"
          options={[
            { value: 'open', label: 'Open', title: 'Hide roles you already applied to' },
            {
              value: 'all',
              label: 'Incl. applied',
              title: 'Show applied roles at the bottom of the list',
            },
          ]}
        />
        <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground">
          <Sparkles className="h-3 w-3" aria-hidden />
          <span className="font-mono tabular-nums">{recencyCounts[recency] ?? 0}</span> roles
        </span>
      </div>
      <ExperienceCountBreakdown />
    </div>
  );
}
