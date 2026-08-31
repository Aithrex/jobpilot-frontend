export type VisaStatus = 'sponsor_verified' | 'likely_sponsor' | 'no_sponsorship' | 'unknown';

export interface DailyPipelineRecord {
  source: string;
  company: string;
  title: string;
  location: string;
  posted: string;
  salary: string;
  applicants?: string | number;
  url: string;
  description?: string;
  score?: number;
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Skip';
  flags?: string;
  roles?: string;
  opt?: string;
  reason?: string;
  /** Visa-sponsorship signal. Useful for F-1 / H-1B candidates. */
  visa_status?: VisaStatus;
  /** Calibrated sponsorship probability (0.0-1.0). Backend layers this on
   *  top of visa_status so the badge can show "Likely sponsor 62%" instead
   *  of a binary verdict. Older payloads may omit this - UI falls back to
   *  the discrete status label. */
  visa_confidence?: number;
  /**
   * Set when the user already engaged with this exact (company, title) via
   * the saved-jobs flow. `interested` = clicked Open but didn't confirm
   * Applied. `applied` / `interview` / `offer` = actively in funnel.
   * `rejected` / `withdrawn` = closed loop. UI uses this to render an
   * "Already applied" badge and to demote in the bulk-open shortlist.
   */
  previously_applied_status?: 'interested' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  previously_applied_at?: string;
}

export type PipelineExperienceLevel = 'any' | 'internship' | 'entry' | 'associate' | 'mid' | 'senior';
export type PipelineEmploymentType = 'ANY' | 'FULLTIME' | 'PARTTIME' | 'INTERN' | 'CONTRACTOR';
export type PipelineWorkArrangement = 'any' | 'remote' | 'hybrid' | 'onsite';

export interface DailyPipelineParams {
  linkedin_keywords?: string[];
  workday_titles?: string[];
  past_days?: number;
  custom_role_terms?: string[];
  linkedin_count?: number;
  workday_limit?: number;
  include_indeed?: boolean;
  // Optional, actor-supported filters. Omit / leave default to keep the
  // original pipeline behavior (entry-level, full-time, US, any arrangement).
  location?: string;
  experience_level?: PipelineExperienceLevel;
  employment_type?: PipelineEmploymentType;
  work_arrangement?: PipelineWorkArrangement;
  domain_strict?: boolean;
  // F-1 / H-1B opt-ins (default false → no behavior change).
  h1b_only?: boolean;
  exclude_no_sponsorship?: boolean;
  // Hide companies + title patterns / company-cap (legacy fields that the
  // backend already accepts).
  hide_companies?: string[];
  hide_title_patterns?: string[];
  max_per_company?: number;
}

export interface PipelinePreset {
  _id?: string;
  name: string;
  filters: DailyPipelineParams;
  created_at?: string;
  updated_at?: string;
}

// --- APIFY DISABLED (temporary): restore to re-enable the BYO Apify-key UI. ---
// export interface ApifyKeyStatus {
//   has_key: boolean;
//   masked?: string;
//   updated_at?: string | null;
// }

export interface SmartFilterIntent {
  primary: string;
  primary_label: string;
  secondary?: string | null;
  secondary_label?: string | null;
  confidence: number;
  is_generalist: boolean;
}

export interface SmartFilterGroup {
  intent: string;
  label: string;
  /** "primary" | "secondary" | "adjacent" - visual styling hint. */
  kind: 'primary' | 'secondary' | 'adjacent';
  score: number;
  tag: string;
  workday_titles: string[];
  linkedin_phrases: string[];
  custom_role_terms: string[];
}

export interface SmartFilterSuggestions {
  headline: string;
  rationale: string;
  linkedin_keyword_sets: string[];
  workday_titles: string[];
  custom_role_terms: string[];
  past_days: number;
  preset_tags: string[];
  intent?: SmartFilterIntent;
  groups?: SmartFilterGroup[];
}

