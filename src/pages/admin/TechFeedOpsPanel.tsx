import { useEffect, useState } from 'react';

import { apiService } from '@/lib/api';

function Metric({ label, value }: { label: string; value: unknown }) {
  const text =
    value === null || value === undefined
      ? 'unknown'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return (
    <div className="rounded border border-border bg-muted/30 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm">{text}</div>
    </div>
  );
}

export function TechFeedOpsPanel() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiService.getAdminTechFeedOps().then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setData((res.data as Record<string, unknown>) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading tech-feed ops...</p>;

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
