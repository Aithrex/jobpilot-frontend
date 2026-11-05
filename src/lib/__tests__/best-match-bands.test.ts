import { describe, expect, test } from 'vitest';
import { sortJobsByMode } from '@/lib/careerJobs';
import type { WorkdayJob } from '@/types/jobs';

/**
 * Best match is BANDS, newest first within a band. A pure score sort buried a
 * 78 posted this morning under every 79 from last week: inside one band those
 * are the same verdict, and the newer one is the one still worth applying to.
 */
let n = 0;
const row = (id: string, over: Partial<WorkdayJob> = {}): WorkdayJob => ({
  job_id: id, title: `Role ${id}`, company: `Company ${id}`, location: 'Austin, TX',
  apply_link: `https://example.com/jobs/${id}`, date_posted: '', is_remote: false,
  // A distinct board per row, so board diversity never reorders these tests.
  tenant: `t${(n += 1)}`, industry: 'tech', score_version: 'fit-v2.9', ...over,
});
const ids = (rows: WorkdayJob[]) => rows.map((j) => j.job_id);

describe('Best match orders by band, then newest, then score', () => {
  test('a newer card beats a slightly higher older one in the same band', () => {
    const older = row('older-82', { match_score: 82, days_ago: 6 });
    const newer = row('newer-80', { match_score: 80, days_ago: 0 });
    expect(ids(sortJobsByMode([older, newer], 'score'))).toEqual(['newer-80', 'older-82']);
  });

  test('a band always outranks recency', () => {
    const goodToday = row('good-today', { match_score: 79, days_ago: 0 });
    const strongOld = row('strong-old', { match_score: 80, days_ago: 20 });
    const possibleToday = row('possible-today', { match_score: 64, days_ago: 0 });
    expect(ids(sortJobsByMode([possibleToday, goodToday, strongOld], 'score')))
      .toEqual(['strong-old', 'good-today', 'possible-today']);
  });

  test('within a band: dated before undated, first sighting stands in for a date, score breaks ties', () => {
    const undated = row('undated', { match_score: 95, days_ago: null });
    const seen1 = row('seen-1', { match_score: 81, days_ago: null, first_seen_days_ago: 1 });
    const today90 = row('today-90', { match_score: 90, days_ago: 0 });
    const today85 = row('today-85', { match_score: 85, days_ago: 0 });
    expect(ids(sortJobsByMode([undated, seen1, today85, today90], 'score')))
      .toEqual(['today-90', 'today-85', 'seen-1', 'undated']);
  });

  test('unscored cards sit after possible and before weak, ordered by recency', () => {
    const weak = row('weak', { match_score: 40, days_ago: 0 });
    const possible = row('possible', { match_score: 55, days_ago: 9 });
    const unscoredOld = row('unscored-old', { match_score: 0, days_ago: 4, score_version: undefined });
    // No version stamp: a provisional number is not a verdict.
    const unscoredNew = row('unscored-new', { match_score: 99, days_ago: 0, score_version: undefined });
    expect(ids(sortJobsByMode([weak, unscoredOld, possible, unscoredNew], 'score')))
      .toEqual(['possible', 'unscored-new', 'unscored-old', 'weak']);
  });

  test('a board with no resume (all unscored) reads newest first', () => {
    const rows = [
      row('d3', { days_ago: 3, score_version: undefined }),
      row('d0', { days_ago: 0, score_version: undefined }),
      row('d1', { days_ago: 1, score_version: undefined }),
    ];
    expect(ids(sortJobsByMode(rows, 'score'))).toEqual(['d0', 'd1', 'd3']);
  });

  test('the pin tiers still come first: demoted, applied and marketplace rows sink', () => {
    const strongMarket = row('market', { match_score: 95, days_ago: 0, board_kind: 'marketplace' });
    const strongApplied = row('applied', { match_score: 95, days_ago: 0 });
    const strongDemoted = row('demoted', { match_score: 95, days_ago: 0, sponsorship_demoted: true });
    const weakOpen = row('weak-open', { match_score: 36, days_ago: 9 });
    const sorted = sortJobsByMode([strongDemoted, strongApplied, strongMarket, weakOpen], 'score', {
      isApplied: (j) => j.job_id === 'applied',
    });
    expect(ids(sorted)).toEqual(['weak-open', 'market', 'applied', 'demoted']);
  });

  test('Newest is unchanged: age first, then score, bands ignored', () => {
    const strongOld = row('strong-old', { match_score: 95, days_ago: 3 });
    const weakToday = row('weak-today', { match_score: 36, days_ago: 0 });
    const goodToday = row('good-today', { match_score: 70, days_ago: 0 });
    expect(ids(sortJobsByMode([strongOld, weakToday, goodToday], 'newest')))
      .toEqual(['good-today', 'weak-today', 'strong-old']);
  });
});

describe('a card the user keeps passing moves down its band only', () => {
  const strongPassed = row('strong-passed', { match_score: 92, days_ago: 0 });
  const strongFresh = row('strong-fresh', { match_score: 81, days_ago: 5 });
  const good = row('good', { match_score: 79, days_ago: 0 });
  const passed = new Set(['strong-passed']);
  const isPassedOver = (j: WorkdayJob) => passed.has(j.job_id);

  test('after the rest of its band, still above every lower band', () => {
    expect(ids(sortJobsByMode([strongPassed, good, strongFresh], 'score', { isPassedOver })))
      .toEqual(['strong-fresh', 'strong-passed', 'good']);
  });

  test('a lone passed-over strong card stays first', () => {
    expect(ids(sortJobsByMode([good, strongPassed], 'score', { isPassedOver })))
      .toEqual(['strong-passed', 'good']);
  });

  test('Newest ignores it', () => {
    expect(ids(sortJobsByMode([strongPassed, strongFresh], 'newest', { isPassedOver })))
      .toEqual(['strong-passed', 'strong-fresh']);
  });
});
