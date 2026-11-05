import { describe, expect, test } from 'vitest';
import {
  ALWAYS_KEEP_TOP_MATCHES,
  isNewSince,
  selectForYouJobs,
  type ForYouFilters,
} from '@/lib/forYouSelection';
import type { WorkdayJob } from '@/types/jobs';

/**
 * "The best job is not missed, the unmatched not appeared": weak and unlikely
 * verdicts fold away by default, but never a provisional score, never an
 * unscored card, and never the user's own best 20.
 */
const row = (id: string, over: Partial<WorkdayJob> = {}): WorkdayJob => ({
  job_id: id, title: 'Software Engineer', company: `Company ${id}`, seniority: 'entry',
  days_ago: 0, match_score: 85, score_version: 'fit-v2.9',
  apply_link: `https://example.com/jobs/${id}`, ...over,
} as WorkdayJob);
const filters = (over: Partial<ForYouFilters> = {}): ForYouFilters => ({
  recency: 'today', search: '', seniorityLevels: ['entry', 'mid'], minScore: 0,
  sponsorFilter: 'friendly', showApplied: false, sortBy: 'score', hiddenJobIds: new Set(),
  getJobStatus: () => null, ...over,
});
const ids = (rows: WorkdayJob[]) => rows.map((j) => j.job_id).sort();
const many = (count: number, prefix: string, over: Partial<WorkdayJob>) =>
  Array.from({ length: count }, (_, i) => row(`${prefix}${i}`, over));

describe('weaker matches fold away by default', () => {
  // 25 strong cards fill the always-keep 20, so nothing weak is rescued.
  const strong = many(25, 's', { match_score: 85 });

  test('weak and unlikely verdicts are hidden; the count says how many', () => {
    const jobs = [...strong, row('weak', { match_score: 40 }), row('unlikely', { match_score: 20 })];
    const result = selectForYouJobs(jobs, filters());
    expect(result.visibleJobs).toHaveLength(25);
    expect(result.weakerMatchCount).toBe(2);
    expect(result.recencyCounts.today).toBe(25);
  });

  test('Show them restores every one, and the counts follow', () => {
    const jobs = [...strong, row('weak', { match_score: 40 }), row('unlikely', { match_score: 20 })];
    const result = selectForYouJobs(jobs, filters({ showWeaker: true }));
    expect(result.visibleJobs).toHaveLength(27);
    expect(result.weakerMatchCount).toBe(2);
    expect(result.recencyCounts.today).toBe(27);
    expect(result.levelCounts.entry).toBe(27);
  });

  test('a provisional (title-only) score is never folded', () => {
    const jobs = [...strong, row('provisional', { match_score: 30, score_basis: 'title_only' })];
    const result = selectForYouJobs(jobs, filters());
    expect(result.visibleJobs.map((j) => j.job_id)).toContain('provisional');
    expect(result.weakerMatchCount).toBe(0);
  });

  test('an unscored card is never folded', () => {
    const jobs = [...strong, row('unscored', { match_score: 20, score_version: undefined })];
    const result = selectForYouJobs(jobs, filters());
    expect(result.visibleJobs.map((j) => j.job_id)).toContain('unscored');
    expect(result.weakerMatchCount).toBe(0);
  });

  test('a user whose best scores are all low still sees their best 20', () => {
    const jobs = Array.from({ length: 30 }, (_, i) => row(`w${i}`, { match_score: 49 - i }));
    const result = selectForYouJobs(jobs, filters());
    expect(ALWAYS_KEEP_TOP_MATCHES).toBe(20);
    expect(result.visibleJobs).toHaveLength(20);
    expect(ids(result.visibleJobs)).toEqual(ids(jobs.slice(0, 20)));
    expect(result.weakerMatchCount).toBe(10);
    expect(result.recencyCounts.today).toBe(20);
  });

  test('the best 20 are counted among cards passing the other filters, per window', () => {
    const today = Array.from({ length: 5 }, (_, i) => row(`t${i}`, { match_score: 30 + i }));
    const older = Array.from({ length: 30 }, (_, i) => row(`o${i}`, { match_score: 45, days_ago: 3 }));
    const result = selectForYouJobs([...today, ...older], filters());
    // Today holds 5 weak cards and they ARE the best Today has.
    expect(result.visibleJobs).toHaveLength(5);
    expect(result.recencyCounts.today).toBe(5);
    expect(result.recencyCounts['3d']).toBe(20);
    expect(result.recencyCounts['7d']).toBe(20);
  });

  test('minScore still applies on top', () => {
    const jobs = Array.from({ length: 5 }, (_, i) => row(`w${i}`, { match_score: 40 + i }));
    const result = selectForYouJobs(jobs, filters({ minScore: 43 }));
    expect(ids(result.visibleJobs)).toEqual(['w3', 'w4']);
  });

  test('the level breakdown still adds up to the list', () => {
    const jobs = [
      ...many(22, 'e', { match_score: 85 }),
      row('weak-entry', { match_score: 40 }),
      row('unknown-level', { match_score: 90, seniority: 'unknown' }),
      row('weak-senior', { match_score: 40, seniority: 'senior' }),
      row('good-senior', { match_score: 70, seniority: 'senior' }),
    ];
    const result = selectForYouJobs(jobs, filters());
    const { entry, mid, unknown } = result.levelCounts;
    expect(entry + mid + unknown).toBe(result.visibleJobs.length);
    // Adding Senior would show its good card; its weak one is not among the
    // best 20 once senior is in the list either.
    expect(result.levelCounts.senior).toBe(1);
  });
});

