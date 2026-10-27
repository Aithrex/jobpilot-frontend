import { describe, expect, test } from 'vitest';
import { selectForYouJobs, type ForYouFilters } from '@/lib/forYouSelection';
import { applyUrlKey } from '@/lib/careerJobs';
import type { WorkdayJob } from '@/types/jobs';

const row = (id: string, over: Partial<WorkdayJob> = {}): WorkdayJob => ({
  job_id: id, title: 'Software Engineer', company: 'Acme', seniority: 'entry',
  days_ago: 0, match_score: 80, apply_link: `https://example.com/jobs/${id}`, ...over,
} as WorkdayJob);
const filters = (over: Partial<ForYouFilters> = {}): ForYouFilters => ({
  recency: 'today', search: '', seniorityLevels: ['entry', 'mid'], minScore: 0,
  sponsorFilter: 'friendly', showApplied: false, sortBy: 'score', hiddenJobIds: new Set(),
  getJobStatus: () => null, ...over,
});

describe('For you selection and facet counts', () => {
  test('19 today jobs yield the same 3 roles in the active count and listing', () => {
    const jobs = [
      ...Array.from({ length: 12 }, (_, i) => row(`senior-${i}`, { seniority: 'senior' })),
      row('hidden'), row('applied'), row('no-sponsor', { sponsorship: 'refused' }),
      row('low-score', { match_score: 10 }), row('one'), row('two'), row('three'),
    ];
    const result = selectForYouJobs(jobs, filters({
      minScore: 60, hiddenJobIds: new Set(['hidden']),
      getJobStatus: (id) => id === 'applied' ? 'applied' : null,
    }));
    expect(jobs).toHaveLength(19);
    expect(result.visibleJobs.map((job) => job.job_id)).toEqual(['one', 'two', 'three']);
    expect(result.recencyCounts.today).toBe(3);
    expect(result.levelCounts).toEqual({ intern: 0, entry: 3, mid: 0, senior: 12, staff: 0, unknown: 0 });
  });

  test('each facet removes only its own filter and honors query, score and sponsorship', () => {
    const jobs = [row('entry'), row('mid', { seniority: 'mid' }),
      row('old', { days_ago: 5 }), row('old-senior', { days_ago: 5, seniority: 'senior' }),
      row('unrelated', { title: 'Accountant' }), row('low', { match_score: 20 }),
      row('refused', { sponsorship: 'refused' })];
    const narrow = selectForYouJobs(jobs, filters({ search: 'engineer', minScore: 50, seniorityLevels: ['entry'] }));
    expect(narrow.recencyCounts.today).toBe(1);
    expect(narrow.recencyCounts['7d']).toBe(2);
    expect(narrow.levelCounts.mid).toBe(1);
    expect(narrow.levelCounts.senior).toBe(0);
    const week = selectForYouJobs(jobs, filters({ recency: '7d', search: 'engineer', minScore: 50 }));
    expect(week.levelCounts.senior).toBe(1);
  });

  test('unknown dates and unknown levels remain counted when the listing keeps them', () => {
    const result = selectForYouJobs([row('unknown', { days_ago: null, seniority: 'unknown' }),
      row('first-seen', { days_ago: null, first_seen_days_ago: 4 })], filters());
    expect(result.visibleJobs.map((job) => job.job_id)).toEqual(['unknown']);
    expect(result.recencyCounts.today).toBe(1);
    expect(result.recencyCounts['7d']).toBe(2);
    expect(result.levelCounts.unknown).toBe(1);
  });

  test('hiding by a normalized URL survives a changed job id', () => {
    const link = 'https://example.com/jobs/1234';
    const result = selectForYouJobs([row('new-id', { apply_link: `${link}?utm_source=mail` })], filters({
      hiddenJobIds: new Set([`url:${applyUrlKey(link)}`]),
    }));
    expect(result.visibleJobs).toHaveLength(0);
    expect(result.recencyCounts.today).toBe(0);
  });

  test('Include applied restores the role in both facets and total', () => {
    const result = selectForYouJobs([row('applied')], filters({ showApplied: true, getJobStatus: () => 'rejected' }));
    expect(result.visibleJobs).toHaveLength(1);
    expect(result.recencyCounts.today).toBe(1);
    expect(result.levelCounts.entry).toBe(1);
  });
});

describe('Today and Yesterday are single days - no card in both', () => {
  const jobs = [
    row('t1', { days_ago: 0 }), row('t2', { days_ago: 0 }),
    row('y1', { days_ago: 1 }), row('y2', { days_ago: 1 }), row('y3', { days_ago: 1 }),
    row('d2', { days_ago: 2 }), row('d3', { days_ago: 3 }), row('d6', { days_ago: 6 }),
    row('seen-today', { days_ago: null, first_seen_days_ago: 0 }),
    row('seen-yesterday', { days_ago: null, first_seen_days_ago: 1 }),
  ];
  const ids = (recency: ForYouFilters['recency']) =>
    selectForYouJobs(jobs, filters({ recency })).visibleJobs.map((job) => job.job_id).sort();

  test('Yesterday shows only yesterday, never today', () => {
    expect(ids('today')).toEqual(['seen-today', 't1', 't2']);
    expect(ids('yesterday')).toEqual(['seen-yesterday', 'y1', 'y2', 'y3']);
    expect(ids('today').filter((id) => ids('yesterday').includes(id))).toEqual([]);
  });

  test('the wider windows still include today, so no role is lost', () => {
    expect(ids('3d')).toEqual(['d2', 'd3', 'seen-today', 'seen-yesterday', 't1', 't2', 'y1', 'y2', 'y3']);
    expect(ids('7d')).toHaveLength(jobs.length);
  });

  test('chip counts match what each chip lists', () => {
    const { recencyCounts } = selectForYouJobs(jobs, filters());
    expect(recencyCounts).toEqual({ today: 3, yesterday: 4, '3d': 9, '7d': 10, '30d': 10 });
  });
});
