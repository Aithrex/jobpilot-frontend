/**
 * Types for the opt-in auto-submit ("Auto-Apply") loop.
 *
 * The backend feature is gated behind a master flag (`AUTO_SUBMIT_ENABLED`).
 * When it is off every endpoint 404s - the frontend treats that as
 * "feature unavailable" and hides the surface entirely (see useAutoSubmit).
 */

import type { AutoApplyMode } from "./onboarding";

export interface AutoSubmitSettings {
  auto_submit_enabled: boolean;
  /**
   * Confidence floor (0-1) above which JobPilot may auto-submit an application
   * without a manual review. Anything below is held for one-tap approval.
   * Defaults server-side (0.90) when the account hasn't set it explicitly.
   */
  autonomy_threshold?: number;
  /**
   * The explicit autonomy mode (the SINGLE source of truth). `null` until
   * onboarding forces a pick - the FE routes the user to the mode picker while
   * this is null (the executor refuses to auto-act until it is set).
   */
  mode?: AutoApplyMode | null;
  /**
   * When true (default), auto-apply pins a tailored resume before submit.
   * When false, submits with the user's base resume (no tailor quota spend).
   */
  use_tailored_resume?: boolean;
  updated_at?: string | null;
}

export type AutoSubmitStatus =
  | "pending" // prepared, waiting for the user to approve
  | "approved" // approved by the user, handed to the extension to submit
  | "submitted" // the extension confirmed the application was submitted
  | "cancelled" // the user cancelled within the undo window
  | "expired" // the approval window lapsed before submission
  // Canonical ledger execution states surfaced by the E2 approval fold. A
  // `ready_for_review` row still awaits a go-ahead (already_approved false);
  // `approved`/`queued_for_execution`/`running` are cleared to submit and are
  // rendered READ-ONLY (already_approved true) so they can never be re-approved.
  | "ready_for_review"
  | "queued_for_execution"
  | "running"
  // Copilot (prepare-only) disposition: JobPilot resolved the answer sheet but
  // never submits - the user applies manually.
  | "manual_apply"
  // Canonical execution states that hand a row BACK to the human (worker.py /
  // application_ledger_service). None is an error or a success - they are
  // "needs you" holds and must never render as re-approvable review cards:
  //   waiting_human      an anti-bot / verify wall (captcha, MFA, account gate)
  //                      paused the run for a person to clear.
  //   needs_input        a required/sensitive field could not be resolved; the
  //                      user must supply the named answer (never a guess).
  //   submission_unknown the Submit click landed but the outcome was ambiguous;
  //                      HELD, never auto-retried (P1-ENC / worker boundary).
  | "waiting_human"
  | "needs_input"
  | "submission_unknown";

/**
 * A single approval "view" as returned by /pending. Company / role / match%
 * are best-effort enrichments - they are NOT guaranteed by the documented
 * shape, so every consumer must render them defensively (fall back to the
 * posting URL's host). `answers_snapshot` is the generated application answers.
 */
export interface AutoSubmitApprovalView {
  /** Present on legacy System-A approvals; absent on canonical ledger rows. */
  approval_id?: string;
  application_id: string;
  url?: string | null;
  application_url?: string | null;
  /** Canonical ledger rows also expose the raw apply URL under `apply_url`. */
  apply_url?: string | null;
  status: AutoSubmitStatus | string;
  source?: string | null;
  answers_snapshot?: Record<string, string> | null;
  created_at?: string | null;
  approved_at?: string | null;
  /** ISO timestamp until which the user can still cancel a submission. */
  undo_until?: string | null;
  expires_at?: string | null;
  eligible?: boolean;
  /**
   * Defect H: TRUE for rows already approved/queued/running (snapshot frozen).
   * The FE renders these READ-ONLY and NEVER offers a second "Approve & submit"
   * - re-approving is what caused the double approval / double charge.
   */
  already_approved?: boolean;
  /** ATS family label from the ledger (e.g. "greenhouse"), best-effort. */
  ats?: string | null;
  /** Per-row disposition, when the backend labels one (e.g. copilot rows). */
  mode?: AutoApplyMode | null;

  // Optional enrichments (may be absent).
  company?: string | null;
  role?: string | null;
  title?: string | null;
  /** 0-1 or 0-100; normalize before display. */
  match_score?: number | null;

  /**
   * `needs_input` rows carry the one-tap review queue - the exact fields the
   * user must supply, in the ledger's `{question, kind, field_id}` shape. The FE
   * shows the first item's label and points the user to answer it. Best-effort:
   * absent on every non-`needs_input` row (and may be empty).
   */
  needs_input?: NeedsInputItem[] | null;
  /**
   * A short, human reason a row was handed back - e.g. the `waiting_human`
   * pending action ("verify wall", "captcha"). Best-effort free text.
   */
  reason?: string | null;
}

/** One field the executor could not resolve on a `needs_input` row. */
export interface NeedsInputItem {
  /** The prompt shown to the user (e.g. "We need your answer to continue (...)"). */
  question?: string | null;
  /** Why it stalled (e.g. "legal_attestation", "low_confidence"). */
  kind?: string | null;
  /** The canonical field the answer maps to. */
  field_id?: string | null;
}

export interface AutoSubmitUsage {
  feature?: string;
  used?: number;
  limit?: number | null;
  remaining?: number | null;
  unlimited?: boolean;
  period?: string;
  resets_at?: string;
}

export interface AutoSubmitPending {
  /** Candidates awaiting the user's approval. */
  pending: AutoSubmitApprovalView[];
  /** Approved items handed off to the extension to submit. */
  waiting: AutoSubmitApprovalView[];
}

export interface AutoSubmitApproveBody {
  application_id: string;
  url: string;
  answers: Record<string, string>;
}

export interface AutoSubmitApproveResult {
  approval: AutoSubmitApprovalView;
  created: boolean;
  usage?: AutoSubmitUsage;
}

/**
 * Result of confirming an emailed approve link via the CSRF-safe
 * `POST /api/apply/approve-link`. The emailed GET is non-mutating and 302s to
 * `/next/applications?approve=<token>`; the signed-in SPA then POSTs the token.
 * Outcome is read from the HTTP status + these fields:
 *   200 { ok:true, approved:1, ready:true }   -> approved
 *   200 { ok:true, approved:0, ready:false }  -> NOT ready yet (no error)
 *   200 { ok:true, action:"review" }          -> a plain review link (no-op)
 *   409 { error:"link_already_used" }         -> single-use token already spent
 *   403 { error:"not_authorized" }            -> link belongs to another account
 * None of these is ever a 401 - a wrong-account link is a business 403.
 */
export interface ApproveLinkResult {
  ok?: boolean;
  action?: string;
  /** Rows moved to `approved` by an approve action. 0 = not ready yet. */
  approved?: number;
  /** True when at least one row was approved. */
  ready?: boolean;
  /** Rows skipped by a `skip` action. */
  skipped?: number;
  /** True when a `review` link had already been consumed (harmless no-op). */
  already_used?: boolean;
}