describe('new since your last visit', () => {
  const through = '2026-11-03T12:00:00Z';
  const fresh = row('fresh', { first_seen_at: '2026-11-03T15:00:00Z' });
  const known = row('known', { first_seen_at: '2026-11-02T09:00:00Z' });
  const unknown = row('no-first-seen');

  test('new only when both instants exist and first sighting is later', () => {
    expect(isNewSince(fresh, through)).toBe(true);
    expect(isNewSince(known, through)).toBe(false);
    expect(isNewSince(unknown, through)).toBe(false);
    expect(isNewSince(fresh, null)).toBe(false);
    expect(isNewSince({ first_seen_at: 'garbage' }, through)).toBe(false);
  });

  test('counts the new cards, and New only filters the list and the window counts', () => {
    const all = selectForYouJobs([fresh, known, unknown], filters({ seenThrough: through }));
    expect(all.newCount).toBe(1);
    expect(all.visibleJobs).toHaveLength(3);
    const onlyNew = selectForYouJobs([fresh, known, unknown], filters({ seenThrough: through, newOnly: true }));
    expect(onlyNew.visibleJobs.map((j) => j.job_id)).toEqual(['fresh']);
    expect(onlyNew.recencyCounts.today).toBe(1);
    expect(onlyNew.newCount).toBe(1);
  });

  test('no previous visit known: nothing is new and New only is ignored', () => {
    const result = selectForYouJobs([fresh, known], filters({ seenThrough: null, newOnly: true }));
    expect(result.newCount).toBe(0);
    expect(result.visibleJobs).toHaveLength(2);
  });
});

describe('passed-over cards', () => {
  test('move after the rest of their band in the For-you list', () => {
    const jobs = [
      row('passed', { match_score: 95, tenant: 'a' }),
      row('fresh', { match_score: 82, tenant: 'b' }),
      row('good', { match_score: 70, tenant: 'c' }),
    ];
    const result = selectForYouJobs(jobs, filters({ isPassedOver: (j) => j.job_id === 'passed' }));
    expect(result.visibleJobs.map((j) => j.job_id)).toEqual(['fresh', 'passed', 'good']);
  });
});
