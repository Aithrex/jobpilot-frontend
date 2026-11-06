import { isAppliedSavedJob } from '@/lib/savedJobs';
import type { SavedJob } from '@/types/jobs';

/**
 * Saved and Applied, grouped by the NEXT STEP instead of counted.
 *
 * A tab that said "99+" told the user nothing they could act on. Each saved
 * job now lands in exactly one group, and the tab shows only the number that
 * asks for action: saved roles still open, and applications due a follow-up.
 *
 * Every rule reads what the server knows (`next_step`, 2026-11-05); a row from
 * an older backend without it degrades to the plain groups - never to
 * "closed", because a posting we cannot see is not a posting that closed.
 */

export const FOLLOW_UP_AFTER_DAYS = 7;
/** Saved roles posted this long ago are flagged: many are filled by then. */
export const GETTING_OLD_DAYS = 25;

export type SavedGroup = 'ready' | 'tailor' | 'old' | 'archived';
export type AppliedGroup = 'follow_up' | 'waiting' | 'interviewing' | 'closed';

export const SAVED_GROUPS: Array<{ key: SavedGroup; label: string; hint: string; collapsed?: boolean }> = [
  { key: 'ready', label: 'Ready to apply', hint: 'Still open, resume already tailored' },
  { key: 'tailor', label: 'Needs tailoring', hint: 'Still open, no tailored resume yet' },
  { key: 'old', label: 'Getting old', hint: `Posted ${GETTING_OLD_DAYS}+ days ago, apply soon or let go` },
  { key: 'archived', label: 'Closed at the employer', hint: 'The posting was taken down', collapsed: true },
];

export const APPLIED_GROUPS: Array<{ key: AppliedGroup; label: string; hint: string; collapsed?: boolean }> = [
  { key: 'follow_up', label: 'Follow up', hint: `Applied ${FOLLOW_UP_AFTER_DAYS}+ days ago, no update yet` },
  { key: 'waiting', label: 'Waiting', hint: `Applied in the last ${FOLLOW_UP_AFTER_DAYS} days` },
  { key: 'interviewing', label: 'Interviewing', hint: 'Interview or offer stage' },
  { key: 'closed', label: 'Closed out', hint: 'Rejected or withdrawn', collapsed: true },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / DAY_MS)) : null;
}

/** How old the posting itself is: the server's date, else the card's own. */
function postingAgeDays(row: SavedJob, now: number): number | null {
  const fromServer = daysSince(row.next_step?.posted_at, now);
  if (fromServer != null) return fromServer;
  const card = row.job_data as { days_ago?: number | null; date_posted?: string };
  if (typeof card?.days_ago === 'number') {
    // The card's age was true on the day it was saved; add the time since.
    return card.days_ago + (daysSince(row.saved_at, now) ?? 0);
  }
  return daysSince(card?.date_posted, now);
}

export function savedGroupOf(row: SavedJob, now = Date.now()): SavedGroup {
  if (row.next_step?.posting_state === 'closed') return 'archived';
  const age = postingAgeDays(row, now);
  if (age != null && age >= GETTING_OLD_DAYS) return 'old';
  return row.next_step?.tailored ? 'ready' : 'tailor';
}

export function appliedGroupOf(row: SavedJob, now = Date.now()): AppliedGroup {
  const status = (row.next_step?.tracker_status || row.status || '').toLowerCase();
  const own = (row.status || '').toLowerCase();
  if (own === 'rejected' || own === 'withdrawn' || status === 'rejected' || status === 'withdrawn') return 'closed';
  if (own === 'interview' || own === 'offer' || status === 'interview' || status === 'offer') return 'interviewing';
  const days = daysSince(row.next_step?.applied_at, now);
  // No applied date known: we cannot say a follow-up is due, so it waits.
  if (days != null && days >= FOLLOW_UP_AFTER_DAYS) return 'follow_up';
  return 'waiting';
}

export interface SavedTabCounts {
  /** Saved, not applied, posting not known to be closed. */
  toApply: number;
  /** Applications due a follow-up. */
  followUps: number;
  interviewing: number;
  savedTotal: number;
  appliedTotal: number;
}

export function savedTabCounts(rows: readonly SavedJob[], now = Date.now()): SavedTabCounts {
  const out: SavedTabCounts = { toApply: 0, followUps: 0, interviewing: 0, savedTotal: 0, appliedTotal: 0 };
  for (const row of rows) {
    if (isAppliedSavedJob(row)) {
      out.appliedTotal += 1;
      const g = appliedGroupOf(row, now);
      if (g === 'follow_up') out.followUps += 1;
      if (g === 'interviewing') out.interviewing += 1;
    } else {
      out.savedTotal += 1;
      if (savedGroupOf(row, now) !== 'archived') out.toApply += 1;
    }
  }
  return out;
}

export function groupRows<K extends string>(
  rows: readonly SavedJob[],
  groupOf: (row: SavedJob) => K,
  order: ReadonlyArray<{ key: K }>,
): Map<K, SavedJob[]> {
  const out = new Map<K, SavedJob[]>(order.map(({ key }) => [key, [] as SavedJob[]]));
  for (const row of rows) out.get(groupOf(row))?.push(row);
  return out;
}
