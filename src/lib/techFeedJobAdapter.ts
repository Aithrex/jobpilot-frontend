/**
 * TechFeedJob -> Job, for the five flows that already exist.
 *
 * Save, apply-confirm, tailor handoff, the application tracker and auto-apply
 * are all written against `Job` (`src/types/jobs.ts`) and are reached through
 * `useJobSearch`. The tech feed produces `TechFeedJob`. This is the ONE place
 * the two shapes meet - reimplementing any of those flows against the feed's
 * shape would fork behaviour the tracker depends on.
 *
 * The rule this file exists to enforce
 * ------------------------------------
 * A field the feed does not carry is LEFT OUT. It is never defaulted to a
 * plausible-looking value, because every default here becomes a claim
 * somewhere else in the product:
 *
 *  - an unpublished salary must not become `0` or `""`-that-renders-as-a-range;
 *  - an unknown work mode must not become `is_remote: false`, which asserts
 *    the job is on site;
 *  - an unknown posting date must not become `new Date()`, which would make a
 *    posting of unknown age look like it was published today;
 *  - the job's own required skills are NOT the candidate's matched skills, so
 *    they are not copied into `matched_skills`;
 *  - `match_score` travels only when the row carries the scoring engine's
 *    version stamp, which is the same gate `fitBands.isFitScored` applies -
 *    an unstamped number reads "Not scored", which is the truth.
 *
 * Absent keys serialize away (JSON.stringify drops `undefined`), so the
 * tracker receives "we do not know" rather than a fabricated fact.
 */
import type { CareerPortalSeniority, Job } from '@/types/jobs';
import type { TechFeedJob } from '@/types/techFeed';

/** The four seniority bands `Job.seniority` is allowed to hold. */
const JOB_SENIORITY: ReadonlySet<string> = new Set<CareerPortalSeniority>([
  'intern',
  'entry',
  'mid',
  'senior',
]);

/** Pay copy for the tracker, or undefined when the employer published none. */
function salaryText(job: TechFeedJob): string | undefined {
  const salary = job.salary;
  if (!salary?.published) return undefined;
  if (salary.display) return salary.display;

  const currency = salary.currency ? `${salary.currency} ` : '';
  const interval = salary.interval && salary.interval !== 'year' ? ` / ${salary.interval}` : '';
  const { min_annual: min, max_annual: max } = salary;
  if (min !== null && max !== null) {
    return `${currency}${min.toLocaleString()} - ${max.toLocaleString()}${interval}`;
  }
  if (min !== null) return `${currency}${min.toLocaleString()}+${interval}`;
  if (max !== null) return `Up to ${currency}${max.toLocaleString()}${interval}`;
  return undefined;
}

function locationText(job: TechFeedJob): string | undefined {
  const first = (job.locations ?? []).find(Boolean);
  if (!first) return undefined;
  const text =
    first.raw || [first.city, first.region, first.country].filter(Boolean).join(', ');
  return text || undefined;
}

/**
 * `true` for remote, `false` for hybrid / on site, and `undefined` when the
 * posting never said. The third case is the point.
 */
function remoteFlag(job: TechFeedJob): boolean | undefined {
  if (job.work_mode === 'remote') return true;
  if (job.work_mode === 'hybrid' || job.work_mode === 'onsite') return false;
  return undefined;
}

export function techFeedJobToJob(job: TechFeedJob): Job {
  const scored = typeof job.fit_score_version === 'string' && job.fit_score_version.trim() !== '';

  // Built as a partial on purpose: `Job` types several of these as required,
  // and this adapter's whole contract is that an unknown one is ABSENT. The
  // single cast below is where that intent meets a type that cannot express it.
  const posting: Partial<Job> = {
    job_id: job.job_id,
    title: job.normalized_title || job.title_raw,
    company: job.employer_name,
    apply_link: job.apply_url || job.canonical_url,
  };

  const location = locationText(job);
  if (location) posting.location = location;

  const salary = salaryText(job);
  if (salary) posting.salary = salary;

  if (job.employment_type) posting.employment_type = job.employment_type;

  // Only an EXACT date travels. A relative age rides `posted_text`, which is
  // display copy, so nothing downstream can parse it back into a date.
  if (job.posted_at_confidence === 'exact' && job.posted_at) {
    posting.date_posted = job.posted_at;
  } else if (job.posted_at_confidence === 'relative' && job.days_ago !== null) {
    posting.posted_text = job.days_ago <= 0 ? 'about today' : `about ${job.days_ago} days ago`;
  }

  const remote = remoteFlag(job);
  if (remote !== undefined) posting.is_remote = remote;

  const source = job.source || job.ats;
  if (source) posting.source = source;

  if (scored) {
    posting.match_score = job.match_score;
    posting.score_version = job.fit_score_version ?? undefined;
  }

  if (JOB_SENIORITY.has(job.seniority)) {
    posting.seniority = job.seniority as CareerPortalSeniority;
  }

  return posting as Job;
}

export default techFeedJobToJob;
