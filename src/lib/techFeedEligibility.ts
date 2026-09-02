/**
 * Reading the screening block off a tech-feed job.
 *
 * The scoring engine produces four things a card must render carefully:
 * `eligibility`, `ineligible_reasons`, `role_alignment` and `hard_constraints`.
 * The search response promotes them to the top level of each job; the same
 * fields also exist inside the `fit` verdict block. These readers take the top
 * level first and fall back to `fit`, so a card renders identically whichever
 * shape the server sends and renders NOTHING when it sends neither.
 *
 * Nothing here derives a verdict the server did not state. The one inference
 * is the honest one: when `eligibility` is absent entirely, a row with no fit
 * version stamp is "not scored" - the same gate `fitBands.isFitScored` uses -
 * and anything else is left alone.
 */
import type {
  RoleAlignmentTier,
  TechFeedEligibility,
  TechFeedHardConstraint,
  TechFeedJob,
  TechFeedRoleAlignment,
} from '@/types/techFeed';

/** True when the row carries the scoring engine's own version stamp. */
export function isTechFeedScored(job: TechFeedJob): boolean {
  const stamp = job.fit_score_version ?? job.fit?.score_version;
  return typeof stamp === 'string' && stamp.trim().length > 0;
}

/**
 * The screening verdict. `not_scored` when the server said so, and also when
 * no fit verdict was computed at all - a row we could not score is exactly
 * that, and calling it `eligible` would claim a screening pass we never ran.
 */
export function eligibilityOf(job: TechFeedJob): TechFeedEligibility {
  const stated = job.eligibility ?? job.fit?.eligibility;
  if (stated === 'eligible' || stated === 'ineligible' || stated === 'not_scored') return stated;
  return isTechFeedScored(job) ? 'eligible' : 'not_scored';
}

export function ineligibleReasonsOf(job: TechFeedJob): string[] {
  const reasons = job.ineligible_reasons ?? job.fit?.ineligible_reasons ?? [];
  return reasons.filter((reason): reason is string => typeof reason === 'string' && !!reason.trim());
}

export function roleAlignmentOf(job: TechFeedJob): TechFeedRoleAlignment | null {
  const alignment = job.role_alignment ?? job.fit?.role_alignment ?? null;
  if (!alignment || typeof alignment.detail !== 'string' || !alignment.detail.trim()) return null;
  return alignment;
}

export function hardConstraintsOf(job: TechFeedJob): TechFeedHardConstraint[] {
  const constraints = job.hard_constraints ?? job.fit?.hard_constraints ?? [];
  return constraints.filter((entry): entry is TechFeedHardConstraint => !!entry && !!entry.detail);
}

/**
 * Stated gates the resume is SILENT about - a clearance, a licence, a work
 * authorization restriction.
 *
 * These are requirements to check, not deductions: nothing on a resume can
 * contradict "holds an active security clearance", so the engine does not
 * price them and the card must not present them as a reason a score is low.
 * `missing` constraints are excluded here precisely because those ARE priced,
 * and they surface as ineligibility reasons instead.
 */
export function requirementsToCheck(job: TechFeedJob): TechFeedHardConstraint[] {
  return hardConstraintsOf(job).filter(
    (entry) => entry.hard_requirement === true && entry.status === 'unknown',
  );
}

/**
 * Short label for a tier. The engine's own `detail` string carries the
 * substance and is rendered verbatim beside it - this is a heading, not a
 * paraphrase.
 */
export const ROLE_ALIGNMENT_LABEL: Record<RoleAlignmentTier, string> = {
  exact_specialty: 'Same specialty as your resume',
  adjacent_specialty: 'Adjacent specialty',
  same_family: 'Same field as your resume',
  adjacent_family: 'Adjacent field',
  unrelated: 'Different field from your resume',
  unknown: 'Not enough signal to compare fields',
};

export function roleAlignmentLabel(tier: RoleAlignmentTier | string): string {
  return ROLE_ALIGNMENT_LABEL[tier as RoleAlignmentTier] ?? 'Field comparison';
}
