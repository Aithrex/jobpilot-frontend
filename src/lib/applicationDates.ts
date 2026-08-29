/**
 * Civil-day helpers for the application tracker.
 *
 * The backend stores two different kinds of time on an application:
 *
 *   - `applied_at`  — a UTC instant. Answers *when* it happened.
 *   - `applied_date` — a "YYYY-MM-DD" civil day, frozen in the user's zone at
 *     confirmation time. Answers *which day* it counts for.
 *
 * Everything here works in civil days, so filtering and display never re-derive
 * a day from an instant (which would shift an evening application into the next
 * day, and shift it again whenever the user travels).
 */

/** Local "YYYY-MM-DD", optionally offset by whole days. */
export function localDayISO(offsetDays = 0, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** First day of the current local month, as "YYYY-MM-DD". */
export function startOfLocalMonthISO(base: Date = new Date()): string {
  return `${base.getFullYear()}-${`${base.getMonth() + 1}`.padStart(2, '0')}-01`;
}

/**
 * A picked "YYYY-MM-DD" -> the instant to store as `applied_at`.
 *
 * Anchored at **noon** local, not midnight. Midnight sits exactly on the day
 * boundary, so any westward reinterpretation or a DST shift flips it to the
 * previous day; noon survives a +/-12h reinterpretation intact.
 */
export function civilDayToInstant(day: string): string {
  return new Date(`${day}T12:00:00`).toISOString();
}

/**
 * The civil day an application belongs to.
 *
 * Prefers the stored `applied_date`. Falls back to deriving it from
 * `applied_at` for records written before that field existed — the backend
 * serializes naive-UTC timestamps with no `Z`, which `Date` would otherwise
 * read as local time, so the zone is forced before converting.
 */
export function appliedDayOf(app?: {
  applied_date?: string | null;
  applied_at?: string | null;
} | null): string | null {
  const stored = app?.applied_date;
  if (stored) return stored.slice(0, 10);

  const iso = app?.applied_at;
  if (!iso) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return isNaN(d.getTime()) ? null : localDayISO(0, d);
}

/**
 * Format a civil day for display.
 *
 * Forced to UTC so a date-only string cannot shift a second time on its way to
 * the screen — the same guard `StreakWidget` uses for its date-only keys.
 */
export function formatCivilDay(
  day?: string | null,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  if (!day) return '';
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}
