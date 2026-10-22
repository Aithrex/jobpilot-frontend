/**
 * Direct-employer policy - contract `employer-policy-1.0.0`.
 *
 * Source of truth: docs/prompts/direct-employer-job-quality.md section C
 * (platform repo). Every field here is ADDITIVE on the wire: an older backend
 * sends none of them and every surface must render exactly as it did before.
 * So every block is optional on the row, and every field inside a block is
 * read through the guards in `src/lib/employerPolicy.ts`, never directly.
 *
 * Four separate facts, deliberately not merged into one "quality" score:
 *  - WHO the employer is in business as (`EmployerProfile`);
 *  - what THIS posting is (`PostingProfile`) - a consultancy can hire for
 *    itself, and both facts are kept;
 *  - whether the posting is still open, and how we know (`Availability`);
 *  - evidence-backed warnings (`TrustBlock`), which are NOT preference
 *    exclusions and NOT a second match score.
 */

// ── C1. Employer business model ──────────────────────────────────

/**
 * `unknown` is a real answer and is NEVER rendered as a direct employer.
 * `operating` is the only kind that may be labelled "Direct employer".
 */
export type EmployerBusinessKind =
  | 'operating'
  | 'staffing'
  | 'consultancy'
  | 'talent_marketplace'
  | 'mixed'
  | 'unknown';

export type EmployerClassificationBasis =
  | 'owner_override'
  | 'research_register'
  | 'registry_category'
  | 'naics'
  | 'name_rule'
  | 'none';

export interface EmployerClassificationEvidence {
  kind: 'url' | 'naics' | 'category' | 'rule' | 'register' | string;
  value: string;
  source?: string;
}

/** `employers.business_model`, served per row as `employer_profile`. */
export interface EmployerProfile {
  kind: EmployerBusinessKind;
  confidence?: number | null;
  basis?: EmployerClassificationBasis | string | null;
  evidence?: EmployerClassificationEvidence[];
  version?: string | null;
  classified_at?: string | null;
}

// ── C2. Posting relationship and purpose ─────────────────────────

export type PostingRelationship =
  | 'own_role'
  | 'named_client'
  | 'undisclosed_client'
  | 'freelance_task'
  | 'unknown';

export type PostingPurpose = 'requisition' | 'talent_community' | 'resume_collection' | 'unknown';

export interface PostingProfile {
  relationship: PostingRelationship;
  purpose: PostingPurpose;
  /** Short reason codes. Not user copy. */
  evidence?: string[];
  version?: string | null;
}

// ── C3. Availability ─────────────────────────────────────────────

/** A 403 / 429 / timeout / challenge is `unverifiable`, never `closed`. */
export type AvailabilityState = 'verified_open' | 'closed' | 'unverifiable' | 'unknown';

export type AvailabilityMethod = 'listing_seen' | 'liveness_probe' | 'detail_fetch' | 'none';

export interface Availability {
  state: AvailabilityState;
  method: AvailabilityMethod;
  verified_at: string | null;
  age_hours?: number | null;
}

// ── C4. Trust warnings ───────────────────────────────────────────

/** `no_warnings_found` is a heuristic result and is never labelled "verified". */
export type TrustState = 'no_warnings_found' | 'warnings' | 'ownership_conflict' | 'suspected_fraud';

export interface TrustWarning {
  code: string;
  evidence: string;
  source?: 'rule' | 'ownership' | string;
}

export interface TrustBlock {
  state: TrustState;
  warnings: TrustWarning[];
  version?: string | null;
}

// ── C5. Preferences ──────────────────────────────────────────────

export type EmployerPolicyPreset = 'strict_direct' | 'custom' | 'off';

/** The seven independent exclusions, in the order the UI lists them. */
export type EmployerExclusionKey =
  | 'staffing'
  | 'consultancy'
  | 'client_placement'
  | 'talent_marketplace'
  | 'task_gig'
  | 'talent_community'
  | 'unknown_business_model';

export type EmployerExclusions = Record<EmployerExclusionKey, boolean>;

/** GET/PUT /api/jobs/tech-feed/employer-preferences. */
export interface EmployerPreferences {
  preset: EmployerPolicyPreset;
  exclude: EmployerExclusions;
  /** `default` = the user never chose; the server applied the documented default. */
  set_by?: 'user' | 'default';
  version?: string;
}

/** What the client sends on PUT. The server owns `set_by` and `version`. */
export interface EmployerPreferencesUpdate {
  preset: EmployerPolicyPreset;
  exclude: EmployerExclusions;
}

// ── C6. Policy block on every served list ────────────────────────

export interface PolicyBlock {
  preset?: EmployerPolicyPreset;
  exclude?: Partial<EmployerExclusions>;
  excluded_counts?: Partial<Record<EmployerExclusionKey, number>>;
  /** Rows shown although their employer type could not be verified. */
  unverified_shown?: number;
}

/**
 * The per-row blocks, as one mixin so `Job`, `WorkdayJob` and `TechFeedJob`
 * carry exactly the same optional shape.
 */
export interface EmployerPolicyRowFields {
  employer_profile?: EmployerProfile | null;
  posting_profile?: PostingProfile | null;
  availability?: Availability | null;
  trust?: TrustBlock | null;
  /** The posting's own URL on the board that published it. */
  original_job_url?: string | null;
  /** The normalized original application destination. */
  canonical_apply_url?: string | null;
}
