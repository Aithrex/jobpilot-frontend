/**
 * The tracker's numbers, checked as arithmetic.
 *
 * The rule they all share: an application counts for every stage it has
 * reached, not only the one it is in now.
 */
import { describe, expect, test } from 'vitest';

import { localDayISO } from '@/lib/applicationDates';
import type { TailoringRecord } from '@/types/resume';

import {
  FOLLOW_UP_AFTER_DAYS,
  MIN_GROUP_SIZE,
  STALE_AFTER_DAYS,
  computeInsights,
  gotReply,
  needsFollowUp,
  reachedInterview,
  waitingDays,
} from '../trackerInsights';

const NOW = new Date();
const day = (offset: number) => localDayISO(offset, NOW);
const at = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();

let seq = 0;
function app(
  status: string,
  appliedDaysAgo: number | null,
  extra: Record<string, unknown> = {},
): TailoringRecord {
  seq += 1;
  const { ats, ...application } = extra as { ats?: number } & Record<string, unknown>;
  return {
    record_id: `r${seq}`,
    user_email: 'u@example.com',
    created_at: at(-90),
    jd_analysis: { job_title: `Role ${seq}`, company: 'Acme' },
    ...(typeof ats === 'number' ? { ats_scores: { overall: ats } } : {}),
    application: {
      status,
      ...(appliedDaysAgo === null ? {} : { applied_date: day(-appliedDaysAgo) }),
      ...application,
    },
  } as unknown as TailoringRecord;
}

describe('what counts as reaching a stage', () => {
  test('a rejection after an interview still reached interview', () => {
    const record = app('rejected', 20, {
      stage_dates: { applied: at(-20), interviewing: at(-12), rejected: at(-5) },
    });
    expect(reachedInterview(record)).toBe(true);
    expect(gotReply(record)).toBe(true);
  });

  test('without history, a rejection is a reply and not an interview', () => {
    const record = app('rejected', 20);
    expect(gotReply(record)).toBe(true);
    expect(reachedInterview(record)).toBe(false);
  });

  test('a saved job was never applied to, and a job with no reply is still waiting', () => {
    const insights = computeInsights(
      [app('saved', null), app('draft', null), app('applied', 3)],
      NOW,
    );
    expect(insights.applied).toBe(1);
    expect(insights.waiting).toBe(1);
    expect(insights.replied).toBe(0);
  });

  test('an interview date entered by hand counts as an interview', () => {
    expect(reachedInterview(app('applied', 9, { interview_dates: [at(2)] }))).toBe(true);
  });
});

describe('the funnel and the weekly pace', () => {
  test('each stage counts everything that got that far', () => {
    const insights = computeInsights(
      [
        app('applied', 2),
        app('applied', 40),
        app('interviewing', 15),
        app('offer', 30),
        app('rejected', 25, { stage_dates: { interviewing: at(-18), rejected: at(-10) } }),
        app('rejected', 12),
        app('ghosted', 50),
        app('saved', null),
      ],
      NOW,
    );
    expect(insights.tracked).toBe(8);
    expect(insights.applied).toBe(7);
    expect(insights.replied).toBe(4);
    expect(insights.interviewed).toBe(3);
    expect(insights.offers).toBe(1);
    expect(insights.waiting).toBe(2);
    expect(insights.oldestWaitingDays).toBe(40);
  });

  test('the last seven days include today, and are compared with the seven before', () => {
    const insights = computeInsights(
      [
        app('applied', 0),
        app('applied', 6),
        app('applied', 7),
        app('applied', 13),
        app('applied', 14),
      ],
      NOW,
    );
    expect(insights.last7).toBe(2);
    expect(insights.previous7).toBe(2);
  });

  test('eight weeks, oldest first, every application in exactly one of them', () => {
    const records = [0, 1, 8, 15, 22, 29, 36, 43, 50, 200].map((ago) => app('applied', ago));
    const insights = computeInsights(records, NOW);
    expect(insights.weeks).toHaveLength(8);
    expect(insights.weeks.map((w) => w.start)).toEqual(
      [...insights.weeks.map((w) => w.start)].sort(),
    );
    const counted = insights.weeks.reduce((sum, w) => sum + w.count, 0);
    // Everything inside the window, nothing from 200 days ago.
    expect(counted).toBeGreaterThanOrEqual(8);
    expect(counted).toBeLessThanOrEqual(9);
  });
});

