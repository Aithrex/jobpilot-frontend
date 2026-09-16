/**
 * Tech feed - the unified indexed job search that replaces the three career
 * portal fan-outs (Workday / career-pages / MNC).
 *
 * Contract: POST /api/jobs/tech-feed/search, GET /api/jobs/tech-feed/taxonomy,
 * GET /api/jobs/tech-feed/coverage. Unlike the fan-outs this is a BOUNDED
 * INDEXED READ, so the search answers 200 inline; it only returns 202
 * {job_id} when the caller explicitly asks for `async: true`.
 *
 * Boundary normalizer note
 * -----------------------
 * Two shapes are normalized in `src/lib/api.ts` rather than in components:
 *
 * 1. The 410 `cursor_expired` body is handed back as DATA, tagged with a
 *    `cursor_expired: true` discriminant this file defines, so a caller can
 *    branch on it. It is a paging-session expiry, NOT an auth failure, and it
 *    must never travel the 401 force-logout path.
 * 2. The catalog endpoints (`/jobs/workday/catalog`, `/jobs/career-pages/catalog`,
 *    `/jobs/mnc/catalog`) now return company entries with BOTH `display_name`
 *    (canonical) and `name` (legacy alias). Read them through `companyLabel()`
 *    in `src/types/jobs.ts` so a server that still sends only one of the two
 *    keeps rendering.
 */

// ── Enumerations ─────────────────────────────────────────────────

export type TechScope = 'core' | 'adjacent' | 'non_tech' | 'unknown';

export type TechFeedWorkMode = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type TechFeedSeniority =
  | 'intern'
  | 'entry'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'director'
  | 'executive'
  | 'unknown';

export type EmployerScope = 'any' | 'tech_only';

/**
 * What to do with postings that STATE a barrier the reader would have to
 * clear - an active security clearance, or an explicit refusal to sponsor.
 *
 * The default is `demote`, never `hide`. A hard default filter silently
 * deletes reachable jobs: a cleared role can be worth pursuing, an employer
 * who wrote "no sponsorship" on one requisition may sponsor on another, and a
 * user who never sees a posting cannot disagree with us about it. Demoting
 * keeps every result reachable while putting the ones with a stated barrier
 * below the ones without.
 *
 * This is a PRESENTATION preference and is applied client-side, over the page
 * the server actually returned. It is deliberately not sent to the search:
 * the count of what it suppressed has to be a count of rows we were handed,
 * or the "N hidden" line would be a guess.
 */
export type AccessBarrierHandling = 'show' | 'demote' | 'hide';

export type EmployerKindFilter = 'any' | 'direct_employer' | 'staffing' | 'marketplace';

export type EmployerKind = 'direct_employer' | 'staffing' | 'marketplace';

export type EmployerTechClassification = 'software' | 'tech_adjacent' | 'non_tech' | 'unknown';

export type ApplyMode = 'any' | 'direct_apply';

export type TechFeedSort = 'relevance' | 'newest' | 'salary';

/** How much the backend trusts the posting date. `unknown` means DO NOT show a date. */
export type PostedAtConfidence = 'exact' | 'relative' | 'unknown';

export type TechFeedFacetKey =
  | 'role_family'
  | 'role_specialty'
  | 'tech_scope'
  | 'seniority'
  | 'work_mode'
  | 'employer'
  | 'ats'
  | 'source'
  | 'employment_type'
  | 'salary_published'
  | 'country'
  | 'employer_kind';

// ── Request ──────────────────────────────────────────────────────

/**
 * Every field is optional. When `cursor` is present the server IGNORES every
 * other filter field, so page-2+ requests must send `{cursor, page_size}` only.
 */
