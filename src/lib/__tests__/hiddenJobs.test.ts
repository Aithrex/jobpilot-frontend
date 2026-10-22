/**
 * "Hide" must survive a refresh AND a repost.
 *
 * A re-crawled or re-issued card can carry a new `job_id` for the same
 * posting; keyed on the id alone, a hidden job came straight back (reported
 * 2026-10-21). Entries are now also keyed by the normalized application URL.
 */
import { beforeEach, describe, expect, test } from 'vitest';

import { isHiddenJob, loadHiddenJobIds, persistHiddenJobId } from '@/lib/hiddenJobs';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('hidden jobs', () => {
  test('a hidden job stays hidden after a reload (localStorage, not the session)', () => {
    persistHiddenJobId('job-1', 'https://boards.greenhouse.io/acme/jobs/123');
    const reloaded = loadHiddenJobIds();
    expect(isHiddenJob(reloaded, { job_id: 'job-1' })).toBe(true);
  });

  test('a re-issued card with the same posting URL stays hidden', () => {
    const hidden = persistHiddenJobId('old-id', 'https://boards.greenhouse.io/acme/jobs/123?gh_src=abc');
    expect(
      isHiddenJob(hidden, { job_id: 'new-id', apply_link: 'https://boards.greenhouse.io/acme/jobs/123/' }),
    ).toBe(true);
  });

  test('a different posting with the same employer is not hidden', () => {
    const hidden = persistHiddenJobId('old-id', 'https://boards.greenhouse.io/acme/jobs/123');
    expect(
      isHiddenJob(hidden, { job_id: 'other', apply_link: 'https://boards.greenhouse.io/acme/jobs/456' }),
    ).toBe(false);
  });

  test('a job without a link is hidden by id only, and an empty link never matches', () => {
    const hidden = persistHiddenJobId('no-link');
    expect(isHiddenJob(hidden, { job_id: 'no-link' })).toBe(true);
    expect(isHiddenJob(hidden, { job_id: 'x', apply_link: '' })).toBe(false);
  });

  test('ids hidden under the old session-only key are kept', () => {
    window.sessionStorage.setItem('aspirely.hidden-jobs', JSON.stringify(['legacy-id']));
    expect(isHiddenJob(loadHiddenJobIds(), { job_id: 'legacy-id' })).toBe(true);
    // And they are carried into the persistent list on the next hide.
    persistHiddenJobId('another');
    window.sessionStorage.clear();
    expect(isHiddenJob(loadHiddenJobIds(), { job_id: 'legacy-id' })).toBe(true);
  });
});
