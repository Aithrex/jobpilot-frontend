import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkTimeZoneChange,
  detectedTimeZone,
  setTimeZoneOverride,
  TIMEZONE_CHANGED,
  timeZoneOverride,
  viewerTimeZone,
  viewerTzOffsetMinutes,
  zoneOffsetMinutes,
} from '@/lib/viewerTimezone';

/** Node honours a runtime `process.env.TZ` change - the browser's own move. */
const ORIGINAL_TZ = process.env.TZ;
const OCT_26 = new Date('2026-10-26T18:00:00Z'); // DST still on in the US
const DEC_1 = new Date('2026-12-01T18:00:00Z');  // standard time
const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const signIn = (sub: string) =>
  localStorage.setItem('auth_token', `${b64url({ alg: 'HS256' })}.${b64url({ sub })}.sig`);

beforeEach(() => {
  localStorage.clear();
  process.env.TZ = 'America/Phoenix';
  checkTimeZoneChange(); // baseline for change detection
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
  localStorage.clear();
});

describe('viewer time zone', () => {
  it('is automatic: read from the browser every time, so travel is followed', () => {
    expect(viewerTimeZone()).toBe('America/Phoenix');
    expect(viewerTzOffsetMinutes(OCT_26)).toBe(-420);
    process.env.TZ = 'America/Chicago'; // Arizona -> Texas
    expect(detectedTimeZone()).toBe('America/Chicago');
    expect(viewerTimeZone()).toBe('America/Chicago');
    expect(viewerTzOffsetMinutes(OCT_26)).toBe(-300);
    expect(viewerTzOffsetMinutes(DEC_1)).toBe(-360);
  });

  it('announces a move so the feed can re-fetch', () => {
    const heard = vi.fn();
    window.addEventListener(TIMEZONE_CHANGED, heard);
    checkTimeZoneChange();
    expect(heard).not.toHaveBeenCalled();
    process.env.TZ = 'America/Chicago';
    checkTimeZoneChange();
    expect(heard).toHaveBeenCalledTimes(1);
    checkTimeZoneChange();
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(TIMEZONE_CHANGED, heard);
  });

  it('a zone pinned in Settings wins over travel until Automatic is chosen', () => {
    setTimeZoneOverride('America/New_York');
    expect(viewerTimeZone()).toBe('America/New_York');
    expect(viewerTzOffsetMinutes(OCT_26)).toBe(-240);
    process.env.TZ = 'America/Los_Angeles';
    expect(viewerTimeZone()).toBe('America/New_York');
    setTimeZoneOverride(null);
    expect(timeZoneOverride()).toBeNull();
    expect(viewerTimeZone()).toBe('America/Los_Angeles');
  });

  it("another account's pin on this browser is not yours", () => {
    signIn('tej@example.com');
    setTimeZoneOverride('America/New_York');
    signIn('bhavya@example.com');
    expect(timeZoneOverride()).toBeNull();
    expect(viewerTimeZone()).toBe('America/Phoenix');
  });

  it('ignores an invalid pin and computes offsets across the globe', () => {
    setTimeZoneOverride('Mars/Olympus_Mons');
    expect(timeZoneOverride()).toBeNull();
    expect(zoneOffsetMinutes('Asia/Kolkata', OCT_26)).toBe(330);
    expect(zoneOffsetMinutes('Pacific/Honolulu', OCT_26)).toBe(-600);
    expect(zoneOffsetMinutes('UTC', OCT_26)).toBe(0);
  });
});