export interface DailyPipelineSourceCounts {
  raw: number;
  apply_now: number;
  verify: number;
  excluded: number;
}

export interface DailyPipelineResult {
  ok: boolean;
  generated_at: string;
  past_days: number;
  cutoff: string;
  credits_exhausted?: boolean;
  // used_user_apify_key?: boolean;  // APIFY DISABLED (temporary)
  raw_counts: {
    linkedin: number;
    workday: number;
    workday_direct?: number;
    indeed?: number;
    ats_direct?: number;
    total: number;
    duplicates_dropped?: number;
  };
  tier_counts: { tier_1: number; tier_2: number; tier_3: number };
  source_breakdown?: {
    linkedin: DailyPipelineSourceCounts;
    workday: DailyPipelineSourceCounts;
    workday_direct?: DailyPipelineSourceCounts;
    indeed?: DailyPipelineSourceCounts;
    ats_direct?: DailyPipelineSourceCounts;
  };
  totals: { apply_now: number; verify_dates: number; excluded: number };
  apply_now: DailyPipelineRecord[];
  verify_dates: DailyPipelineRecord[];
  excluded_sample: DailyPipelineRecord[];
  excluded_total: number;
  errors: string[];
  inputs: {
    linkedin_keywords: string[];
    workday_titles: string[];
    custom_role_terms: string[];
  };
  /**
   * Per-actor debug info. Helps differentiate "actor returned empty for valid
   * reasons" (narrow filters) from "actor errored / rate-limited" cases.
   */
  actor_diagnostics?: {
    linkedin_urls: string[];
    linkedin_silent_zero: boolean;
    workday_silent_zero: boolean;
    linkedin_input_summary?: { urls?: number; count_per_url?: number };
    workday_input_summary?: {
      titles?: number;
      limit?: number;
      experience?: string[];
      employment?: string[];
      arrangement?: string[];
    };
  };
}

/**
 * Visa-sponsorship signal - a calibrated, evidence-backed read of a company's
 * H-1B track record. Attached to search results (`Job.sponsorship`) and also
 * fetchable per-company via `apiService.getSponsorship`.
 */
export interface SponsorshipSignal {
  score: number;
  band: 'none' | 'low' | 'moderate' | 'strong';
  headline: string;
  summary: string;
  approvals_5y: number;
  lca_filings_5y: number;
  median_wage: number;
  data_vintage: string;
  source: string;
  disclaimer: string;
}

/**
 * A single visa/eligibility fact. `value === null` means "unknown / not stated";
 * `evidence` is the JD snippet or heuristic behind the call.
 */
export interface VisaFlag {
  value: boolean | null;
  evidence: string;
}

export interface VisaFlags {
  sponsors_h1b?: VisaFlag;
  cap_exempt?: VisaFlag;
  accepts_cpt?: VisaFlag;
  no_citizenship_requirement?: VisaFlag;
  clearance_required?: VisaFlag;
  e_verify?: VisaFlag;
}

/** Client-side filter toggles serialized as `visa_filters` on search calls. */
export interface VisaFilters {
  sponsors_h1b?: boolean;
  cap_exempt?: boolean;
  accepts_cpt?: boolean;
  no_citizenship_requirement?: boolean;
  exclude_clearance?: boolean;
}

