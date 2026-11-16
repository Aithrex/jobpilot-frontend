/**
 * One voice for every error the app shows.
 *
 * The backend answers a failure with whatever was nearest to hand: a sentence
 * written for people ("That email is already registered"), a machine code
 * ("resume_not_parsed"), an HTTP reason ("Bad Gateway"), or nothing, in which
 * case the client used to print "HTTP 502". All of those reached toasts and
 * banners unchanged. `userFacingError` is the single place that turns the
 * last three into a sentence, and leaves the first exactly as sent.
 *
 * The standard every message follows:
 *   - say what happened in plain words, then what to do next;
 *   - no codes, no status numbers, no stack traces, no blame;
 *   - sentence case, full stop, no exclamation marks.
 *
 * Callers that branch on WHY a call failed read `status` and
 * `errorPayload.error` (the untouched code), never this text.
 */

/** Sentences for the machine codes the backend is known to answer with. */
const CODE_COPY: Record<string, string> = {
  upgrade_required: 'This is part of a paid plan. Upgrade to use it.',
  daily_quota_exceeded: "You have reached today's limit. It resets tomorrow.",
  quota_exceeded: 'You have reached the limit for this feature on your plan.',
  resume_not_parsed: 'We are still reading this resume. Please try again in a moment.',
  no_resume: 'Upload a resume first, then try again.',
  storage_unavailable: 'File storage is temporarily unavailable. Please try again in a few minutes.',
  file_too_large: 'That file is too large. Please choose a smaller one.',
  unsupported_file: 'That file type is not supported. Please use a PDF or a Word document.',
  version_limit_reached: 'This resume has reached its version limit. Start a new tailoring to continue.',
  deletion_pending: 'Some files could not be removed yet. They are queued and will be deleted automatically.',
  cursor_expired: 'This list changed while you were reading it. Please refresh.',
  challenge_required: 'Please complete the quick check to continue.',
  capacity: 'We are at capacity right now. Please try again in a few minutes.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  too_many_requests: 'Too many requests. Please wait a moment and try again.',
  not_found: 'We could not find that. It may have been moved or deleted.',
  forbidden: 'You do not have permission to do that.',
  unauthorized: 'Please sign in to continue.',
  invalid_request: 'Some of the details were not valid. Please check them and try again.',
  validation_error: 'Some of the details were not valid. Please check them and try again.',
  timeout: 'That took too long. Please try again.',
  internal_error: 'Something went wrong on our side. Please try again in a moment.',
  server_error: 'Something went wrong on our side. Please try again in a moment.',
};

const GENERIC = 'Something went wrong. Please try again.';

/** A sentence for a bare HTTP status, when the server said nothing usable. */
function statusCopy(status?: number): string {
  if (!status) return GENERIC;
  if (status === 400) return 'We could not process that. Please check the details and try again.';
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'We could not find that. It may have been moved or deleted.';
  if (status === 408 || status === 504) return 'That took too long. Please try again.';
  if (status === 409) return 'That conflicts with a more recent change. Please refresh and try again.';
  if (status === 413) return 'That file is too large. Please choose a smaller one.';
  if (status === 422) return 'Some of the details were not valid. Please check them and try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return GENERIC;
}

/** HTTP reason phrases a proxy or framework sends when the app sent nothing. */
const REASON_PHRASE =
  /^(bad request|unauthorized|forbidden|not found|method not allowed|request timeout|conflict|payload too large|unprocessable entity|too many requests|internal server error|bad gateway|service unavailable|gateway time-?out)\.?$/i;

/** Text that was produced by a program for a program, not written for a person. */
function isMachineText(text: string): boolean {
  if (/^HTTP \d{3}\b/i.test(text)) return true;
  if (REASON_PHRASE.test(text)) return true;
  // One token with no spaces: a code such as "capacity" or "resume_not_parsed".
  if (!/\s/.test(text) && /^[a-z0-9]+([_.:-][a-z0-9]+)*$/i.test(text)) return true;
  // Exception names, stack traces, markup, serialized objects.
  if (/(Traceback|Exception\b|\b[A-Z][a-zA-Z]+Error:|errno|<!doctype|<html|^\s*[[{])/i.test(text)) return true;
  // The browser's own wording for a request that never left.
  if (/^(failed to fetch|load failed|networkerror)/i.test(text)) return true;
  return text.length > 400;
}

/**
 * The message to show a person for a failed request.
 *
 * @param raw     whatever the server (or the catch block) produced
 * @param status  the HTTP status, when there was a response
 */
export function userFacingError(raw: unknown, status?: number): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return statusCopy(status);
  const known = CODE_COPY[text.toLowerCase()];
  if (known) return known;
  // A sentence written for people is shown exactly as sent.
  if (!isMachineText(text)) return text;
  return statusCopy(status);
}
