/** Ordering and day-bucketing for the rows inside a stage column. */
import type { TailoringRecord } from '@/types/resume';
import { appliedDayOf, localDayISO } from '@/lib/applicationDates';

/**
 * Above this many rows a stage stops being a list you read and becomes one you
 * scroll past, so it rolls up into a row per day. Two weeks of thirty-a-day
 * applying is 420 rows in one column; the same thing as fourteen day headers is
 * something you can actually take in.
 */
export const DAY_ROLLUP_THRESHOLD = 25;

/** Soonest next action first, then most recently created. */
export function byUrgencyThenRecency(a: TailoringRecord, b: TailoringRecord): number {
  const aDue = a.application?.next_action_date
    ? new Date(a.application.next_action_date).getTime()
    : Infinity;
  const bDue = b.application?.next_action_date
    ? new Date(b.application.next_action_date).getTime()
    : Infinity;
  if (aDue !== bDue) return aDue - bDue;
  const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bCreated - aCreated;
}

/** The civil day an ISO instant falls on in the reader's timezone. */
function localDayOf(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : localDayISO(0, d);
}

/**
 * The day a record belongs to in a rollup: when it was applied to, or failing
 * that when it entered the tracker. Saved and Draft rows have no applied date,
 * and "everything under Not applied" would be a rollup of one bucket.
 */
export function rollupDayOf(record: TailoringRecord): string {
  return (
    appliedDayOf(record.application) ||
    localDayOf(record.application?.updated_at) ||
    localDayOf(record.created_at) ||
    ''
  );
}

export interface DayBucket {
  day: string;
  records: TailoringRecord[];
}

/** Most recent day first; anything undateable sinks to the bottom. */
export function buildDayBuckets(records: TailoringRecord[]): DayBucket[] {
  const buckets = new Map<string, TailoringRecord[]>();
  for (const record of records) {
    const day = rollupDayOf(record);
    const list = buckets.get(day);
    if (list) list.push(record);
    else buckets.set(day, [record]);
  }

  return [...buckets.keys()]
    .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)))
    .map((day) => ({ day, records: (buckets.get(day) || []).sort(byUrgencyThenRecency) }));
}
