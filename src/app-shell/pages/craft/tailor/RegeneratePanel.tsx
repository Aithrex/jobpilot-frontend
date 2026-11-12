/**
 * Regenerate inspector panel (Tailor right column).
 *
 * Presentational only - typed props in, render out. Ported from the classic
 * "Regenerate" tab in ResumeParser, rebuilt on semantic tokens + shadcn/ui.
 * Owns no data: feedback text + submit are lifted to the orchestrator.
 */
import { RotateCw, Zap, Check, Plus, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Tier = 'high' | 'style' | 'extra';

const SUGGESTIONS: { tier: Tier; label: string }[] = [
  { tier: 'high', label: 'Lead with the most relevant accomplishments' },
  { tier: 'high', label: 'Make my contribution clearer' },
  { tier: 'high', label: 'Surface transferable experience' },
  { tier: 'style', label: 'Make the summary more concise' },
  { tier: 'style', label: 'Use simpler, more natural wording' },
  { tier: 'style', label: 'Remove repeated claims' },
  { tier: 'extra', label: 'Clarify outcomes already in my resume' },
  { tier: 'extra', label: 'Reduce unnecessary jargon' },
];

/** Detect whether a suggestion is already reflected in the feedback text. */
const isSelected = (feedback: string, label: string) =>
  feedback.toLowerCase().includes(label.toLowerCase().slice(0, 20));

interface RegeneratePanelProps {
  feedback: string;
  onFeedbackChange: (v: string) => void;
  regenerating: boolean;
  error: string;
  onSubmit: () => void;
}

export function RegeneratePanel({
  feedback,
  onFeedbackChange,
  regenerating,
  error,
  onSubmit,
}: RegeneratePanelProps) {
  const selected = SUGGESTIONS.filter((s) => isSelected(feedback, s.label));

  const chipCls = (tier: Tier, already: boolean) => {
    if (already)
      return 'cursor-default border-success/30 bg-success/10 text-success ring-1 ring-success/20';
    if (tier === 'high')
      return 'border-primary/30 bg-primary/15 font-semibold text-primary hover:border-primary/50 hover:bg-primary/20';
    if (tier === 'style')
      return 'border-border bg-muted text-foreground hover:border-primary/40 hover:text-primary';
    return 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground';
  };

  const Chip = ({ hint }: { hint: { tier: Tier; label: string } }) => {
    const already = isSelected(feedback, hint.label);
    return (
      <button
        type="button"
        disabled={already || regenerating}
        onClick={() => {
          const f = feedback;
          if (!f.trim()) {
            onFeedbackChange(hint.label + '.');
            return;
          }
          if (isSelected(f, hint.label)) return;
          onFeedbackChange(f.trim().replace(/\.?$/, '.') + ' ' + hint.label + '.');
        }}
        className={cn(
          'hit-target inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption-sm transition-colors disabled:cursor-default',
          chipCls(hint.tier, already),
        )}
      >
        {already ? (
          <Check className="h-3 w-3" />
        ) : hint.tier === 'high' ? (
          <Zap className="h-3 w-3" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
        {hint.label}
      </button>
    );
  };

  return (
    <div className="space-y-5 p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary" aria-hidden="true">
          <RotateCw className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-title-sm text-foreground">
            Regenerate resume
          </h2>
          <p className="text-xs text-muted-foreground">
            Refine with feedback. Your current version is kept for comparison.
          </p>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="overline">Quick suggestions</p>
          {selected.length > 0 && (
            <span className="inline-flex items-center gap-1 text-caption-sm font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {selected.length} selected
            </span>
          )}
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1 text-caption-sm font-semibold uppercase tracking-wide text-ink-muted">
            <Zap className="h-3 w-3" aria-hidden="true" />
            High impact
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => s.tier === 'high').map((s) => (
              <Chip key={s.label} hint={s} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-caption-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Style
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => s.tier === 'style').map((s) => (
              <Chip key={s.label} hint={s} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-caption-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Extras
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => s.tier === 'extra').map((s) => (
              <Chip key={s.label} hint={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Custom instructions */}
      <div>
        <label htmlFor="regen-feedback" className="overline mb-2 block">Custom instructions</label>
        <Textarea
          id="regen-feedback"
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter submits; plain Enter stays a new line.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && feedback.trim() && !regenerating) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Or write your own, e.g., 'Remove the summary and add a highlights section with top 3 achievements'"
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={5}
          maxLength={2000}
          disabled={regenerating}
          className="resize-none rounded-control leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-caption-sm tabular-nums text-muted-foreground">
            {feedback.length} / 2,000
          </span>
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={onSubmit}
        disabled={!feedback.trim() || regenerating}
        aria-busy={regenerating}
        className="w-full rounded-control"
        size="lg"
      >
        {regenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Regenerating...
          </>
        ) : (
          <>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Regenerate resume
          </>
        )}
      </Button>
    </div>
  );
}
