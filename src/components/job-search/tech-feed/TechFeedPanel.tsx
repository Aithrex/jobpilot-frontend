/**
 * The tech feed workspace.
 *
 * One search over the whole indexed universe, replacing the three career
 * portal fan-outs. The container owns:
 *  - filter state, which lives in the URL so a search is shareable;
 *  - the infinite cursor list (IntersectionObserver, with a real button as the
 *    keyboard-reachable fallback - a scroll-only pager is a dead end for
 *    anyone not using a mouse);
 *  - every honest state: loading, empty, partial, stale, error, and the
 *    silent-recovery notice when a paging cursor expired.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Filter, Loader2, RefreshCw, Search, Star } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useTechFeed } from '@/hooks/useTechFeed';
import { useTechFeedTaxonomy } from '@/hooks/useTechFeedTaxonomy';
import { loadNotInterestedIds, reconcileNotInterested } from '@/lib/techFeedNotInterested';
import { useSavedTechFeedSearches, useTechFeedFilters } from '@/lib/techFeedUrlState';
import { cn } from '@/lib/utils';
import { TechFeedEmptyState } from '@/components/job-search/tech-feed/TechFeedEmptyState';
import { TechFeedFacets } from '@/components/job-search/tech-feed/TechFeedFacets';
import { TechFeedFilters } from '@/components/job-search/tech-feed/TechFeedFilters';
import { TechFeedHealthBanner } from '@/components/job-search/tech-feed/TechFeedHealthBanner';
import { TechFeedJobCard } from '@/components/job-search/tech-feed/TechFeedJobCard';
import type { Job } from '@/types/jobs';
import type { TechFeedSort } from '@/types/techFeed';

const SORT_OPTIONS: Array<{ value: TechFeedSort; label: string }> = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'salary', label: 'Salary' },
];

function ResultsSkeleton() {
  return (
    <div className="space-y-3" data-testid="tech-feed-loading">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="space-y-2 rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** The SERVER's normalized view of the search - not an echo of the request. */