describe('waiting, following up and closing out', () => {
  test('waiting is measured from the day applied and sorted into four ages', () => {
    const insights = computeInsights(
      [
        app('applied', 1),
        app('applied', 7),
        app('applied', 10),
        app('applied', 20),
        app('applied', 31),
        app('applied', 90),
      ],
      NOW,
    );
    expect(insights.waitingBuckets.map((b) => b.count)).toEqual([2, 1, 1, 2]);
    expect(insights.staleIds).toHaveLength(2);
    expect(STALE_AFTER_DAYS).toBe(30);
  });

  test('the longest wait comes first in the list to close', () => {
    const older = app('applied', 120);
    const old = app('applied', 45);
    expect(computeInsights([old, older], NOW).staleIds).toEqual([older.record_id, old.record_id]);
  });

  test('a follow-up is due after a week of silence, and a dismissal lasts until the application changes', () => {
    expect(needsFollowUp(app('applied', FOLLOW_UP_AFTER_DAYS - 1))).toBe(false);
    expect(needsFollowUp(app('applied', FOLLOW_UP_AFTER_DAYS))).toBe(true);
    expect(needsFollowUp(app('interviewing', 40))).toBe(false);
    const dismissed = app('applied', 20, { updated_at: at(-20), followup_dismissed_at: at(-2) });
    expect(needsFollowUp(dismissed)).toBe(false);
    const touchedSince = app('applied', 20, { updated_at: at(-1), followup_dismissed_at: at(-2) });
    expect(needsFollowUp(touchedSince)).toBe(true);
  });

  test('an application that got a reply is not waiting, whatever its age', () => {
    expect(waitingDays(app('rejected', 60))).toBeNull();
    expect(waitingDays(app('applied', 12))).toBe(12);
  });

  test('the usual reply time is the middle one, from real dates only', () => {
    const insights = computeInsights(
      [
        app('rejected', 30, { stage_dates: { rejected: at(-26) } }),
        app('interviewing', 30, { stage_dates: { interviewing: at(-20) } }),
        app('offer', 60, { stage_dates: { interviewing: at(-40), offer: at(-10) } }),
        app('applied', 5),
      ],
      NOW,
    );
    expect(insights.replySample).toBe(3);
    expect(insights.medianReplyDays).toBe(10);
  });
});

describe('what gets interviews', () => {
  test('groups are compared only when each holds enough applications', () => {
    const few = computeInsights(
      [app('interviewing', 9, { ats: 85 }), app('applied', 9, { ats: 50 })],
      NOW,
    );
    expect(few.comparisons.every((c) => !c.enough)).toBe(true);

    const tailored = Array.from({ length: MIN_GROUP_SIZE }, (_, i) =>
      app(i < 2 ? 'interviewing' : 'applied', 10),
    );
    const base = Array.from({ length: MIN_GROUP_SIZE }, () =>
      app('applied', 10, { resume_used: 'base' }),
    );
    const resume = computeInsights([...tailored, ...base], NOW).comparisons.find(
      (c) => c.id === 'resume',
    )!;
    expect(resume.enough).toBe(true);
    expect(resume.groups.map((g) => [g.applied, g.interviewed])).toEqual([
      [MIN_GROUP_SIZE, 2],
      [MIN_GROUP_SIZE, 0],
    ]);
  });

  test('an application with no match score is left out of the score comparison, not guessed', () => {
    const score = computeInsights(
      [app('applied', 4), app('applied', 4, { ats: 91 })],
      NOW,
    ).comparisons.find((c) => c.id === 'score')!;
    expect(score.groups.reduce((sum, g) => sum + g.applied, 0)).toBe(1);
  });
});
