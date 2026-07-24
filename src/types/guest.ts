/**
 * Guest onboarding contract types - coded against the FROZEN v2 spec
 * (jobpilot-backend/docs/specs/guest-onboarding.md, v2, 2026-07-19).
 * Any drift from these shapes is a cross-repo contract bug.
 *
 * v2 highlights encoded here:
 * - onboard returns a server-issued `device_token` (persist + echo).
 * - match cards carry `match_id` (the ONLY tailorable reference), `why`,
 *  and `sponsorship` from public filings.
 * - tailor takes `{guest_id, match_id, device_token?}` - the v1
 *  `job:{title,company,jd_text|url}` shape is gone.
 * - completed tailor results carry a `download` grant; polished PDF/DOCX
 *  come from the token download endpoints (no client-side export).
 * - claim returns transfer + day-1 usage counters.
 */

import type { JDAnalysis, TailoredFullResume } from './resume';

/** POST /api/resume/guest/onboard → 202. A stale/unknown guest_id in the
 * request gets a FRESH guest_id minted here - always overwrite localStorage
 * with this value. `device_token` is a server-issued anti-abuse signal
 * (opaque, first-party) - persist it and echo on session/matches/tailor. */
export interface GuestOnboardSubmit {
  guest_id: string;
  job_id: string;
  device_token?: string;
}

/** Recognition + quota block shared by the parse result and session lookup.
 * `recognized_name` is present ONLY when the caller proved the owning
 * guest_id (capability rule) - device/fingerprint-only recognition omits the
 * field entirely. Never synthesize an empty-string name. */
export interface GuestRecognition {
  recognized?: boolean;
  recognized_name?: string;
  tailors_used?: number;
  tailors_limit?: number;
}

/** Honest sub-phase marker guest job polls may carry while processing
 * (resume-platform-v3.md section 5; written by update_job_progress).
 * guest_parse: parsing -> extracting_skills -> finalizing.
 * guest_matches: reading_resume -> searching_sources -> ranking -> finalizing.
 * Unknown phases must be treated as "keep the current step". */
export interface GuestJobProgress {
  phase: string;
  pct?: number;
  updated_at?: string;
  /** v4 additive, guest_parse `finalizing` only: the GENUINELY extracted
   * skill names (first ~8) so the parsing scene can materialize REAL data
   * while the completed payload is still in flight. Never synthetic. */
  skills_preview?: string[];
}

/** Profile block on the guest_parse result (v3 additive): ONLY fields the
 * parser genuinely extracted are present - never synthesize server-side
 * absences into placeholders. The extracted name is presentation-only,
 * never identity. */
export interface GuestProfileBlock {
  first_name?: string;
  headline_title?: string;
  experience_level?: string;
  years?: number;
  skills?: string[];
  location?: string;
  work_authorization?: string;
  summary_short?: string;
}

/** Completed guest_parse job result (NESTED - the resume lives under
 * parsed_resume.structured, plus a `guest` recognition/quota block so no
 * extra session call is needed after parsing). v3 additive: `resume_id` and
 * a `profile` block for the profile-reveal step (absent on older results  -
 * the FE synthesizes a client-side equivalent from `structured`). */
export interface GuestParseResult {
  parsed_resume: {
    structured: Record<string, unknown>;
    filename?: string;
  };
  guest?: GuestRecognition;
  resume_id?: string;
  profile?: GuestProfileBlock;
}

/** GET /api/resume/guest/session?guest_id=&fingerprint_hash=&device_token= */
export interface GuestSession {
  exists: boolean;
  /** Device/fingerprint matched a known subject (guest_id may be unknown). */
  recognized?: boolean;
  /** Present ONLY on a guest_id-proven session with a parsed resume. */
  recognized_name?: string;
  tailors_used?: number;
  tailors_limit?: number;
  has_resume?: boolean;
  /** Count of jobs already matched today (int, not bool). */
  matched_jobs_today?: number;
  claimed?: boolean;
}

/** Sponsorship signal derived from public H-1B filing data. Precise language
 * only ("signals from public filings") - never "verified sponsor". */
export interface GuestSponsorship {
  signal?: string;
  note?: string;
}

/**
 * FitScore v2 - the VERSIONED, server-computed fit breakdown behind the
 * headline score. Every field is optional by design: a backend that has not
 * shipped v2 omits the whole block and the UI falls back to the single
 * `match_score` scalar. Nothing in here is ever derived or inferred
 * client-side - an absent component/evidence/constraint simply does not
 * render.
 */
