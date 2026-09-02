/**
 * Honest coverage banner.
 *
 * The index is a crawl, and crawls fall behind. When a source is stale or the
 * ingest heartbeat is dead the user is told SO, above the results, because a
 * silently incomplete feed reads as "there are no jobs" - which is a lie the
 * product cannot afford. Nothing here is collapsible by default when it is bad
 * news; the healthy case renders as a quiet one-line footnote instead.
 */
import { useState } from 'react';
import { AlertTriangle, ChevronDown, Database, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TechFeedCoverage, TechFeedSourceHealth } from '@/types/techFeed';

interface TechFeedHealthBannerProps {
  coverage: TechFeedCoverage | null;
  sourceHealth: TechFeedSourceHealth | null;
  /** Top-level response warnings (partial results, degraded ranking, ...). */
  warnings: string[];
  className?: string;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString();
}

function formatLag(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return 'lag unknown';
  if (minutes < 60) return `${Math.round(minutes)} min behind`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hours behind`;
  return `${Math.round(hours / 24)} days behind`;
}

export function TechFeedHealthBanner({
  coverage,
  sourceHealth,
  warnings,
  className,
}: TechFeedHealthBannerProps) {
  const [open, setOpen] = useState(false);

  const staleSources = (sourceHealth?.sources ?? []).filter((source) => source.stale);
  const runner = sourceHealth?.ingest_runner ?? null;
  const runnerDown = !!runner && runner.healthy === false;
  const allWarnings = [...warnings, ...(sourceHealth?.warnings ?? [])].filter(Boolean);

  const degraded = runnerDown || staleSources.length > 0 || allWarnings.length > 0;

  if (!coverage && !sourceHealth && !allWarnings.length) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-xs',
        degraded
          ? 'border-destructive/40 bg-destructive/5 text-foreground'
          : 'border-border bg-muted/40 text-muted-foreground',
        className,
      )}
      role={degraded ? 'alert' : undefined}
      data-testid="tech-feed-health-banner"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {degraded ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
        )}

        <span className="font-medium">
          {degraded ? 'These results may be incomplete' : 'Index is up to date'}
        </span>

        {coverage && (
          <span className="inline-flex items-center gap-1">
            <Database className="h-3 w-3" aria-hidden />
            {coverage.active_postings.toLocaleString()} active postings across{' '}
            {coverage.known_employers.toLocaleString()} employers
          </span>
        )}

        {coverage?.as_of && <span>Coverage as of {formatTimestamp(coverage.as_of)}</span>}

        {(staleSources.length > 0 || runnerDown || allWarnings.length > 0) && (
          <Collapsible open={open} onOpenChange={setOpen} className="ml-auto">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring"
              >
                {open ? 'Hide details' : 'Why'}
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 text-xs">
              {runnerDown && (
                <p data-testid="tech-feed-ingest-down">
                  The ingest runner has not checked in since{' '}
                  {formatTimestamp(runner?.last_heartbeat_at)}
                  {typeof runner?.minutes_ago === 'number'
                    ? ` (${Math.round(runner.minutes_ago)} min ago)`
                    : ''}
                  . New postings are probably missing.
                </p>
              )}
              {staleSources.length > 0 && (
                <div data-testid="tech-feed-stale-sources">
                  <p className="mb-1">Sources behind their schedule:</p>
                  <ul className="space-y-1">
                    {staleSources.map((source) => (
                      <li key={source.source} className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {source.source}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatLag(source.crawl_lag_minutes)}
                          {source.retry_count > 0 ? ` after ${source.retry_count} retries` : ''}
                          {source.last_success_at
                            ? ` - last success ${formatTimestamp(source.last_success_at)}`
                            : ' - no successful crawl recorded'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {allWarnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-4">
                  {allWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export default TechFeedHealthBanner;