export interface Job {
  job_id: string;
  title: string;
  company: string;
  logo: string;
  /** Backend-served favicon path ("/api/jobs/logo/<40-hex>"). May 404 - the
   *  UI must fall back to the hued monogram. Resolve via `companyLogoSrc`. */
  logo_url?: string;
  location: string;
  apply_link: string;
  description: string;
  salary: string;
  employment_type: string;
  date_posted: string;
  is_remote: boolean;
  h1b_sponsor: boolean;
  contract_friendly?: boolean;
  source?: string;
  posted_text?: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  // Scam-shield: deterministic trust assessment attached to every search result
  // (server-side, no LLM). Optional - saved/older payloads may omit it.
  trust_score?: number;
  trust_band?: 'trusted' | 'caution' | 'high_risk';
  trust_flags?: string[];
  trust_reasons?: string[];
  // Visa surfacing - every fresh search result carries these; older/saved
  // payloads may omit them, so keep both optional.
  sponsorship?: SponsorshipSignal | null;
  visa_flags?: VisaFlags;
  /**
   * FitScore v2 explanation block (ADR-002, `shared/python/services/fit_score.py`).
   * Written by `inventory_feed._score_rows`; ABSENT on the career-portal scan
   * rows the shell's Jobs feed uses today. The UI must therefore treat this as
   * a bonus, never a requirement - `JobFitDetails` degrades to the evidence
   * that always exists (matched/missing skills, seniority, title match).
   */
  fit?: import('./guest').GuestFitScore;
  /**
   * The scoring engine's own version stamp (`fit_score.FIT_SCORE_VERSION`,
   * "fit-v2.0"), written FLAT by `workday_jobs_service._score_jobs` and nested
   * under `fit` everywhere else. Its PRESENCE is what licenses the UI to attach
   * fit_score's band words to `match_score` - see `fitBands.isFitScored`.
   * Absent on streamed scan previews (a provisional pre-detail estimate) and on
   * accounts with no parsed resume, both of which must read "Not scored".
   */
  score_version?: string;
  /** Ordering-only score: fit plus preference bonuses (H1B / remote / new-grad)
   *  that are deliberately kept OUT of `match_score`. Never display it. */
  rank_score?: number;
  // ── Career-portal row metadata ─────────────────────────────────────────
  // `lib/careerJobs.ts::toJob` spreads the whole portal row, so these survive
  // at runtime; declaring them keeps the score-explanation UI type-safe.
  /** Title-derived seniority band. */
  seniority?: CareerPortalSeniority;
  /** Frank "can the base resume be honestly tailored into this JD?" verdict. */
  tailor_feasibility?: CareerPortalFeasibility;
  feasibility_reason?: string;
  /** True when the job title covers all core tokens of one of the user's
   *  search titles - the strongest cheap role-alignment signal we have. */
  title_matched?: boolean;
  /** Which search terms (title families and/or resume skills) retrieved this. */
  matched_terms?: string[];
}

export interface JobTrustResult {
  trust_score: number;
  trust_band: 'trusted' | 'caution' | 'high_risk';
  trust_flags: string[];
  trust_reasons: string[];
  llm_rationale?: string;
  advice?: string;
  llm_confidence?: number;
}

export interface SavedJob {
  _id: string;
  job_id: string;
  job_data: Job;
  status: 'interested' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  notes: string;
  saved_at: string;
}

export interface ParsedResume {
  skills: string[];
  experience_years: number;
  education: Array<{ degree: string; institution: string; year: string }>;
  certifications: string[];
  job_titles: string[];
  /** Union of job_titles across every parsed resume (additive; older backends omit). */
  job_titles_all?: string[];
  summary: string;
  parsed_at: string;
}

/** GET /api/jobs/title-seed — never hits the LLM. */
export interface JobTitleSeed {
  fingerprint: string;
  resume_titles: string[];
  synth_titles: string[];
  resume_count: number;
  cached: boolean;
}

export interface TailoredResume {
  summary: string;
  skills: string[];
  experience_bullets: string[];
  keywords_to_add: string[];
}

export interface JobSearchFilters {
  query: string;
  location: string;
  date_posted: 'all' | 'today' | '3days' | 'week' | 'month';
  remote_only: boolean;
  employment_type: '' | 'FULLTIME' | 'PARTTIME' | 'INTERN' | 'CONTRACTOR';
  h1b_only: boolean;
  visa_or_contract: boolean;
  experience_level: '' | 'entry' | 'internship' | 'associate' | 'mid';
  source: 'all' | 'linkedin' | 'workday' | 'indeed' | 'google' | 'company' | 'jobright' | 'jsearch' | 'workday_direct' | 'ats_direct';
  include_company_careers: boolean;
  use_resume_recommendations: boolean;
  /** Visa/eligibility toggles surfaced in the Discover filter bar. */
  visa_filters?: VisaFilters;
}

