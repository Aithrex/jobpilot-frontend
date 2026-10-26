/**
 * The Gmail action queue: status changes detected in your inbox, each one a
 * single Apply or Dismiss.
 *
 * Split out of GmailIntegration so the tracker can surface just the decisions
 * without dragging the connect / sync / disconnect chrome onto the page with
 * them. GmailIntegration still composes this, so Settings is unchanged.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { appliedDayOf, formatCivilDay } from '@/lib/applicationDates';
import type { GmailOutcome, GmailSuggestion } from '@/types/gmail';
export type { GmailSuggestion } from '@/types/gmail';

const STATUS_TONE: Record<string, string> = {
  draft: 'text-muted-foreground',
  saved: 'text-info',
  applied: 'text-primary',
  interviewing: 'text-[hsl(var(--brand-to))]',
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
    const resp = await apiService.listGmailSuggestions(false);
    if (resp.data) setSuggestions(resp.data.suggestions || []);
    else setLoadError(resp.error || 'Could not load the complete Gmail review queue.');
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
        toast.error(resp.error);
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
      toast.error(resp.error);
      return;
    }
    setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== id));
  }, []);

  return { suggestions, busyId, apply, dismiss, reload, setSuggestions, loadError };
}

export function GmailReviewLoadError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-label text-destructive">
      {error}{' '}
      <button type="button" className="font-medium underline" onClick={onRetry}>Retry email reviews</button>
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
        const confidence = Math.round((s.confidence || 0) * 100);
        const selectedRecord = selectedRecords[s.suggestion_id];
        const selectedStatus = selectedStatuses[s.suggestion_id];
        const needsStatus = Boolean(s.requires_status_selection || !s.suggested_status);
        const needsChoice = Boolean(s.requires_record_selection || needsStatus);
        const received = s.email_received_at ? new Date(s.email_received_at) : null;
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
          const date = applied ? ` - Applied ${applied}` : added ? ` - Added ${added}` : '';
          return {
            recordId: candidate.record_id,
            label: `${candidate.title || 'Untitled role'} - ${candidate.company || 'Unknown company'}${date}`,
          };
        });
        return (
          <li
            key={s.suggestion_id}
            className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5"
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
                  'Outcome needs review'
                ) : (
                  <>
                    {s.current_status && (
                      <>
                        <span className={STATUS_TONE[s.current_status] || STATUS_TONE.draft}>
                          {s.current_status}
                        </span>
                        {' → '}
                      </>
                    )}
                    <span className={STATUS_TONE[s.suggested_status || ''] || STATUS_TONE.draft}>
                      {s.suggested_status}
                    </span>
                    <span className="tabular-nums"> - {confidence}% status confidence</span>
                  </>
                )}
              </p>
              {s.subject && (
                <p className="mt-1 break-words text-label font-medium text-foreground">
                  {s.subject}
                </p>
              )}
              <div className="mt-1 space-y-1 text-label text-muted-foreground">
                {s.from_address && <p className="break-all">{s.from_address}</p>}
                {received && !Number.isNaN(received.getTime()) && (
                  <p>
                    Email received{' '}
                    <time dateTime={s.email_received_at}>{received.toLocaleString()}</time>
                  </p>
                )}
                {s.snippet && <p className="break-words">{s.snippet}</p>}
                {s.reason && <p>{s.reason}</p>}
                {s.match_reason && <p>{s.match_reason}</p>}
                {typeof s.match_confidence === 'number' && (
                  <p>{Math.round(s.match_confidence * 100)}% application match confidence</p>
                )}
              </div>
              {needsMatch && (
                <p className="mt-3 text-label text-muted-foreground">
                  No matching application is available in your tracker. This email is kept here for
                  review; no application status has been changed.
                </p>
              )}
              {needsChoice && !needsMatch && (
                <label className="mt-3 block text-label font-medium text-foreground">
                  Choose application
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
                    <option value="">Select the matching role...</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.recordId} value={candidate.recordId}>
                        {candidate.label}
                        {candidates.filter((other) => other.label === candidate.label).length > 1
                          ? ` - Application ${candidate.recordId.slice(-8)}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {needsStatus && !needsMatch && (
                <label className="mt-3 block text-label font-medium text-foreground">
                  Choose outcome
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
                    <option value="">Select the outcome confirmed by this email...</option>
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
                  className="rounded-md bg-primary px-2.5 py-1 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Update status
                </button>
              )}
              <button
                type="button"
                disabled={busyId === s.suggestion_id}
                onClick={() => onDismiss(s.suggestion_id)}
                className="rounded-md px-2 py-1 text-label text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
