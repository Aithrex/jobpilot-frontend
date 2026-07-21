/**
 * Onboarding logic - pure helpers + resumable-state persistence.
 *
 * Kept JSX-free so the wizard file stays about UI. Two jobs:
 *   1. Derive sensible DEFAULTS from a just-parsed resume so Step 4's few
 *      questions arrive PRE-FILLED (the user confirms/edits, not fills blanks).
 *   2. Persist wizard progress across the LinkedIn OAuth full-page redirect so
 *      onboarding is resumable (localStorage) and non-nagging (sessionStorage).
 */
import type { ResumeStatus } from '@/types/resume';

export const ONBOARDING_STORAGE_KEY = 'jobpilot.onboarding.v1';
/** Set when the user dismisses the wizard - suppresses it for this tab session. */
export const ONBOARDING_SNOOZE_KEY = 'jobpilot.onboarding.snoozed';

/** The friendly seniority buckets we ask about (stored as `experience_level`). */
export const EXPERIENCE_LEVELS = [
  'Intern / New grad',
  'Junior',
  'Mid-level',
  'Senior',
  'Lead / Staff',
  'Manager / Director',
] as const;

export const REMOTE_OPTIONS = ['Remote', 'Hybrid', 'On-site', 'Any'] as const;

export const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'DevOps Engineer',
  'Designer',
  'ML Engineer',
];

export type SponsorshipAnswer = 'yes' | 'no' | '';

export interface OnboardingDefaults {
  roles: string[];
  skills: string[];
  locations: string[];
  level: string;
}

export interface OnboardingAnswers {
  roles: string[];
  level: string;
  needsSponsorship: SponsorshipAnswer;
  locations: string[];
  remote: string;
  compFloor: string;
}

export interface PersistedOnboarding {
  stepIndex: number;
  resumeDone: boolean;
  defaults: OnboardingDefaults;
  answers: OnboardingAnswers;
}

export const EMPTY_DEFAULTS: OnboardingDefaults = {
  roles: [],
  skills: [],
  locations: [],
  level: '',
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  roles: [],
  level: '',
  needsSponsorship: '',
  locations: [],
  remote: 'Remote',
  compFloor: '',
};

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

/** Map a rough years-of-experience count to a seniority bucket. */
export function levelFromYears(years?: number | null): string {
  if (years == null || Number.isNaN(years)) return '';
  if (years < 1) return 'Intern / New grad';
  if (years < 3) return 'Junior';
  if (years < 6) return 'Mid-level';
  if (years < 10) return 'Senior';
  return 'Lead / Staff';
}

/** Infer seniority from an explicit signal in the most-recent job title. */
export function levelFromTitle(title?: string | null): string {
  const t = (title || '').toLowerCase();
  if (!t) return '';
  if (/\bintern(ship)?\b/.test(t)) return 'Intern / New grad';
  if (/manager|director|head of|\bvp\b|vice president/.test(t)) return 'Manager / Director';
  if (/principal|\bstaff\b|\blead\b|architect/.test(t)) return 'Lead / Staff';
  if (/senior|\bsr\.?\b/.test(t)) return 'Senior';
  if (/junior|\bjr\.?\b|associate|\bentry\b/.test(t)) return 'Junior';
  return '';
}

/**
 * Derive defaults from the parser's rich `parsed_resume` payload. Tolerates both
 * the grouped-skills object shape and a flat skills array, and a missing
 * experience array - nothing here throws on partial data.
 */
export function deriveDefaultsFromParsed(parsed: unknown): OnboardingDefaults {
  const p = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;

  const skillsRaw = p.skills;
  let skills: string[] = [];
  if (Array.isArray(skillsRaw)) {
    skills = skillsRaw as string[];
  } else if (skillsRaw && typeof skillsRaw === 'object') {
    skills = Object.values(skillsRaw as Record<string, unknown>).flat() as string[];
  }
  skills = uniq(skills.filter(Boolean).map(String)).slice(0, 12);

  const exp = Array.isArray(p.experience) ? (p.experience as Record<string, unknown>[]) : [];
  const roles = uniq(
    exp.map((e) => (e?.title ? String(e.title) : '')).filter(Boolean),
  ).slice(0, 3);
  const locations = uniq(
    exp.map((e) => (e?.location ? String(e.location) : '')).filter(Boolean),
  ).slice(0, 2);

  const level = levelFromTitle(exp[0]?.title as string | undefined);

  return { roles, skills, locations, level };
}

/** Backfill anything the parsed payload left empty from the stored resume status. */
export function mergeStatusDefaults(
  base: OnboardingDefaults,
  status?: ResumeStatus | null,
): OnboardingDefaults {
  if (!status) return base;
  const roles = base.roles.length
    ? base.roles
    : uniq((status.job_titles || []).filter(Boolean).map(String)).slice(0, 3);
  const skills = base.skills.length
    ? base.skills
    : uniq((status.skills || []).filter(Boolean).map(String)).slice(0, 12);
  const level = base.level || levelFromYears(status.experience_years);
  return { roles, skills, locations: base.locations, level };
}

export function loadOnboardingState(): PersistedOnboarding | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedOnboarding>;
    return {
      stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0,
      resumeDone: !!parsed.resumeDone,
      defaults: { ...EMPTY_DEFAULTS, ...(parsed.defaults || {}) },
      answers: { ...EMPTY_ANSWERS, ...(parsed.answers || {}) },
    };
  } catch {
    return null;
  }
}

export function saveOnboardingState(state: PersistedOnboarding): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled - progress just won't survive a redirect */
  }
}

export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

export function isOnboardingSnoozed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ONBOARDING_SNOOZE_KEY) === '1';
  } catch {
    return false;
  }
}

export function snoozeOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ONBOARDING_SNOOZE_KEY, '1');
  } catch {
    /* no-op */
  }
}
