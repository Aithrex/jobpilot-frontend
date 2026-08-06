/**
 * Types for the Auto-Apply onboarding (declared-profile) surface.
 *
 * Contract: jobpilot-backend/docs/specs/auto-apply-fill-engine.md (QT2) +
 * services/jobs/blueprints/apply.py (`/api/apply/onboarding/*`).
 *
 * The backend returns the canonical question bank grouped by category. Each
 * field carries its sensitivity/type/options plus the user's declared
 * `current_value` and the safe `default` the UI pre-fills. Protected (EEO) and
 * legal fields ALWAYS default to the form's decline option - a real demographic
 * value is NEVER pre-selected; it is only ever user-declared.
 */

export type OnboardingCategory =
  | 'identity'
  | 'work_auth'
  | 'eeo'
  | 'logistics'
  | 'screening'
  | 'legal';

export type OnboardingSensitivity = 'safe' | 'sensitive' | 'protected' | 'legal';

export type OnboardingValueType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'boolean'
  | 'select'
  | 'date'
  | 'number'
  | 'money'
  | 'years'
  | 'essay';

/**
 * The autonomy modes. Product labels, renamed off the old internal jargon -
 * "Auto Aggressive" is not a phrase to put in front of a nervous job seeker.
 * The stored VALUES are unchanged, so there is no migration and no backend
 * impact; only the labels moved.
 *   Prepare only          -> copilot
 *   Ask me first          -> approval
 *   Apply within my rules -> aggressive (legacy `autopilot` still accepted)
 * There is NO implicit default - onboarding forces an explicit pick, and the
 * executor refuses to act while `mode` is null.
 */
export type AutoApplyMode = 'copilot' | 'approval' | 'autopilot' | 'aggressive';

/** A scalar answer value. Booleans for Yes/No fields, numbers for years/money. */
export type OnboardingAnswerValue = string | boolean | number;

export interface OnboardingField {
  field_id: string;
  label: string;
  category: OnboardingCategory;
  sensitivity: OnboardingSensitivity;
  value_type: OnboardingValueType;
  /** Options for a `select` field (already includes the decline option). */
  options: string[];
  /** Part of the required set that blocks auto-apply until filled. */
  required: boolean;
  /**
   * The safe, pre-fillable default. For protected/legal fields this is the
   * form's decline option (never an inferred real value); null when there is
   * no safe default.
   */
  default: OnboardingAnswerValue | null;
  /** The user's already-declared/derived value, or null when unset. */
  current_value: OnboardingAnswerValue | null;
  /** True when a required field has no declared value yet. */
  missing: boolean;
}

export interface OnboardingGroup {
  category: OnboardingCategory;
  fields: OnboardingField[];
}

export interface OnboardingQuestions {
  groups: OnboardingGroup[];
  /** True once every field in `required_fields` has a declared/derived value. */
  ready_for_autoapply: boolean;
  /** null until onboarding forces the pick (no implicit default). */
  mode: AutoApplyMode | null;
  /** The READY set the FE blocks completion on (contact, address, work_auth, experience). */
  required_fields: string[];
}

export interface SaveOnboardingAnswersBody {
  /** Map of catalog field_id -> reviewed value. Unknown/bad values -> 400. */
  answers: Record<string, OnboardingAnswerValue>;
  /** Optional explicit autonomy mode pick, persisted alongside the answers. */
  mode?: AutoApplyMode;
}
