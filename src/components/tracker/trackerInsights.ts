/**
 * What the tracker knows about how the search is going, as plain numbers.
 *
 * Everything here is worked out from the rows the page already holds, so the
 * figures move the moment a stage changes and never disagree with the list
 * beside them. (They used to come from a second endpoint that also asked a
 * language model for a paragraph on every open.)
 *
 * One rule runs through all of it: an application is counted for every stage
 * it has REACHED, not only the one it sits in now. A rejection after two
 * interviews still reached interview. The backend records the first time each
 * stage was set (`application.stage_dates`); rows from before that existed
 * fall back to what their current stage implies.
 */
import type { ApplicationStatus, TailoringRecord } from '@/types/resume';
import { appliedDayOf, localDayISO } from '@/lib/applicationDates';

import { statusKeyOf } from './trackerConfig';
import { isUntailoredStub } from './trackerUtils';

const DAY_MS = 86_400_000;

/** A reply this late is rare enough that the application can be closed out. */
export const STALE_AFTER_DAYS = 30;
/** Silence long enough to be worth a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 7;
/** A rate from fewer applications than this is noise, so it is not compared. */
export const MIN_GROUP_SIZE = 10;
export const WEEKS_SHOWN = 8;

/** The backend writes naive timestamps in UTC; `Date` would read them as local. */
function toMs(iso?: string | null): number | null {
  if (!iso) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2}|GMT)$/.test(iso);
  const t = new Date(hasZone ? iso : `${iso}Z`).getTime();
  return Number.isNaN(t) ? null : t;
}

function stageMs(record: TailoringRecord, stage: ApplicationStatus): number | null {
  return toMs(record.application?.stage_dates?.[stage]);
}

/** When the application was sent, or null when it never was. */
export function appliedMs(record: TailoringRecord): number | null {
  const day = appliedDayOf(record.application);
  // Noon on the civil day: the day the user counts it for, safe from zone shifts.
  if (day) return new Date(`${day}T12:00:00`).getTime();
  return stageMs(record, 'applied');
}

export function wasApplied(record: TailoringRecord): boolean {
  const status = statusKeyOf(record.application?.status);
  return (status !== 'saved' && status !== 'draft') || appliedMs(record) !== null;
}

/** Reached an interview at any point, whatever happened afterwards. */
export function reachedInterview(record: TailoringRecord): boolean {
  const status = statusKeyOf(record.application?.status);
  return (
    status === 'interviewing' ||
    status === 'offer' ||
    stageMs(record, 'interviewing') !== null ||
    stageMs(record, 'offer') !== null ||
    (record.application?.interview_dates?.length ?? 0) > 0
  );
}

export function reachedOffer(record: TailoringRecord): boolean {
  return statusKeyOf(record.application?.status) === 'offer' || stageMs(record, 'offer') !== null;
}

/** The employer answered: an interview, an offer, or a no. */
export function gotReply(record: TailoringRecord): boolean {
  return (
    reachedInterview(record) ||
    statusKeyOf(record.application?.status) === 'rejected' ||
    stageMs(record, 'rejected') !== null
  );
}

/** Applied, and nothing has come back. */
export function isWaiting(record: TailoringRecord): boolean {
  return statusKeyOf(record.application?.status) === 'applied' && !gotReply(record);
}

function firstReplyMs(record: TailoringRecord): number | null {
  const dated = (['interviewing', 'offer', 'rejected'] as const)
    .map((stage) => stageMs(record, stage))
    .filter((t): t is number => t !== null);
  if (dated.length) return Math.min(...dated);
  // No stage history: the last change is the reply only while the application
  // still sits in the stage that reply put it in.
  const status = statusKeyOf(record.application?.status);
  if (status === 'interviewing' || status === 'offer' || status === 'rejected') {
    return toMs(record.application?.updated_at);
  }
  return null;
}

/** Whole days an application has gone unanswered, or null when it is not waiting. */
export function waitingDays(record: TailoringRecord, now: number = Date.now()): number | null {
  if (!isWaiting(record)) return null;
  const sent = appliedMs(record) ?? toMs(record.application?.updated_at) ?? toMs(record.created_at);
  if (sent === null) return null;
  // Whole calendar days, midnight to midnight. Counting elapsed 24-hour
  // spans from noon made every wait read one day short until midday.
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(sent)) / DAY_MS));
}

/**
 * Waiting long enough to nudge, and not already waved off. A dismissal counts
 * until the application is touched again, the same rule the server used.
 */
export function needsFollowUp(record: TailoringRecord, now: number = Date.now()): boolean {
  const days = waitingDays(record, now);
  if (days === null || days < FOLLOW_UP_AFTER_DAYS) return false;
  const dismissed = toMs(record.application?.followup_dismissed_at);
  if (dismissed === null) return true;
  const touched = toMs(record.application?.updated_at) ?? appliedMs(record) ?? 0;
  return dismissed < touched;
}

export interface WeekCount {
  /** Monday of the week, "YYYY-MM-DD". */
  start: string;
  count: number;
}

export interface WaitingBucket {
  key: 'week' | 'fortnight' | 'month' | 'stale';
  label: string;
  count: number;
}

export interface ComparisonGroup {
  label: string;
  applied: number;
  interviewed: number;
}