export interface JobSearchOptions {
  forceRefresh?: boolean;
}

export interface SavedJobFilters {
  filters: JobSearchFilters | null;
  updated_at?: string;
}

export interface JobSearchResponse {
  jobs: Job[];
  total: number;
  total_pages?: number;
  page: number;
  errors?: string[];
  fallback_source?: string;
  sources?: Record<string, number>;
  raw_sources?: Record<string, number>;
  filtered_reasons?: Record<string, number>;
  selected_sources?: string[];
  skipped_sources?: Record<string, string>;
  cache_hits?: number;
  cache_bypassed?: boolean;
}

export interface BatchSearchParams {
  queries: string[];
  location?: string;
  date_posted?: string;
  remote?: boolean;
  type?: string;
  h1b_only?: boolean;
  visa_or_contract?: boolean;
  experience_level?: string;
  source?: string;
  include_company_careers?: boolean;
  use_resume_recommendations?: boolean;
  force_refresh?: boolean;
  /** Visa/eligibility toggles (sponsors_h1b, cap_exempt, exclude_clearance, ...). */
  visa_filters?: VisaFilters;
}

export interface BatchSearchResponse {
  jobs: Job[];
  total: number;
  queries_executed: number;
  cache_hits: number;
  errors: string[];
  sources?: Record<string, number>;
  raw_sources?: Record<string, number>;
  filtered_reasons?: Record<string, number>;
  selected_sources?: string[];
  skipped_sources?: Record<string, string>;
  cache_bypassed?: boolean;
}

// ── Career portals (direct Workday + career-page ATS fan-out) ──────────────
// Same engine behind three catalogs: /api/jobs/workday (enterprise Workday
// tenants), /api/jobs/career-pages (Greenhouse / Lever / Ashby / ...) and
// /api/jobs/mnc (curated FAANG+ / Fortune-500 MNC boards, keyed by sector).

export type CareerPortalVariant = 'workday' | 'careers' | 'mncs';

export type WorkdayRecency = 'today' | '24h' | '3d' | '7d' | '30d';

export type CareerPortalFeasibility = 'strong' | 'possible' | 'stretch' | 'skip';

export type CareerPortalSeniority = 'intern' | 'entry' | 'mid' | 'senior';

/**
 * JD-level visa signal for portal rows - a discrete band, NOT the
 * `SponsorshipSignal` object on `Job.sponsorship`. 'refused' = the posting
 * itself declines sponsorship (strongest signal); 'likely' = the company has
 * a real recent H-1B filing record in public disclosure data; 'rare' = files
 * occasionally; 'unknown' = no evidence either way (which is not a refusal).
 */
export type CareerPortalSponsorship = 'likely' | 'rare' | 'unknown' | 'refused';

/** Job row returned by the portal search endpoints. Intentionally NOT an
 *  extension of `Job` - portal rows carry catalog metadata (tenant/industry),
 *  a string sponsorship band, and several `Job`-required fields only
 *  optionally. The panel normalizes rows into `Job` for `JobCard`. */
