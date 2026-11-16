/**
 * The Gmail action queue: status changes detected in your inbox, each one a
 * single Apply or Dismiss.
 *
 * Split out of GmailIntegration so the tracker can surface just the decisions
 * without dragging the connect / sync / disconnect chrome onto the page with
 * them. GmailIntegration still composes this, so Settings is unchanged.
 */
import { notifyError } from '@/lib/notify';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { appliedDayOf, formatCivilDay } from '@/lib/applicationDates';
import type { GmailOutcome, GmailSuggestion } from '@/types/gmail';
import { statusMeta } from '@/components/tracker/trackerConfig';
export type { GmailSuggestion } from '@/types/gmail';

const STATUS_TONE: Record<string, string> = {
  draft: 'text-muted-foreground',
  saved: 'text-info',
  applied: 'text-primary',
  interviewing: 'text-info',
  offer: 'text-success',
  rejected: 'text-destructive',
  ghosted: 'text-warning',
  withdrawn: 'text-muted-foreground',
};

const OUTCOMES: { value: GmailOutcome; label: string }[] = [
  { value: 'applied', label: 'Application received' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'ghosted', label: 'No response' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

/**
 * The scan's note on why it reads an email the way it does, as a sentence for
 * the person looking at that email. The stored notes are written for a log
 * ("Decline phrase: ...", "Email requisition is not uniquely confirmed in this
 * application"). A note this build does not know is shown as it came.
 */
export function explainReason(reason?: string | null): string | null {
  if (!reason) return null;
  const older = 'Email predates your latest status change. ';
  if (reason.startsWith(older)) {
    const rest = explainReason(reason.slice(older.length));
    return `This email is older than the last change you made.${rest ? ` ${rest}` : ''}`;
  }
  if (reason.startsWith('Outcome is unclear')) return null;
  const quoted = reason.match(/^([^"]+?):? "(.*)"$/);
  if (!quoted) return reason;
  const [, lead, words] = quoted;
  if (lead.startsWith('Possible decline')) return `This may be a no. The email says: "${words}"`;
  if (lead.startsWith('Interview wording inside an application receipt')) {
    return `This reads like a confirmation that also mentions next steps: "${words}"`;
  }
  if (lead.startsWith('Receipt only')) return `The email confirms they have your application: "${words}"`;
  if (lead.startsWith('Withdrawal confirmed')) return `The email confirms you withdrew: "${words}"`;
  if (lead.startsWith('Conflicting outcomes')) {
    return `Earlier and later emails disagree. The latest one says: "${words}"`;
  }
  if (/^(?:Decline phrase|Offer phrase|Interview signal)$/.test(lead)) return `The email says: "${words}"`;
  return reason;
}

const MATCH_NOTES: [RegExp, string | null][] = [
  [/requisition is not uniquely confirmed/i, 'The email gives a job number your tracker does not have, so check it is this application.'],
  [/Several applications match/i, 'More than one of your applications fits this email.'],
  [/Role title not confirmed/i, 'The email does not name the role.'],
  [/Role evidence identifies a possible application/i, 'This looks like one of your applications. Confirm which.'],
  // Said elsewhere on the card, or only of interest to a log.
  [/does not match a tracked application|No tracked application matches/i, null],
  [/^(?:Company identified in application content|Exact role title in email|Company name matches sender domain label|Saved recruiter email matches sender|Sent in the company's name|Application requisition matches email)$/i, null],
];

/** What the person should know about which application an email belongs to. */
export function explainMatch(matchReason?: string | null): string[] {
  const notes: string[] = [];
  for (const part of (matchReason || '').split(';').map((text) => text.trim()).filter(Boolean)) {
    const known = MATCH_NOTES.find(([pattern]) => pattern.test(part));
    const note = known ? known[1] : part;
    if (note && !notes.includes(note)) notes.push(note);
  }
  return notes;
}

/** How long to wait before the one automatic second try. */
export const gmailReviewRetry = { delayMs: 1200 };

/**
 * Owns the suggestion list so both the tracker and the Settings panel get the
 * same fetch, optimistic removal and error handling.
 */
export function useGmailSuggestions(enabled: boolean, onChanged?: () => void) {
  const [suggestions, setSuggestions] = useState<GmailSuggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoadError(null);
    let resp = await apiService.listGmailSuggestions(false);
    // One quiet second try. A slow first answer is common just after a deploy
    // or a long scan, and nobody should have to press a button for that.
    if (!resp.data && resp.status !== 401) {
      await new Promise((resolve) => setTimeout(resolve, gmailReviewRetry.delayMs));
      resp = await apiService.listGmailSuggestions(false);
    }
    if (resp.data) setSuggestions(resp.data.suggestions || []);
    else setLoadError(resp.error || 'The list did not load.');
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const apply = useCallback(
    async (id: string, recordId?: string, status?: GmailOutcome) => {
      setBusyId(id);
      const resp = status
        ? await apiService.applyGmailSuggestion(id, recordId, status)
        : recordId
          ? await apiService.applyGmailSuggestion(id, recordId)
          : await apiService.applyGmailSuggestion(id);
      setBusyId(null);
      if (resp.error) {
        notifyError("Couldn't apply that update", resp.error);
        return;
      }
      setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== id));
      onChanged?.();
    },
    [onChanged],
  );

  const dismiss = useCallback(async (id: string) => {
    setBusyId(id);
    const resp = await apiService.dismissGmailSuggestion(id);
    setBusyId(null);
    if (resp.error) {
      notifyError("Couldn't dismiss that suggestion", resp.error);
      return;
    }
    setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== id));
  }, []);

  return { suggestions, busyId, apply, dismiss, reload, setSuggestions, loadError };
}

export function GmailReviewLoadError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-body-sm text-foreground"
    >
      <span className="min-w-0 flex-1 basis-64">
        Email updates from Gmail did not load. Your applications below are not affected.
      </span>
      <button
        type="button"
        className="hit-target rounded-md border border-border px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onRetry}
      >
        Load email updates
      </button>
    </p>
  );
}

interface GmailSuggestionsProps {
  suggestions: GmailSuggestion[];
  busyId: string | null;
  onApply: (id: string, recordId?: string, status?: GmailOutcome) => void;
  onDismiss: (id: string) => void;
  className?: string;
}

export default function GmailSuggestions({
  suggestions,
  busyId,
  onApply,
  onDismiss,
  className,
}: GmailSuggestionsProps) {
  const [selectedRecords, setSelectedRecords] = useState<Record<string, string>>({});
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, GmailOutcome | ''>>({});
  if (suggestions.length === 0) return null;

  return (
    <ul className={cn('divide-y divide-border/60', className)}>
      {suggestions.map((s) => {
        const selectedRecord = selectedRecords[s.suggestion_id];
        const selectedStatus = selectedStatuses[s.suggestion_id];
        const needsStatus = Boolean(s.requires_status_selection || !s.suggested_status);
        const needsChoice = Boolean(s.requires_record_selection || needsStatus);
        const received = s.email_received_at ? new Date(s.email_received_at) : null;
        const notes = [explainReason(s.reason), ...explainMatch(s.match_reason)].filter(
          (note): note is string => Boolean(note),
        );
        const records: NonNullable<GmailSuggestion['candidate_records']> =
          s.candidate_records ??
          (s.record_id
            ? [
                {
                  record_id: s.record_id,
                  company: s.company || '',
                  title: s.title || '',
                },
              ]
            : []);
        const needsMatch = Boolean(
          s.requires_application_match || (needsChoice && records.length === 0),
        );
        const candidates = records.map((candidate) => {
          const dateFormat: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          };
          const applied = formatCivilDay(candidate.applied_date, dateFormat);
          const added = applied
            ? ''
            : formatCivilDay(appliedDayOf({ applied_at: candidate.created_at }), dateFormat);
          const date = applied ? ` · Applied ${applied}` : added ? ` · Added ${added}` : '';
          return {
            recordId: candidate.record_id,
            label: `${candidate.title || 'Untitled role'} · ${candidate.company || 'Unknown company'}${date}`,
          };
        });
        return (
          <li
            key={s.suggestion_id}
            className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3.5"
          >
            <div className="w-full min-w-0 flex-auto sm:w-auto sm:flex-1">
              <p className="truncate text-body font-medium text-foreground">
                {needsChoice && !needsMatch
                  ? 'Choose the application for this update'
                  : s.title || 'Untitled role'}
                {s.company && (
                  <span className="font-normal text-muted-foreground"> · {s.company}</span>
                )}
              </p>
              <p className="text-label text-muted-foreground">
                {needsStatus ? (
                  // Kept as one phrase: tests and screen readers find the card by it.
                  <span title="The email is about this application but does not say what happened">
                    Outcome needs review
                  </span>
                ) : (
                  <>
                    {s.current_status ? 'Move from ' : 'Mark as '}
                    {s.current_status && (
                      <>
                        <span className={STATUS_TONE[s.current_status] || STATUS_TONE.draft}>
                          {statusMeta(s.current_status).label}
                        </span>
                        {' to '}
                      </>
                    )}
                    <span className={STATUS_TONE[s.suggested_status || ''] || STATUS_TONE.draft}>
                      {statusMeta(s.suggested_status).label}
                    </span>

                  </>
                )}
              </p>
              {/* The email itself, set apart as a quote: subject, who and
                  when on one line, then what it said. */}
              {(s.subject || s.from_address || s.snippet) && (
                <div className="mt-2 max-w-3xl rounded-lg border-l-2 border-primary/40 bg-muted/50 px-3 py-2">
                  {s.subject && (
                    <p className="break-words text-label font-medium text-foreground">
                      {s.subject}
                    </p>
                  )}
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-caption-sm text-muted-foreground">
                    {s.from_address && <span className="break-all">{s.from_address}</span>}
                    {received && !Number.isNaN(received.getTime()) && (
                      <span>
                        Email received{' '}
                        <time dateTime={s.email_received_at}>
                          {received.toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      </span>
                    )}
                  </p>
                  {s.snippet && (
                    <p className="mt-1.5 break-words text-label font-normal text-ink-muted">{s.snippet}</p>
                  )}
                </div>
              )}
              {/* Why this is suggested, as one quiet line. */}
              {/* A second percentage ("97% application match confidence") sat
                  here beside "85% sure" and nobody could say which to trust. */}
              {notes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-label text-muted-foreground">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {needsMatch && (
                <p className="mt-2 text-caption-sm text-muted-foreground">
                  No matching application is available in your tracker. This email is kept here for
                  review; no application status has been changed.
                </p>
              )}
              {needsChoice && !needsMatch && (
                <label className="mt-3 block text-label font-medium text-foreground">
                  Which application is this about?
                  <select
                    aria-label="Choose application"
                    className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedRecord || ''}
                    disabled={busyId === s.suggestion_id}
                    onChange={(event) =>
                      setSelectedRecords((prev) => ({
                        ...prev,
                        [s.suggestion_id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pick the application</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.recordId} value={candidate.recordId}>
                        {candidate.label}
                        {candidates.filter((other) => other.label === candidate.label).length > 1
                          ? ` · Application ${candidate.recordId.slice(-8)}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {needsStatus && !needsMatch && (
                <label className="mt-3 block text-label font-medium text-foreground">
                  What does the email say happened?
                  <select
                    aria-label="Choose outcome"
                    className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedStatus || ''}
                    disabled={busyId === s.suggestion_id}
                    onChange={(event) =>
                      setSelectedStatuses((prev) => ({
                        ...prev,
                        [s.suggestion_id]:
                          OUTCOMES.find((outcome) => outcome.value === event.target.value)?.value ||
                          '',
                      }))
                    }
                  >
                    <option value="">Pick what happened</option>
                    {OUTCOMES.map((outcome) => (
                      <option key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {!needsMatch && (
                <button
                  type="button"
                  disabled={
                    busyId === s.suggestion_id ||
                    (needsChoice && !selectedRecord) ||
                    (needsStatus && !selectedStatus)
                  }
                  onClick={() =>
                    needsStatus && selectedStatus
                      ? onApply(s.suggestion_id, selectedRecord, selectedStatus)
                      : needsChoice
                        ? onApply(s.suggestion_id, selectedRecord)
                        : onApply(s.suggestion_id)
                  }
                  className="hit-target rounded-lg bg-primary px-3 py-1.5 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Update status
                </button>
              )}
              <button
                type="button"
                disabled={busyId === s.suggestion_id}
                onClick={() => onDismiss(s.suggestion_id)}
                title="Leave the application as it is and take this email off the list"
                className="rounded-md px-2 py-1 text-label text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Ignore this email
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
