/**
 * Employer-type preferences: optimistic write, rollback on failure, and a
 * feed refresh after a save lands (the SERVER re-filters; the client never
 * filters by policy itself).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import {
  EMPLOYER_PREFERENCES_CHANGED_EVENT,
  EMPLOYER_PREFERENCES_QUERY_KEY,
  useEmployerPreferences,
} from '@/hooks/useEmployerPreferences';
import { apiService } from '@/lib/api';
import { STRICT_DIRECT_DEFAULT, withExclusion } from '@/lib/employerPolicy';

vi.mock('@/lib/api', () => ({
  apiService: {
    getEmployerPreferences: vi.fn(),
    saveEmployerPreferences: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const api = apiService as unknown as Record<string, Mock>;

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  api.getEmployerPreferences.mockResolvedValue({ data: STRICT_DIRECT_DEFAULT, status: 200 });
});

describe('useEmployerPreferences', () => {
  test('loads what the server returns, including set_by', async () => {
    const { result } = renderHook(() => useEmployerPreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences).not.toBeNull());
    expect(result.current.preferences?.preset).toBe('strict_direct');
    expect(result.current.preferences?.set_by).toBe('default');
  });

  test('a save is optimistic, then refreshes the feeds and announces the change', async () => {
    let resolveSave: (v: unknown) => void = () => {};
    api.saveEmployerPreferences.mockReturnValue(new Promise((r) => { resolveSave = r; }));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const announced = vi.fn();
    window.addEventListener(EMPLOYER_PREFERENCES_CHANGED_EVENT, announced);

    const { result } = renderHook(() => useEmployerPreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences).not.toBeNull());

    const next = withExclusion(result.current.preferences!, 'staffing', false);
    let saved: Promise<boolean> = Promise.resolve(false);
    act(() => {
      saved = result.current.save(next);
    });
    // Optimistic: the toggle moved before the server answered.
    await waitFor(() => expect(result.current.preferences?.exclude.staffing).toBe(false));
    expect(api.saveEmployerPreferences).toHaveBeenCalledWith({ preset: 'custom', exclude: next.exclude });

    await act(async () => {
      resolveSave({ data: { ...next, set_by: 'user' }, status: 200 });
      await saved;
    });
    expect(result.current.preferences?.set_by).toBe('user');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tech-feed', 'search'] });
    expect(announced).toHaveBeenCalledTimes(1);
    window.removeEventListener(EMPLOYER_PREFERENCES_CHANGED_EVENT, announced);
  });

  test('a failed save rolls back to the stored choice and refreshes nothing', async () => {
    api.saveEmployerPreferences.mockResolvedValue({ error: 'HTTP 500', status: 500 });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEmployerPreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await result.current.save(withExclusion(result.current.preferences!, 'staffing', false));
    });
    expect(ok).toBe(false);
    expect(result.current.preferences?.exclude.staffing).toBe(true);
    expect(client.getQueryData(EMPLOYER_PREFERENCES_QUERY_KEY)).toEqual(STRICT_DIRECT_DEFAULT);
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['tech-feed', 'search'] });
  });

  test('a 404 marks the feature unavailable instead of erroring', async () => {
    api.getEmployerPreferences.mockResolvedValue({ error: 'HTTP 404', status: 404 });
    const { result } = renderHook(() => useEmployerPreferences(), { wrapper });
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.error).toBeNull();
  });
});
