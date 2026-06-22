/**
 * Frontend mirror of the backend freemium model (services/entitlements_service.py).
 * The backend is the source of truth and ENFORCES limits; this is for display +
 * client-side gating UX only (lock badges, upgrade prompts, quota meters).
 */
import type { AuthEntitlements } from '@/contexts/AuthContext';

export type PlanId = 'free' | 'premium' | 'premium_plus';

export const PLAN_ORDER: PlanId[] = ['free', 'premium', 'premium_plus'];

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  premium: 'Premium',
  premium_plus: 'Premium+',
};

export const PLAN_PRICE: Record<PlanId, number> = {
  free: 0,
  premium: 19.99,
  premium_plus: 39.99,
};

/** Human labels for boolean feature gates the UI checks. */
export const FEATURE_LABEL: Record<string, string> = {
  batch_tailor: 'Batch resume tailoring',
  interview_fit: 'Interview-fit analysis',
  interview_analytics_trends: 'Interview pattern trends',
  interview_analytics_predictive: 'Predictive interview coaching',
  events_personalized: 'Personalized events feed',
  events_curated: 'Curated & early-access events',
  advisor: 'AI recruiter advisor',
  advisor_autoactions: 'Advisor auto-actions',
  salary_percentiles: 'Salary percentiles',
  salary_negotiation: 'Negotiation scripts',
  post_history: 'Post history',
};

export function hasFeature(ent: AuthEntitlements | undefined, feature: string): boolean {
  return !!ent?.features?.includes(feature);
}

export function limitOf(ent: AuthEntitlements | undefined, key: string): number | null | undefined {
  return ent?.limits?.[key];
}

/** Format a numeric limit for display (null => Unlimited, 0 => off). */
export function formatLimit(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Unlimited';
  if (v === 0) return '—';
  return String(v);
}

export function planRank(plan: string | undefined): number {
  const i = PLAN_ORDER.indexOf((plan as PlanId) ?? 'free');
  return i < 0 ? 0 : i;
}

export function nextPlan(plan: string | undefined): PlanId | null {
  const i = planRank(plan);
  return i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : null;
}

/** The lowest plan that unlocks a given boolean feature (for upgrade copy). */
const FEATURE_MIN_PLAN: Record<string, PlanId> = {
  batch_tailor: 'premium',
  interview_fit: 'premium',
  interview_analytics_trends: 'premium',
  events_personalized: 'premium',
  advisor: 'premium',
  salary_percentiles: 'premium',
  interview_analytics_predictive: 'premium_plus',
  events_curated: 'premium_plus',
  advisor_autoactions: 'premium_plus',
  salary_negotiation: 'premium_plus',
  post_history: 'premium_plus',
};

export function minPlanFor(feature: string): PlanId {
  return FEATURE_MIN_PLAN[feature] ?? 'premium';
}
