/**
 * The tech feed search hook.
 *
 * React Query `useInfiniteQuery` over POST /api/jobs/tech-feed/search:
 *
 *  - The serialized filters are part of the query key, so changing any filter
 *    starts a NEW query and React Query aborts the in-flight one (we forward
 *    its AbortSignal all the way into `fetch`).
 *  - Page 1 sends the filters. Every page after that sends `{cursor, page_size}`
 *    and NOTHING else, because the server ignores other fields when a cursor is
 *    present and sending them would be a lie about what produced the page.
 *  - A 410 `cursor_expired` is a paging-session expiry, not a failure and
 *    emphatically not an auth event: the query resets to page 1 ONCE and
 *    re-runs from the current filters.
 *  - Pages are de-duplicated by `job_id` before they reach the UI. The server
 *    already dedupes; this is belt and braces so a cursor overlap can never
 *    render the same card twice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { apiService } from '@/lib/api';
import { serializeTechFeedFilters, techFeedFiltersToRequest } from '@/lib/techFeedUrlState';
import {
  isTechFeedCursorExpired,
  type TechFeedCoverage,
  type TechFeedFacets,
  type TechFeedFilters,
  type TechFeedJob,
  type TechFeedSearchRequest,
  type TechFeedSearchResponse,
  type TechFeedSourceHealth,
} from '@/types/techFeed';

/** Thrown by the query fn so the reset effect can recognise the 410 path. */
export class TechFeedCursorExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TechFeedCursorExpiredError';
  }
}

export const DEFAULT_TECH_FEED_PAGE_SIZE = 25;

export interface UseTechFeedOptions {
  filters: TechFeedFilters;
  enabled?: boolean;
  pageSize?: number;
  /** Server-side personalization. Not part of the shareable URL. */
  personalize?: boolean;
}

export interface UseTechFeedResult {
  jobs: TechFeedJob[];
  facets: TechFeedFacets;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  error: string | null;
  coverage: TechFeedCoverage | null;
  sourceHealth: TechFeedSourceHealth | null;
  warnings: string[];
  appliedFilters: Record<string, unknown> | null;
  taxonomyVersion: string | null;
  inventoryWatermark: string | null;
  /** True for one render cycle after a 410 forced a reset - drives a notice. */
  cursorReset: boolean;
  searchId: string | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useTechFeed({
  filters,
  enabled = true,
  pageSize = DEFAULT_TECH_FEED_PAGE_SIZE,
  personalize = true,
}: UseTechFeedOptions): UseTechFeedResult {
  const queryClient = useQueryClient();
  const filterKey = useMemo(() => serializeTechFeedFilters(filters), [filters]);
  const requestBody = useMemo(() => techFeedFiltersToRequest(filters), [filters]);

  // Keep the body out of the key (it is derived from filterKey) but readable
  // inside the query fn without re-creating the query on every render.
  const requestBodyRef = useRef<TechFeedSearchRequest>(requestBody);
  requestBodyRef.current = requestBody;

  const queryKey = useMemo(
    () => ['tech-feed', 'search', filterKey, pageSize, personalize] as const,
    [filterKey, pageSize, personalize],
  );

  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<TechFeedSearchResponse> => {
      const body: TechFeedSearchRequest = pageParam
        ? // Cursor pages carry the cursor and the page size ONLY.
          { cursor: pageParam, page_size: pageSize }
        : { ...requestBodyRef.current, page_size: pageSize, personalize };

      const resp = await apiService.searchTechFeed(body, { signal });

      if (isTechFeedCursorExpired(resp.data)) {
        throw new TechFeedCursorExpiredError(resp.data.message);
      }
      if (resp.error) throw new Error(resp.error);
      if (!resp.data) throw new Error('Tech feed search returned no data');
      return resp.data;
    },
    getNextPageParam: (lastPage: TechFeedSearchResponse) => lastPage.next_cursor ?? null,
    // A cursor expiry must not be retried against the same dead cursor, and a
    // 403/429 will not fix itself either - the UI reports both honestly.
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── 410 recovery: reset to page 1 exactly once per search ──────
  const resetGuard = useRef<string | null>(null);
  const [cursorReset, setCursorReset] = useState(false);

  useEffect(() => {
    if (!(query.error instanceof TechFeedCursorExpiredError)) return;
    if (resetGuard.current === filterKey) return; // already recovered once
    resetGuard.current = filterKey;
    setCursorReset(true);
    void queryClient.resetQueries({ queryKey, exact: true });
  }, [query.error, filterKey, queryKey, queryClient]);

  useEffect(() => {
    // A clean page release the guard, so a LATER session expiry can recover
    // too. Consecutive 410s still stop after one reset - that is the loop we
    // are guarding against.
    if (query.isSuccess && !query.isFetching) resetGuard.current = null;
  }, [query.isSuccess, query.isFetching]);

  useEffect(() => {
    // A new search clears the recovery notice - it described the old one.
    setCursorReset(false);
  }, [filterKey]);

  const pages = useMemo(() => query.data?.pages ?? [], [query.data]);

  const jobs = useMemo(() => {
    const seen = new Set<string>();
    const out: TechFeedJob[] = [];
    for (const page of pages) {
      for (const job of page.jobs ?? []) {
        if (!job?.job_id || seen.has(job.job_id)) continue;
        seen.add(job.job_id);
        out.push(job);
      }
    }
    return out;
  }, [pages]);

  const firstPage = pages[0] ?? null;
  const latestPage = pages.length ? pages[pages.length - 1] : null;

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const error =
    query.error instanceof TechFeedCursorExpiredError
      ? null // recovered in-place; never surfaced as a failure
      : query.error instanceof Error
        ? query.error.message
        : null;

  return {
    jobs,
    // Facets and totals describe the SEARCH, so they come from its first page.
    facets: firstPage?.facets ?? {},
    total: firstPage?.total ?? 0,
    hasMore: !!query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    error,
    // Health describes the INDEX right now, so the freshest page wins.
    coverage: latestPage?.coverage ?? null,
    sourceHealth: latestPage?.source_health ?? null,
    warnings: latestPage?.warnings ?? [],
    appliedFilters: firstPage?.applied_filters ?? null,
    taxonomyVersion: firstPage?.taxonomy_version ?? null,
    inventoryWatermark: latestPage?.inventory_watermark ?? null,
    cursorReset,
    searchId: firstPage?.search_id ?? null,
    isFetching: query.isFetching,
    refetch,
  };
}
