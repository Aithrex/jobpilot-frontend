import type { CompanyType } from '@/types/jobs';

/**
 * The groups of the board's company checklist (`company-type-1.0.0`, computed
 * server side in `company_type.py` with the evidence for each).
 *
 * Startups and mid-size companies are ONE group on purpose: nothing we hold
 * can tell a 40-person startup from a 900-person scale-up that both hire
 * through Greenhouse. "Not yet categorised" is shown last and never hidden, so
 * the group counts always add up to the board.
 */
export const COMPANY_TYPE_ORDER: readonly CompanyType[] = [
  'big_tech_mnc',
  'enterprise',
  'startup_midsize',
  'staffing',
  'unknown',
];

export const COMPANY_TYPE_META: Record<CompanyType, { label: string; hint: string }> = {
  big_tech_mnc: { label: 'Big Tech & MNCs', hint: 'Our curated list, or 1,000+ open roles' },
  enterprise: { label: 'Large enterprises', hint: '150+ open roles, or an enterprise HR system' },
  startup_midsize: { label: 'Startups & mid-size', hint: 'Hire through startup-style tools' },
  staffing: { label: 'Staffing & consulting', hint: 'Hire for clients, not for themselves' },
  unknown: { label: 'Not yet categorised', hint: 'Too little information to group' },
};

export function companyTypeLabel(type: CompanyType | undefined | null): string {
  return COMPANY_TYPE_META[type ?? 'unknown']?.label ?? COMPANY_TYPE_META.unknown.label;
}
