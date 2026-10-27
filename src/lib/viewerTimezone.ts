import { useSyncExternalStore } from 'react';
import { currentAccountKey, ownedByAnotherAccount } from '@/lib/accountKey';

/**
 * The viewer's time zone: ONE definition for every request that carries it
 * and every calendar-day label ("Posted today", the midnight re-scan).
 *
 * Automatic by default, and read from the browser on EVERY call - never
 * cached - so a seeker who flies from Arizona to Texas gets Central days on
 * the next request with nothing to update. A seeker can instead pin a zone in
 * Settings; the pin is per account and per browser, and "Automatic" removes it.
 *
 * Any change - travel, a DST switch, a new pin - fires `TIMEZONE_CHANGED`, so
 * a surface whose labels are calendar days can re-fetch at once.
 */
const OVERRIDE_KEY = 'aspirely.timezone.v1';
export const TIMEZONE_CHANGED = 'timezone:changed';

/** The zones a US seeker lives in, offered first in Settings. */
export const US_TIME_ZONES: Array<{ zone: string; label: string }> = [
  { zone: 'America/New_York', label: 'Eastern' },
  { zone: 'America/Chicago', label: 'Central' },
  { zone: 'America/Denver', label: 'Mountain' },
  { zone: 'America/Phoenix', label: 'Arizona' },
  { zone: 'America/Los_Angeles', label: 'Pacific' },
  { zone: 'America/Anchorage', label: 'Alaska' },
  { zone: 'Pacific/Honolulu', label: 'Hawaii' },
];

export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** What this browser says right now. */
export function detectedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The zone this account pinned on this browser, or null for Automatic. */
export function timeZoneOverride(): string | null {
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const pin = JSON.parse(raw) as { zone?: unknown; owner?: unknown };
    if (ownedByAnotherAccount(pin.owner)) return null;
    return isValidTimeZone(pin.zone) ? pin.zone : null;
  } catch {
    return null;
  }
}

/** Pin a zone, or pass null to go back to Automatic. */
export function setTimeZoneOverride(zone: string | null): void {
  try {
    if (zone && isValidTimeZone(zone)) {
      window.localStorage.setItem(
        OVERRIDE_KEY,
        JSON.stringify({ zone, owner: currentAccountKey() || undefined }),
      );
    } else {
      window.localStorage.removeItem(OVERRIDE_KEY);
    }
  } catch {
    /* storage unavailable: the choice lasts this page only */
  }
  checkTimeZoneChange();
}

export function viewerTimeZone(): string {
  return timeZoneOverride() ?? detectedTimeZone();
}

/** Minutes EAST of UTC for `zone` at `at` (Phoenix = -420, IST = +330). */
export function zoneOffsetMinutes(zone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour') % 24,
    part('minute'), part('second'));
  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The backend's `tz_offset_minutes` (minutes east of UTC) for the viewer. */
export function viewerTzOffsetMinutes(at: Date = new Date()): number {
  const pinned = timeZoneOverride();
  return pinned ? zoneOffsetMinutes(pinned, at) : -at.getTimezoneOffset();
}

/** "Central Daylight Time" / "CDT" for a zone, right now. */
export function timeZoneName(zone: string, style: 'long' | 'short' = 'long'): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: style })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? zone;
  } catch {
    return zone;
  }
}

// ── Change detection ────────────────────────────────────────────────────────

let lastSeen = '';
const signature = () => `${viewerTimeZone()}|${viewerTzOffsetMinutes()}`;

/** Fire `TIMEZONE_CHANGED` if the zone or its offset moved since last seen.
 *  Runs on focus, on returning to the tab, every minute, on sign-in changes
 *  and on a new pin - travel is noticed without a reload. */
export function checkTimeZoneChange(): void {
  if (typeof window === 'undefined') return;
  const now = signature();
  if (lastSeen && now !== lastSeen) {
    lastSeen = now;
    window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGED, { detail: { zone: viewerTimeZone() } }));
    return;
  }
  lastSeen = now;
}

if (typeof window !== 'undefined') {
  lastSeen = signature();
  window.addEventListener('focus', checkTimeZoneChange);
  document.addEventListener('visibilitychange', checkTimeZoneChange);
  window.addEventListener('auth:token-changed', checkTimeZoneChange);
  window.setInterval(checkTimeZoneChange, 60_000);
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(TIMEZONE_CHANGED, listener);
  return () => window.removeEventListener(TIMEZONE_CHANGED, listener);
}

/** The viewer's zone, re-rendering when it changes. */
export function useViewerTimeZone(): string {
  return useSyncExternalStore(subscribe, viewerTimeZone, viewerTimeZone);
}
