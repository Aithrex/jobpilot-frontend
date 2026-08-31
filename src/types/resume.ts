export interface ResumeContact {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  type: string;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  gpa: string;
  coursework: string;
}

export interface ResumeProject {
  name: string;
  dates: string;
  bullets: string[];
  tech: string;
}

export interface ATSKeywordAudit {
  matched: string[];
  missing: string[];
  partial: string[];
  coverage_percentage: number;
  required_missing: string[];
  required_coverage: number;
}

export interface TailoredFullResume {
  contact: ResumeContact;
  summary: string;
  skills: Record<string, string[]>;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: string[];
  projects: ResumeProject[];
  target_role?: string;
  ats_keyword_audit?: ATSKeywordAudit;
  /** Claim-verification sidecar (backend attaches post-tailor; absent on
   * older records = "not verified yet"). See ResumeVerification. */
  verification?: ResumeVerification;
  /**
   * Where each known skill belongs, decided by the backend at tailor time.
   * `map` is canonical-skill-key -> heading and covers both the base resume's
   * own placements and the JD terms it lacked; `order` is the base resume's
   * heading order, needed to re-insert a heading that `_polish_skills` pruned
   * out of this document. Absent on records tailored before this shipped.
   */
  _skill_headings?: { map: Record<string, string>; order: string[] };
}

export interface JDAnalysis {
  job_title: string;
  company: string;
  location: string;
  employment_type: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  qualifications: string[];
  experience_years: string;
  industry: string;
  keywords: string[];
}

/** @deprecated v1 LLM-simulated per-vendor scores - v2 backends emit
 * `vendor_compat` checklists instead. Present only on stored v1 records. */
export interface ATSScannerScores {
  workday: number;
  greenhouse: number;
  lever: number;
  icims: number;
  taleo: number;
  smartrecruiters: number;
}

/** @deprecated v1 pseudo-signal - removed in v2. */
export interface AIScreenerScores {
  overall: number;
  relevance: number;
  seniority_fit: number;
  culture_fit: number;
}

export type AtsVendor =
  | "workday"
  | "greenhouse"
  | "lever"
  | "icims"
  | "taleo"
  | "smartrecruiters";

export type CheckStatus = "pass" | "warn" | "fail";

export interface VendorCheckItem {
  id: string;
  label: string;
  status: CheckStatus;
}

export interface VendorCompatEntry {
  status: CheckStatus;
  checks: VendorCheckItem[];
}

/** Real pypdf round-trip checks (first-class in v2 - no more untyped casts). */
export interface PdfParseabilityChecks {
  extraction_ok?: boolean;
  single_page?: boolean;
  page_count?: number;
  contact_name_found?: boolean;
  contact_email_found?: boolean;
  contact_phone_found?: boolean;
  contact_at_top?: boolean;
  sections_found?: string[];
  sections_missing?: string[];
  sections_in_order?: boolean;
  skills_keywords_found?: number;
  skills_keywords_total?: number;
  experience_dates_parseable?: number;
  experience_dates_total?: number;
  no_glyph_corruption?: boolean;
  word_join_issues?: string[];
}

export interface MissingKeywordsClassified {
  skills: string[];
  logistics: string[];
  compliance: string[];
}

/**
 * ATS scores - a union of the stored v1 shape and the honest v2 rubric.
 * v2 (schema_version === 2): 100% deterministic overall (hard_skill_match
 * 30% / title_alignment 15% / quantified_impact 15% / REAL ats_parseability
 * 15% / section_completeness 10% / recency_relevance 8% / readability 7%),
 * per-vendor parse-compat CHECKLISTS instead of fake scanner scores, and
 * legacy alias keys (keyword_match = hard_skill_match, format_score =
 * ats_parseability, ...) so v1 readers keep working. Old records stored in
 * `tailoring_records` keep the v1 shape forever - branch with `isAtsV2()`
 * from `@/lib/atsScores`.
 */
export interface ATSScores {
  schema_version?: number; // 2 on honest-rubric backends; absent on v1
  overall: number;
  // ── v2 rubric dimensions (absent on v1 records) ──
  hard_skill_match?: number;
  title_alignment?: number;
  quantified_impact?: number;
  ats_parseability?: number;
  recency_relevance?: number;
  readability?: number;
  vendor_compat?: Partial<Record<AtsVendor, VendorCompatEntry>>;
  found_keywords?: string[];
  render_error?: string;
  // ── shared / legacy-alias keys (always present) ──
  keyword_match: number;
  keyword_frequency: number;
  skills_alignment: number;
  experience_relevance: number;
  quantifiable_impact: number;
  bullet_quality: number;
  format_score: number;
  section_completeness: number;
  suggestions: string[];
  missing_keywords: string[];
  strengths: string[];
  // ── v1-only (optional; v2 backends stop emitting) ──
  scanners?: ATSScannerScores;
  ai_screener?: AIScreenerScores;
  // ── loose extras attached post-validation ──
  missing_keywords_classified?: MissingKeywordsClassified;
  ai_review_available?: boolean;
  pdf_parseable_score?: number;
  pdf_parseable_checks?: PdfParseabilityChecks;
  pdf_parseable_warnings?: string[];
}

