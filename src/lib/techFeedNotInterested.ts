/**
 * "Not interested" feedback for the tech feed.
 *
 * LOCAL ONLY, on purpose. `apiService` has exactly one feedback surface today -
 * `submitFeedback()` -> POST /api/resume/feedback/submit - and that is
 * free-text PRODUCT feedback (message + type) routed to the admin console. It
 * carries no job id, no relevance reason and no per-user suppression, so
 * posting job dismissals into it would pollute the support queue and still not
 * change anyone's ranking.
 *
 * TODO(backend): there is no job-level relevance endpoint. The one that should
 * exist is `POST /api/jobs/tech-feed/feedback` with
 * `{job_id, dedupe_group_id, employer_id, reason, search_id}` returning 204,
 * so dismissals suppress the posting server-side and feed the fit model.
 * Until that ships (define the contract in the backend repo first), dismissals
 * live in this browser only and are applied as a client-side filter.
 */
import type { NotInterestedReason, NotInterestedRecord } from '@/types/techFeed';

export const NOT_INTERESTED_KEY = 'aspirely.techFeed.notInterested';

/** Ordered for the menu: most common reason first. */
export const NOT_INTERESTED_REASONS: Array<{ value: NotInterestedReason; label: string }> = [
  { value: 'wrong_role', label: 'Wrong role' },
  { value: 'wrong_level', label: 'Wrong level' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'wrong_technology', label: 'Wrong technology' },
  { value: 'staffing_agency', label: 'Staffing agency' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'not_eligible', label: 'Not eligible' },
];

function read(): NotInterestedRecord[] {
  try {
    const raw = window.localStorage.getItem(NOT_INTERESTED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is NotInterestedRecord =>
        !!entry && typeof (entry as NotInterestedRecord).job_id === 'string',
    );
  } catch {
    return [];
  }
}

function write(records: NotInterestedRecord[]): void {
  try {
    window.localStorage.setItem(NOT_INTERESTED_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    /* private mode / quota - dismissals just do not persist */
  }
}

export function loadNotInterested(): NotInterestedRecord[] {
  return read();
}

export function loadNotInterestedIds(): Set<string> {
  return new Set(read().map((record) => record.job_id));
}

export function recordNotInterested(
  jobId: string,
  reason: NotInterestedReason,
  employerName?: string,
): NotInterestedRecord[] {
  const existing = read().filter((record) => record.job_id !== jobId);
  const next: NotInterestedRecord[] = [
    { job_id: jobId, reason, employer_name: employerName, at: new Date().toISOString() },
    ...existing,
  ];
  write(next);
  return next;
}

export function undoNotInterested(jobId: string): NotInterestedRecord[] {
  const next = read().filter((record) => record.job_id !== jobId);
  write(next);
  return next;
}
