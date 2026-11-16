import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSync } from '@/hooks/useAutoSync';

/** A failed refresh retries soon with growing waits; offline waits for the
 *  connection and catches up at once. */
const THIRTY_MIN = 30 * 60 * 1000;
const MIN = 60 * 1000;

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useAutoSync when things go wrong', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('retries a failed refresh after 1 minute, then 2, keeping the list', async () => {
    const onSync = vi.fn().mockResolvedValueOnce('ok').mockResolvedValue('error');
    const { result } = renderHook(() =>
      useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync }));
    await advance(0);
    expect(onSync).toHaveBeenCalledTimes(1);

    await advance(THIRTY_MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(2);
    expect(result.current.failing).toBe(true);

    await advance(MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(3);
    await advance(MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(3); // the next wait is 2 minutes
    await advance(MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(4);
  });

  it('waits while offline and catches up when the connection returns', async () => {
    const onSync = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() =>
      useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync }));
    await advance(0);
    expect(onSync).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.offline).toBe(true);
    await advance(THIRTY_MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event('online')); });
    await advance(0);
    expect(result.current.offline).toBe(false);
    expect(onSync).toHaveBeenCalledTimes(2);
  });

  it('another tab refreshing re-arms the countdown instead of running', async () => {
    const onSync = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() =>
      useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync }));
    await advance(0);
    await advance(20 * MIN);
    act(() => result.current.touch());
    await advance(15 * MIN);
    expect(onSync).toHaveBeenCalledTimes(1);
    await advance(15 * MIN + 10);
    expect(onSync).toHaveBeenCalledTimes(2);
  });
});