// ─── Claim verification sidecar (rides inside tailored_resume) ────────────
export type BulletVerdict = "SUPPORTED" | "PARTIAL" | "UNSUPPORTED" | "UNVERIFIED";
export type FactSource = "resume" | "linkedin" | "github" | "user";

export interface VerificationItem {
  /** Verbatim text at verification time - re-anchor key after edits. */
  text: string;
  verdict: BulletVerdict;
  evidence_fact_ids: string[];
  /** Human-readable fact lines backing this bullet (resolved sheet refs). */
  evidence_display?: string[];
  flags: string[]; // e.g. "ungrounded_metric", "unsupported_product"
  unsupported_claim: string;
}

export interface ResumeVerification {
  status: "ok" | "degraded" | "skipped";
  model?: string;
  reason?: string;
  counts: { supported: number; partial: number; unsupported: number; unverified: number };
  /** Keyed by structural address: experience.{i}.bullets.{j} | summary.s{k} | projects.{i}.bullets.{j} */
  items: Record<string, VerificationItem>;
}

export interface TailorPipelineResult {
  jd_analysis: JDAnalysis;
  tailored_resume: TailoredFullResume;
  ats_scores?: ATSScores;
  base_selection?: BaseResumeSelection;
}

export interface ResumeStatus {
  has_resume: boolean;
  has_base_file?: boolean;
  skills?: string[];
  experience_years?: number;
  job_titles?: string[];
  summary?: string;
  parsed_at?: string;
  /** Resume Platform v3: id of the active resume asset (present when one exists). */
  resume_id?: string;
  filename?: string;
  /** Legacy object key of the active asset; kept for older download paths. */
  s3_key?: string;
}

// ─── Base resume assets (Resume Platform v3) ──────────────────────────────
// Row shape of GET /api/resume/versions - backed by `resume_assets`.
// Identity is `resume_id` everywhere (set-active, delete, original download);
// rows no longer carry an s3_key.
export type ParseStatus = "pending" | "parsed" | "failed";

export interface ResumeAssetRow {
  resume_id: string;
  filename: string;
  uploaded_at: string;
  size_bytes: number;
  parse_status: ParseStatus | string;
  is_active: boolean;
}

export type BaseSelectionMode = "auto" | "pinned" | "active" | "single";

export interface BaseResumeCandidate {
  resume_id: string;
  filename: string;
  match_score: number;
  is_selected: boolean;
  is_active?: boolean;
}

/** Sidecar on a completed tailor job: which uploaded file was the base. */
export interface BaseResumeSelection {
  resume_id: string;
  filename: string;
  mode: BaseSelectionMode;
  match_score?: number | null;
  reason: string;
  candidates?: BaseResumeCandidate[];
}

// ─── Async job status ─────────────────────────────────────────────────────
// The lifecycle of a `resume_jobs` document, polled via GET /api/resume/job/<id>.
// Backend writes: "queued"/"processing" while running, then terminal
// "completed" (with `result`) or "failed" (with `error`/`error_code`).
export type JobStatus = "queued" | "processing" | "completed" | "failed";

// Honest sub-phase the backend writes into `job.result.progress` while a
// tailor job is processing (update_job_progress). Drives the real stepper  - 
// no elapsed-time guessing. `verifying` arrives once the claim-verification
// pass ships; the UI treats unknown phases as "keep current step".
export type BackendTailorPhase =
  | "extracting_jd"
  | "selecting_base"
  | "tailoring"
  | "augmenting"
  | "verifying"
  | "finalizing";

export interface TailorJobProgress {
  phase: BackendTailorPhase;
  pct?: number;
  updated_at?: string;
}

// ─── Tailoring record + versioning types ──────────────────────────────────
export type VersionSource = "initial" | "regenerated" | "edited";

export interface TailoringVersion {
  version_id: string;
  version_number: number;
  source: VersionSource;
  parent_version_id?: string | null;
  content_hash: string;
  created_at: string;
  /** Lists rely only on `overall`; full ATSScores rides along when the API
   * returns whole documents. Use atsOverall() from @/lib/atsScores. */
  ats_scores?: ATSScores | { overall?: number; schema_version?: number } | null;
  user_feedback?: string | null;
  tailored_resume?: TailoredFullResume;
  files?: Record<
    string,
    {
      s3_key?: string;
      filename?: string;
      size_bytes?: number;
      rendered_at?: string;
      content_hash?: string;
    } | null
  >;
}

