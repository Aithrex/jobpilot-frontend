import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSync } from '@/hooks/useAutoSync';

/**
 * "Today" and "Yesterday" are the viewer's calendar days. A feed scanned at
 * 23:50 kept calling yesterday's roles "today" until the next 30-minute tick;
 * with `refreshOnNewDay` it re-scans just past local midnight.
 */
const ORIGINAL_TZ = process.env.TZ;
const THIRTY_MIN = 30 * 60 * 1000;

function mount(refreshOnNewDay: boolean) {
  const onSync = vi.fn(() => Promise.resolve());
  renderHook(() => useAutoSync({ enabled: true, intervalMs: THIRTY_MIN, isBusy: false, onSync, refreshOnNewDay }));
  return onSync;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useAutoSync day rollover', () => {
  beforeEach(() => {
    process.env.TZ = 'America/Phoenix';
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 26, 23, 50, 0)); // 23:50 local, Oct 26
  });
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = ORIGINAL_TZ;
  });

  it('re-scans just after local midnight, not 30 minutes after the last scan', async () => {
    const onSync = mount(true);
    await advance(0);
    expect(onSync).toHaveBeenCalledTimes(1); // the initial load

    await advance(10 * 60 * 1000); // 00:00 - inside the clock-skew grace
    expect(onSync).toHaveBeenCalledTimes(1);

    await advance(2 * 60 * 1000 + 1000); // 00:02:01 local, Oct 27
    expect(onSync).toHaveBeenCalledTimes(2);
    expect(onSync).toHaveBeenLastCalledWith(true, 'interval');
  });

  it('keeps the plain interval when the surface did not opt in', async () => {
    const onSync = mount(false);
    await advance(0);
    await advance(13 * 60 * 1000); // 00:03 - past midnight, before 30 minutes
    expect(onSync).toHaveBeenCalledTimes(1);
    await advance(17 * 60 * 1000 + 1000);
    expect(onSync).toHaveBeenCalledTimes(2);
  });

  it('mid-day it still syncs on the normal interval', async () => {
    vi.setSystemTime(new Date(2026, 9, 26, 10, 0, 0));
    const onSync = mount(true);
    await advance(0);
    await advance(THIRTY_MIN + 1000);
    expect(onSync).toHaveBeenCalledTimes(2);
  });
});
