/**
 * Tech-feed feedback: what the user tells us about a posting, and what that
 * does (and does not) hide.
 *
 * Server first. `POST /api/jobs/tech-feed/feedback` (204), `DELETE
 * /api/jobs/tech-feed/feedback/<job_id>` (204, idempotent - this is the undo)
 * and `GET /api/jobs/tech-feed/feedback` (the caller's suppression set) are the
 * source of truth, and suppression is already applied INSIDE search results.
 * localStorage is kept only as an offline / optimistic cache so a card
 * disappears on click instead of on the next round trip, and it reconciles
 * from the GET on mount - which is what makes a dismissal on a phone show up
 * on a laptop.
 *
 * The distinction this module exists to hold
 * ------------------------------------------
 * The six reasons are not six flavours of "hide it":
 *
 *  - PREFERENCE - `not_interested`, `irrelevant_role`, `duplicate`. These
 *    three, and only these three, suppress the posting for that user.
 *  - DATA QUALITY - `wrong_company`, `stale_job`, `incorrect_metadata`. The
 *    server records and counts these so ingestion can be fixed, and hides
 *    nothing. A user saying "this is not really Google" is telling us our
 *    employer resolution is wrong; they are not asking us to stop showing
 *    them the job.
 *
 * So the UI must not promise a card will disappear when it will not. That is
 * what `SUPPRESSING_REASONS` and the two menu groups below encode.
 */
import { apiService } from '@/lib/api';
import type {
  TechFeedFeedbackReason,
  TechFeedFeedbackRecord,
  TechFeedFeedbackRequest,
} from '@/types/techFeed';

export const NOT_INTERESTED_KEY = 'aspirely.techFeed.notInterested';

/** The only reasons that hide a posting. Mirrors the server's own set. */
export const SUPPRESSING_REASONS: ReadonlySet<TechFeedFeedbackReason> = new Set<TechFeedFeedbackReason>([
  'not_interested',
  'irrelevant_role',
  'duplicate',
]);

/** Does this reason hide the card? `null` = suppressed by the server, reason unknown here. */
export function reasonHidesJob(reason: TechFeedFeedbackReason | null): boolean {
  return reason === null || SUPPRESSING_REASONS.has(reason);
}

export interface FeedbackReasonOption {
  value: TechFeedFeedbackReason;
  label: string;
}

export interface FeedbackReasonGroup {
  heading: string;
  /** True when every reason in the group suppresses the posting. */
  hides: boolean;
  /** One line under the heading, so the menu states the consequence up front. */
  hint: string;
  reasons: FeedbackReasonOption[];
}

/**
 * The menu, grouped by CONSEQUENCE rather than by topic. A flat list of six
 * would read as six ways to hide a job, and three of them are not.
 */
export const FEEDBACK_REASON_GROUPS: FeedbackReasonGroup[] = [
  {
    heading: 'Not for me',
    hides: true,
    hint: 'Hides this job from your feed.',
    reasons: [
      { value: 'not_interested', label: 'Not interested' },
      { value: 'irrelevant_role', label: 'Not the kind of role I want' },
      { value: 'duplicate', label: 'I have already seen this posting' },
    ],
  },
  {
    heading: "Something's wrong with this listing",
    hides: false,
    hint: 'We re-check the listing. It stays in your feed.',
    reasons: [
      { value: 'wrong_company', label: 'Wrong company' },
      { value: 'stale_job', label: 'Looks closed or expired' },
      { value: 'incorrect_metadata', label: 'Pay, location or date look wrong' },
    ],
  },
];

/** Flat list, kept for callers that just need every reason. */
export const FEEDBACK_REASONS: FeedbackReasonOption[] = FEEDBACK_REASON_GROUPS.flatMap(
  (group) => group.reasons,
);

// ── The local cache ──────────────────────────────────────────────

const KNOWN_REASONS: ReadonlySet<string> = new Set<TechFeedFeedbackReason>(
  FEEDBACK_REASON_GROUPS.flatMap((group) => group.reasons.map((reason) => reason.value)),
);

/**
 * A cached record is usable when its reason is `null` (server-suppressed, this
 * device never saw why) or one of the six the server accepts. Anything else is
 * dropped rather than re-interpreted: the previous LOCAL-ONLY vocabulary
 * ("wrong_role", "staffing_agency", ...) was never sent anywhere and has no
 * honest translation into a reason the user did not pick.
 */
function usable(entry: TechFeedFeedbackRecord): boolean {
  return entry.reason === null || KNOWN_REASONS.has(entry.reason);
}

function read(): TechFeedFeedbackRecord[] {
  try {
    const raw = window.localStorage.getItem(NOT_INTERESTED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is TechFeedFeedbackRecord =>
          !!entry && typeof (entry as TechFeedFeedbackRecord).job_id === 'string',
      )
      .filter(usable);
  } catch {
    return [];
  }
}