export interface TechFeedSearchRequest {
  query?: string;
  titles?: string[];
  role_families?: string[];
  role_specialties?: string[];
  /** Defaults to ["core"] server-side. */
  tech_scope?: TechScope[];
  skills_required?: string[];
  skills_preferred?: string[];
  exclude_skills?: string[];
  exclude_title_terms?: string[];
  exclude_keywords?: string[];
  exclude_companies?: string[];
  countries?: string[];
  regions?: string[];
  cities?: string[];
  radius_km?: number;
  work_modes?: TechFeedWorkMode[];
  remote_eligible_locations?: string[];
  timezone_overlap_hours?: number;
  seniority?: TechFeedSeniority[];
  min_years?: number;
  max_years?: number;
  employment_types?: string[];
  min_salary?: number;
  salary_currency?: string;
  pay_interval?: string;
  /** DEFAULT TRUE. false means "only jobs with published pay". */
  include_unknown_salary?: boolean;
  /** Defaults to "any". */
  employer_scope?: EmployerScope;
  employer_kind?: EmployerKindFilter;
  company_ids?: string[];
  company_categories?: string[];
  sponsorship_preference?: string;
  work_authorization?: string[];
  requires_clearance?: boolean;
  /** Defaults to 30, capped at 180. */
  posted_within_days?: number;
  /** Defaults to true. */
  include_undated?: boolean;
  apply_mode?: ApplyMode;
  /** Defaults to "relevance". */
  sort?: TechFeedSort;
  /** Defaults to 25, capped at 100. */
  page_size?: number;
  /** Opaque. When present EVERY other filter field is ignored. */
  cursor?: string;
  /** Defaults to true. */
  personalize?: boolean;
  tz_offset_minutes?: number;
  /** true switches the endpoint to 202 {job_id} + poll. */
  async?: boolean;
}

// ── Job ──────────────────────────────────────────────────────────

export interface TechFeedEvidence {
  kind: string;
  source: string;
  value: string;
}

export interface TechFeedClassificationEvidence {
  kind: string;
  field: string;
  value: string;
}

export interface TechFeedLocation {
  raw: string;
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface TechFeedSalary {
  min_annual: number | null;
  max_annual: number | null;
  currency: string | null;
  interval: string | null;
  display: string | null;
  confidence: string | null;
  /** The single source of truth for "is there real pay data". */
  published: boolean;
}

export interface TechFeedSourceVariant {
  job_id: string;
  source: string;
  ats: string;
  location: string;
  url: string;
  days_ago: number | null;
}

export interface TechFeedLocationVariant {
  location: string;
  job_id: string;
  url: string;
}

export interface TechFeedJob {
  job_id: string;
  dedupe_group_id: string;
  employer_id: string;
  employer_name: string;
  employer_tech_classification: EmployerTechClassification | null;
  employer_tech_evidence: TechFeedEvidence[];
  employer_kind: EmployerKind;

  title_raw: string;
  normalized_title: string;

  tech_scope: TechScope;
  role_family: string | null;
  role_families: string[];
  role_specialties: string[];
  occupation_codes: string[];
  taxonomy_version: string;
  classification_confidence: number;
  classification_evidence: TechFeedClassificationEvidence[];

  skills_required: string[];
  skills_preferred: string[];

  seniority: TechFeedSeniority;
  required_years_min: number | null;
  required_years_max: number | null;

  work_mode: TechFeedWorkMode;
  locations: TechFeedLocation[];
  remote_eligibility: string | null;
  employment_type: string;

  salary: TechFeedSalary;

  /**
   * The posting's own words about sponsorship, as a token. Legacy and
   * free-form: read it through `sponsorshipStanceOf()` in
   * `lib/techFeedWorkAuth.ts`, which maps a CLOSED list of known tokens and
   * treats everything else as "not stated". Never string-match it in a
   * component.
   */
  sponsorship: string | null;
  clearance_required: boolean | null;

  /**
   * The normalized stance, when the server computes it.
   *
   * @contract PROVISIONAL - `offers` / `refuses` / `unstated`. Preferred over
   * the legacy `sponsorship` token whenever present; silence stays `unstated`
   * and is never read as either of the other two.
   */
  sponsorship_stance?: import('./workAuthorization').SponsorshipStance;

  /**
   * The employer's H-1B filing history, with the MANDATED framing. Absent
   * means we have no data, and no data renders as NOTHING - never as a zero.
   *
   * @contract PROVISIONAL - see `EmployerSponsorshipSignal` in
   * `types/workAuthorization.ts` for the exact fields.
   */
  employer_sponsorship?: import('./workAuthorization').EmployerSponsorshipSignal | null;

  source: string;
  ats: string;
  source_requisition_id: string;
  canonical_url: string;
  apply_url: string;
  direct_apply: boolean;

  posted_at: string | null;
  posted_at_confidence: PostedAtConfidence;
  days_ago: number | null;
  first_seen_at: string;
  first_seen_days_ago: number;
  last_seen_at: string;
  last_verified_at: string;
  valid_through: string | null;

  match_score: number;
  fit_score_version: string | null;
  fit: TechFeedFit | null;
  rank_score: number;

