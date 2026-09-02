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

function formatAge(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) {
    return 'at an unknown time';
  }
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  if (hours < 48) return `${Math.round(hours)} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(1)}%`;
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

  const measured = coverage?.measured;
  const haveMeasurement = !!measured?.available;
  /**
   * A stale MEASUREMENT is not a degraded index - the crawl may be perfectly
   * healthy while nobody has re-run the coverage report - so it is surfaced
   * as its own caveat rather than turning the banner red. Conflating them
   * would train the user to ignore the red banner.
   */
  const measurementStale = haveMeasurement && measured?.stale === true;

  const degraded = runnerDown || staleSources.length > 0 || allWarnings.length > 0;
  const expandable =
    staleSources.length > 0 || runnerDown || allWarnings.length > 0 || haveMeasurement;

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
            {coverage.active_postings.toLocaleString()} active postings from{' '}
            {coverage.known_employers.toLocaleString()} employers
          </span>
        )}

        {/*
          The honest denominator. `owner_verified_sources` counts career
          sources whose OWNER we proved; `harvested_companies` is every company
          ever harvested and is a ceiling on ambition, not a claim of coverage.
          Showing them together is the point: the gap is the work remaining,
          and hiding it would be promising coverage we do not have.
        */}
        {typeof coverage?.owner_verified_sources === 'number' && (
          <span
            className="inline-flex items-center gap-1"
            data-testid="tech-feed-owner-verified"
            title={
              'A career page counts as covered only once we have proved whose ' +
              'board it is. An endpoint that merely answers does not count.'
            }
          >
            {coverage.owner_verified_sources.toLocaleString()} career pages
            owner-verified
          </span>
        )}

        {/*
          The MEASURED coverage: what share of the technology employers we
          hold documentary evidence for has a career source whose owner we can
          prove. Rendered WITH its age, always. The number is computed by
          `scripts/employer_coverage_report.py --persist` and read from a
          stored snapshot, so a figure with no age could be a week old and
          look current.
        */}
        {haveMeasurement && (
          <span
            className="inline-flex items-center gap-1"
            data-testid="tech-feed-employer-coverage"
            title={
              'Of the technology employers we hold documentary evidence for, ' +
              'this many have a career source whose owner we have proved. An ' +
              'endpoint that merely answers does not count.'
            }
          >
            {pct(measured?.employer_coverage_pct)} of{' '}
            {(measured?.technology_employer_denominator ?? 0).toLocaleString()}{' '}
            technology employers covered
            {measurementStale && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                measured {formatAge(measured?.age_hours)}
              </Badge>
            )}
          </span>
        )}

        {coverage?.as_of && <span>Coverage as of {formatTimestamp(coverage.as_of)}</span>}

        {expandable && (
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
              {haveMeasurement && (
                <div data-testid="tech-feed-coverage-detail" className="space-y-1">
                  <p className="font-medium">
                    Coverage, measured {formatAge(measured?.age_hours)}
                    {measured?.measured_at ? ` (${formatTimestamp(measured.measured_at)})` : ''}
                  </p>
                  {/*
                    Four counts, four UNITS, and they were one number under a
                    name that fitted none of them. An employer running a
                    Workday board and a Greenhouse board is one employer and
                    two sources; a covered board can be genuinely empty; an
                    ownership-verified board whose content is unconfirmed is
                    work in progress and not coverage.
                  */}
                  <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    <li>
                      Technology employers we hold evidence for:{' '}
                      <strong className="tabular-nums">
                        {(measured?.technology_employer_denominator ?? 0).toLocaleString()}
                      </strong>
                    </li>
                    <li>
                      Of those, covered:{' '}
                      <strong className="tabular-nums">
                        {(measured?.covered_technology_employers ?? 0).toLocaleString()}
                      </strong>{' '}
                      ({pct(measured?.employer_coverage_pct)})
                    </li>
                    <li>
                      Still candidates:{' '}
                      <strong className="tabular-nums">
                        {(measured?.candidate_technology_employers ?? 0).toLocaleString()}
                      </strong>
                    </li>
                    <li>
                      Career sources covered (boards, not employers):{' '}
                      <strong className="tabular-nums">
                        {(measured?.covered_career_sources ?? 0).toLocaleString()}
                      </strong>
                    </li>
                    <li>
                      Owner-verified, content not yet confirmed:{' '}
                      <strong className="tabular-nums">
                        {(measured?.ownership_verified_unvalidated_sources ?? 0).toLocaleString()}
                      </strong>
                    </li>
                    <li>
                      Employers actually yielding postings:{' '}
                      <strong className="tabular-nums">
                        {(measured?.employers_yielding_postings ?? 0).toLocaleString()}
                      </strong>
                    </li>
                    {measured?.tier_a && (
                      <li>
                        Strategic employers covered:{' '}
                        <strong className="tabular-nums">
                          {(measured.tier_a.accountable?.covered
                            ?? measured.tier_a.covered).toLocaleString()}
                        </strong>{' '}
                        of{' '}
                        {(measured.tier_a.accountable?.total
                          ?? measured.tier_a.total).toLocaleString()}
                      </li>
                    )}
                    {typeof coverage?.postings_with_canonical_employer === 'number' && (
                      <li>
                        Postings with a proven employer:{' '}
                        <strong className="tabular-nums">
                          {coverage.postings_with_canonical_employer.toLocaleString()}
                        </strong>
                      </li>
                    )}
                  </ul>
                  {measured?.by_cohort && Object.keys(measured.by_cohort).length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1 text-muted-foreground">By cohort:</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {Object.entries(measured.by_cohort)
                          .sort((a, b) => b[1].employers - a[1].employers)
                          .slice(0, 6)
                          .map(([name, facet]) => (
                            <li key={name}>
                              <Badge variant="outline" className="text-[10px]">
                                {name.replace(/_/g, ' ')} {pct(facet.covered_pct)}
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {measured?.by_category && Object.keys(measured.by_category).length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1 text-muted-foreground">By category:</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {Object.entries(measured.by_category)
                          .filter(([name]) => name !== 'other')
                          .sort((a, b) => b[1].employers - a[1].employers)
                          .slice(0, 8)
                          .map(([name, facet]) => (
                            <li key={name}>
                              <Badge variant="outline" className="text-[10px]">
                                {name.replace(/_/g, ' ')} {pct(facet.covered_pct)}
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {measured?.inventory_watermark && (
                    <p className="text-muted-foreground">
                      Inventory watermark {formatTimestamp(measured.inventory_watermark)}
                    </p>
                  )}
                  {measurementStale && (
                    <p className="text-muted-foreground">
                      This measurement is older than{' '}
                      {measured?.stale_after_hours
                        ? `${Math.round(measured.stale_after_hours / 24)} days`
                        : 'its refresh window'}
                      . Treat it as history, not as status.
                    </p>
                  )}
                </div>
              )}
              {coverage?.measured && !coverage.measured.available && (
                <p data-testid="tech-feed-coverage-unmeasured" className="text-muted-foreground">
                  No coverage measurement has been stored yet, so the share of
                  technology employers we cover is unknown - which is not the
                  same as zero.
                </p>
              )}
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