function AppliedFiltersSummary({ applied }: { applied: Record<string, unknown> | null }) {
  const entries = useMemo(() => {
    if (!applied) return [];
    return Object.entries(applied).filter(([, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  }, [applied]);

  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="tech-feed-applied-filters">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Server applied
      </span>
      {entries.slice(0, 12).map(([key, value]) => (
        <Badge key={key} variant="outline" className="font-normal text-muted-foreground">
          {key.replace(/_/g, ' ')}: {Array.isArray(value) ? value.join(', ') : String(value)}
        </Badge>
      ))}
    </div>
  );
}

/**
 * The five job flows are OWNED by `useJobSearch`, which is mounted once by the
 * page (`CareerPortalsTab`) so save / apply / tracker state is shared with
 * every other jobs surface. They are handed down here rather than re-created,
 * which is why they are all optional: a panel rendered without them still
 * searches, it just links out instead of tracking.
 */
export interface TechFeedPanelProps {
  className?: string;
  isJobSaved?: (jobId: string) => boolean;
  getJobStatus?: (jobId: string) => string | null;
  saveJob?: (job: Job) => void | Promise<unknown>;
  unsaveJob?: (jobId: string) => void | Promise<unknown>;
  quickApply?: (job: Job, opts?: { skipOpen?: boolean }) => void | Promise<unknown>;
  beginApplyWithTailor?: (job: Job) => void | Promise<unknown>;
  autoApply?: (job: Job) => void | Promise<unknown>;
  autoApplyingId?: string | null;
  isApplyConfirmPending?: (jobId: string) => boolean;
  /** Job the page-level dialog is currently asking about. */
  applyConfirmJobId?: string | null;
  confirmApplied?: (jobId: string, job?: Job) => void | Promise<unknown>;
  dismissApplyConfirm?: (jobId: string) => void;
  markAlreadyApplied?: (job: Job) => void | Promise<unknown>;
}

export function TechFeedPanel({
  className,
  isJobSaved,
  getJobStatus,
  saveJob,
  unsaveJob,
  quickApply,
  beginApplyWithTailor,
  autoApply,
  autoApplyingId,
  isApplyConfirmPending,
  applyConfirmJobId,
  confirmApplied,
  dismissApplyConfirm,
  markAlreadyApplied,
}: TechFeedPanelProps) {
  const { filters, queryDraft, setQueryDraft, patchFilters, replaceFilters, resetFilters, activeFilterCount } =
    useTechFeedFilters();
  const { families, isLoading: taxonomyLoading } = useTechFeedTaxonomy();
  const { saved, save, remove } = useSavedTechFeedSearches();

  const {
    jobs,
    facets,
    total,
    hasMore,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    error,
    coverage,
    sourceHealth,
    warnings,
    appliedFilters,
    inventoryWatermark,
    cursorReset,
    searchId,
    isFetching,
    refetch,
  } = useTechFeed({ filters });

  const [dismissed, setDismissed] = useState<Set<string>>(() => loadNotInterestedIds());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const visibleJobs = useMemo(
    () => jobs.filter((job) => !dismissed.has(job.job_id)),
    [jobs, dismissed],
  );

  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const family of families) {
      map[family.key] = family.label;
      for (const specialty of family.specialties) map[specialty.key] = specialty.label;
    }
    return map;
  }, [families]);

  // Suppression is applied SERVER-side inside the search itself; this set is
  // the optimistic half, so a card leaves the list on click rather than on the
  // next round trip. Reconciling from the server on mount is what makes a
  // dismissal made on another device hold on this one.
  useEffect(() => {
    let cancelled = false;
    void reconcileNotInterested().then((ids) => {
      if (!cancelled) setDismissed(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onNotInterested = useCallback((jobId: string) => {
    setDismissed((prev) => new Set(prev).add(jobId));
  }, []);

  // The server DELETE belongs to the menu's Undo action (and to the rollback
  // of a refused write). This only puts the card back on screen.
  const onRestore = useCallback((jobId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  // ── Infinite scroll ────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchNextRef = useRef(fetchNextPage);
  fetchNextRef.current = fetchNextPage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fetchNextRef.current();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  const countLabel = isLoading
    ? 'Searching the index'
    : `${total.toLocaleString()} ${total === 1 ? 'job matches' : 'jobs match'} these filters`;

  // The rail's own keyword box is suppressed here: the panel already shows a
  // search field at the top on every breakpoint, and two inputs bound to the
  // same draft is a bug waiting to happen.
  const rail = (
    <TechFeedFilters
      filters={filters}
      onPatch={patchFilters}
      onReset={resetFilters}
      families={families}
      taxonomyLoading={taxonomyLoading}
      queryDraft={queryDraft}
      onQueryDraftChange={setQueryDraft}
      hideSearch
    />
  );

  return (
    <div className={cn('space-y-4', className)} data-testid="tech-feed-panel">
      {/* Search bar - always visible, at every breakpoint */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search jobs"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Search roles, skills, or describe the job you want"
            className="h-10 pl-9"
          />
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 lg:hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Filter className="h-4 w-4" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="text-left">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow the feed. Changes apply straight away and stay in the page address.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">{rail}</div>
          </SheetContent>
        </Sheet>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={refetch}
          disabled={isFetching}
          aria-label="Refresh results"
          className="focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop rail */}
        <aside className="hidden lg:block" aria-label="Job filters">
          {rail}
        </aside>

        <div className="min-w-0 space-y-4">
          <TechFeedHealthBanner
            coverage={coverage}
            sourceHealth={sourceHealth}
            warnings={warnings}
          />

          {cursorReset && (
            <Alert data-testid="tech-feed-cursor-reset">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Results refreshed</AlertTitle>
              <AlertDescription>
                That result page expired, so the search was re-run from your current filters. You
                are still signed in.
              </AlertDescription>
            </Alert>
          )}

          {/* Result count + sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                aria-live="polite"
                role="status"
                className="text-sm font-medium text-foreground"
                data-testid="tech-feed-result-count"
              >
                {countLabel}
              </p>
              {inventoryWatermark && (
                <p className="text-[11px] text-muted-foreground">
                  Index snapshot {new Date(inventoryWatermark).toLocaleString()}
                </p>
              )}
            </div>

            <fieldset className="flex items-center gap-1.5">
              <legend className="sr-only">Sort results</legend>
              <span className="text-xs text-muted-foreground" aria-hidden>
                Sort
              </span>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filters.sort === option.value}
                  onClick={() => patchFilters({ sort: option.value })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    filters.sort === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>
          </div>

          <AppliedFiltersSummary applied={appliedFilters} />

          {/* Saved searches */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
            <Label htmlFor="tech-feed-save-name" className="sr-only">
              Name this search
            </Label>
            <Input
              id="tech-feed-save-name"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Name this search"
              className="h-8 w-44 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                save(saveName, filters);
                setSaveName('');
              }}
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              Save search
            </Button>
            {saved.length > 0 && (
              <ul className="flex flex-wrap items-center gap-1.5" aria-label="Saved searches">
                {saved.map((entry) => (
                  <li key={entry.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => replaceFilters(entry.filters)}
                      className="rounded-l-full border border-border bg-background px-2.5 py-0.5 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {entry.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      aria-label={`Delete saved search ${entry.name}`}
                      className="rounded-r-full border border-l-0 border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <TechFeedFacets
            facets={facets}
            filters={filters}
            onPatch={patchFilters}
            labels={labels}
            className="rounded-lg border border-border p-3"
          />

          {/* Results */}
          {error ? (
            <Alert variant="destructive" data-testid="tech-feed-error">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Could not load the feed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                <Button type="button" size="sm" variant="outline" onClick={refetch}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <ResultsSkeleton />
          ) : visibleJobs.length === 0 ? (
            <TechFeedEmptyState filters={filters} onApply={patchFilters} onReset={resetFilters} />
          ) : (
            <>
              <ul className="space-y-3" aria-label="Search results">
                {visibleJobs.map((job) => (
                  <li key={job.job_id}>
                    <TechFeedJobCard
                      job={job}
                      labels={labels}
                      searchId={searchId}
                      onNotInterested={onNotInterested}
                      onRestore={onRestore}
                      saved={isJobSaved?.(job.job_id) ?? false}
                      jobStatus={getJobStatus?.(job.job_id) ?? null}
                      onSave={saveJob}
                      onUnsave={unsaveJob}
                      onQuickApply={quickApply}
                      onApplyWithTailor={beginApplyWithTailor}
                      onAutoApply={autoApply}
                      autoApplying={autoApplyingId === job.job_id}
                      applyConfirmPending={isApplyConfirmPending?.(job.job_id) ?? false}
                      applyConfirmModalJobId={applyConfirmJobId}
                      onConfirmApplied={(posting) => confirmApplied?.(posting.job_id, posting)}
                      onConfirmNotYet={dismissApplyConfirm}
                      onAlreadyApplied={markAlreadyApplied}
                    />
                  </li>
                ))}
              </ul>

              <div ref={sentinelRef} aria-hidden className="h-px" />

              <div className="flex justify-center py-2">
                {hasMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchNextPage}
                    disabled={isFetchingNextPage}
                    className="gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {isFetchingNextPage ? 'Loading more jobs' : 'Load more jobs'}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    That is every match in the index for these filters.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TechFeedPanel;
