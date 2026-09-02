/**
 * The adapter must never invent a value.
 *
 * Everything the adapter produces is written into the application tracker and
 * read back as fact, so a plausible-looking default here becomes a claim the
 * product makes on the user's behalf. The assertions below are about ABSENCE:
 * a field the feed does not carry must not appear at all, rather than appear
 * as `0`, `""`, `false` or today's date.
 */
import { describe, expect, test } from 'vitest';

import { techFeedJobToJob } from '@/lib/techFeedJobAdapter';
import { makeTechFeedJob } from '@/test/techFeedFixtures';

const NO_SALARY = {
  min_annual: null,
  max_annual: null,
  currency: null,
  interval: null,
  display: null,
  confidence: null,
  published: false,
};

describe('techFeedJobToJob identity fields', () => {
  test('carries the identifiers the flows key on', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());

    expect(posting.job_id).toBe('job-1');
    expect(posting.title).toBe('Senior Backend Engineer');
    expect(posting.company).toBe('Northwind Systems');
    expect(posting.apply_link).toBe('https://example.com/jobs/1/apply');
  });

  test('falls back to the canonical URL when there is no apply URL', () => {
    const posting = techFeedJobToJob(makeTechFeedJob({ apply_url: '' }));
    expect(posting.apply_link).toBe('https://example.com/jobs/1');
  });

  test('uses the raw title when the index has no normalized one', () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({ normalized_title: '', title_raw: 'Sr. Backend Engineer (Platform)' }),
    );
    expect(posting.title).toBe('Sr. Backend Engineer (Platform)');
  });
});

describe('techFeedJobToJob never invents a value', () => {
  test('an unpublished salary is absent, not 0 and not an empty range', () => {
    const posting = techFeedJobToJob(makeTechFeedJob({ salary: NO_SALARY }));

    expect('salary' in posting).toBe(false);
    expect(posting.salary).toBeUndefined();
    expect(JSON.stringify(posting)).not.toContain('salary');
  });

  test('an unknown work mode is absent, not is_remote: false', () => {
    const posting = techFeedJobToJob(makeTechFeedJob({ work_mode: 'unknown' }));

    // `false` would assert the job is on site, which nobody said.
    expect('is_remote' in posting).toBe(false);
    expect(posting.is_remote).toBeUndefined();
  });

  test('an unknown posting date produces no date at all', () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({ posted_at: null, posted_at_confidence: 'unknown', days_ago: null }),
    );

    expect('date_posted' in posting).toBe(false);
    expect('posted_text' in posting).toBe(false);
    expect(JSON.stringify(posting)).not.toContain(String(new Date().getFullYear()));
  });

  test('a relative age rides display copy, never a parseable date', () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({ posted_at: null, posted_at_confidence: 'relative', days_ago: 3 }),
    );

    expect('date_posted' in posting).toBe(false);
    expect(posting.posted_text).toBe('about 3 days ago');
    expect(Number.isNaN(Date.parse(posting.posted_text as string))).toBe(true);
  });

  test('an exact posting date is carried through unchanged', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());
    expect(posting.date_posted).toBe('2026-08-20T00:00:00Z');
  });

  test('an unscored row carries no match score, so the card reads "Not scored"', () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({ match_score: 0, fit_score_version: null, fit: null }),
    );

    expect('match_score' in posting).toBe(false);
    expect('score_version' in posting).toBe(false);
  });

  test('a score without the engine version stamp is not carried either', () => {
    // The number exists but nothing licenses the band words that go with it.
    const posting = techFeedJobToJob(makeTechFeedJob({ match_score: 91, fit_score_version: '' }));
    expect('match_score' in posting).toBe(false);
  });

  test('a stamped score is carried with its stamp', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());
    expect(posting.match_score).toBe(88);
    expect(posting.score_version).toBe('fit-3');
  });

  test("the job's own required skills are not passed off as the candidate's matches", () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({ skills_required: ['Go', 'PostgreSQL'], skills_preferred: ['Kubernetes'] }),
    );

    expect('matched_skills' in posting).toBe(false);
    expect('missing_skills' in posting).toBe(false);
  });

  test('a posting with no location gets no location string', () => {
    const posting = techFeedJobToJob(makeTechFeedJob({ locations: [] }));
    expect('location' in posting).toBe(false);
  });

  test('no employer logo is invented', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());
    expect('logo' in posting).toBe(false);
    expect('logo_url' in posting).toBe(false);
  });

  test('sponsorship prose is not turned into an h1b_sponsor boolean', () => {
    const posting = techFeedJobToJob(makeTechFeedJob({ sponsorship: 'available' }));
    expect('h1b_sponsor' in posting).toBe(false);
  });

  test('a seniority band outside the tracker vocabulary is dropped, not remapped', () => {
    expect('seniority' in techFeedJobToJob(makeTechFeedJob({ seniority: 'principal' }))).toBe(false);
    expect('seniority' in techFeedJobToJob(makeTechFeedJob({ seniority: 'unknown' }))).toBe(false);
    expect(techFeedJobToJob(makeTechFeedJob({ seniority: 'senior' })).seniority).toBe('senior');
  });
});

describe('techFeedJobToJob known values still travel', () => {
  test('a published salary becomes the display string', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());
    expect(posting.salary).toBe('USD 170,000 - 210,000');
  });

  test('a published salary with no display string is composed, not dropped', () => {
    const posting = techFeedJobToJob(
      makeTechFeedJob({
        salary: { ...NO_SALARY, min_annual: 120000, max_annual: 140000, currency: 'USD', published: true },
      }),
    );
    expect(posting.salary).toBe('USD 120,000 - 140,000');
  });

  test('remote and on-site both resolve to a real boolean', () => {
    expect(techFeedJobToJob(makeTechFeedJob({ work_mode: 'remote' })).is_remote).toBe(true);
    expect(techFeedJobToJob(makeTechFeedJob({ work_mode: 'onsite' })).is_remote).toBe(false);
    expect(techFeedJobToJob(makeTechFeedJob({ work_mode: 'hybrid' })).is_remote).toBe(false);
  });

  test('the source travels so auto-apply can recognise the ATS family', () => {
    expect(techFeedJobToJob(makeTechFeedJob({ source: 'workday', ats: '' })).source).toBe('workday');
    expect(techFeedJobToJob(makeTechFeedJob({ source: '', ats: 'lever' })).source).toBe('lever');
  });

  test('the location is the first stated one', () => {
    const posting = techFeedJobToJob(makeTechFeedJob());
    expect(posting.location).toBe('Austin, TX');
  });
});
