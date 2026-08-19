import { useMemo, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { RECENCY_OPTIONS } from '@/lib/careerJobs';
import { cn } from '@/lib/utils';

function Seg({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-background text-primary shadow-soft'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/**
 * For-you listing chrome: recency windows + Best match / Newest.
 * Lives under the Jobs section tabs so it stays visible even before the first
 * scan result (the old panel row hid these until `hasResult`).
 */
export function JobsRefineBar() {
  const { jobs, recency, setRecency, sortBy, setSortBy } = useCombinedJobsCtx();

  const recencyCounts = useMemo(() => {
    const counts: Record<string, number> = { today: 0, '24h': 0, '3d': 0, '7d': 0, '30d': 0 };
    for (const j of jobs) {
      if (j.days_ago == null) continue;
      for (const opt of RECENCY_OPTIONS) if (j.days_ago <= opt.maxDays) counts[opt.key] += 1;
    }
    return counts;
  }, [jobs]);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label="Listing recency and sort"
    >
      <div
        className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5"
        title="Posting dates use your timezone. Each window includes everything newer, so Today is inside Since yesterday."
      >
        {RECENCY_OPTIONS.map((opt) => (
          <Seg key={opt.key} active={recency === opt.key} onClick={() => setRecency(opt.key)}>
            {opt.label}
            <span className="ml-1 tabular-nums opacity-60">{recencyCounts[opt.key]}</span>
          </Seg>
        ))}
      </div>
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {(['score', 'newest'] as const).map((s) => (
          <Seg key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
            {s === 'score' ? 'Best match' : 'Newest'}
          </Seg>
        ))}
      </div>
      <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
        <Sparkles className="h-3 w-3" aria-hidden />
        <span className="font-mono tabular-nums">{recencyCounts[recency] ?? 0}</span> roles
      </Badge>
    </div>
  );
}
