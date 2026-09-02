/**
 * Cursor paging, cancellation and the 410 recovery path.
 *
 * Three invariants:
 *  - a cursor page sends `{cursor, page_size}` and NOTHING else, and its
 *    results append without ever repeating a job_id;
 *  - changing a filter aborts the in-flight search rather than racing it;
 *  - a 410 `cursor_expired` resets to page 1 exactly once and never signs the
 *    user out.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { useTechFeed } from '@/hooks/useTechFeed';
import { DEFAULT_TECH_FEED_FILTERS } from '@/lib/techFeedUrlState';
import { makeTechFeedJob, makeTechFeedResponse } from '@/test/techFeedFixtures';
import type { TechFeedFilters } from '@/types/techFeed';

vi.mock('@/lib/api', () => ({
  apiService: {
    searchTechFeed: vi.fn(),
    getTechFeedTaxonomy: vi.fn(),
    getTechFeedCoverage: vi.fn(),
    getWorkdayCatalog: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function bodies(): Array<Record<string, unknown>> {
  return api.searchTechFeed.mock.calls.map((call) => call[0]);
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('useTechFeed cursor paging', () => {
  test('page 2 sends only the cursor and page size, and pages append', async () => {
    api.searchTechFeed
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          jobs: [makeTechFeedJob({ job_id: 'a' }), makeTechFeedJob({ job_id: 'b' })],
          next_cursor: 'cursor-2',
          has_more: true,
          total: 3,
        }),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          jobs: [makeTechFeedJob({ job_id: 'c' })],
          next_cursor: null,
          has_more: false,
          total: 3,
        }),
        status: 200,
      });

    const { result } = renderHook(
      () => useTechFeed({ filters: DEFAULT_TECH_FEED_FILTERS, pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.jobs).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.jobs).toHaveLength(3));

    expect(bodies()[1]).toEqual({ cursor: 'cursor-2', page_size: 25 });
    expect(result.current.jobs.map((job) => job.job_id)).toEqual(['a', 'b', 'c']);
    expect(result.current.hasMore).toBe(false);
  });

  test('a job repeated across pages is rendered once', async () => {
    api.searchTechFeed
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          jobs: [makeTechFeedJob({ job_id: 'a' }), makeTechFeedJob({ job_id: 'b' })],
          next_cursor: 'cursor-2',
          has_more: true,
        }),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          // Overlapping window: 'b' comes back a second time.
          jobs: [makeTechFeedJob({ job_id: 'b' }), makeTechFeedJob({ job_id: 'c' })],
          next_cursor: null,
          has_more: false,
        }),
        status: 200,
      });

    const { result } = renderHook(() => useTechFeed({ filters: DEFAULT_TECH_FEED_FILTERS }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.jobs).toHaveLength(2));
    act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.jobs).toHaveLength(3));
    expect(result.current.jobs.map((job) => job.job_id)).toEqual(['a', 'b', 'c']);
  });

  test('facets and totals come from the search, health from the freshest page', async () => {
    api.searchTechFeed
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          facets: { seniority: [{ value: 'staff', count: 4 }] },
          total: 2,
          next_cursor: 'cursor-2',
          has_more: true,
          warnings: [],
        }),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: makeTechFeedResponse({
          jobs: [makeTechFeedJob({ job_id: 'z' })],
          facets: {},
          total: 0,
          next_cursor: null,
          warnings: ['A source went stale mid-scroll.'],
        }),
        status: 200,
      });

    const { result } = renderHook(() => useTechFeed({ filters: DEFAULT_TECH_FEED_FILTERS }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.total).toBe(2));
    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.warnings).toEqual(['A source went stale mid-scroll.']));

    expect(result.current.total).toBe(2);
    expect(result.current.facets.seniority).toEqual([{ value: 'staff', count: 4 }]);
  });
});

describe('useTechFeed cancellation', () => {
  test('changing a filter aborts the in-flight search', async () => {
    const signals: AbortSignal[] = [];
    api.searchTechFeed.mockImplementation(
      (_body: unknown, opts: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          signals.push(opts.signal);
          opts.signal.addEventListener('abort', () => resolve({ error: 'Canceled' }));
        }),
    );

    const { rerender } = renderHook(({ filters }: { filters: TechFeedFilters }) => useTechFeed({ filters }), {
      wrapper,
      initialProps: { filters: DEFAULT_TECH_FEED_FILTERS },
    });

    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0].aborted).toBe(false);

    rerender({ filters: { ...DEFAULT_TECH_FEED_FILTERS, query: 'rust' } });

    await waitFor(() => expect(signals[0].aborted).toBe(true));
    await waitFor(() => expect(signals).toHaveLength(2));
  });
});

describe('useTechFeed cursor expiry', () => {
  test('a 410 resets to page one, re-runs from the filters, and never logs out', async () => {
    const sessionExpired = vi.fn();
    window.addEventListener('auth:session-expired', sessionExpired);

    const firstPage = makeTechFeedResponse({
      jobs: [makeTechFeedJob({ job_id: 'a' })],
      next_cursor: 'cursor-2',
      has_more: true,
    });

    api.searchTechFeed
      .mockResolvedValueOnce({ data: firstPage, status: 200 })
      .mockResolvedValueOnce({
        data: {
          cursor_expired: true,
          error: 'cursor_expired',
          message: 'This search session expired.',
        },
        status: 410,
      })
      .mockResolvedValue({
        data: makeTechFeedResponse({
          jobs: [makeTechFeedJob({ job_id: 'a' }), makeTechFeedJob({ job_id: 'b' })],
          next_cursor: null,
          has_more: false,
          total: 2,
        }),
        status: 200,
      });

    const { result } = renderHook(() => useTechFeed({ filters: DEFAULT_TECH_FEED_FILTERS }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.jobs).toHaveLength(1));
    act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.cursorReset).toBe(true));
    await waitFor(() => expect(result.current.jobs).toHaveLength(2));

    // Never surfaced as an error, and never an auth event.
    expect(result.current.error).toBeNull();
    expect(sessionExpired).not.toHaveBeenCalled();

    // The recovery request went out WITHOUT a cursor - it re-ran the filters.
    const recovery = bodies()[2];
    expect(recovery).not.toHaveProperty('cursor');
    expect(recovery).toMatchObject({ tech_scope: ['core'], posted_within_days: 30 });

    window.removeEventListener('auth:session-expired', sessionExpired);
  });

  test('a cursor that expires again does not loop - it resets once', async () => {
    api.searchTechFeed.mockImplementation((body: Record<string, unknown>) =>
      Promise.resolve(
        body.cursor
          ? {
              data: { cursor_expired: true, error: 'cursor_expired', message: 'gone' },
              status: 410,
            }
          : {
              data: makeTechFeedResponse({
                jobs: [makeTechFeedJob({ job_id: 'a' })],
                next_cursor: 'cursor-2',
                has_more: true,
              }),
              status: 200,
            },
      ),
    );

    const { result } = renderHook(() => useTechFeed({ filters: DEFAULT_TECH_FEED_FILTERS }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.jobs).toHaveLength(1));
    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.cursorReset).toBe(true));

    // Let any runaway reset loop have time to show itself.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(api.searchTechFeed.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
