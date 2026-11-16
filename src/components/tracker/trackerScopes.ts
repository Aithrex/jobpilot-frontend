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
import { FOLLOW_UP_AFTER_DAYS, needsFollowUp } from './trackerInsights';
import { daysUntil, isConfirmationPending } from './trackerUtils';

/**
 * The three things the page can be about. They used to be Focus, Active and
 * All, which named how much of one list to show; these name what you came to
 * do, and Insights was a button nobody found.
 */
export type TrackerView = 'todo' | 'applications' | 'insights';

export const VIEWS: { key: TrackerView; label: string; hint: string }[] = [
  { key: 'todo', label: 'To do', hint: 'Only what needs something from you' },
  { key: 'applications', label: 'Applications', hint: 'Every application, by stage' },
  { key: 'insights', label: 'Insights', hint: 'How your search is going, in numbers' },
];

/** Days of silence after applying before a follow-up is suggested. */
export const GOING_QUIET_DAYS = FOLLOW_UP_AFTER_DAYS;
/** How far ahead "this week" looks. Matches the old upcoming banner. */
export const UPCOMING_DAYS = 14;

const CLOSED = new Set(['rejected', 'withdrawn', 'ghosted']);

export function isClosed(record: TailoringRecord): boolean {
  return CLOSED.has(statusKeyOf(record.application?.status));
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
    label: 'Confirm you applied',
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
    label: 'Follow up',
    description: `Applied ${GOING_QUIET_DAYS} or more days ago with no reply`,
    match: (r) => needsFollowUp(r),
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

/** How many records want attention. Drives the To do count in the toolbar. */
export function focusCount(records: TailoringRecord[]): number {
  return records.filter(
    (r) => !isClosed(r) && FOCUS_SECTIONS.some((s) => s.match(r)),
  ).length;
}

export function viewRecords(records: TailoringRecord[], view: TrackerView): TailoringRecord[] {
  if (view !== 'todo') return records;
  return records.filter((r) => !isClosed(r) && FOCUS_SECTIONS.some((s) => s.match(r)));
}
