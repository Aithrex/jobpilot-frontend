import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { PillSwitch } from '@/components/ui/pill-switch';

/**
 * For-you listing chrome: recency windows + Best match / Newest.
 * Lives under the Jobs section tabs so it stays visible even before the first
 * scan result (the old panel row hid these until `hasResult`).
 */
export function JobsRefineBar() {
  const { jobs, recency, setRecency, sortBy, setSortBy } = useCombinedJobsCtx();

  const recencyCounts = useMemo(() => {
    const counts: Record<string, number> = { today: 0, '24h': 0, '3d': 0, '7d': 0, '30d': 0 };
    for (const j of jobs ?? []) {
      if (j.days_ago == null) continue;
      for (const opt of RECENCY_OPTIONS) if (j.days_ago <= opt.maxDays) counts[opt.key] += 1;
    }
    return counts;
  }, [jobs]);

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
      role="toolbar"
      aria-label="Listing recency and sort"
    >
      <PillSwitch
        aria-label="Posting recency"
        value={recency}
        onValueChange={setRecency}
        layoutId="jobs-recency-pill"
        options={RECENCY_OPTIONS.map((opt) => ({
          value: opt.key,
          title:
            'Posting dates use your timezone. Each window includes everything newer, so Today is inside Since yesterday.',
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
        options={[
          { value: 'score', label: 'Best match' },
          { value: 'newest', label: 'Newest' },
        ]}
      />
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground">
        <Sparkles className="h-3 w-3" aria-hidden />
        <span className="font-mono tabular-nums">{recencyCounts[recency] ?? 0}</span> roles
      </span>
    </div>
  );
}
