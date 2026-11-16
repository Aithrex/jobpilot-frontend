export interface GmailSyncSummary {
  messages_scanned: number;
  auto_applied: number;
  suggested: number;
  ignored: number;
  deferred?: number;
  model_calls?: number;
  has_more?: boolean;
  ambiguous_matches?: number;
  skipped_already_seen?: number;
  skipped_no_match?: number;
  skipped_already_in_status?: number;
  /** Why a finished run ended the way it did. */
  outcome?: GmailSyncOutcome | null;
  tracked_applications?: number;
  /** Set on a first scan: how many days back it read. */
  window_days?: number;
}

export type GmailState =
  | 'unavailable'
  | 'not_connected'
  | 'needs_reconnect'
  | 'never_synced'
  | 'syncing'
  | 'paused'
  | 'synced';

export type GmailSyncOutcome = 'no_applications' | 'no_mail' | 'no_matches' | 'up_to_date' | 'updated';

export type GmailReconnectReason = 'expired_or_revoked' | 'permission_missing';

export type GmailErrorCode =
  | 'gmail_reconnect_required'
  | 'gmail_rate_limited'
  | 'gmail_unavailable'
  | 'gmail_policy_blocked'
  | 'gmail_time_limit'
  | 'gmail_error';

/** One press of Sync: a run that reads batch after batch until the window is done. */
export interface GmailSyncRun {
  run_id: string;
  trigger?: 'manual' | 'scheduled';
  state: 'running' | 'paused' | 'completed' | 'failed';
  started_at?: string | null;
  updated_at?: string | null;
  finished_at?: string | null;
  batches?: number;
  messages_scanned?: number;
  auto_applied?: number;
  suggested?: number;
  deferred?: number;
  ignored?: number;
  outcome?: GmailSyncOutcome | null;
  error_code?: GmailErrorCode | string | null;
  error?: string | null;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  gmail_address?: string | null;
  last_synced_at?: string | null;
  /** Null on a light (polling) read, which skips the review count. */
  pending_suggestions: number | null;
  has_more?: boolean;
  last_sync_summary?: GmailSyncSummary | null;
  /** The one field that picks a screen. Absent on an older backend. */
  state?: GmailState;
  linked_at?: string | null;
  needs_reconnect?: boolean;
  /** An unknown value gets the general reconnect wording. */
  reconnect_reason?: GmailReconnectReason | string | null;
  tracked_applications?: number;
  sync?: GmailSyncRun | null;
  auto_sync?: { enabled: boolean; interval_hours: number } | null;
  access?: GmailAccess | null;
}

/**
 * Whether this person may start Google's screen. While Google limits Aspirely
 * to a list of accounts added by hand, `gate` is `invite`: a person asks, the
 * address is added, and only then is Connect offered. Sending anyone else to
 * Google ends on a page that says "Access blocked", with no way back.
 */
export interface GmailAccess {
  mode: 'testing' | 'production';
  expires_at?: string | null;
  /** Absent on an older backend, which let everyone through. `try`: everyone
   *  may connect; whoever Google stops is offered Ask for access. */
  gate?: 'open' | 'invite' | 'try';
  state?: 'none' | 'requested' | 'approved';
  /** The Google account that was asked for, and must be chosen on Google's screen. */
  google_email?: string | null;
  requested_at?: string | null;
  decided_at?: string | null;
  /** A recent Connect press that has not produced a connection (`try` gate). */
  attempted_at?: string | null;
}

/** An automatic status move made by a sync, which the user may undo. */
export interface GmailChange {
  suggestion_id: string;
  record_id: string;
  company?: string;
  title?: string;
  from_status: string | null;
  to_status: string;
  subject?: string;
  from_address?: string;
  email_received_at?: string | null;
  applied_at?: string | null;
  sync_run_id?: string | null;
  undoable: boolean;
  undone: boolean;
  /** Put back by a later, stricter read of the same email (not by the person). */
  corrected?: boolean;
}

export type GmailOutcome =
  'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted' | 'withdrawn';

export interface GmailSuggestion {
  suggestion_id: string;
  record_id: string | null;
  company?: string;
  title?: string;
  from_name?: string;
  from_address?: string;
  subject?: string;
  snippet?: string;
  current_status: string | null;
  suggested_status: string | null;
  confidence: number;
  reason?: string;
  applied: boolean;
  dismissed: boolean;
  auto_applied?: boolean;
  created_at?: string;
  email_received_at?: string;
  match_confidence?: number;
  match_reason?: string;
  candidate_records?: {
    record_id: string;
    company: string;
    title: string;
    applied_date?: string | null;
    created_at?: string | null;
  }[];
  requires_record_selection?: boolean;
  requires_status_selection?: boolean;
  requires_application_match?: boolean;
  email_role?: string;
  evidence_message_id?: string;
  gmail_thread_id?: string;
}

/** One person or address on the app's copy of Google's test-user list. */
export interface GmailAccessRow {
  user_email: string | null;
  google_email: string | null;
  state: 'requested' | 'approved';
  requested_at: string | null;
  decided_at: string | null;
  decided_by?: string | null;
  connected?: boolean;
}

/** What the owner sees: who is waiting, who is in, how many places are left. */
export interface GmailAccessOverview {
  gate: 'open' | 'invite';
  consent_mode: 'testing' | 'production';
  limit: number;
  used: number;
  pending: GmailAccessRow[];
  approved: GmailAccessRow[];
  connected_without_a_record: string[];
}