export interface GuestFitComponent {
  /** Stable component key, e.g. "required_skills". */
  key?: string;
  /** Server display label. The UI falls back to a key lookup, never invents. */
  label?: string;
  /** Points EARNED by this component. */
  score?: number;
  /** Points AVAILABLE for this component (its weight in the total). */
  max?: number;
}

/** One evidence-backed reason the score landed where it did. */
export interface GuestFitEvidence {
  label?: string;
  text?: string;
  /** Component key this evidence supports, when the server ties them. */
  component?: string;
}

/** A requirement or hard constraint read off the POSTING (not the resume).
 * `satisfied` absent = the server did not decide; the UI stays neutral. */
export interface GuestFitConstraint {
  label?: string;
  text?: string;
  satisfied?: boolean;
}

export interface GuestFitScore {
  score?: number;
  /** Qualitative band for the score, e.g. "strong" / "moderate". */
  band?: string;
  confidence?: string;
  /** Scorer version stamp - presence marks a v2-capable payload. */
  score_version?: string;
  /** Either an ordered list, or a key -> points/component map. */
  components?: GuestFitComponent[] | Record<string, number | GuestFitComponent>;
  evidence?: Array<GuestFitEvidence | string>;
  strengths?: string[];
  missing_requirements?: Array<GuestFitConstraint | string>;
  hard_constraints?: Array<GuestFitConstraint | string>;
  explanation?: string;
}

/** One scored job card from the guest matches result (server caps at 5). */
export interface GuestJobMatch {
  /** Opaque server-minted id - the ONLY reference guest tailor accepts. */
  match_id: string;
  title: string;
  /** Tolerated source-side variants of `title` (backend normalizes, the FE
   * defends belt-and-braces - see normalizeGuestMatch in useGuestFlow). */
  job_title?: string;
  role?: string;
  company: string;
  /** Backend-served favicon path ("/api/jobs/logo/<40-hex>"). May 404 - the
   *  UI must fall back to the hued monogram. Resolve via `companyLogoSrc`. */
  logo_url?: string;
  location?: string;
  /** Job posting URL (application page). */
  apply_link?: string;
  /** Original posting URL when distinct from apply_link. */
  url?: string;
  /** Direct source the job came from (workday / greenhouse / lever / ashby). */
  source?: string;
  posted?: string;
  tier?: string | number;
  /** jd_match score 0-100 int - presented to users as an ESTIMATE. */
  match_score: number;
  matched_skills?: string[];
  /** Additive v2.1: up to 5 of the guest's OWN resume skills the posting does
   * not mention (scorer `missing_top`). Resume-relative score context - label
   * it that way, never as "requirements you lack". Absent on older caches. */
  gaps?: string[];
  /** Short deterministic "why this matches" line from the scorer. */
  why?: string;
  sponsorship?: GuestSponsorship | null;
  /** v4 additive: viewer-local calendar-day age + its display label. BOTH are
   * server-authoritative - freshness is NEVER computed or guessed client-side,
   * and an absent value renders no freshness at all (never "today"). */
  days_ago?: number;
  posted_text?: string;
  /** v5 additive: the versioned FitScore breakdown behind `match_score`. */
  fit?: GuestFitScore;
  /** v4 additive: deterministic title classification - 'senior' | 'mid' |
   * 'entry' | 'neutral' (no marker; shows in every seniority view). */
  seniority?: string;
}

/** Seniority views over the day's scanned pool (v4). */
export type GuestSeniority = 'any' | 'entry' | 'mid' | 'senior';

/** Deterministic experience detection from exact date-range math (merged
 * intervals - concurrent roles never double-count). */
export interface GuestDetectedExperience {
  level?: GuestSeniority;
  years?: number;
}

/** Why a completed guest_matches run returned zero jobs (v3 3.5) - a
 * completed-empty is distinguishable from provider failure. */
export type GuestEmptyReason = 'no_openings_matched' | 'sources_unavailable' | 'low_signal_resume';

/** Per-source outcome report on the guest_matches result (v3 additive). */
export interface GuestSourcesReport {
  ok?: string[];
  failed?: string[];
  timed_out?: string[];
  considered?: number;
  /** v5 additive: rows dropped for age by the hard freshness window, and the
   * window itself in days. These make a zero-result day explainable without
   * guessing ("openings existed, they were stale"). Absent on older caches. */
  dropped_stale?: number;
  max_age_days?: number;
}

