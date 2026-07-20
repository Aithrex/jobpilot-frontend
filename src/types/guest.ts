/**
 * Guest onboarding contract types — coded against the FROZEN v2 spec
 * (jobpilot-backend/docs/specs/guest-onboarding.md, v2, 2026-07-19).
 * Any drift from these shapes is a cross-repo contract bug.
 *
 * v2 highlights encoded here:
 * - onboard returns a server-issued `device_token` (persist + echo).
 * - match cards carry `match_id` (the ONLY tailorable reference), `why`,
 *   and `sponsorship` from public filings.
 * - tailor takes `{guest_id, match_id, device_token?}` — the v1
 *   `job:{title,company,jd_text|url}` shape is gone.
 * - completed tailor results carry a `download` grant; polished PDF/DOCX
 *   come from the token download endpoints (no client-side export).
 * - claim returns transfer + day-1 usage counters.
 */

import type { JDAnalysis, TailoredFullResume } from "./resume";

/** POST /api/resume/guest/onboard → 202. A stale/unknown guest_id in the
 * request gets a FRESH guest_id minted here — always overwrite localStorage
 * with this value. `device_token` is a server-issued anti-abuse signal
 * (opaque, first-party) — persist it and echo on session/matches/tailor. */
export interface GuestOnboardSubmit {
  guest_id: string;
  job_id: string;
  device_token?: string;
}

/** Recognition + quota block shared by the parse result and session lookup.
 * `recognized_name` is present ONLY when the caller proved the owning
 * guest_id (capability rule) — device/fingerprint-only recognition omits the
 * field entirely. Never synthesize an empty-string name. */
export interface GuestRecognition {
  recognized?: boolean;
  recognized_name?: string;
  tailors_used?: number;
  tailors_limit?: number;
}

/** Completed guest_parse job result (NESTED — the resume lives under
 * parsed_resume.structured, plus a `guest` recognition/quota block so no
 * extra session call is needed after parsing). */
export interface GuestParseResult {
  parsed_resume: {
    structured: Record<string, unknown>;
    filename?: string;
  };
  guest?: GuestRecognition;
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
 * only ("signals from public filings") — never "verified sponsor". */
export interface GuestSponsorship {
  signal?: string;
  note?: string;
}

/** One scored job card from the guest matches result (server caps at 5). */
export interface GuestJobMatch {
  /** Opaque server-minted id — the ONLY reference guest tailor accepts. */
  match_id: string;
  title: string;
  company: string;
  /** Backend-served favicon path ("/api/jobs/logo/<40-hex>"). May 404 — the
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
  /** jd_match score 0-100 int — presented to users as an ESTIMATE. */
  match_score: number;
  matched_skills?: string[];
  /** Additive v2.1: up to 5 of the guest's OWN resume skills the posting does
   * not mention (scorer `missing_top`). Resume-relative score context — label
   * it that way, never as "requirements you lack". Absent on older caches. */
  gaps?: string[];
  /** Short deterministic "why this matches" line from the scorer. */
  why?: string;
  sponsorship?: GuestSponsorship | null;
}

/**
 * POST /api/jobs/guest/matches ({guest_id, device_token?}):
 * - cache miss → 202 { job_id } → poll GET /resume/guest/job/<id>?guest_id=
 *   → completed result { jobs, date, min_score, cached:false }
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

/** POST /api/resume/guest/tailor → 202 (fresh atomic reservation) or
 * 200 { existing:true } (idempotent retry with the SAME match_id). Both carry
 * the server-confirmed quota numbers. */
export interface GuestTailorSubmit {
  job_id: string;
  existing?: boolean;
  tailors_used?: number;
  tailors_limit?: number;
}

export type GuestDownloadFormat = "pdf" | "docx";

/** Download capability grant — token is format-scoped, TTL ~15 min,
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
  tailors_used?: number;
  tailors_limit?: number;
}

/** POST /api/resume/guest/claim (JWT required — the only authed guest call).
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
