/**
 * pricing.ts - what the PUBLIC site is allowed to say about plans.
 *
 * Why this is a third registry rather than a section of an existing one
 * --------------------------------------------------------------------
 * `entitlements.ts` answers "has this user paid for X". It is a declared
 * mirror of the backend's paid-plan contract, and mixing marketing copy into
 * it drifts the mirror. `capabilities.ts` answers "does X exist for anyone
 * yet". This file answers the third, different question: "what do we PRINT on
 * a page a stranger reads before they have an account".
 *
 * It reads from both rather than restating them. Plan names come from
 * `PLAN_LABEL`, so the marketing site, the billing tab and the backend cannot
 * disagree about whether a tier is called Premium or Pro. Capability lines
 * carry a capability id and render that capability's own registry status, so
 * a tier physically cannot advertise something the registry calls unbuilt.
 *
 * THE PRICE RULE
 * --------------
 * No price is published. `POST /api/billing/upgrade` is a documented stub
 * (see capabilities.ts), so there is no checkout to send anyone to, and the
 * numbers in `entitlements.PLAN_PRICE` are a frontend guess at a decision the
 * product owner has not made. A page that prints "$19.99/mo" next to a button
 * that toasts "Billing is coming soon" costs more trust than it earns.
 *
 * So: `PRICING_PUBLISHED` is false, every money value below is null, and the
 * only live CTA anywhere on the public site is "Create free account". When
 * the decisions in `PRICE_TODO` are made, fill them in and flip the flag -
 * `pricing.test.ts` will hold you to the rest.
 */
import { PLAN_LABEL, PLAN_ORDER, AUTO_APPLY_SUBMIT_LIMITS, type PlanId } from './entitlements';
import { capabilityById } from './capabilities';

/* ─────────────────────────────────────────────────────────────────────────
 * PRODUCT-OWNER TODO. Nothing in this block is data yet.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Gates every price-shaped thing on the public site. While this is false, no
 * surface may render a currency symbol, a decimal amount, or a "/mo".
 */
export const PRICING_PUBLISHED = false as const;

export interface PlanPrice {
  monthly: number | null;
  annual: number | null;
}

/**
 * TODO(product-owner): decide and fill, then set PRICING_PUBLISHED = true.
 *
 * Two currencies, not one. The stated target user is a final-year student or
 * recent graduate in the US OR India, and a USD-only page is the wrong answer
 * for half of them - INR is a separate decision, not a conversion of the USD
 * number.
 */
export const PRICE_TODO: Record<PlanId, { usd: PlanPrice; inr: PlanPrice } | null> = {
  free: null, // TODO(product-owner): confirm Free stays free permanently.
  premium: null, // TODO(product-owner): monthly + annual, USD and INR.
  premium_plus: null, // TODO(product-owner): confirm this tier exists at launch.
};

/** TODO(product-owner): each of these is a public promise, and none is decided. */
export const PRICE_POLICY_TODO = {
  annualDiscountPercent: null,
  trialDays: null,
  studentDiscount: null,
  refundWindowDays: null,
} as const;

/** The one string printed where a price would otherwise go. */
export const PRICE_TBD_LABEL = 'Pricing not announced yet';
export const FREE_PRICE_LABEL = 'Free';

/* ─────────────────────────────────────────────────────────────────────────
 * DATA. Everything below is verifiable today.
 * ───────────────────────────────────────────────────────────────────────── */

export type PlanLine =
  /** Renders the capability's own name plus its registry status. Cannot overclaim. */
  | { kind: 'capability'; capabilityId: string; outcome: string }
  /** A number already mirrored in entitlements.ts. `source` names the mirror. */
  | { kind: 'limit'; outcome: string; value: string; source: string }
  /** A plain outcome. `evidence` is for the next person who edits this. */
  | { kind: 'text'; outcome: string; evidence: string };

export interface PublicPlan {
  id: PlanId;
  /** ALWAYS PLAN_LABEL[id]. Never a literal. */
  label: string;
  /** Who this tier is for, in job-seeker language. */
  audience: string;
  includes: readonly PlanLine[];
  /**
   * The only live CTA on the public site. `null` renders NO control at all -
   * deliberately not a disabled button, because a dead control is exactly
   * what the roadmap sections on this page already refuse to ship.
   */
  cta: { label: string; to: string } | null;
}

