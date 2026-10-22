/**
 * careerJobs boundary defense - title normalization + dedupe keys.
 *
 * Regression for the "blank title" bug: some source rows carry the role
 * under `job_title` or `role` instead of `title`. Both toJob mappers and the
 * mergeJobs dedupe key must resolve through jobTitleOf.
 */
import { describe, expect, test } from 'vitest';

import { applyUrlKey, inRecencyWindow, jobTitleOf, matchesSeniority, mergeJobs, recencyAgeOf, seniorityOf, sortJobsByMode, toJob, isAppliedPipelineStatus } from '@/lib/careerJobs';
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

  test('mergeJobs prefers higher score over a longer description from another ATS', () => {
    const workday = row({
      job_id: 'wd',
      title: 'Software Engineer',
      match_score: 88,
      description: 'Short.',
    });
    const careers = row({
      job_id: 'cp',
      title: 'Software Engineer',
      match_score: 40,
      description: 'x'.repeat(400),
    });
    const merged = mergeJobs([workday], [careers]);
    expect(merged).toHaveLength(1);
    expect(merged[0].job_id).toBe('wd');
    expect(merged[0].match_score).toBe(88);
  });

  test('sortJobsByMode Best match vs Newest', () => {
    const a = row({ job_id: 'a', title: 'A', match_score: 90, days_ago: 5 });
    const b = row({ job_id: 'b', title: 'B', match_score: 50, days_ago: 0 });
    expect(sortJobsByMode([a, b], 'score').map((j) => j.job_id)).toEqual(['a', 'b']);
    expect(sortJobsByMode([a, b], 'newest').map((j) => j.job_id)).toEqual(['b', 'a']);
  });

  test('Jobgether marketplace rows always sort after first-party employers', () => {
    const employer = row({
      job_id: 'emp',
      title: 'Software Engineer',
      company: 'Acme',
      tenant: 'acme',
      match_score: 40,
      days_ago: 3,
    });
    const market = row({
      job_id: 'jg',
      title: 'Software Engineer',
      company: 'Jobgether',
      tenant: 'jobgether',
      board_kind: 'marketplace',
      match_score: 99,
      days_ago: 0,
    });
    expect(sortJobsByMode([market, employer], 'score').map((j) => j.job_id)).toEqual([
      'emp',
      'jg',
    ]);
    expect(sortJobsByMode([market, employer], 'newest').map((j) => j.job_id)).toEqual([
      'emp',
      'jg',
    ]);
  });

  test('mergeJobs prefers a first-party copy over a Jobgether duplicate', () => {
    const employer = row({
      job_id: 'emp',
      title: 'Software Engineer',
      company: 'Acme',
      location: 'Remote',
      match_score: 50,
    });
    const market = row({
      job_id: 'jg',
      title: 'Software Engineer',
      company: 'Acme',
      location: 'Remote',
      tenant: 'jobgether',
      board_kind: 'marketplace',
      match_score: 95,
    });
    const merged = mergeJobs([market], [employer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].job_id).toBe('emp');
  });

  test('isAppliedPipelineStatus covers funnel and terminal statuses', () => {
    expect(isAppliedPipelineStatus('applied')).toBe(true);
    expect(isAppliedPipelineStatus('interview')).toBe(true);
    expect(isAppliedPipelineStatus('offer')).toBe(true);
    expect(isAppliedPipelineStatus('rejected')).toBe(true);
    expect(isAppliedPipelineStatus('withdrawn')).toBe(true);
    expect(isAppliedPipelineStatus('interested')).toBe(false);
    expect(isAppliedPipelineStatus(null)).toBe(false);
  });

  test('applied roles pin after open roles, including after marketplace', () => {
    const openEmp = row({
      job_id: 'open-emp',
      title: 'A',
      match_score: 40,
      days_ago: 5,
      tenant: 'acme',
    });
    const openMarket = row({
      job_id: 'open-jg',
      title: 'B',
      match_score: 99,
      days_ago: 0,
      tenant: 'jobgether',
      board_kind: 'marketplace',
    });
    const appliedEmp = row({
      job_id: 'applied-emp',
      title: 'C',
      match_score: 95,
      days_ago: 0,
      tenant: 'acme',
    });
    const appliedIds = new Set(['applied-emp']);
    const sorted = sortJobsByMode([appliedEmp, openMarket, openEmp], 'newest', {
      isApplied: (j) => appliedIds.has(j.job_id),
    });
    expect(sorted.map((j) => j.job_id)).toEqual(['open-emp', 'open-jg', 'applied-emp']);
  });
});