/**
 * POST /api/jobs/guest/matches ({guest_id, device_token?}):
 * - cache miss → 202 { job_id } → poll GET /resume/guest/job/<id>?guest_id=
 *  → completed result { jobs, date, min_score, cached:false }
 * - same-day repeat → 200 directly { jobs, date, computed_at, min_score, cached:true }
 * v3 additive: sources_report / empty_reason / total_considered for honest
 * empty vs unavailable vs partial states - never padded results.
 */
export interface GuestMatchesResult {
  jobs: GuestJobMatch[];
  date?: string;
  computed_at?: string;
  min_score?: number;
  total_considered?: number;
  sources_report?: GuestSourcesReport;
  empty_reason?: GuestEmptyReason;
  cached?: boolean;
  /** v4 additive - the seniority pool. `seniority` is the APPLIED view;
   * `pool_total` counts qualifying matches for that view; `locked_count` =
   * pool_total − visible (the honest "N more, create an account" number);
   * `seniority_counts` powers the toggle badges; `detected_experience` is
   * the deterministic level/years read from the resume's own dates. A
   * seniority re-request against a cached pool answers 200 instantly. */
  seniority?: GuestSeniority;
  seniority_counts?: Partial<Record<GuestSeniority, number>>;
  pool_total?: number;
  locked_count?: number;
  detected_experience?: GuestDetectedExperience;
}

/** POST /api/resume/guest/tailor → 202 (fresh atomic reservation) or
 * 200 { existing:true } (idempotent retry with the SAME match_id). Both carry
 * the server-confirmed quota numbers. */
export interface GuestTailorSubmit {
  job_id: string;
  existing?: boolean;
  tailors_used?: number;
  tailors_limit?: number;
}

export type GuestDownloadFormat = 'pdf' | 'docx';

/** Download capability grant - token is format-scoped, TTL ~15 min,
 * re-issuable without limit, and never consumes quota. */
export interface GuestDownloadGrant {
  token: string;
  expires_at?: string;
  formats?: GuestDownloadFormat[];
}

/** Completed guest_tailor job result (quota numbers live on the submit
 * response, not here). `download` advertises the polished-export capability
 * for this record. */
export interface GuestTailorResult {
  tailored_resume: TailoredFullResume;
  jd_analysis?: JDAnalysis;
  record_id?: string;
  download?: GuestDownloadGrant;
}

/** 429 body from guest endpoints. Three CTA variants (never error toasts,
 * never logout): `quota_exhausted` (the guest's own lifetime trial),
 * `error:"capacity"` + `global:true` (platform-wide daily breaker), and
 * `error:"challenge_required"` (progressive anti-abuse challenge). */
export interface GuestQuotaError {
  error?: string;
  message?: string;
  quota_exhausted?: boolean;
  global?: boolean;
  /** Challenge provider id when error === "challenge_required". */
  provider?: string;
  /** One-time, expiring, subject-bound id to redeem at
   * POST /resume/guest/challenge/verify (present with challenge_required). */
  challenge_id?: string;
  tailors_used?: number;
  tailors_limit?: number;
}

/** 200 body of POST /resume/guest/challenge/verify. Every failure is a 400
 * carrying `error` = one of GuestChallengeErrorCode - NEVER a 401. */
export interface GuestChallengeVerified {
  verified?: boolean;
}

export type GuestChallengeErrorCode =
  | 'challenge_expired'
  | 'challenge_already_used'
  | 'challenge_subject_mismatch'
  | 'challenge_solution_rejected'
  | 'challenge_invalid'
  | 'challenge_not_required'
  | 'challenge_unavailable';

/** POST /api/resume/guest/claim (JWT required - the only authed guest call).
 * Atomic + idempotent; repeat by the same account returns
 * already_claimed:true with unchanged counts. */
export interface GuestClaimResult {
  claimed?: boolean;
  already_claimed?: boolean;
  resume_imported?: boolean;
  records_transferred?: number;
  /** Guest tailors carried into day-1 free usage (counted once per subject/day). */
  tailors_carried?: number;
  daily_tailors_used?: number;
  daily_tailors_limit?: number;
}
