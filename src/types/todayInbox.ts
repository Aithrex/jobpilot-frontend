/**
 * Types for the unified "Today" inbox feed (GET /api/apply/today-inbox).
 *
 * The backend composes one queue of everything that may need the user today —
 * approvals awaiting input, auto-submit hand-offs, inbox status suggestions,
 * and "did you apply?" nudges — returned newest-first and capped at 50.
 * This replaces the frontend's old best-effort synthesis of separate sources.
 */

/** What a row represents — drives its icon and how the action reads. */
export type TodayInboxKind =
  | "needs_input"
  | "auto_submit"
  | "inbox_suggestion"
  | "did_you_apply";

export interface TodayInboxItem {
  id: string;
  kind: TodayInboxKind;
  title: string;
  detail: string;
  /**
   * Where the action goes. Usually an in-app SPA path (e.g. "/applications");
   * may be an absolute http(s) URL for auto_submit hand-offs.
   */
  deep_link: string;
  /** CTA copy for the row's primary action. */
  action_label: string;
  /** ISO-8601, or null when the source carries no timestamp. */
  created_at: string | null;
}

export interface TodayInbox {
  count: number;
  items: TodayInboxItem[];
}