describe('seniority filtering', () => {
  const job = (over: Partial<WorkdayJob>): WorkdayJob => row(over);

  test('a band the filter does not offer is not silently hidden', () => {
    // The server stores seven bands; the dropdown offers four. The old
    // `seniorityOf(j) === view` comparison meant every staff / director /
    // executive posting matched NO option and vanished under every choice
    // except "Any". They belong under Senior+.
    for (const band of ['senior', 'staff', 'director', 'executive']) {
      expect(matchesSeniority(job({ seniority: band }), 'senior')).toBe(true);
      expect(matchesSeniority(job({ seniority: band }), 'entry')).toBe(false);
    }
    expect(matchesSeniority(job({ seniority: 'intern' }), 'intern')).toBe(true);
    expect(matchesSeniority(job({ seniority: 'entry' }), 'entry')).toBe(true);
    expect(matchesSeniority(job({ seniority: 'mid' }), 'mid')).toBe(true);
  });

  test('an unlevelled posting shows in every view', () => {
    // Most postings state no level. Treating unknown as "fails the filter"
    // hides the majority of the market behind a distinction the employer
    // never drew - the same rule the server applies in its own query.
    for (const view of ['intern', 'entry', 'mid', 'senior', 'any']) {
      expect(matchesSeniority(job({ seniority: 'unknown' }), view)).toBe(true);
      expect(matchesSeniority(job({ title: 'Software Engineer' }), view)).toBe(true);
    }
  });

  test('the streamed-row fallback mirrors the server classifier', () => {
    // No `seniority` yet (a provisional row mid-scan), so the title is read.
    expect(seniorityOf(job({ title: 'New Grad Software Engineer' }))).toBe('entry');
    expect(seniorityOf(job({ title: 'Early Career Analyst' }))).toBe('entry');
    expect(seniorityOf(job({ title: 'Software Engineering Intern' }))).toBe('intern');
    // "Lead" and "Manager" are not senior markers: "Lead Cashier" is not a
    // Staff Engineer, and reading them that way is what put 21% of the live
    // corpus in the staff band.
    expect(seniorityOf(job({ title: 'Lead Cashier' }))).toBe('mid');
    expect(seniorityOf(job({ title: 'Restaurant Shift Manager' }))).toBe('mid');
    expect(seniorityOf(job({ title: 'Staff Nurse' }))).not.toBe('staff');
    // Unmarked is unknown, never 'mid'.
    expect(seniorityOf(job({ title: 'Registered Nurse' }))).toBe('unknown');
  });
});