export type ApplicationStatus =
  | "saved"
  | "draft"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "ghosted";

export interface ApplicationInfo {
  status?: ApplicationStatus;
  /** UTC instant the application was submitted. Answers "when". */
  applied_at?: string | null;
  /**
   * The civil day the application counts for, as "YYYY-MM-DD", frozen in the
   * user's timezone at confirmation time. Answers "which day" — deriving it
   * from `applied_at` at read time would shift an evening application into the
   * next day, and move it again whenever the user travels.
   */
  applied_date?: string | null;
  /** IANA zone that produced `applied_date`. */
  applied_tz?: string | null;
  next_action_date?: string | null;
  next_action_note?: string;
  notes?: string;
  recruiter_name?: string;
  recruiter_email?: string;
  recruiter_company?: string;
  job_url?: string;
  interview_dates?: string[];
  updated_at?: string;
  /** base = applied without a tailored resume; tailored = ATS score may exist. */
  resume_used?: "base" | "tailored";
  /** An unanswered "Did you apply?" prompt is waiting on this record. */
  confirmation_pending?: boolean;
}

export type QDifficulty = "easy" | "medium" | "hard";
export type RoleType =
  | "coding"
  | "data"
  | "devops"
  | "design"
  | "pm"
  | "business"
  | "research"
  | "generic";

export interface InterviewPrepQuestion {
  question: string;
  why_asked?: string;
  answer_outline?: string;
  difficulty?: QDifficulty;
}

export interface RedFlagItem {
  question: string;
  answer_outline?: string;
  defense?: string;
  difficulty?: QDifficulty;
}

export interface CodingProblem {
  title: string;
  difficulty?: QDifficulty;
  problem_statement: string;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  hints?: string[];
  approach?: string;
  complexity?: string;
  skill_tags?: string[];
}

export interface CaseStudy {
  title: string;
  difficulty?: QDifficulty;
  scenario: string;
  subtasks?: string[];
  evaluation_criteria?: string[];
  hints?: string[];
}

export interface SystemDesignPrompt {
  title: string;
  difficulty?: QDifficulty;
  scope: string;
  requirements?: string[];
  suggested_components?: string[];
  discussion_points?: string[];
}

export interface DataChallenge {
  title: string;
  difficulty?: QDifficulty;
  scenario: string;
  deliverable?: string;
  hints?: string[];
}

export interface InterviewPrepContent {
  role_type?: RoleType;
  elevator_pitch?: string;
  talking_points?: string[];
  behavioral_questions?: InterviewPrepQuestion[];
  technical_questions?: InterviewPrepQuestion[];
  company_specific?: InterviewPrepQuestion[];
  coding_problems?: CodingProblem[];
  case_studies?: CaseStudy[];
  system_design_prompts?: SystemDesignPrompt[];
  data_challenges?: DataChallenge[];
  gaps_to_address?: string[];
  questions_to_ask_them?: string[];
  red_flags?: (RedFlagItem | string)[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at?: string;
}

export interface MockEvaluation {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  missing_points: string[];
  model_answer: string;
}

export interface InterviewPrepPack {
  content?: InterviewPrepContent;
  generated_at?: string;
  grounded_version_id?: string;
}

export interface TailoringRecord {
  record_id: string;
  user_email: string;
  jd_text?: string;
  jd_analysis?: {
    job_title?: string;
    company?: string;
    required_skills?: string[];
    keywords?: string[];
    location?: string;
    seniority?: string;
  };
  base_resume_filename?: string;
  base_resume_s3_key?: string;
  base_resume_id?: string;
  base_selection?: BaseResumeSelection;
  ats_scores?: { overall?: number } | null;
  created_at: string;
  updated_at?: string;
  current_version_id?: string;
  versions?: TailoringVersion[];
  application?: ApplicationInfo;
  interview_prep?: InterviewPrepPack;
  /** Inventory / listing job_id when this record was tailored from a posting. */
  source_job_id?: string;
  /** `pipeline_stub` until a tailored resume is merged in. */
  source?: string;
  tailored_resume?: TailoredFullResume;
  /**
   * Present only on the tracker's slim `view=list` rows, where `versions` and
   * `tailored_resume` are never read. Consumers that need "is this an
   * untailored stub" must prefer these and fall back to the full fields.
   */
  version_count?: number;
  has_tailored_resume?: boolean;
}
