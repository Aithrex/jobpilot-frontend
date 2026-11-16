/**
 * What needs you, and nothing else.
 *
 * This is the tracker's landing view. Every application is still one tab away,
 * but opening the page on four hundred rows you have no decision to make about
 * is how a tracker turns into a database browser. Every section here is a
 * reason something is asking for your attention, and a record appears under
 * the first reason that fits it.
 */
import { CheckCircle2 } from 'lucide-react';

import type { TailoringRecord } from '@/types/resume';
import type { GmailOutcome } from '@/types/gmail';
import GmailSuggestions, { type GmailSuggestion } from '@/components/resume/GmailSuggestions';
import { Button } from '@/components/ui/button';

import ApplicationRow from './ApplicationRow';
import FollowUps from './FollowUps';
import TrackerSection from './TrackerSection';
import { buildFocusSections } from './trackerScopes';
import { byUrgencyThenRecency } from './trackerGrouping';
import type { ApplicationPatch } from './useTrackerData';

interface FocusViewProps {
  records: TailoringRecord[];
  suggestions: GmailSuggestion[];
  suggestionBusyId: string | null;
  onApplySuggestion: (id: string, recordId?: string, status?: GmailOutcome) => void;
  onDismissSuggestion: (id: string) => void;
  selectedId: string | null;
  savingId: string | null;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
  onNoResponse: (id: string) => void;
  onDismissFollowUp: (id: string) => void;
  onCloseStale: () => void;
  closing: boolean;
  onShowAll: () => void;
}

export default function FocusView({
  records,
  suggestions,
  suggestionBusyId,
  onApplySuggestion,
  onDismissSuggestion,
  selectedId,
  savingId,
  onSelect,
  onPatch,
  onNoResponse,
  onDismissFollowUp,
  onCloseStale,
  closing,
  onShowAll,
}: FocusViewProps) {
  const sections = buildFocusSections(records);
  const empty = sections.length === 0 && suggestions.length === 0;

  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-success" aria-hidden />
        <p className="font-display text-body font-semibold text-foreground">
          Nothing needs you right now
        </p>
        <p className="mx-auto mt-1 max-w-sm text-body-sm text-muted-foreground">
          No email updates to confirm, no unanswered questions, nothing due and nobody to chase.
          Your applications are still there when you want to look at them.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onShowAll}>
          See all applications
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {/* An email that changes a stage is a decision too, and the quickest one
          on the page, so it comes first. */}
      {suggestions.length > 0 && (
        <TrackerSection
          label="From Gmail"
          count={suggestions.length}
          dot="bg-info"
          meta="review before updating"
        >
          <GmailSuggestions
            suggestions={suggestions}
            busyId={suggestionBusyId}
            onApply={onApplySuggestion}
            onDismiss={onDismissSuggestion}
            className="border-t border-border/60"
          />
        </TrackerSection>
      )}

      {sections.map(({ section, records: sectionRecords }) => (
        <TrackerSection
          key={section.id}
          label={section.label}
          count={sectionRecords.length}
          dot={section.id === 'overdue' ? 'bg-destructive' : null}
          meta={section.id === 'quiet' ? 'a week or more without a reply' : undefined}
        >
          {section.id === 'quiet' ? (
            <FollowUps
              records={sectionRecords}
              savingId={savingId}
              onSelect={onSelect}
              onNoResponse={onNoResponse}
              onDismiss={onDismissFollowUp}
              onCloseStale={onCloseStale}
              closing={closing}
            />
          ) : (
            <ul>
              {[...sectionRecords].sort(byUrgencyThenRecency).map((record) => (
                <ApplicationRow
                  key={record.record_id}
                  record={record}
                  selected={selectedId === record.record_id}
                  saving={savingId === record.record_id}
                  showStatusLabel
                  draggable={false}
                  onSelect={() => onSelect(record.record_id)}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  onPatch={(patch, opts) => onPatch(record.record_id, patch, opts)}
                />
              ))}
            </ul>
          )}
        </TrackerSection>
      ))}
    </div>
  );
}