describe('board diversity preserves the sort', () => {
  /**
   * 100 rows, scores strictly descending, over TEN boards - enough that a
   * 20-row page can hold 3 from each without the best-effort top-up firing.
   * Board A owns the twelve highest scores, which is the shape that broke it:
   * JPMorgan's `jpmc` tenant held 15 of the first 20 cards.
   */
  const feed = (): WorkdayJob[] =>
    Array.from({ length: 100 }, (_, i) =>
      row({
        job_id: `j-${i}`,
        title: `Engineer ${i}`,
        match_score: 100 - i,
        days_ago: 0,
        ats: 'workday',
        tenant: i < 12 ? 'boardA' : `board${'BCDEFGHIJ'[i % 9]}`,
      }),
    );

  test('page one still descends by score', () => {
    const out = sortJobsByMode(feed(), 'score');
    const page = out.slice(0, 20).map((j) => j.match_score ?? 0);
    // The first implementation dealt round-robin and produced
    // 98, 98, 97, 94, 91, 80, 91, 81 - a sawtooth. Ordering is the contract:
    // a feed sorted by score must descend, or the sort control lies.
    for (let i = 1; i < page.length; i += 1) {
      expect(page[i]).toBeLessThanOrEqual(page[i - 1]);
    }
  });

  test('no board takes more than the cap on a page, and nothing is dropped', () => {
    const input = feed();
    const out = sortJobsByMode(input, 'score');
    expect(out).toHaveLength(input.length);
    expect(new Set(out.map((j) => j.job_id)).size).toBe(input.length);

    const counts = new Map<string, number>();
    for (const j of out.slice(0, 20)) {
      const k = `${j.ats}:${j.tenant}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    // boardA holds the 12 highest scores; only 3 may sit on page one.
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  test('a page that genuinely is one board is filled, not shortened', () => {
    const single = Array.from({ length: 40 }, (_, i) =>
      row({ job_id: `s-${i}`, match_score: 100 - i, ats: 'workday', tenant: 'only' }),
    );
    const out = sortJobsByMode(single, 'score');
    expect(out).toHaveLength(40);
    // Best-effort cap: with no diversity available the page is topped up
    // rather than emitted four rows long.
    expect(out.slice(0, 20).map((j) => j.match_score)).toEqual(
      single.slice(0, 20).map((j) => j.match_score),
    );
  });
});

describe('recency windows judge undated rows by first sighting', () => {
  // Reported 2026-10-21: Rippling / JazzHR rows (no published date) showed
  // under "Today" days after they were first seen, because any row with
  // `days_ago == null` passed every window.
  test('a dated row is judged by its post date', () => {
    expect(inRecencyWindow(row({ days_ago: 0 }), 0)).toBe(true);
    expect(inRecencyWindow(row({ days_ago: 1 }), 0)).toBe(false);
  });
  test('an undated row first seen days ago is not Today', () => {
    const r = row({ days_ago: null, first_seen_days_ago: 3 });
    expect(recencyAgeOf(r)).toBe(3);
    expect(inRecencyWindow(r, 0)).toBe(false);
    expect(inRecencyWindow(r, 3)).toBe(true);
  });
  test('an undated row first seen today stays in Today', () => {
    expect(inRecencyWindow(row({ days_ago: null, first_seen_days_ago: 0 }), 0)).toBe(true);
  });
  test('a row with no age at all is kept (unknown is not old)', () => {
    expect(recencyAgeOf(row({ days_ago: null }))).toBeNull();
    expect(inRecencyWindow(row({ days_ago: null }), 0)).toBe(true);
  });
});

describe('applyUrlKey - the same posting under a new card id', () => {
  test('drops tracking and the apply suffix, keeps the job address', () => {
    expect(applyUrlKey('https://ats.rippling.com/acme/jobs/5f1c?utm_source=x&src=li'))
      .toBe(applyUrlKey('https://ats.rippling.com/acme/jobs/5f1c/'));
    expect(applyUrlKey('https://jobs.lever.co/acme/abc/apply?lever-source=LinkedIn'))
      .toBe(applyUrlKey('https://jobs.lever.co/acme/abc'));
  });
  test('functional identifiers in the query are preserved', () => {
    expect(applyUrlKey('https://acme.com/careers?gh_jid=1')).not.toBe(applyUrlKey('https://acme.com/careers?gh_jid=2'));
    expect(applyUrlKey('https://jobs.ashbyhq.com/acme?ashby_jid=a')).not.toBe(applyUrlKey('https://jobs.ashbyhq.com/acme'));
  });
  test('a generic portal with no job address does not equal a specific job', () => {
    expect(applyUrlKey('https://portal.jobdiva.com/jobs?a=1'))
      .not.toBe(applyUrlKey('https://portal.jobdiva.com/jobs?a=1&jobid=99'));
  });
  test('a job id after # keeps one portal from collapsing distinct jobs', () => {
    const a = applyUrlKey('https://portal.jobdiva.com/portal/?a=scalence#/jobs/33273835');
    const b = applyUrlKey('https://portal.jobdiva.com/portal/?a=scalence#/jobs/33273299');
    expect(a).not.toBe(b);
    expect(applyUrlKey('https://acme.com/careers?jr_id=abc&gh_jid=7'))
      .toBe(applyUrlKey('https://acme.com/careers?gh_jid=7'));
  });
  test('garbage and non-web schemes never match', () => {
    expect(applyUrlKey('')).toBe('');
    expect(applyUrlKey('mailto:jobs@acme.com')).toBe('');
    expect(applyUrlKey('not a url')).toBe('');
  });
});
