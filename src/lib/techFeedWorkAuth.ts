/**
 * Reading the work-authorization facts off a tech-feed posting.
 *
 * Three facts, all about the POSTING or the EMPLOYER and never about the user:
 *
 *  1. does this role require an active security clearance;
 *  2. does this posting state that the employer will not sponsor;
 *  3. has this employer sponsored people in comparable roles before.
 *
 * The hard rule here is that SILENCE IS NOT A STATEMENT. The vast majority of
 * postings say nothing about sponsorship, and a posting that says nothing must
 * not be labelled either way. Every reader below returns the "not stated"
 * answer unless the server said something from a closed, known vocabulary.
 *
 * The token list exists because `TechFeedJob.sponsorship` is a legacy
 * free-form string written by several ingest paths. When the server sends
 * `sponsorship_stance` that is used instead and the list is never consulted.
 */
import type { SponsorshipStance } from '@/types/workAuthorization';
import type { TechFeedHardConstraint, TechFeedJob } from '@/types/techFeed';

import { hardConstraintsOf } from '@/lib/techFeedEligibility';

/**
 * Tokens that mean "this employer will not sponsor". Closed set: anything not
 * here is "not stated", including strings that look negative but are not
 * unambiguous.
 */
const REFUSAL_TOKENS = new Set([
  'no_sponsorship',
  'not_offered',
  'not_available',
  'no_visa_sponsorship',
  'sponsorship_not_available',
  'sponsorship_not_offered',
  'refused',
  'declined',
  'us_citizen_only',
  'citizens_only',
  'no_c2c',
  'must_be_authorized',
  'authorized_without_sponsorship',
]);

/** Tokens that mean "sponsorship is on the table". Equally closed. */
const OFFER_TOKENS = new Set([
  'sponsorship_available',
  'sponsors',
  'offers_sponsorship',
  'will_sponsor',
  'visa_sponsorship',
  'h1b_sponsorship',
  'available',
  'likely',
]);

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * The posting's stance on sponsorship.
 *
 * Prefers the server's own `sponsorship_stance`. Falls back to the legacy
 * token, and returns `unstated` for everything it does not recognise - which
 * is the honest answer for a posting that never mentioned it.
 */
export function sponsorshipStanceOf(job: TechFeedJob): SponsorshipStance {
  const stated = job.sponsorship_stance;
  if (stated === 'offers' || stated === 'refuses' || stated === 'unstated') return stated;

  const token = typeof job.sponsorship === 'string' ? normalizeToken(job.sponsorship) : '';
  if (!token) return 'unstated';
  if (REFUSAL_TOKENS.has(token)) return 'refuses';
  if (OFFER_TOKENS.has(token)) return 'offers';
  return 'unstated';
}

/** True only when the posting STATES it does not sponsor. */
export function statesNoSponsorship(job: TechFeedJob): boolean {
  return sponsorshipStanceOf(job) === 'refuses';
}

/**
 * The clearance requirement, and the evidence for it.
 *
 * `clearance_required` is the flag; a `hard_constraints` entry about a
 * clearance carries the posting's own wording, which is worth far more to a
 * reader than the boolean. Returns null when nothing said so.
 */
export function clearanceRequirementOf(
  job: TechFeedJob,
): { detail: string | null; constraint: TechFeedHardConstraint | null } | null {
  const constraint =
    hardConstraintsOf(job).find((entry) => {
      const key = `${entry.type ?? ''} ${entry.key ?? ''}`.toLowerCase();
      return key.includes('clearance');
    }) ?? null;

  if (job.clearance_required !== true && !constraint) return null;
  return { detail: constraint?.detail ?? null, constraint };
}

export function requiresClearance(job: TechFeedJob): boolean {
  return clearanceRequirementOf(job) !== null;
}

/**
 * Does this posting state a barrier the user would have to clear?
 *
 * The union the feed's demote/hide control acts on. Deliberately narrow: only
 * a STATED clearance requirement or a STATED refusal to sponsor counts. A
 * posting that is merely silent is never demoted, because demoting on silence
 * would quietly bury most of the index.
 */
export function statesAccessBarrier(job: TechFeedJob): boolean {
  return requiresClearance(job) || statesNoSponsorship(job);
}

// ── Applying the show / demote / hide preference ─────────────────

export interface AccessBarrierPartition<T> {
  /** Postings with no stated barrier, in the server's order. */
  primary: T[];
  /** Postings pushed below the fold, still in the server's relative order. */
  demoted: T[];
  /** How many rows each choice removed, so the UI can say what it cost. */
  hiddenClearance: number;
  hiddenNoSponsorship: number;
  /** Total rows removed. A row hit by both reasons counts once. */
  hiddenTotal: number;
  /** How many rows were demoted rather than hidden. */
  demotedTotal: number;
}

/**
 * Split a page of results by what the postings STATE about access.
 *
 * Nothing here re-scores and nothing re-sorts: the server's order is
 * preserved inside each group, so demoting is a partition rather than a second
 * ranking model competing with the first. Hiding is counted, not silent - the
 * caller is expected to render the counts and offer them back.
 */
export function partitionByAccessBarrier<T extends TechFeedJob>(
  jobs: T[],
  options: {
    clearanceRoles: 'show' | 'demote' | 'hide';
    noSponsorshipRoles: 'show' | 'demote' | 'hide';
  },
): AccessBarrierPartition<T> {
  const primary: T[] = [];
  const demoted: T[] = [];
  let hiddenClearance = 0;
  let hiddenNoSponsorship = 0;
  let hiddenTotal = 0;

  for (const job of jobs) {
    const clearance = requiresClearance(job);
    const noSponsorship = statesNoSponsorship(job);

    const hide =
      (clearance && options.clearanceRoles === 'hide') ||
      (noSponsorship && options.noSponsorshipRoles === 'hide');

    if (hide) {
      if (clearance && options.clearanceRoles === 'hide') hiddenClearance += 1;
      if (noSponsorship && options.noSponsorshipRoles === 'hide') hiddenNoSponsorship += 1;
      hiddenTotal += 1;
      continue;
    }

    const demote =
      (clearance && options.clearanceRoles === 'demote') ||
      (noSponsorship && options.noSponsorshipRoles === 'demote');

    if (demote) demoted.push(job);
    else primary.push(job);
  }

  return {
    primary,
    demoted,
    hiddenClearance,
    hiddenNoSponsorship,
    hiddenTotal,
    demotedTotal: demoted.length,
  };
}