const AUTO_APPLY_LIMIT = (plan: PlanId): string => {
  const limit = AUTO_APPLY_SUBMIT_LIMITS[plan];
  return limit == null ? 'No monthly cap' : `${limit} a month`;
};

export const PUBLIC_PLANS: readonly PublicPlan[] = [
  {
    id: 'free',
    label: PLAN_LABEL.free,
    audience: 'Everything you need to run a real job search. No card.',
    includes: [
      { kind: 'capability', capabilityId: 'match', outcome: 'Roles matched to your resume, with the reason for each' },
      { kind: 'capability', capabilityId: 'tailor', outcome: 'Tailored resumes, with a daily limit' },
      { kind: 'capability', capabilityId: 'track', outcome: 'Every application, status and follow-up in one pipeline' },
      { kind: 'capability', capabilityId: 'email-updates', outcome: 'A daily digest, off until you turn it on' },
      {
        kind: 'limit',
        outcome: 'Assisted applications',
        value: AUTO_APPLY_LIMIT('free'),
        source: 'entitlements.AUTO_APPLY_SUBMIT_LIMITS.free',
      },
    ],
    cta: { label: 'Create free account', to: '/register' },
  },
  {
    id: 'premium',
    label: PLAN_LABEL.premium,
    audience: 'For an active search where volume starts to matter.',
    includes: [
      { kind: 'text', outcome: 'Everything in Free', evidence: 'PLAN_ORDER is cumulative in entitlements_service' },
      {
        kind: 'text',
        outcome: 'A higher daily tailoring limit',
        evidence: 'entitlements_service PLAN_LIMITS.tailor; exact number is a PRICE_TODO decision',
      },
      {
        kind: 'text',
        outcome: 'Batch tailoring for several roles at once',
        evidence: "entitlements.FEATURE_MIN_PLAN.batch_tailor === 'premium'",
      },
      {
        kind: 'limit',
        outcome: 'Assisted applications',
        value: AUTO_APPLY_LIMIT('premium'),
        source: 'entitlements.AUTO_APPLY_SUBMIT_LIMITS.premium',
      },
    ],
    cta: null,
  },
  {
    id: 'premium_plus',
    label: PLAN_LABEL.premium_plus,
    audience: 'For a search that is your full-time job right now.',
    includes: [
      { kind: 'text', outcome: 'Everything in Premium', evidence: 'PLAN_ORDER is cumulative' },
      {
        kind: 'text',
        outcome: 'Interview coaching and pattern analysis',
        evidence: "entitlements.FEATURE_MIN_PLAN.interview_analytics_predictive === 'premium_plus'",
      },
      {
        kind: 'limit',
        outcome: 'Assisted applications',
        value: AUTO_APPLY_LIMIT('premium_plus'),
        source: 'entitlements.AUTO_APPLY_SUBMIT_LIMITS.premium_plus',
      },
    ],
    cta: null,
  },
] as const;

/** Public plans follow the entitlements order, so the page cannot reorder tiers. */
export const PUBLIC_PLAN_ORDER: readonly PlanId[] = PLAN_ORDER;

/** The line printed above the plan grid while prices are unannounced. */
export const PRICING_DISCLOSURE =
  'Prices are not announced yet. The Free plan is what you can sign up for today, and it does not ask for a card.';

/**
 * Dev-time guard. The unit test enforces this properly; this is the version
 * that shouts during local work, before anyone opens a PR.
 */
if (import.meta.env.DEV && !PRICING_PUBLISHED) {
  const offenders = PUBLIC_PLANS.filter((p) => p.id !== 'free' && p.cta !== null);
  console.assert(
    offenders.length === 0,
    'pricing.ts: paid plans must carry no CTA while PRICING_PUBLISHED is false',
  );
  const unknown = PUBLIC_PLANS.flatMap((p) =>
    p.includes.filter((l) => l.kind === 'capability' && !capabilityById(l.capabilityId)),
  );
  console.assert(unknown.length === 0, 'pricing.ts: a plan line names an unknown capability');
}
