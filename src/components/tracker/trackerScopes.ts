/**
 * What the tracker is asking, at three levels of zoom.
 *
 * At thirty applications a day, "show me everything" stops being a useful
 * default: two weeks is 420 rows and almost none of them want anything from
 * you. Focus is the answer to "what needs me", derived entirely from fields
 * that already exist, so there is no schema to migrate and nothing to keep in
 * sync.
 */
import type { TailoringRecord } from '@/types/resume';

import { statusKeyOf } from './trackerConfig';
import { daysUntil, isConfirmationPending } from './trackerUtils';

export type Scope = 'focus' | 'active' | 'all';

export const SCOPES: { key: Scope; label: string; hint: string }[] = [
  { key: 'focus', label: 'Focus', hint: 'Needs a decision from you' },
  { key: 'active', label: 'Active', hint: 'Everything still in play' },
  { key: 'all', label: 'All', hint: 'Including closed' },
];

/** Days of silence after applying before we call it going quiet. */
export const GOING_QUIET_DAYS = 10;
/** How far ahead "this week" looks. Matches the old upcoming banner. */
export const UPCOMING_DAYS = 14;

const CLOSED = new Set(['rejected', 'withdrawn', 'ghosted']);

export function isClosed(record: TailoringRecord): boolean {
  return CLOSED.has(statusKeyOf(record.application?.status));
}

/** Whole days since an ISO instant, or null when it is unparseable. */
function daysSince(iso?: string | null): number | null {
  const ahead = daysUntil(iso);
  return ahead === null ? null : -ahead;
}

/**
 * The sections of the Focus view, in the order they are read. Each one is a
 * different reason a record wants attention, and a record appears in the first
 * bucket it qualifies for so nothing is listed twice.
 */
export type FocusSectionId = 'unanswered' | 'overdue' | 'upcoming' | 'quiet';

export interface FocusSection {
  id: FocusSectionId;
  label: string;
  /** Shown when the section is empty and every other one is too. */
  description: string;
  match: (record: TailoringRecord) => boolean;
}

export const FOCUS_SECTIONS: FocusSection[] = [
  {
    id: 'unanswered',
    label: 'Needs an answer',
    description: 'Tailored resumes you have not said whether you applied to',
    match: (r) => isConfirmationPending(r.application),
  },
  {
    id: 'overdue',
    label: 'Overdue',
    description: 'Next actions whose date has passed',
    match: (r) => {
      const due = daysUntil(r.application?.next_action_date);
      return due !== null && due < 0;
    },
  },
  {
    id: 'upcoming',
    label: 'This week',
    description: 'Next actions coming up',
    match: (r) => {
      const due = daysUntil(r.application?.next_action_date);
      return due !== null && due >= 0 && due <= UPCOMING_DAYS;
    },
  },
  {
    id: 'quiet',
    label: 'Going quiet',
    description: `Applied over ${GOING_QUIET_DAYS} days ago with no reply`,
    match: (r) => {
      if (statusKeyOf(r.application?.status) !== 'applied') return false;
      const since = daysSince(
        r.application?.updated_at || r.application?.applied_at || r.updated_at,
      );
      return since !== null && since >= GOING_QUIET_DAYS;
    },
  },
];

/**
 * Bucket records into the Focus sections, first match wins. Closed records
 * never qualify — a rejection is not an outstanding decision.
 */
export function buildFocusSections(
  records: TailoringRecord[],
): { section: FocusSection; records: TailoringRecord[] }[] {
  const buckets = new Map<FocusSectionId, TailoringRecord[]>();

  for (const record of records) {
    if (isClosed(record)) continue;
    const section = FOCUS_SECTIONS.find((s) => s.match(record));
    if (!section) continue;
    const list = buckets.get(section.id);
    if (list) list.push(record);
    else buckets.set(section.id, [record]);
  }

  return FOCUS_SECTIONS.filter((s) => buckets.has(s.id)).map((section) => ({
    section,
    records: buckets.get(section.id) || [],
  }));
}

/** How many records want attention. Drives the Focus count in the toolbar. */
export function focusCount(records: TailoringRecord[]): number {
  return records.filter(
    (r) => !isClosed(r) && FOCUS_SECTIONS.some((s) => s.match(r)),
  ).length;
}

export function scopeRecords(records: TailoringRecord[], scope: Scope): TailoringRecord[] {
  if (scope === 'all') return records;
  if (scope === 'active') return records.filter((r) => !isClosed(r));
  return records.filter((r) => !isClosed(r) && FOCUS_SECTIONS.some((s) => s.match(r)));
}
