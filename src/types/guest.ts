/**
 * Guest onboarding contract types — coded against the IMPLEMENTED backend
 * (jobpilot-backend guest blueprints), which refines the v1 spec
 * (docs/specs/guest-onboarding.md). Any drift from these shapes is a
 * cross-repo contract bug.
 */

import type { JDAnalysis, TailoredFullResume } from "./resume";

/** POST /api/resume/guest/onboard → 202. A stale/unknown guest_id in the
 * request gets a FRESH guest_id minted here — always overwrite localStorage
 * with this value. */
export interface GuestOnboardSubmit {
  guest_id: string;
  job_id: string;
}

/** Completed guest_parse job result (NESTED — the resume lives under
 * parsed_resume.structured, plus a `guest` recognition/quota block so no
 * extra session call is needed after parsing). */
export interface GuestParseResult {
  parsed_resume: {
    structured: Record<string, unknown>;
    filename?: string;
  };
  guest?: {
    recognized?: boolean;
    recognized_name?: string | null;
    tailors_used?: number;
    tailors_limit?: number;
  };
}

/** GET /api/resume/guest/session?guest_id=&fingerprint_hash= */
export interface GuestSession {
  exists: boolean;
  /** Fingerprint matched an identity cluster (guest_id may be unknown). */
  recognized?: boolean;
  recognized_name?: string | null;
  tailors_used?: number;
  tailors_limit?: number;
  has_resume?: boolean;
  /** Count of jobs already matched today (int, not bool). */
  matched_jobs_today?: number;
  claimed?: boolean;
}

/** One scored job from the guest matches result. */
export interface GuestJobMatch {
  title: string;
  company: string;
  location?: string;
  /** Job posting URL — this is what guest tailor receives as `url`. */
  apply_link?: string;
  /** Direct source the job came from (workday / greenhouse / lever / ashby). */
  source?: string;
  posted?: string;
  tier?: string | number;
  /** jd_match score 0–100 int; only jobs ≥ the admin min-score knob return. */
  match_score: number;
  matched_skills?: string[];
}

/**
 * POST /api/jobs/guest/matches:
 * - cache miss → 202 { job_id } → poll GET /resume/guest/job/<id>?guest_id=
 *   → completed result { jobs, date, min_score, total_considered, cached:false }
 * - same-day repeat → 200 directly { jobs, date, computed_at, min_score, cached:true }
 */
export interface GuestMatchesResult {
  jobs: GuestJobMatch[];
  date?: string;
  computed_at?: string;
  min_score?: number;
  total_considered?: number;
  cached?: boolean;
}

/** POST /api/resume/guest/tailor → 202 (server-confirmed quota numbers). */
export interface GuestTailorSubmit {
  job_id: string;
  tailors_used?: number;
  tailors_limit?: number;
}

/** Completed guest_tailor job result (quota numbers live on the 202, not here). */
export interface GuestTailorResult {
  tailored_resume: TailoredFullResume;
  jd_analysis?: JDAnalysis;
  record_id?: string;
}

/** 429 body from guest tailor. `global: true` marks the platform-wide daily
 * circuit breaker (capacity copy) vs. the guest's own lifetime quota (CTA). */
export interface GuestQuotaError {
  error?: string;
  message?: string;
  quota_exhausted?: boolean;
  global?: boolean;
  tailors_used?: number;
  tailors_limit?: number;
}

/** POST /api/resume/guest/claim (JWT required). Idempotent. */
export interface GuestClaimResult {
  ok?: boolean;
  claimed?: boolean;
  already_claimed?: boolean;
}