function write(records: TechFeedFeedbackRecord[]): void {
  try {
    window.localStorage.setItem(NOT_INTERESTED_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    /* private mode / quota - the cache just does not persist */
  }
}

export function loadNotInterested(): TechFeedFeedbackRecord[] {
  return read();
}

/**
 * Ids to hide right now, from the cache alone. Data-quality reports are NOT in
 * here: they were never a request to hide anything.
 */
export function loadNotInterestedIds(): Set<string> {
  return new Set(read().filter((r) => reasonHidesJob(r.reason)).map((r) => r.job_id));
}

// ── Server reconciliation ────────────────────────────────────────

/**
 * Pull the server's suppression set and reconcile the cache against it.
 *
 * Rules, in order of who wins:
 *  1. An id the server suppresses is suppressed here, even on a device that
 *    has never seen it (fresh localStorage). The reason is recorded as `null`
 *    rather than guessed - the GET returns ids, not reasons.
 *  2. A cached suppression the server does NOT list was undone elsewhere, so
 *    it is dropped - unless it has not been acknowledged yet (`synced: false`),
 *    which means it is our own in-flight or offline write.
 *  3. Data-quality records are kept untouched: they are not suppressions, so
 *    their absence from the server's list says nothing about them.
 *
 * A failed GET leaves the cache exactly as it is - going offline must not
 * silently un-hide everything the user already dismissed.
 */
export async function reconcileNotInterested(): Promise<Set<string>> {
  const resp = await apiService.getTechFeedFeedback();
  if (resp.error || !resp.data) return loadNotInterestedIds();

  const serverIds = new Set(resp.data.job_ids ?? []);
  const cached = read();

  const kept = cached.filter((record) => {
    if (!reasonHidesJob(record.reason)) return true; // data-quality report
    if (serverIds.has(record.job_id)) return true;
    return record.synced === false; // our own write, not yet acknowledged
  });

  const known = new Set(kept.map((record) => record.job_id));
  for (const jobId of serverIds) {
    if (known.has(jobId)) continue;
    kept.push({
      job_id: jobId,
      reason: null,
      at: resp.data.updated_at ?? new Date().toISOString(),
      synced: true,
    });
  }

  write(kept);
  return new Set(kept.filter((r) => reasonHidesJob(r.reason)).map((r) => r.job_id));
}

// ── Writes ───────────────────────────────────────────────────────

export interface FeedbackContext {
  employerName?: string;
  dedupeGroupId?: string;
  employerId?: string;
  searchId?: string | null;
  note?: string;
}

export interface FeedbackOutcome {
  ok: boolean;
  /** True only when this reason actually removes the posting from the feed. */
  hidden: boolean;
  error?: string;
}

function upsert(record: TechFeedFeedbackRecord): void {
  write([record, ...read().filter((entry) => entry.job_id !== record.job_id)]);
}

function drop(jobId: string): TechFeedFeedbackRecord[] {
  const remaining = read().filter((entry) => entry.job_id !== jobId);
  write(remaining);
  return remaining;
}

/**
 * Send one piece of feedback, cached optimistically first.
 *
 * If the POST fails the optimistic record is rolled back, so a rate-limited or
 * rejected write never leaves a card hidden on the strength of a request the
 * server refused. `hidden` tells the caller whether to remove the card at all.
 */
export async function recordNotInterested(
  jobId: string,
  reason: TechFeedFeedbackReason,
  context: FeedbackContext = {},
): Promise<FeedbackOutcome> {
  const hidden = SUPPRESSING_REASONS.has(reason);

  upsert({
    job_id: jobId,
    reason,
    employer_name: context.employerName,
    at: new Date().toISOString(),
    synced: false,
  });

  const body: TechFeedFeedbackRequest = { job_id: jobId, reason };
  if (context.dedupeGroupId) body.dedupe_group_id = context.dedupeGroupId;
  if (context.employerId) body.employer_id = context.employerId;
  if (context.searchId) body.search_id = context.searchId;
  if (context.note) body.note = context.note;

  const resp = await apiService.recordTechFeedFeedback(body);
  if (resp.error) {
    drop(jobId);
    return { ok: false, hidden: false, error: resp.error };
  }

  upsert({
    job_id: jobId,
    reason,
    employer_name: context.employerName,
    at: new Date().toISOString(),
    synced: true,
  });
  return { ok: true, hidden };
}

/**
 * Undo. The DELETE is idempotent, so a double-tap and a retry behave the same.
 * A failed DELETE restores the local record rather than pretending the posting
 * came back everywhere.
 */
export async function undoNotInterested(jobId: string): Promise<FeedbackOutcome> {
  const previous = read().find((entry) => entry.job_id === jobId);
  drop(jobId);

  const resp = await apiService.undoTechFeedFeedback(jobId);
  if (resp.error) {
    if (previous) upsert(previous);
    return { ok: false, hidden: !!previous && reasonHidesJob(previous.reason), error: resp.error };
  }
  return { ok: true, hidden: false };
}
