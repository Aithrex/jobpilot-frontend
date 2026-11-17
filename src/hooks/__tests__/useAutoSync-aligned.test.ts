import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSync } from '@/hooks/useAutoSync';

/** The board is rebuilt on the server every 30 minutes. The open page looks
 *  right after that rebuild, not a full interval after its own last look, and
 *  shows how long until then. */
const THIRTY_MIN = 30 * 60 * 1000;
const MIN = 60 * 1000;

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useAutoSync aimed at the server rebuild', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('looks when the stored board is next due, and counts down to it', async () => {
    const onSync = vi.fn().mockResolvedValue('ok');
    // The board on screen was built 20 minutes ago: due in about 12 minutes.
    const due = Date.now() + 12 * MIN;
    const { result } = renderHook(() =>
      useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync, nextDueAt: due }));
    await advance(0);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(result.current.secondsUntilNext).toBe(12 * 60);

    await advance(12 * MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(2);
  });

  it('a due time already passed (the server is late) looks again in 5 minutes', async () => {
    const onSync = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() =>
      useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync, nextDueAt: Date.now() - MIN }));
    await advance(0);
    expect(result.current.secondsUntilNext).toBe(5 * 60);
    await advance(5 * MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(2);
  });
});