  /**
   * Screening verdict. Optional because an older server omits it; absent is
   * read as "the server did not say", never as `eligible`.
   */
  eligibility?: TechFeedEligibility;
  ineligible_reasons?: string[];
  role_alignment?: TechFeedRoleAlignment | null;
  hard_constraints?: TechFeedHardConstraint[];

  why_matched: string[];
  /** Rendered as "Important unknowns" - never as a hard rejection. */
  hard_constraint_mismatches: string[];

  source_variants: TechFeedSourceVariant[];
  location_variants: TechFeedLocationVariant[];
  duplicate_count: number;

  /** Present only when the employer name was resolved or disputed. */
  employer_name_original?: string;
  employer_name_confidence?: number;
  employer_name_conflict?: boolean;
  employer_name_variants?: string[];
}

// ── Fit verdict, eligibility and role alignment ──────────────────

/**
 * "May this person be considered at all", which is NOT a second score.
 *  - `eligible`    - no KNOWN disqualifier;
 *  - `ineligible`  - a positive, stated mismatch (a named licence the resume
 *    does not evidence, a sponsorship conflict, a confident cross-domain
 *    verdict). Silence is never a mismatch;
 *  - `not_scored`  - there was nothing readable to compare against.
 */
export type TechFeedEligibility = 'eligible' | 'ineligible' | 'not_scored';

export type RoleAlignmentTier =
  | 'exact_specialty'
  | 'adjacent_specialty'
  | 'same_family'
  | 'adjacent_family'
  | 'unrelated'
  | 'unknown';

/**
 * How close the candidate's discipline is to the posting's.
 *
 * `detail` is written by the scoring engine to be READ ("backend is adjacent
 * to platform engineering"). Render it verbatim - re-wording it on the client
 * would put a claim in the engine's mouth that the engine did not make.
 */
export interface TechFeedRoleAlignment {
  tier: RoleAlignmentTier;
  detail: string;
  /** The specialty / family key that produced the tier. null when none did. */
  matched: string | null;
  weight?: number;
  cross_domain?: boolean;
  adjacency_version?: string;
  taxonomy_version?: string;
}

/** `unknown` is "the resume is silent", which is not `missing`. */
export type HardConstraintStatus = 'met' | 'missing' | 'unknown';

/**
 * One stated gate on the posting (a clearance, a licence, a work-authorization
 * restriction).
 *
 * An entry with `hard_requirement: true` and `status: "unknown"` is a
 * REQUIREMENT TO CHECK, never a deduction: nothing on a resume can contradict
 * "holds an active security clearance", so the engine does not price it and
 * the UI must not present it as a reason the score is low.
 */
export interface TechFeedHardConstraint {
  type: string;
  key?: string;
  status: HardConstraintStatus;
  hard_requirement?: boolean;
  detail?: string;
  /** Score ceiling this constraint applied. Only ever set for `missing`. */
  cap?: number;
}

/**
 * The fit block. Kept open (`[key: string]: unknown`) because the engine sends
 * more than the card reads, and narrowed only where the card actually reads.
 *
 * The four fields below are also promoted to the top level of a job by the
 * search response; `src/lib/techFeedEligibility.ts` reads the top level first
 * and falls back here, so both shapes render.
 */
export interface TechFeedFit {
  score_version?: string | null;
  band?: string | null;
  confidence?: string | null;
  eligibility?: TechFeedEligibility;
  ineligible_reasons?: string[];
  role_alignment?: TechFeedRoleAlignment | null;
  hard_constraints?: TechFeedHardConstraint[];
  [key: string]: unknown;
}

// ── Response envelope ────────────────────────────────────────────

export interface TechFeedFacetValue {
  value: string;
  count: number;
}

export type TechFeedFacets = Partial<Record<TechFeedFacetKey, TechFeedFacetValue[]>>;

export interface TechFeedCoverage {
  as_of: string | null;
  active_postings: number;
  /** Employers we hold LIVE postings for — not every company ever harvested. */
  known_employers: number;
  /**
   * Endpoints that ANSWERED. Not coverage: it cannot tell a company's own
   * board from a stranger's board with a similar slug, and it is the number
   * that once reported 43%. Optional — older backends send
   * `validated_endpoints` for the same thing under a name that overclaims.
   */
  responding_endpoints?: number;
  /** @deprecated the old name for `responding_endpoints`. */
  validated_endpoints?: number;
  /** Every company ever harvested. A ceiling on ambition, not a claim. */
  harvested_companies?: number;
  /** Career sources whose OWNER is verified — the real coverage figure. */
  owner_verified_sources?: number;
  registered_employers?: number;
  /**
   * Employers we hold live postings for, keyed on the LEGACY `employer_id`
   * slug. Always >= `known_employers`, and the difference IS the identity
   * problem: JPMorgan's Oracle instance stamps three legal-entity names on
   * one tenant, so the slug count triple-counts it. Shown beside the
   * canonical count rather than instead of it.
   */
  known_employers_legacy?: number;
  postings_with_canonical_employer?: number;
  /** The stored measurement. See `TechFeedMeasuredCoverage`. */
  measured?: TechFeedMeasuredCoverage;
}

/**
 * The MEASURED coverage numbers, from `coverage_snapshots`.
 *
 * These are not computed per request — measuring them reads five collections
 * and classifies 23,782 employers — so they arrive with `measured_at`,
 * `age_hours` and `stale`. A surface that renders a coverage figure without
 * its age is making a claim the data does not support.
 *
 * `available: false` is a real answer and must render as one. An absent
 * measurement is not a coverage of zero.
 */
export interface TechFeedMeasuredCoverage {
  available: boolean;
  detail?: string;
  /** Employers we hold documentary technology evidence for. The denominator. */
  technology_employer_denominator?: number;
  /** Of those, how many have a career source whose owner we can prove. */
  covered_technology_employers?: number;
  employer_coverage_pct?: number;
  candidate_technology_employers?: number;
  /** BOARDS, not employers — a different unit, reported separately. */
  covered_career_sources?: number;
  /** Ownership proven, content not yet confirmed. Work in progress. */
  ownership_verified_unvalidated_sources?: number;
  employers_yielding_postings?: number;
  employers_yielding_core_tech?: number;
  core_tech_postings?: number;
  tier_a?: {
    total: number;
    covered: number;
    by_state?: Record<string, number>;
    /** The batch the target was set against, reported on its own. */
    accountable?: { total: number; covered: number; pct: number };
  };
  by_cohort?: Record<string, TechFeedCoverageFacet>;
  by_category?: Record<string, TechFeedCoverageFacet>;
  inventory_watermark?: string | null;
  measured_at?: string | null;
  age_hours?: number | null;
  stale?: boolean;
  stale_after_hours?: number | null;
}

export interface TechFeedCoverageFacet {
  employers: number;
  covered: number;
  covered_pct: number;
  core_postings: number;
}

// ── Employer directory (company autocomplete) ────────────────────

/**
 * One company as the directory describes it. Everything here is ABOUT THE
 * EMPLOYER — nothing from `career_sources`, which holds the endpoints we
 * fetch and the domains we probe. `career_source_verified` is the one thing
 * that subsystem contributes and it is a boolean with no detail behind it.
 */
export interface TechFeedCompany {
  employer_id: string;
  display_name: string;
  aliases: string[];
  legal_names?: string[];
  brands?: string[];
  domain: string | null;
  categories: string[];
  cohorts: string[];
  countries?: string[];
  identity: {
    basis: 'domain' | 'curated' | 'name' | string;
    confidence: number | null;
    operating_status: string;
    /** Set when this id now resolves to a different employer. */
    redirects_to: string | null;
  };
  career_source_verified: boolean;
  active_postings: number;
  core_tech_postings: number;
  /** Present on a lookup when the id asked for resolved to another employer. */
  requested_employer_id?: string;
}

export interface TechFeedCompanyResponse {
  query?: string;
  companies: TechFeedCompany[];
  truncated?: boolean;
  unresolved?: string[];
  detail?: string;
  directory_version?: string;
}

export interface TechFeedCompanyCategory {
  value: string;
  label: string;
  employers: number;
}

export interface TechFeedCompanyCategoriesResponse {
  categories: TechFeedCompanyCategory[];
  directory_version?: string;
}

// ── Saved searches (server-owned, locally mirrored) ──────────────

export interface TechFeedSavedSearchesResponse {
  searches: SavedTechFeedSearch[];
  pushed_from_client?: number;
  saved_search_version?: string;
}

// ── Telemetry ────────────────────────────────────────────────────

/**
 * A telemetry event. `dimensions` carries filter KEYS, never their values —
 * "somebody filtered by company" is a product fact, "somebody filtered by
 * Stripe" is that person's job hunt. The server drops anything outside its
 * own allowlist, so this type is a convenience rather than the enforcement.
 */
export type TechFeedTelemetryEvent =
  | 'search'
  | 'zero_result'
  | 'filter_applied'
  | 'card_impression'
  | 'card_open'
  | 'card_apply_click'
  | 'card_save'
  | 'source_failure';

export interface TechFeedTelemetryItem {
  event: TechFeedTelemetryEvent;
  count?: number;
  dimensions?: Record<string, string | number | boolean | string[]>;
}

export interface TechFeedSourceStatus {
  source: string;
  shards: number;
  last_success_at: string | null;
  crawl_lag_minutes: number | null;
  stale: boolean;
  retry_count: number;
}

export interface TechFeedIngestRunner {
  last_heartbeat_at: string | null;
  minutes_ago?: number;
  healthy: boolean;
}

export interface TechFeedSourceHealth {
  sources: TechFeedSourceStatus[];
  ingest_runner: TechFeedIngestRunner;
  warnings: string[];
}

/**
 * `not_applied` — nothing narrowed on it at all.
 * `partial` — it DID narrow, but only the rows carrying the data it tests;
 * rows without that data are kept rather than excluded. Rendering a partial
 * as "not applied" replaces one wrong claim with the opposite one.
 */
export type TechFeedFilterStatus = 'not_applied' | 'partial';

export interface TechFeedUnappliedFilter {
  filter: string;
  reason: string;
  /** Absent from responses that predate the distinction; treat as not applied. */
  status?: TechFeedFilterStatus;
}

export interface TechFeedSearchResponse {
  search_id: string;
  jobs: TechFeedJob[];
  next_cursor: string | null;
  has_more: boolean;
  total: number;
  facets: TechFeedFacets;
  /** The SERVER's normalized view of the filters - render this, not the request. */
  applied_filters: Record<string, unknown>;
  /**
   * The filters in `applied_filters` that NOTHING actually narrowed on, each
   * with the reason. `applied_filters` is an echo of the request, so rendering
   * it as "Server applied" tells the user a filter excluded something when it
   * did not - and a user who believes they have filtered stops looking. Render
   * these separately; never inside the applied list.
   */
  unapplied_filters?: TechFeedUnappliedFilter[];
  taxonomy_version: string;
  fit_score_version: string;
  feed_version: string;
  inventory_watermark: string | null;
  coverage: TechFeedCoverage;
  source_health: TechFeedSourceHealth;
  warnings: string[];
  diagnostics: Record<string, unknown>;
  /** Never set by the server - the discriminant against `TechFeedCursorExpired`. */
  cursor_expired?: false;
}

/**
 * The 410 body, tagged at the API boundary. A paging session expired; re-run
 * the search from the CURRENT filters. This is not an error and not a 401.
 */
export interface TechFeedCursorExpired {
  cursor_expired: true;
  error: 'cursor_expired';
  message: string;
}

export type TechFeedSearchOutcome = TechFeedSearchResponse | TechFeedCursorExpired;

export function isTechFeedCursorExpired(
  outcome: TechFeedSearchOutcome | undefined | null,
): outcome is TechFeedCursorExpired {
  return !!outcome && (outcome as TechFeedCursorExpired).cursor_expired === true;
}

// ── Taxonomy ─────────────────────────────────────────────────────

export interface TechFeedSpecialty {
  key: string;
  label: string;
  occupation_codes: string[];
}

export interface TechFeedFamily {
  key: string;
  label: string;
  scope: 'core' | 'adjacent';
  specialties: TechFeedSpecialty[];
}

export interface TechFeedTaxonomy {
  taxonomy_version: string;
  scopes: string[];
  families: TechFeedFamily[];
}

// ── Coverage endpoint ────────────────────────────────────────────

export interface TechFeedCoverageResponse {
  coverage: TechFeedCoverage;
  source_health: TechFeedSourceHealth;
}

// ── Client-side filter state ─────────────────────────────────────

/**
 * The UI's filter model. camelCase, fully populated (no undefined), and the
 * single thing that is serialized to the URL and to a saved search. Mapped to
 * the wire shape by `techFeedFiltersToRequest()` in `lib/techFeedUrlState.ts`.
 *
 * Deliberately excludes cursor, page_size and personalize: those are transport
 * and personalization concerns, not part of a shareable search.
 */
export interface TechFeedFilters {
  query: string;
  titles: string[];
  roleFamilies: string[];
  roleSpecialties: string[];
  techScope: TechScope[];
  skillsRequired: string[];
  skillsPreferred: string[];
  excludeSkills: string[];
  excludeTitleTerms: string[];
  excludeKeywords: string[];
  excludeCompanies: string[];
  countries: string[];
  regions: string[];
  cities: string[];
  radiusKm: number | null;
  workModes: TechFeedWorkMode[];
  remoteEligibleLocations: string[];
  timezoneOverlapHours: number | null;
  seniority: TechFeedSeniority[];
  minYears: number | null;
  maxYears: number | null;
  employmentTypes: string[];
  minSalary: number | null;
  salaryCurrency: string | null;
  payInterval: string | null;
  includeUnknownSalary: boolean;
  employerScope: EmployerScope;
  employerKind: EmployerKindFilter;
  companyIds: string[];
  companyCategories: string[];
  sponsorshipPreference: string | null;
  workAuthorization: string[];
  requiresClearance: boolean | null;
  /** Postings stating a security-clearance requirement. Default `demote`. */
  clearanceRoles: AccessBarrierHandling;
  /** Postings stating the employer does not sponsor. Default `demote`. */
  noSponsorshipRoles: AccessBarrierHandling;
  postedWithinDays: number;
  includeUndated: boolean;
  applyMode: ApplyMode;
  sort: TechFeedSort;
}

/**
 * A search the user chose to keep.
 *
 * The SERVER owns the list (`/api/jobs/tech-feed/saved-searches`) and
 * localStorage keeps a mirror under `aspirely.techFeed.savedSearches`. Not
 * belt-and-braces: the feed must stay usable when the API is unreachable, and
 * a saved search the user can still see and still apply offline is worth more
 * than a correct 503.
 *
 * `id` is the CLIENT's own key. It is minted locally, sent up, and the server
 * keys on `(account, id)` — so a write that arrives twice is one row, and the
 * client never has to map its ids onto the server's.
 */
export interface SavedTechFeedSearch {
  id: string;
  name: string;
  filters: TechFeedFilters;
  createdAt: string;
  updatedAt?: string;
  /** Absent until the server has acknowledged this search. */
  fingerprint?: string;
  /** True while this search exists only in this browser. */
  pendingSync?: boolean;
  alerts?: {
    enabled: boolean;
    frequency?: 'daily';
    timezone?: string;
    last_evaluated_at?: string | null;
    last_delivered_at?: string | null;
    paused_reason?: string | null;
  };
}

/**
 * Why a user gave feedback on a posting. The CLOSED set the server accepts on
 * POST /api/jobs/tech-feed/feedback - anything else is a 400.
 *
 * These are two different acts under one menu, and the difference is
 * load-bearing:
 *  - `not_interested` / `irrelevant_role` / `duplicate` are PREFERENCES and
 *    are the only three that suppress the posting for that user;
 *  - `wrong_company` / `stale_job` / `incorrect_metadata` are DATA-QUALITY
 *    REPORTS. The server records and counts them so ingestion can be fixed,
 *    and deliberately hides nothing. The UI must not promise otherwise.
 */
export type TechFeedFeedbackReason =
  | 'not_interested'
  | 'irrelevant_role'
  | 'wrong_company'
  | 'duplicate'
  | 'stale_job'
  | 'incorrect_metadata';

/** Body of POST /api/jobs/tech-feed/feedback. 204, no body, on success. */
export interface TechFeedFeedbackRequest {
  job_id: string;
  reason: TechFeedFeedbackReason;
  dedupe_group_id?: string;
  employer_id?: string;
  search_id?: string;
  note?: string;
}

/**
 * GET /api/jobs/tech-feed/feedback - the caller's suppression set, so a second
 * device converges on the same feed. `employer_ids` is always empty today and
 * is present for shape stability only.
 */
export interface TechFeedSuppression {
  job_ids: string[];
  dedupe_group_ids: string[];
  employer_ids: string[];
  updated_at: string | null;
}

/**
 * One locally-cached piece of feedback.
 *
 * `reason: null` means the SERVER reported this job as suppressed and this
 * device never saw the reason (GET returns ids, not reasons). It is recorded
 * as unknown rather than back-filled with a plausible one.
 *
 * `synced: false` means the write has not been acknowledged by the server yet
 * (offline / in flight), which is why the cache keeps it.
 */
export interface TechFeedFeedbackRecord {
  job_id: string;
  reason: TechFeedFeedbackReason | null;
  employer_name?: string;
  at: string;
  synced?: boolean;
}
