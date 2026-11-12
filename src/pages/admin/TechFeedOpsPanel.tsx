import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';

const METRIC_COUNT = 10;

function Metric({ label, value }: { label: string; value: unknown }) {
  const text =
    value === null || value === undefined
      ? 'unknown'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="text-caption-sm uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm text-foreground">{text}</div>
    </div>
  );
}

export function TechFeedOpsPanel() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Try again" so the effect re-runs the same request.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void apiService.getAdminTechFeedOps().then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setData((res.data as Record<string, unknown>) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) {
    // Skeleton in the populated layout, so nothing jumps when numbers land.
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="sr-only">Loading tech-feed ops...</span>
        <div className="h-5 w-72 max-w-full animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: METRIC_COUNT }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  const coverage = (data.coverage || {}) as Record<string, unknown>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Aggregate only. Search terms and account emails are not shown.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Coverage available" value={coverage.available} />
        <Metric label="Coverage age (hours)" value={coverage.age_hours} />
        <Metric label="Stale" value={coverage.stale} />
        <Metric label="Employer coverage" value={coverage.employer_coverage_pct} />
        <Metric label="Ownership conflicts" value={data.ownership_conflicts} />
        <Metric label="Zero-result rate" value={data.zero_result_rate} />
        <Metric label="Duplicate rate" value={data.duplicate_rate} />
        <Metric label="Company requests" value={data.company_requests} />
        <Metric label="Feedback counts" value={data.feedback} />
        <Metric label="Alert sweep" value={data.alerts} />
      </div>
    </div>
  );
}
