/**
 * Types for the opt-in auto-submit ("Auto-Apply") loop.
 *
 * The backend feature is gated behind a master flag (`AUTO_SUBMIT_ENABLED`).
 * When it is off every endpoint 404s — the frontend treats that as
 * "feature unavailable" and hides the surface entirely (see useAutoSubmit).
 */

export interface AutoSubmitSettings {
  auto_submit_enabled: boolean;
  /**
   * Confidence floor (0–1) above which JobPilot may auto-submit an application
   * without a manual review. Anything below is held for one-tap approval.
   * Defaults server-side (0.90) when the account hasn't set it explicitly.
   */
  autonomy_threshold?: number;
  updated_at?: string | null;
}

export type AutoSubmitStatus =
  | "pending" // prepared, waiting for the user to approve
  | "approved" // approved by the user, handed to the extension to submit
  | "submitted" // the extension confirmed the application was submitted
  | "cancelled" // the user cancelled within the undo window
  | "expired"; // the approval window lapsed before submission

/**
 * A single approval "view" as returned by /pending. Company / role / match%
 * are best-effort enrichments — they are NOT guaranteed by the documented
 * shape, so every consumer must render them defensively (fall back to the
 * posting URL's host). `answers_snapshot` is the generated application answers.
 */
export interface AutoSubmitApprovalView {
  approval_id: string;
  application_id: string;
  url?: string | null;
  application_url?: string | null;
  status: AutoSubmitStatus | string;
  source?: string | null;
  answers_snapshot?: Record<string, string> | null;
  created_at?: string | null;
  approved_at?: string | null;
  /** ISO timestamp until which the user can still cancel a submission. */
  undo_until?: string | null;
  expires_at?: string | null;
  eligible?: boolean;

  // Optional enrichments (may be absent).
  company?: string | null;
  role?: string | null;
  title?: string | null;
  /** 0–1 or 0–100; normalize before display. */
  match_score?: number | null;
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
