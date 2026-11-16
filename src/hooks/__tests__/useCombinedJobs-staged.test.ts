import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The 30-minute refresh never reshuffles the list under the reader. What it
 * brings waits; only roles the reader has not seen are offered ("2 new
 * roles"), and a refresh with nothing new is taken quietly.
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

const tab = (...ids: string[]) => ({
  ok: true,
  jobs: ids.map((id) => ({ job_id: id, title: `Backend Engineer ${id}`, company: `Acme ${id}`, apply_link: `https://x/${id}` })),
  total: ids.length, tenants_done: 1, tenants_total: 1, tenants_with_results: 1, cache_hit: true,
  errors: [], window_counts: {}, query_terms: [], industries_available: [], generated_at: '',
});
const board = (workday: string[]) => ({
  data: { available: true, fresh: true, built_at: '2026-11-16T17:50:00Z', age_seconds: 60,
    sources: { workday: tab(...workday), careers: tab('c1'), mncs: tab('m1') } },
});
const ids = (jobs: { job_id: string }[]) => jobs.map((j) => j.job_id).sort();

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

async function opened() {
  api.getBoardSnapshot.mockResolvedValueOnce(board(['w1']));
  const hook = renderHook(() => useCombinedJobs(true));
  await act(async () => { await hook.result.current.run(false, {}, 'initial'); });
  expect(ids(hook.result.current.jobs)).toEqual(['c1', 'm1', 'w1']);
  return hook;
}

describe('a background refresh', () => {
  it('holds new roles until the reader asks for them', async () => {
    const { result } = await opened();
    api.getBoardSnapshot.mockResolvedValueOnce(board(['w1', 'w8', 'w9']));
    await act(async () => { await result.current.run(false, {}, 'interval'); });

    expect(ids(result.current.jobs)).toEqual(['c1', 'm1', 'w1']);
    expect(result.current.pendingNewCount).toBe(2);
    expect(result.current.loading).toBe(false);

    act(() => result.current.applyPending());
    expect(ids(result.current.jobs)).toEqual(['c1', 'm1', 'w1', 'w8', 'w9']);
    expect([...result.current.arrivedIds].sort()).toEqual(['w8', 'w9']);
    expect(result.current.pendingNewCount).toBe(0);
  });

  it('takes a refresh with nothing new quietly', async () => {
    const { result } = await opened();
    api.getBoardSnapshot.mockResolvedValueOnce(board(['w1']));
    await act(async () => { await result.current.run(false, {}, 'interval'); });
    expect(result.current.pendingNewCount).toBe(0);
    expect(ids(result.current.jobs)).toEqual(['c1', 'm1', 'w1']);
  });

  it('a failed refresh keeps the list and says so', async () => {
    const { result } = await opened();
    api.getBoardSnapshot.mockResolvedValueOnce({ error: 'down', status: 503 });
    const fail = () => Promise.resolve({ error: 'down' });
    api.searchWorkdayJobs.mockImplementation(fail);
    api.searchCareerPagesJobs.mockImplementation(fail);
    api.searchMncJobs.mockImplementation(fail);
    let outcome: unknown;
    await act(async () => { outcome = await result.current.run(false, {}, 'interval'); });
    expect(outcome).toBe('error');
    expect(ids(result.current.jobs)).toEqual(['c1', 'm1', 'w1']);
    expect(result.current.pendingNewCount).toBe(0);
  });
});