export interface Comparison {
  id: 'resume' | 'score';
  title: string;
  groups: ComparisonGroup[];
  /** False until every group holds enough applications to be worth comparing. */
  enough: boolean;
}

export interface TrackerInsights {
  tracked: number;
  applied: number;
  replied: number;
  interviewed: number;
  /** At the interview stage right now. */
  interviewingNow: number;
  offers: number;
  waiting: number;
  /** Sent, never answered, and closed anyway (no response, or withdrawn). */
  closedUnanswered: number;
  oldestWaitingDays: number | null;
  last7: number;
  previous7: number;
  weeks: WeekCount[];
  medianReplyDays: number | null;
  replySample: number;
  waitingBuckets: WaitingBucket[];
  /** Waiting past STALE_AFTER_DAYS, oldest first. */
  staleIds: string[];
  comparisons: Comparison[];
}

/** Monday of the local week `weeksAgo` weeks back, as "YYYY-MM-DD". */
function mondayISO(weeksAgo: number, now: Date): string {
  const sinceMonday = (now.getDay() + 6) % 7;
  return localDayISO(-sinceMonday - weeksAgo * 7, now);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

function compare(
  id: Comparison['id'],
  title: string,
  labels: string[],
  groupOf: (record: TailoringRecord) => number | null,
  applied: TailoringRecord[],
): Comparison {
  const groups: ComparisonGroup[] = labels.map((label) => ({ label, applied: 0, interviewed: 0 }));
  for (const record of applied) {
    const index = groupOf(record);
    if (index === null) continue;
    groups[index].applied += 1;
    if (reachedInterview(record)) groups[index].interviewed += 1;
  }
  return { id, title, groups, enough: groups.every((g) => g.applied >= MIN_GROUP_SIZE) };
}

export function computeInsights(
  records: TailoringRecord[],
  now: Date = new Date(),
): TrackerInsights {
  const nowMs = now.getTime();
  const applied = records.filter(wasApplied);
  const waitingList = records
    .map((record) => ({ record, days: waitingDays(record, nowMs) }))
    .filter((w): w is { record: TailoringRecord; days: number } => w.days !== null);

  const today = localDayISO(0, now);
  const weekAgo = localDayISO(-6, now);
  const twoWeeksAgo = localDayISO(-13, now);
  let last7 = 0;
  let previous7 = 0;
  const weeks: WeekCount[] = Array.from({ length: WEEKS_SHOWN }, (_, i) => ({
    start: mondayISO(WEEKS_SHOWN - 1 - i, now),
    count: 0,
  }));
  for (const record of applied) {
    const day = appliedDayOf(record.application);
    if (!day || day > today) continue;
    if (day >= weekAgo) last7 += 1;
    else if (day >= twoWeeksAgo) previous7 += 1;
    // The last week whose Monday is on or before the day.
    for (let i = weeks.length - 1; i >= 0; i -= 1) {
      if (day >= weeks[i].start) {
        weeks[i].count += 1;
        break;
      }
    }
  }

  const replyDays: number[] = [];
  for (const record of applied) {
    const sent = appliedMs(record);
    const reply = firstReplyMs(record);
    if (sent !== null && reply !== null && reply >= sent - DAY_MS) {
      replyDays.push(Math.max(0, Math.round((reply - sent) / DAY_MS)));
    }
  }

  const buckets: WaitingBucket[] = [
    { key: 'week', label: 'Up to 7 days', count: 0 },
    { key: 'fortnight', label: '8 to 14 days', count: 0 },
    { key: 'month', label: `15 to ${STALE_AFTER_DAYS} days`, count: 0 },
    { key: 'stale', label: `Over ${STALE_AFTER_DAYS} days`, count: 0 },
  ];
  for (const { days } of waitingList) {
    const index = days <= 7 ? 0 : days <= 14 ? 1 : days <= STALE_AFTER_DAYS ? 2 : 3;
    buckets[index].count += 1;
  }

  return {
    tracked: records.length,
    applied: applied.length,
    replied: applied.filter(gotReply).length,
    interviewed: applied.filter(reachedInterview).length,
    interviewingNow: records.filter((r) => statusKeyOf(r.application?.status) === 'interviewing')
      .length,
    offers: applied.filter(reachedOffer).length,
    waiting: waitingList.length,
    closedUnanswered: applied.filter((r) => !gotReply(r) && !isWaiting(r)).length,
    oldestWaitingDays: waitingList.length ? Math.max(...waitingList.map((w) => w.days)) : null,
    last7,
    previous7,
    weeks,
    medianReplyDays: median(replyDays),
    replySample: replyDays.length,
    waitingBuckets: buckets,
    staleIds: waitingList
      .filter((w) => w.days > STALE_AFTER_DAYS)
      .sort((a, b) => b.days - a.days)
      .map((w) => w.record.record_id),
    comparisons: [
      compare(
        'resume',
        'Tailored resume or your base resume',
        ['Tailored for the job', 'Base resume'],
        (record) =>
          isUntailoredStub(record) || record.application?.resume_used === 'base' ? 1 : 0,
        applied,
      ),
      compare(
        'score',
        'Match score when you applied',
        ['80 and above', '60 to 79', 'Under 60'],
        (record) => {
          const score = record.ats_scores?.overall;
          if (typeof score !== 'number') return null;
          return score >= 80 ? 0 : score >= 60 ? 1 : 2;
        },
        applied,
      ),
    ],
  };
}
