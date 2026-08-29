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

export type GmailSuggestion = {
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
};

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

/**
 * Owns the suggestion list so both the tracker and the Settings panel get the
 * same fetch, optimistic removal and error handling.
 */
export function useGmailSuggestions(enabled: boolean, onChanged?: () => void) {
  const [suggestions, setSuggestions] = useState<GmailSuggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const resp = await apiService.listGmailSuggestions(false);
    if (resp.data) setSuggestions(resp.data.suggestions || []);
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const apply = useCallback(
    async (id: string) => {
      setBusyId(id);
      const resp = await apiService.applyGmailSuggestion(id);
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

  return { suggestions, busyId, apply, dismiss, reload, setSuggestions };
}

interface GmailSuggestionsProps {
  suggestions: GmailSuggestion[];
  busyId: string | null;
  onApply: (id: string) => void;
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
  if (suggestions.length === 0) return null;

  return (
    <ul className={cn('divide-y divide-border/60', className)}>
      {suggestions.map((s) => {
        const confidence = Math.round((s.confidence || 0) * 100);
        return (
          <li
            key={s.suggestion_id}
            className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-foreground">
                {s.title || 'Untitled role'}
                {s.company && (
                  <span className="font-normal text-muted-foreground"> · {s.company}</span>
                )}
              </p>
              <p className="text-label text-muted-foreground">
                <span className={STATUS_TONE[s.current_status] || STATUS_TONE.draft}>
                  {s.current_status}
                </span>
                {' → '}
                <span className={STATUS_TONE[s.suggested_status] || STATUS_TONE.draft}>
                  {s.suggested_status}
                </span>
                <span className="tabular-nums"> · {confidence}% confident</span>
              </p>
              {s.subject && (
                <p className="truncate text-label text-muted-foreground">{s.subject}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={busyId === s.suggestion_id}
                onClick={() => onApply(s.suggestion_id)}
                className="rounded-md bg-primary px-2.5 py-1 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Apply
              </button>
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
