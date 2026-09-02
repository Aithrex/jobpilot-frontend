/**
 * Saved searches: server-owned, locally mirrored.
 *
 * The load-bearing property is what happens when the API is NOT there. A
 * saved search the user can still see and still apply offline is worth more
 * than a correct 503, and a sync that clears the local list on failure would
 * be a data-loss bug wearing a network error's clothes.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import {
  DEFAULT_TECH_FEED_FILTERS,
  SAVED_SEARCHES_KEY,
  useSavedTechFeedSearches,
} from '@/lib/techFeedUrlState';

vi.mock('@/lib/api', () => ({
  apiService: {
    reconcileTechFeedSavedSearches: vi.fn(),
    saveTechFeedSearch: vi.fn(),
    deleteTechFeedSavedSearch: vi.fn(),
    listTechFeedSavedSearches: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function serverRow(id: string, name: string) {
  return {
    id,
    name,
    filters: { ...DEFAULT_TECH_FEED_FILTERS },
    createdAt: '2026-09-02T00:00:00Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.reconcileTechFeedSavedSearches.mockResolvedValue({ data: { searches: [] } });
  api.saveTechFeedSearch.mockResolvedValue({ data: { searches: [] } });
  api.deleteTechFeedSavedSearch.mockResolvedValue({ data: { searches: [] } });
});

describe('saved searches', () => {
  test('the server list replaces the local mirror on reconcile', async () => {
    api.reconcileTechFeedSavedSearches.mockResolvedValue({
      data: { searches: [serverRow('a', 'From another device')] },
    });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    expect(result.current.saved[0].name).toBe('From another device');
    expect(window.localStorage.getItem(SAVED_SEARCHES_KEY)).toContain('another device');
  });

  test('a failed reconcile KEEPS the local list rather than clearing it', async () => {
    window.localStorage.setItem(
      SAVED_SEARCHES_KEY,
      JSON.stringify([serverRow('local', 'Saved offline')]),
    );
    api.reconcileTechFeedSavedSearches.mockResolvedValue({ error: 'offline' });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.syncError).toBeTruthy());
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].name).toBe('Saved offline');
  });

  test('a save appears locally before the server answers', async () => {
    let resolve: ((v: unknown) => void) | null = null;
    api.saveTechFeedSearch.mockReturnValue(
      new Promise((r) => {
        resolve = r as (v: unknown) => void;
      }),
    );
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(api.reconcileTechFeedSavedSearches).toHaveBeenCalled());
    act(() => {
      void result.current.save('Remote SRE', DEFAULT_TECH_FEED_FILTERS);
    });
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    expect(result.current.saved[0].name).toBe('Remote SRE');
    // Settle the deferred promise inside `act` so the state update it causes
    // is flushed before the test ends, rather than leaking into the next one.
    await act(async () => {
      resolve?.({ data: { searches: [serverRow('x', 'Remote SRE')] } });
      await Promise.resolve();
    });
  });

  test('a save the server refused is MARKED, not lost', async () => {
    api.saveTechFeedSearch.mockResolvedValue({ error: 'offline' });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(api.reconcileTechFeedSavedSearches).toHaveBeenCalled());
    await act(async () => {
      await result.current.save('Only here', DEFAULT_TECH_FEED_FILTERS);
    });
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    expect(result.current.saved[0].pendingSync).toBe(true);
    expect(result.current.syncError).toBeTruthy();
  });

  test('reconcile pushes the local list up exactly once', async () => {
    window.localStorage.setItem(
      SAVED_SEARCHES_KEY,
      JSON.stringify([serverRow('local', 'Offline')]),
    );
    const { rerender } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(api.reconcileTechFeedSavedSearches).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(api.reconcileTechFeedSavedSearches).toHaveBeenCalledTimes(1);
    expect(api.reconcileTechFeedSavedSearches).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'local' }),
    ]);
  });

  test('a delete removes it locally even when the server call fails', async () => {
    api.reconcileTechFeedSavedSearches.mockResolvedValue({
      data: { searches: [serverRow('a', 'Doomed')] },
    });
    api.deleteTechFeedSavedSearch.mockResolvedValue({ error: 'offline' });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    await act(async () => {
      await result.current.remove('a');
    });
    expect(result.current.saved).toHaveLength(0);
    expect(result.current.syncError).toBeTruthy();
  });
});

describe('a transport that THROWS, not one that answers an error', () => {
  test('a synchronous throw is reported, not left as an unhandled rejection', async () => {
    // A bundle whose `apiService` predates these routes - a partial deploy,
    // a stale cached chunk - has no such method at all. That is a
    // `TypeError` thrown before any promise exists.
    api.reconcileTechFeedSavedSearches.mockImplementation(() => {
      throw new TypeError('apiService.reconcileTechFeedSavedSearches is not a function');
    });
    window.localStorage.setItem(
      SAVED_SEARCHES_KEY,
      JSON.stringify([serverRow('local-1', 'Saved before the deploy')]),
    );
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.syncError).toBeTruthy());
    // The list the user already had is untouched, and the spinner stops.
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].name).toBe('Saved before the deploy');
    expect(result.current.syncing).toBe(false);
  });

  test('a save whose transport throws is kept locally and marked pendingSync', async () => {
    api.saveTechFeedSearch.mockImplementation(() => {
      throw new Error('network down');
    });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.syncing).toBe(false));
    await act(async () => {
      await result.current.save('Staff backend', DEFAULT_TECH_FEED_FILTERS);
    });
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].pendingSync).toBe(true);
    expect(result.current.syncError).toBe('network down');
  });

  test('a delete whose transport throws still removes it HERE', async () => {
    api.deleteTechFeedSavedSearch.mockImplementation(() => {
      throw new Error('network down');
    });
    window.localStorage.setItem(
      SAVED_SEARCHES_KEY,
      JSON.stringify([serverRow('gone', 'Remove me')]),
    );
    api.reconcileTechFeedSavedSearches.mockResolvedValue({
      data: { searches: [serverRow('gone', 'Remove me')] },
    });
    const { result } = renderHook(() => useSavedTechFeedSearches());
    await waitFor(() => expect(result.current.saved).toHaveLength(1));
    await act(async () => {
      await result.current.remove('gone');
    });
    expect(result.current.saved).toHaveLength(0);
    expect(result.current.syncError).toBe('network down');
  });
});
