import { afterEach, describe, expect, it } from 'vitest';
import { formatDate } from '../TechFeedJobCard';

/**
 * A posting DATE is stored as midnight UTC. Rendered in a US timezone that is
 * the previous evening, so a job dated Oct 26 read "Posted Oct 25" (reported
 * from Phoenix, 2026-10-26). Node honours a runtime `process.env.TZ` change.
 */
const ORIGINAL_TZ = process.env.TZ;
const fmt = (y: number, m: number, d: number, timeZone: string) =>
  new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone,
  });

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe('tech feed posted date', () => {
  it.each(['America/Phoenix', 'America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu'])(
    'renders the published date, not the previous evening, in %s',
    (tz) => {
      process.env.TZ = tz;
      const oct26 = fmt(2026, 10, 26, tz);
      expect(formatDate('2026-10-26T00:00:00+00:00')).toBe(oct26);
      expect(formatDate('Mon, 26 Oct 2026 00:00:00 GMT')).toBe(oct26); // Flask's encoding
      expect(formatDate('2026-10-26T04:00:00.000Z')).toBe(oct26); // iCIMS midnight EDT
    },
  );

  it('keeps a real instant in the viewer zone', () => {
    process.env.TZ = 'America/Phoenix';
    // 01:15:42Z is 18:15 the previous evening in Phoenix - a real moment.
    expect(formatDate('2026-10-26T01:15:42Z')).toBe(fmt(2026, 10, 25, 'America/Phoenix'));
  });

  it.each(['Asia/Kolkata', 'UTC', 'Pacific/Kiritimati'])('is unchanged east of UTC (%s)', (tz) => {
    process.env.TZ = tz;
    const inZone = (iso: string) =>
      new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', timeZone: tz,
      });
    // East of UTC the local date is already the published one or newer
    // (11:00Z is Oct 27 in UTC+14), so the viewer zone keeps rendering it.
    for (const iso of ['2026-10-26T00:00:00Z', '2026-10-26T04:00:00Z', '2026-10-26T11:00:00Z']) {
      expect(formatDate(iso)).toBe(inZone(iso));
    }
  });

  it('returns null for missing or unparseable input', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate('not a date')).toBeNull();
  });
});
