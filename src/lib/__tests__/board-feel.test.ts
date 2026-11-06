import { describe, expect, it } from 'vitest';
import { appliedGroupOf, savedGroupOf, savedTabCounts } from '@/lib/savedNextStep';
import { companyKeyOf, selectForYouJobs } from '@/lib/forYouSelection';
import { jobLevelLabel } from '@/lib/jobLevel';
import type { SavedJob, WorkdayJob } from '@/types/jobs';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

function saved(over: Partial<SavedJob> & { job_id: string }): SavedJob {
  return {
    _id: over.job_id, status: 'interested', notes: '', saved_at: daysAgo(1),
    job_data: { job_id: over.job_id, title: 'Engineer', company: 'Acme' } as SavedJob['job_data'],
    ...over,
  };
}

describe('Saved and Applied next steps', () => {
  it('groups saved jobs by what to do next', () => {
    expect(savedGroupOf(saved({ job_id: 'a', next_step: { posting_state: 'closed' } }), NOW)).toBe('archived');
    expect(savedGroupOf(saved({ job_id: 'b', next_step: { posting_state: 'open', tailored: true, posted_at: daysAgo(3) } }), NOW)).toBe('ready');
    expect(savedGroupOf(saved({ job_id: 'c', next_step: { posting_state: 'open', posted_at: daysAgo(3) } }), NOW)).toBe('tailor');
    expect(savedGroupOf(saved({ job_id: 'd', next_step: { posting_state: 'open', posted_at: daysAgo(40) } }), NOW)).toBe('old');
  });

  it('an unknown posting is never called closed', () => {
    expect(savedGroupOf(saved({ job_id: 'e', next_step: { posting_state: 'unknown' } }), NOW)).toBe('tailor');
    expect(savedGroupOf(saved({ job_id: 'f' }), NOW)).toBe('tailor');
  });

  it('applications: follow up after a week, waiting without a date', () => {
    const ap = (n: number | null, status = 'applied') =>
      saved({ job_id: `x${n}`, status: status as SavedJob['status'], next_step: { posting_state: 'open', applied_at: n == null ? null : daysAgo(n) } });
    expect(appliedGroupOf(ap(9), NOW)).toBe('follow_up');
    expect(appliedGroupOf(ap(2), NOW)).toBe('waiting');
    expect(appliedGroupOf(ap(null), NOW)).toBe('waiting');
    expect(appliedGroupOf(ap(30, 'interview'), NOW)).toBe('interviewing');
    expect(appliedGroupOf(ap(30, 'rejected'), NOW)).toBe('closed');
  });

  it('tab counts count only what needs action', () => {
    const rows = [
      saved({ job_id: '1', next_step: { posting_state: 'open' } }),
      saved({ job_id: '2', next_step: { posting_state: 'closed' } }),
      saved({ job_id: '3', status: 'applied', next_step: { posting_state: 'open', applied_at: daysAgo(10) } }),
      saved({ job_id: '4', status: 'applied', next_step: { posting_state: 'open', applied_at: daysAgo(1) } }),
    ];
    const c = savedTabCounts(rows, NOW);
    expect(c.toApply).toBe(1);
    expect(c.followUps).toBe(1);
    expect(c.savedTotal).toBe(2);
    expect(c.appliedTotal).toBe(2);
  });
});

const job = (id: string, over: Partial<WorkdayJob> = {}): WorkdayJob => ({
  job_id: id, title: 'Software Engineer', company: 'Acme', location: 'Austin, TX',
  date_posted: new Date().toISOString(), days_ago: 0, match_score: 70, ...over,
} as WorkdayJob);

const base = {
  recency: '30d' as const, search: '', seniorityLevels: [], minScore: 0, sponsorFilter: 'all' as const,
  showApplied: true, sortBy: 'score' as const, hiddenJobIds: new Set<string>(), getJobStatus: () => null,
  showWeaker: true,
};

describe('company checklist and reposts', () => {
  const jobs = [
    job('1', { company: 'NVIDIA', company_type: { type: 'big_tech_mnc' } }),
    job('2', { company: 'NVIDIA', company_type: { type: 'big_tech_mnc' } }),
    job('3', { company: 'Tiny AI', company_type: { type: 'startup_midsize' } }),
  ];

  it('facets count every company whatever is ticked', () => {
    const r = selectForYouJobs(jobs, { ...base, companies: new Set([companyKeyOf(jobs[2])]) });
    expect(r.visibleJobs.map((j) => j.job_id)).toEqual(['3']);
    const nv = r.companyFacets.find((f) => f.name === 'NVIDIA');
    expect(nv?.count).toBe(2);
    expect(nv?.type).toBe('big_tech_mnc');
  });

  it('a repost folds only under a card still on the board', () => {
    const rows = [job('a'), job('b', { possible_duplicate_of: 'a' }), job('c', { possible_duplicate_of: 'gone' })];
    const r = selectForYouJobs(rows, { ...base, collapseReposts: true });
    expect(r.visibleJobs.map((j) => j.job_id).sort()).toEqual(['a', 'c']);
    expect(r.repostsFolded).toBe(1);
    const all = selectForYouJobs(rows, { ...base, collapseReposts: false });
    expect(all.visibleJobs).toHaveLength(3);
  });
});

describe('level label', () => {
  it('stated, estimated and unstated read differently', () => {
    expect(jobLevelLabel({ title: 'Senior Software Engineer' }).kind).toBe('stated');
    const est = jobLevelLabel({ title: 'Software Engineer', level_estimate: { level: 'mid', basis: 'mentor junior engineers' } });
    expect(est.kind).toBe('estimated');
    expect(est.text).toBe('Likely Mid');
    expect(jobLevelLabel({ title: 'Software Engineer' }).text).toBe('Level not stated');
  });
});

describe('title fallback reads mid in words', () => {
  it('Mid-Level and Intermediate titles are mid; Intermediate Care is not a band', async () => {
    const { seniorityOf } = await import('@/lib/careerJobs');
    const t = (title: string) => seniorityOf({ job_id: 'x', title } as WorkdayJob);
    expect(t('Mid-Level Test & Evaluation Engineer')).toBe('mid');
    expect(t('Intermediate Developer')).toBe('mid');
    expect(t('Intermediate Care Nurse')).toBe('unknown');
    expect(t('Junior Developer')).toBe('entry');
  });
});
