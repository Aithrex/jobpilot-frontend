/**
 * Managed Application Mailbox (Tsenta-style relay) - the FE half of the
 * backend contract in jobpilot-backend/docs/specs/managed-mailbox-v1.md.
 *
 * Field names are taken VERBATIM from that spec (§2 collections + §5 endpoints):
 * do NOT rename them - a field-name mismatch is the exact class of bug this
 * feature supersedes (see the legacy src/types/mailIngress.ts, whose
 * from_address / suggested_status / provisioned shape never matched a backend).
 *
 * A 404 on any /api/resume/mailbox/* call = the feature flag
 * (APPLY_MAILBOX_ENABLED) is off -> hide the whole surface. Business failures
 * are 400/403/404/409/429 - NEVER 401 (invariant #1).
 */

/** Mailbox autonomy mode (managed_mailboxes.mode, §2). */
export type MailboxMode = 'copilot' | 'approval' | 'autopilot';

/** Per-thread / per-message trust bucket (§8). Unverified mail is shown but
 *  never auto-transitions an application. */
export type MailTrust = 'verified' | 'unverified';

/** SPF/DKIM/DMARC evidence result (mail_messages, §2). */
export type MailAuthResult = 'pass' | 'fail' | 'none';

/** Attachment scan verdict (mail_attachments.scan_verdict, §2). A non-"clean"
 *  verdict means the download is blocked server-side; the FE must never render
 *  a link for it. */
export type AttachmentVerdict = 'clean' | 'suspicious' | 'blocked';

/**
 * GET /api/resume/mailbox (§5) - the flat mailbox view. The POST controls
 * (provision / pause / rotate / forwarding) return the same shape so the FE can
 * reflect a new address after rotate. Before provisioning, `provisioned` is
 * false and address/mode/forward_to may be null.
 */
export interface Mailbox {
  provisioned: boolean;
  address: string | null;
  mode: MailboxMode | null;
  paused: boolean;
  forwarding_enabled: boolean;
  forward_to: string | null;
  forward_to_verified: boolean;
  unread_count: number;
}

/** mail_threads.status_suggestion (§2) - an LLM *proposal* only; code + evidence
 *  decide any real application transition. */
export interface StatusSuggestion {
  suggested: string;
  confidence: number;
  evidence_message_id: string;
}

/**
 * ThreadSummary (§5 `GET /api/resume/mailbox/threads`). Fields mirror the
 * `mail_threads` collection doc (§2) verbatim.
 *
 * `snippet` and `has_attachments` are OPTIONAL summary conveniences: §5 names
 * ThreadSummary but does not enumerate its fields, so the list degrades
 * gracefully when the backend omits them (it renders sender/subject/time from
 * the enumerated fields). Confirm these two names with backend-engineer.
 */
export interface ThreadSummary {
  thread_id: string;
  alias_id: string;
  application_id?: string | null;
  subject: string;
  participants: string[];
  message_count: number;
  unread_count: number;
  last_message_at: string;
  trust: MailTrust;
  status_suggestion?: StatusSuggestion | null;
  created_at?: string;
  updated_at?: string;
  /** OPTIONAL - not enumerated in §5; render only when present. */
  snippet?: string;
  /** OPTIONAL - not enumerated in §5; render the paperclip only when present. */
  has_attachments?: boolean;
}

/** MessageView.attachments item (§5: `attachments:[{id,filename,size,verdict}]`). */
export interface Attachment {
  id: string;
  filename: string;
  size: number;
  verdict: AttachmentVerdict;
}

/**
 * MessageView (§5). "Returns the sanitized HTML/text (never raw), `from`,
 * `subject`, `received_at`, `spf/dkim/dmarc`, `attachments:[{id,filename,size,
 * verdict}]`, `trust`, `read`."
 *
 * The sanitized-body field name is not given verbatim in §5; `html`/`text` are
 * the assumed names, with `safe_html` tolerated as a fallback (the S3 key in §2
 * is `safe_html_s3_key`). `message_id` is the stable key (mail_messages, §2).
 */
export interface MessageView {
  message_id: string;
  from: string;
  subject: string;
  received_at: string;
  spf: MailAuthResult;
  dkim: MailAuthResult;
  dmarc: MailAuthResult;
  /** Server-sanitized HTML (remote images already stripped). */
  html?: string | null;
  /** Tolerated alias for the sanitized HTML field. */
  safe_html?: string | null;
  /** Extracted plain text (fallback when there is no HTML part). */
  text?: string | null;
  attachments: Attachment[];
  trust: MailTrust;
  read: boolean;
  direction?: 'inbound' | 'outbound';
}

/** GET /api/resume/mailbox/threads/<thread_id> (§5). */
export interface ThreadDetail {
  thread: ThreadSummary;
  messages: MessageView[];
}

/** Query params for `getMailboxThreads` (§5: `?trust=&application_id=&unread=`). */
export interface MailboxThreadQuery {
  trust?: MailTrust;
  application_id?: string;
  unread?: boolean;
}
