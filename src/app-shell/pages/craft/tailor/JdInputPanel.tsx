/**
 * JdInputPanel - the Job Description inspector tab body.
 *
 * Presentational: a shadcn Textarea (10k cap + char counter), Paste / Clear /
 * Retry-fetch / Open-posting affordances, the extracted-requirements chips
 * (when a result exists), and the primary "Tailor My Resume" CTA. All data +
 * handlers arrive via props; the only local behavior is clipboard read.
 */
import type React from 'react';
import { Clipboard, RotateCw, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { RequirementsChips } from './RequirementsChips';
import type { TailorPipelineResult } from './types';

export interface JdInputPanelProps {
  jdText: string;
  onJdTextChange: (v: string) => void;
  pendingJobUrl: string;
  retryingJdFetch: boolean;
  onRetryFetch: () => void;
  disabled: boolean;
  result: TailorPipelineResult | null;
  onSubmit: () => void;
  dailyRemaining: number | null;
  usageLoading: boolean;
  onQuotaBlocked: () => void;
  /** Format choices shown before tailoring (ResumeFormatControls). */
  formatControls?: React.ReactNode;
}

export function JdInputPanel({
  jdText,
  onJdTextChange,
  pendingJobUrl,
  retryingJdFetch,
  onRetryFetch,
  disabled,
  result,
  onSubmit,
  formatControls,
  dailyRemaining,
  usageLoading,
  onQuotaBlocked,
}: JdInputPanelProps) {
  const quotaBlocked = dailyRemaining === 0;

  const handlePaste = async () => {
    try {
      // Trim what a messy copy drags along (leading blank lines, trailing
      // whitespace) before it counts against the 10,000 character cap.
      const t = (await navigator.clipboard.readText()).trim();
      if (t) onJdTextChange(t.slice(0, 10000));
      else toast.info('Your clipboard is empty. Copy the job posting first.');
    } catch {
      // Access denied or unsupported: say so, or the button reads as broken.
      toast.error('Paste was blocked. Click in the box and press Ctrl+V instead.');
    }
  };

  const hostname = (() => {
    try {
      return new URL(pendingJobUrl).hostname;
    } catch {
      return pendingJobUrl;
    }
  })();

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-title-sm text-foreground">Job description</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste the complete job posting. We'll extract requirements automatically.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {pendingJobUrl && !jdText && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryFetch}
              disabled={disabled || retryingJdFetch}
              className="hit-target h-auto gap-1 px-2.5 py-1.5 text-caption-sm text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 hover:text-primary"
              title={`Re-attempt auto-fetch from ${hostname}`}
            >
              {retryingJdFetch ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {retryingJdFetch ? 'Fetching...' : 'Retry JD fetch'}
            </Button>
          )}
          {pendingJobUrl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hit-target h-auto gap-1 px-2.5 py-1.5 text-caption-sm text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <a
                href={pendingJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the original posting in a new tab"
              >
                Open posting
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            disabled={disabled}
            className="hit-target h-auto gap-1 px-2.5 py-1.5 text-caption-sm text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Clipboard className="w-3.5 h-3.5" aria-hidden="true" />
            Paste
          </Button>
          {jdText && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onJdTextChange('')}
              disabled={disabled}
              className="hit-target h-auto px-2 py-1.5 text-caption-sm text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Textarea
          placeholder="Paste the job description here. We'll extract key requirements and tailor your resume automatically..."
          value={jdText}
          onChange={(e) => onJdTextChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds a line in a long paste; Ctrl/Cmd+Enter submits,
            // the convention for multi-line inputs.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && jdText.trim() && !disabled) {
              e.preventDefault();
              if (quotaBlocked) onQuotaBlocked();
              else onSubmit();
            }
          }}
          aria-label="Job description"
          aria-describedby="jd-char-count"
          rows={10}
          maxLength={10000}
          disabled={disabled}
          className="min-h-[280px] rounded-container leading-relaxed resize-none focus-visible:ring-primary"
        />
        <span id="jd-char-count" className="absolute bottom-3 right-3 text-caption-sm text-muted-foreground tabular-nums pointer-events-none">
          {jdText.length.toLocaleString()} / 10,000
        </span>
      </div>

      {/* Extracted requirements preview - chips color-coded matched/missing. */}
      {result?.jd_analysis && (
        <RequirementsChips
          jdAnalysis={result.jd_analysis}
          tailoredResume={result.tailored_resume}
        />
      )}

      {formatControls && !result && (
        <div className="rounded-container border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Resume format</p>
          {formatControls}
        </div>
      )}

      {/* Quota-exhausted banner - shown above the CTA so the reason is clear. */}
      {quotaBlocked && (
        <div className="mb-3 rounded-container border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-warning text-xs font-bold">
              !
            </span>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-warning">Daily limit reached</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Tailoring is capped per UTC day so the AI stays free for everyone. The
                counter resets at midnight UTC.
              </p>
              <button
                type="button"
                onClick={onQuotaBlocked}
                className="hit-target mt-2 rounded text-xs font-semibold text-warning underline underline-offset-2"
              >
                See options
              </button>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => {
          if (quotaBlocked) {
            onQuotaBlocked();
            return;
          }
          onSubmit();
        }}
        disabled={!jdText.trim() || disabled}
        className={cn(
          'w-full h-auto min-h-12 py-3.5 rounded-container text-sm font-semibold shadow-soft transition-colors duration-200',
        )}
      >
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Tailoring...
          </>
        ) : quotaBlocked ? (
          <>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Daily limit reached. See options
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {result ? 'Re-tailor with new JD' : 'Tailor my resume'}
          </>
        )}
      </Button>

      {!usageLoading && dailyRemaining !== null && dailyRemaining > 0 && (
        <p className="text-center text-caption-sm text-muted-foreground tabular-nums">
          {dailyRemaining} tailor{dailyRemaining === 1 ? '' : 's'} left today
        </p>
      )}
    </div>
  );
}
