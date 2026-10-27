import { useCallback, useEffect, useRef, useState } from 'react';
import { viewerTzOffsetMinutes } from '@/lib/viewerTimezone';

export type SyncReason = 'initial' | 'interval' | 'manual';

interface UseAutoSyncOptions {
  /** Auto behaviors (initial auto-load + interval refresh + countdown) only
   *  run while this is true. Manual `sync()` always works regardless, so a
   *  gated/free user can still trigger a run (and get the upgrade prompt). */
  enabled: boolean;
  /** Refresh cadence in ms (e.g. 30 min). */
  intervalMs: number;
  /** True while a scan is already in flight - auto ticks skip so we never
   *  stack concurrent scans. */
  isBusy: boolean;
  /** Runs the actual search. `force` = bypass cache (used by interval +
   *  manual refresh). Resolve when the run finishes so we can stamp
   *  `lastSyncedAt` and re-arm the countdown. */
  onSync: (force: boolean, reason: SyncReason) => Promise<unknown> | unknown;
  /** Also re-run just after the viewer's local midnight. For results whose
   *  labels are calendar days ("Today", "Yesterday"): a scan taken at 11pm
   *  must not keep calling yesterday's roles "today" for up to an interval. */
  refreshOnNewDay?: boolean;
}

/** Past local midnight before a day-rollover sync fires. The SERVER decides
 *  which day it is, so a client clock a little fast must not re-scan while
 *  the server still reads the previous day. */
const NEW_DAY_GRACE_MS = 2 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The next midnight in the VIEWER's zone (browser, or the zone pinned in
 *  Settings) - the day "Today" is counted in. */
function nextLocalMidnight(t: number): number {
  const offset = viewerTzOffsetMinutes(new Date(t)) * 60_000;
  return (Math.floor((t + offset) / DAY_MS) + 1) * DAY_MS - offset;
}

interface AutoSyncState {
  /** Epoch ms of the last completed sync, or null before the first one. */
  lastSyncedAt: number | null;
  /** Whole seconds until the next scheduled auto-refresh, or null when auto
   *  sync is off / not yet armed. Ticks every second for a live display. */
  secondsUntilNext: number | null;
  /** Whether auto sync is currently armed (enabled + has run at least once). */
  autoArmed: boolean;
  /** Trigger a run by hand. `force` bypasses cache. Re-arms the countdown. */
  sync: (force: boolean) => void;
}

/**
 * Drives "it just stays fresh" surfaces: fires an initial load, then quietly
 * re-runs on a fixed cadence - but only while the tab is actually visible and
 * no scan is already running. Also exposes a live countdown to the next sync
 * and a manual trigger, so a panel can show "Updated 3m ago · next in 27:00"
 * with a Sync-now button.
 *
 * Timers are paused for background tabs (visibilitychange) so we don't burn a
 * scan while the user is elsewhere; a tab returning to the foreground past its
 * interval syncs immediately.
 */
export function useAutoSync({
  enabled,
  intervalMs,
  isBusy,
  onSync,
  refreshOnNewDay = false,
}: UseAutoSyncOptions): AutoSyncState {
  /** When the next sync is due after one that finished at `t`. */
  const dueAfter = useCallback(
    (t: number) => (refreshOnNewDay
      ? Math.min(t + intervalMs, nextLocalMidnight(t) + NEW_DAY_GRACE_MS)
      : t + intervalMs),
    [intervalMs, refreshOnNewDay],
  );

  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [nextSyncAt, setNextSyncAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Keep the latest closures/flags in refs so the interval effect doesn't need
  // to tear down and rebuild on every render (which would reset the cadence).
  const onSyncRef = useRef(onSync);
  const isBusyRef = useRef(isBusy);
  const runningRef = useRef(false);
  const didInitRef = useRef(false);
  onSyncRef.current = onSync;
  isBusyRef.current = isBusy;

  const doSync = useCallback(async (force: boolean, reason: SyncReason) => {
    // Never stack scans: skip if one is in flight (either ours or the panel's).
    if (runningRef.current || isBusyRef.current) return;
    runningRef.current = true;
    try {
      await onSyncRef.current(force, reason);
    } finally {
      runningRef.current = false;
      setLastSyncedAt(Date.now());
      setNextSyncAt(dueAfter(Date.now()));
    }
  }, [dueAfter]);

  // Initial auto-load - once, when auto sync first becomes enabled.
  useEffect(() => {
    if (!enabled || didInitRef.current) return;
    didInitRef.current = true;
    void doSync(false, 'initial');
  }, [enabled, doSync]);

  // Interval refresh - a self-re-arming timeout scheduled from the LAST sync,
  // so the visible countdown always matches when it actually fires (including
  // right after a manual Sync-now). Hidden tabs are skipped and caught up on
  // refocus; an in-flight scan's completion stamps `lastSyncedAt`, which
  // re-runs this effect and re-arms the next tick.
  useEffect(() => {
    if (!enabled) return;

    const base = lastSyncedAt ?? Date.now();
    const delay = Math.max(0, dueAfter(base) - Date.now());
    const id = window.setTimeout(() => {
      if (document.visibilityState !== 'visible' || isBusyRef.current) return;
      void doSync(true, 'interval');
    }, delay);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Returning to the tab after the window elapsed → refresh now.
      setNextSyncAt((next) => {
        if (next != null && Date.now() >= next) void doSync(true, 'interval');
        return next;
      });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, dueAfter, lastSyncedAt, doSync]);

  // 1-second ticker purely for the countdown display; only armed once we have
  // a scheduled next sync so idle surfaces don't tick.
  useEffect(() => {
    if (!enabled || nextSyncAt == null) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled, nextSyncAt]);

  const sync = useCallback((force: boolean) => {
    void doSync(force, 'manual');
  }, [doSync]);

  const secondsUntilNext = enabled && nextSyncAt != null
    ? Math.max(0, Math.round((nextSyncAt - nowTick) / 1000))
    : null;

  return {
    lastSyncedAt,
    secondsUntilNext,
    autoArmed: enabled && lastSyncedAt != null,
    sync,
  };
}
