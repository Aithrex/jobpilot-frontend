import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Opening the For-you board is a READ. The server rebuilds every active
 * user's board every 30 minutes; the board shows that stored answer and only
 * scans when it is missing or stale, or when the user presses Sync now.
 */
const api = vi.hoisted(() => ({
  getBoardSnapshot: vi.fn(),
  searchWorkdayJobs: vi.fn(),
  searchCareerPagesJobs: vi.fn(),
  searchMncJobs: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ apiService: api }));
vi.mock('@/hooks/useJobTitles', () => ({
  useJobTitles: () => ({
    titles: ['Backend Engineer'],
    setTitles: vi.fn(),
    resumeTitles: ['Backend Engineer'],
    ready: true,
    smartSuggestTitles: vi.fn(),
    suggesting: false,
  }),
}));

import { useCombinedJobs } from '@/hooks/useCombinedJobs';

const tab = (id: string) => ({
  ok: true, jobs: [{ job_id: id, title: `Backend Engineer ${id}`, company: `Acme ${id}`, apply_link: `https://x/${id}` }],
  total: 1, tenants_done: 1, tenants_total: 1, tenants_with_results: 1, cache_hit: true,
  errors: [], window_counts: {}, query_terms: [], industries_available: [], generated_at: '',
});

const scanned = (id: string) => () => Promise.resolve({ data: tab(id) });

function snapshot(fresh: boolean, sources = { workday: tab('w1'), careers: tab('c1'), mncs: tab('m1') }) {
  return { data: { available: true, fresh, built_at: '2026-11-02T17:50:00Z', age_seconds: 600, sources } };
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.searchWorkdayJobs.mockImplementation(scanned('w2'));
  api.searchCareerPagesJobs.mockImplementation(scanned('c2'));
  api.searchMncJobs.mockImplementation(scanned('m2'));
});

describe('useCombinedJobs reads the stored board first', () => {
  it('a fresh board is the answer: no scan starts', async () => {
    api.getBoardSnapshot.mockResolvedValue(snapshot(true));
    const { result } = renderHook(() => useCombinedJobs(true));
    await act(async () => { await result.current.run(false, {}, 'initial'); });

    expect(api.searchWorkdayJobs).not.toHaveBeenCalled();
    expect(api.searchMncJobs).not.toHaveBeenCalled();
    expect(result.current.jobs.map((j) => j.job_id).sort()).toEqual(['c1', 'm1', 'w1']);
    expect(result.current.hasResult).toBe(true);
    expect(result.current.builtAt).toBe(Date.parse('2026-11-02T17:50:00Z'));
    expect(api.getBoardSnapshot.mock.calls[0][0]).toMatchObject({
      titles: ['Backend Engineer'], board: 'for_you', us_only: true,
    });
  });

  it('a stale board is shown, then replaced by a scan', async () => {
    api.getBoardSnapshot.mockResolvedValue(snapshot(false, { workday: tab('w1') } as never));
    const { result } = renderHook(() => useCombinedJobs(true));
    await act(async () => { await result.current.run(false, {}, 'interval'); });

    expect(api.searchWorkdayJobs).toHaveBeenCalledTimes(1);
    expect(api.searchWorkdayJobs.mock.calls[0][0]).toMatchObject({ board: 'for_you', force_refresh: false });
    expect(result.current.jobs.map((j) => j.job_id).sort()).toEqual(['c2', 'm2', 'w2']);
  });

  it('nothing stored (or an older backend) just scans', async () => {
    api.getBoardSnapshot.mockResolvedValue({ error: 'Not found', status: 404 });
    const { result } = renderHook(() => useCombinedJobs(true));
    await act(async () => { await result.current.run(false, {}, 'initial'); });
    expect(api.searchCareerPagesJobs).toHaveBeenCalledTimes(1);
    expect(result.current.jobs).toHaveLength(3);
  });

  it('Sync now always scans and never reads the stored board', async () => {
    const { result } = renderHook(() => useCombinedJobs(true));
    await act(async () => { await result.current.run(true, {}, 'manual'); });
    expect(api.getBoardSnapshot).not.toHaveBeenCalled();
    expect(api.searchMncJobs.mock.calls[0][0]).toMatchObject({ force_refresh: true });
  });
});