export interface WorkdayJob {
  job_id: string;
  title: string;
  /** Tolerated source-side variants of `title` - some fetcher rows carry the
   *  role under these keys instead. Normalized at the FE boundary via
   *  `jobTitleOf`/`toJob` (lib/careerJobs.ts); backend normalizes too. */
  job_title?: string;
  role?: string;
  company: string;
  location: string;
  apply_link: string;
  date_posted: string;
  posted_text?: string;
  is_remote: boolean;
  /** Catalog slug of the company that served this row. */
  tenant: string;
  industry: string;
  /** Career-pages rows: which ATS hosts this posting (greenhouse, lever,
   *  ashby, smartrecruiters, workable, recruitee). Absent on Workday rows.
   *  MNC rows may also carry workday, amazon, eightfold, phenom, aggregator. */
  ats?: string;
  /** Marketplace / aggregator boards (e.g. Jobgether on Lever). Kept in the
   *  feed but sorted below first-party employer postings. */
  board_kind?: 'marketplace' | string;
  /** MNC rows: curated sector key (big_tech, semiconductors, fintech, ...). */
  sector?: string;
  /** Whole days since posting (0 = today). null/undefined = unknown. */
  days_ago?: number | null;
  logo?: string;
  description?: string;
  salary?: string;
  employment_type?: string;
  source?: string;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  /** `fit_score.FIT_SCORE_VERSION` - set by `_score_jobs` on the final payload
   *  and ABSENT on streamed provisional rows, so the card can tell a real fit
   *  verdict from a mid-scan estimate. `toJob` spreads it onto `Job`. */
  score_version?: string;
  /** Fit + retrieval/preference bonuses. Ordering only, never displayed. */
  rank_score?: number;
  /** FitScore v2 explanation block, when the row carries one. */
  fit?: import('./guest').GuestFitScore;
  /** True when the job title covers all core tokens of one of the user's
   *  search titles - drives the ranking boost. */
  title_matched?: boolean;
  /** Which search terms (title families and/or resume skills) retrieved
   *  this posting. */
  matched_terms?: string[];
  /** Definitive country from the job-detail API, set for enriched rows. */
  country_code?: string;
  /** Frank "can the base resume be honestly tailored into this JD?" verdict. */
  tailor_feasibility?: CareerPortalFeasibility;
  feasibility_reason?: string;
  /** Title-derived seniority band. */
  seniority?: CareerPortalSeniority;
  h1b_sponsor?: boolean;
  sponsorship?: CareerPortalSponsorship;
  /** Evidence behind the sponsorship band - JD snippet or filings summary. */
  sponsor_note?: string;
}

export interface WorkdayJobsParams {
  /** Viewer's UTC offset in minutes EAST of UTC (MST = -420) - the backend
   * computes "posted today" in the USER's calendar day. apiService stamps
   * this automatically on every scan; set it only to override. */
  tz_offset_minutes?: number;
  titles?: string[];
  industries?: string[];
  companies?: string[];
  /** Optional narrowing WITHIN the US (state/city/"Remote"). */
  location?: string;
  remote_only?: boolean;
  /** Server-side US country facet on every tenant. Defaults to true. */
  us_only?: boolean;
  force_refresh?: boolean;
}

export interface WorkdayJobsProgress {
  tenants_done: number;
  tenants_total: number;
  jobs_found: number;
  /** "details" while full descriptions are being fetched for top matches. */
  phase?: string;
}

export interface WorkdayJobsResult {
  ok: boolean;
  generated_at: string;
  jobs: WorkdayJob[];
  total: number;
  window_counts: { today: number; d1: number; d3: number; d7: number; d30: number };
  query_terms: string[];
  tenants_total: number;
  tenants_done: number;
  tenants_with_results: number;
  industries_available: string[];
  /** Career-pages results: ATS kinds present in the catalog. */
  ats_available?: string[];
  cache_hit: boolean;
  us_only?: boolean;
  /** 0 => no parsed resume on this account (skill scoring unavailable). */
  resume_skill_count?: number;
  diagnostics?: { facet_fallbacks?: number; task_errors?: number };
  errors: string[];
  /** Present only on streaming partials while the fan-out is running. */
  progress?: WorkdayJobsProgress;
  /** True on streaming partials - the jobs list is a provisional top slice. */
  streaming?: boolean;
}

export interface WorkdayCatalogIndustry {
  key: string;
  count: number;
  companies: Array<{ display_name: string; tenant: string; ats?: string }>;
}

export interface WorkdayCatalog {
  total: number;
  industries: WorkdayCatalogIndustry[];
  /** Career-pages catalog only: ATS kinds represented. */
  ats_available?: string[];
}

