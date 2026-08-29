/**
 * What needs you, and nothing else.
 *
 * This is the tracker's landing view. The pipeline is still a click away, but
 * opening the page on four hundred rows you have no decision to make about is
 * how a tracker turns into a database browser. Every section here is a reason
 * something is asking for your attention, and a record appears under the first
 * reason that fits it.
 */
import { CheckCircle2 } from 'lucide-react';

import type { TailoringRecord } from '@/types/resume';
import GmailSuggestions, { type GmailSuggestion } from '@/components/resume/GmailSuggestions';
import { Button } from '@/components/ui/button';

import ApplicationRow from './ApplicationRow';
import TrackerSection from './TrackerSection';
import { buildFocusSections } from './trackerScopes';
import { byUrgencyThenRecency } from './trackerGrouping';
import type { ApplicationPatch } from './useTrackerData';

interface FocusViewProps {
  records: TailoringRecord[];
  suggestions: GmailSuggestion[];
  suggestionBusyId: string | null;
  onApplySuggestion: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
  selectedId: string | null;
  savingId: string | null;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
  onShowActive: () => void;
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
  onShowActive,
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
        <p className="mx-auto mt-1 max-w-sm text-label text-muted-foreground">
          No unanswered prompts, no actions due, nothing gone quiet. Your pipeline is still there
          when you want to look at it.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onShowActive}>
          See the pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {/* Inbox-derived stage changes are decisions too, and they were only ever
          reachable through the Insights sheet, which is not where anyone looks
          first. */}
      {suggestions.length > 0 && (
        <TrackerSection
          label="From your inbox"
          count={suggestions.length}
          dot="bg-info"
          meta="detected in Gmail"
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
        >
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
        </TrackerSection>
      ))}
    </div>
  );
}
