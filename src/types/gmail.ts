export interface GmailSyncSummary {
  messages_scanned: number;
  auto_applied: number;
  suggested: number;
  ignored: number;
  has_more?: boolean;
  ambiguous_matches?: number;
  skipped_already_seen?: number;
  skipped_no_match?: number;
  skipped_already_in_status?: number;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  gmail_address?: string | null;
  last_synced_at?: string | null;
  pending_suggestions: number;
  has_more?: boolean;
  last_sync_summary?: GmailSyncSummary | null;
}

export interface GmailSuggestion {
  suggestion_id: string;
  record_id: string;
  company?: string;
  title?: string;
  from_name?: string;
  from_address?: string;
  subject?: string;
  snippet?: string;
  current_status: string;
  suggested_status: string;
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
  evidence_message_id?: string;
  gmail_thread_id?: string;
}
