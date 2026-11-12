import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { timeZoneName, useViewerTimeZone } from '@/lib/viewerTimezone';
import { PillSwitch } from '@/components/ui/pill-switch';
import { cn } from '@/lib/utils';
import { ExperienceCountBreakdown, ExperienceLevelPicker } from '@/components/job-search/ExperienceLevelPicker';
import { CompanyFilter } from '@/components/job-search/CompanyFilter';

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
    seenThrough,
    newCount,
    newOnly,
    setNewOnly,
  } = useCombinedJobsCtx();
  // Only when the server told us when the last visit ended; while filtering,
  // kept visible so the filter can always be turned off.
  const showNewChip = !!seenThrough && (newCount > 0 || newOnly);
  const zone = timeZoneName(useViewerTimeZone());

  return (
    <div className="space-y-2">
      {/* When it was posted is the first question, so it leads; who and how
          to order sit together on the right. The old trailing "N roles" pill
          looked like a button and repeated the count shown just below. */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Listing recency and sort"
      >
        {/* Only the recency pills scroll sideways on a phone; every other
            control wraps onto the next line so none is hidden off-screen. */}
        <div className="min-w-0 max-w-full overflow-x-auto scrollbar-hide">
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
                  <span className="tabular-nums font-normal">{recencyCounts[opt.key]}</span>
                </>
              ),
            }))}
          />
        </div>
        {showNewChip && (
          <button
            type="button"
            aria-pressed={newOnly}
            onClick={() => setNewOnly(!newOnly)}
            title="Roles first seen since your last visit"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              newOnly
                ? 'border-info bg-info text-info-foreground'
                : 'border-info/30 bg-info/10 text-info hover:bg-info/15',
            )}
          >
            New <span className="tabular-nums">({newCount})</span>
          </button>
        )}
        <span className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />
        <ExperienceLevelPicker />
        <CompanyFilter className="h-9" />
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <PillSwitch
            aria-label="Sort jobs"
            value={sortBy}
            onValueChange={setSortBy}
            layoutId="jobs-sort-pill"
            className="shrink-0"
            options={[
              { value: 'score', label: 'Best match' },
              { value: 'newest', label: 'Newest' },
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
        </div>
      </div>
      <ExperienceCountBreakdown />
    </div>
  );
}
