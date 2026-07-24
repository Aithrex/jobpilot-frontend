/**
 * careerJobs boundary defense - title normalization + dedupe keys.
 *
 * Regression for the "blank title" bug: some source rows carry the role
 * under `job_title` or `role` instead of `title`. Both toJob mappers and the
 * mergeJobs dedupe key must resolve through jobTitleOf.
 */
import { describe, expect, test } from 'vitest';

import { jobTitleOf, mergeJobs, toJob } from '@/lib/careerJobs';
import type { WorkdayJob } from '@/types/jobs';

function row(overrides: Partial<WorkdayJob>): WorkdayJob {
  return {
    job_id: 'j-1',
    title: '',
    company: 'Acme',
    location: 'Austin, TX',
    apply_link: 'https://example.com/apply',
    date_posted: '2026-07-19',
    is_remote: false,
    tenant: 'acme',
    industry: 'tech',
    ...overrides,
  };
}

describe('jobTitleOf / toJob', () => {
  test('falls back title -> job_title -> role, trimmed', () => {
    expect(jobTitleOf(row({ title: '  Staff Engineer  ' }))).toBe('Staff Engineer');
    expect(jobTitleOf(row({ title: '', job_title: 'Platform Engineer II' }))).toBe(
      'Platform Engineer II',
    );
    expect(jobTitleOf(row({ title: '', role: 'Data Engineer' }))).toBe('Data Engineer');
    expect(jobTitleOf(row({}))).toBe('');
  });

  test('toJob renders a visible title from a job_title-only payload', () => {
    // Simulate the real defect: the fetcher row has no `title` key at all.
    const payload = row({ job_title: 'Platform Engineer II' });
    delete (payload as Partial<WorkdayJob>).title;
    const job = toJob(payload, 'workday');
    expect(job.title).toBe('Platform Engineer II');
  });

  test('mergeJobs dedupes a title row against its job_title twin', () => {
    const a = row({ job_id: 'a', title: 'Platform Engineer II', match_score: 50 });
    const b = row({ job_id: 'b', title: '', job_title: 'Platform Engineer II', match_score: 70 });
    const merged = mergeJobs([a], [b]);
    expect(merged).toHaveLength(1);
    // The higher-scoring copy wins the merge.
    expect(merged[0].match_score).toBe(70);
  });
});
