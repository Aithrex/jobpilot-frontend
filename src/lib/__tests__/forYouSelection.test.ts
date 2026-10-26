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
