import { describe, it, expect } from 'vitest';
import { sortJobsByMode, JOB_FEED_PAGE_SIZE } from '@/lib/careerJobs';
import type { WorkdayJob } from '@/types/jobs';

function mk(i: number, board: string, score: number): WorkdayJob {
  return { job_id: `j${i}`, company: board, ats: 'workday', tenant: board,
           title: `T${i}`, match_score: score, days_ago: 0 } as unknown as WorkdayJob;
}
describe('job feed board diversity spans the RENDERED page', () => {
  it('caps one board at 3 across the first visible page of 24', () => {
    const jobs: WorkdayJob[] = [];
    // RTX holds the top 8 scores, as it does live.
    for (let i = 0; i < 8; i++) jobs.push(mk(i, 'globalhr', 100 - i));
    for (let i = 0; i < 200; i++) jobs.push(mk(100 + i, `t${i % 60}`, 90 - i * 0.1));
    for (let i = 0; i < 30; i++) jobs.push(mk(300 + i, 'globalhr', 70 - i * 0.1));
    const out = sortJobsByMode(jobs, 'score');
    const page1 = out.slice(0, JOB_FEED_PAGE_SIZE);
    const rtx = page1.filter((j) => j.tenant === 'globalhr').length;
    expect(JOB_FEED_PAGE_SIZE).toBe(24);
    expect(rtx).toBeLessThanOrEqual(3);
  });
});
