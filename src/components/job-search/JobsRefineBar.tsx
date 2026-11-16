import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { timeZoneName, useViewerTimeZone } from '@/lib/viewerTimezone';
import { PillSwitch } from '@/components/ui/pill-switch';
import { cn } from '@/lib/utils';
import { JobSearchBar } from '@/components/job-search/JobSearchBar';

/**
 * For-you chrome under the Jobs tabs: the search bar (what and who), then one
 * row for when it was posted and how the list is ordered. Stays visible before
 * the first result, so the controls are there to fix an empty board.
 *
 * What the list leaves out (weaker matches, repeat postings, roles already
 * applied to) is said under the list, where each note carries its own "show"
 * link. It used to be an "Open / Incl. applied" switch here, and nobody could
 * say what "Open" meant.
 */
export function JobsRefineBar() {
  const {
    recencyCounts,
    recency,
    setRecency,
    sortBy,
    setSortBy,
    seenThrough,
    newCount,
    newOnly,
    setNewOnly,
    visibleJobs,
  } = useCombinedJobsCtx();
  // Only when the server told us when the last visit ended, and only when it
  // would narrow the list: with every role new, "New (7)" beside "Today 7"
  // was the same number twice. While filtering it stays, so it can be undone.
  const showNewChip = !!seenThrough && (newOnly || (newCount > 0 && newCount < visibleJobs.length));
  const zone = timeZoneName(useViewerTimeZone());

  return (
    <div className="space-y-2.5">
      <JobSearchBar />

      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-2"
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
              'hit-target inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              newOnly
                ? 'border-info bg-info text-info-foreground'
                : 'border-info/30 bg-info/10 text-info hover:bg-info/15',
            )}
          >
            New <span className="tabular-nums">({newCount})</span>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <PillSwitch
            aria-label="Sort jobs"
            value={sortBy}
            onValueChange={setSortBy}
            layoutId="jobs-sort-pill"
            className="shrink-0"
            options={[
              { value: 'score', label: 'Best match', title: 'Closest matches to your resume first' },
              { value: 'newest', label: 'Newest', title: 'Most recently posted first' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
