/**
 * The bridge from the LEGACY per-company sponsorship payload to the one
 * framing this product is allowed to use for it.
 *
 * `SponsorshipSignal` (`types/jobs.ts`) is what `/api/jobs/search` and
 * `/api/jobs/sponsorship` have sent for a long time. It carries a `score`, a
 * `band` and a server-written `headline`, and the old badge rendered that
 * headline verbatim - which meant the copy on screen was whatever string the
 * backend happened to produce, including bands like "low" that read as a
 * prediction about the reader's chances.
 *
 * This maps it onto `EmployerSponsorshipSignal`, whose renderer can only ever
 * produce
 *
 *     "Sponsored N people in similar roles in the last 5 years"
 *
 * beside its source and vintage. Two consequences, both deliberate:
 *
 *  - `score`, `band` and `headline` are DROPPED. They are model output about
 *    the reader's odds, and this product does not make that claim;
 *  - a payload with no approvals maps to a signal with no evidence, which
 *    renders as nothing at all. `approvals_5y: 0` is not published as a zero,
 *    because "not present in the filing data" and "does not sponsor" are
 *    different facts and the dataset cannot tell them apart;
 *  - no period is asserted. `approvals_5y` is a field name and the store
 *    behind it holds a single fiscal year, so the only period this bridge
 *    passes on is the vintage the payload itself reports. Without one the
 *    signal fails `hasSponsorshipEvidence` and nothing is rendered.
 */
import type { SponsorshipSignal } from '@/types/jobs';
import type { EmployerSponsorshipSignal } from '@/types/workAuthorization';

export function legacySponsorshipSignal(
  legacy: SponsorshipSignal | null | undefined,
): EmployerSponsorshipSignal | null {
  if (!legacy) return null;
  const approvals = typeof legacy.approvals_5y === 'number' ? legacy.approvals_5y : null;
  if (approvals === null || !Number.isFinite(approvals) || approvals <= 0) return null;

  return {
    // The legacy payload counts H-1B approvals for the EMPLOYER. It is not
    // role-scoped, so it is marked as such and renders the employer-wide
    // sentence rather than borrowing "in similar roles".
    scope: 'employer_wide',
    similar_role_approvals: approvals,
    // No period is asserted here. `approvals_5y` is a field NAME, not a
    // measured window, and the store behind it currently holds one fiscal
    // year. The vintage the payload reports is the only period claim made;
    // a payload with no vintage renders nothing, which is the honest outcome
    // for a count we cannot date.
    data_vintage: legacy.data_vintage || null,
    source: legacy.source || null,
    disclaimer: legacy.disclaimer || null,
  };
}
