/**
 * JdInputPanel - where a tailoring starts: paste the job posting, press one
 * button.
 *
 * Before a result it is the whole left column, so it is written as a short
 * form in reading order: the posting, the two quiet choices (which resume,
 * what format) folded into one line each, then the action. The format
 * controls used to sit open between the box and the button, which pushed
 * "Tailor my resume" below the fold on a laptop.
 *
 * After a result it is the "Job posting" tab: the same box, plus the
 * requirements we read from it.
 *
 * Presentational: all data + handlers arrive via props; the only local
 * behaviour is the clipboard read.
 */
import type React from 'react';
import { ChevronDown, Clipboard, ExternalLink, Loader2, RotateCw, ShieldCheck, Sparkles } from 'lucide-react';
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
  /** One line naming the current format ("1 page, compact"). */
  formatSummary?: string;
  /** Which uploaded resume to start from (BaseResumePicker). */
  resumePicker?: React.ReactNode;
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
  formatSummary,
  resumePicker,
  dailyRemaining,
  usageLoading,
  onQuotaBlocked,
}: JdInputPanelProps) {
  const quotaBlocked = dailyRemaining === 0;
  const starting = !result;

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
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={cn('text-foreground', starting ? 'font-display text-h2' : 'text-title-sm')}>
            {starting ? 'Paste the job posting' : 'Job posting'}
          </h2>
          <p className="mt-1 max-w-prose text-caption text-muted-foreground">
            {starting
              ? 'Copy the whole posting from the company site. We read what it asks for and rewrite your resume around it.'
              : 'The posting this resume was tailored for.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {pendingJobUrl && !jdText && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryFetch}
              disabled={disabled || retryingJdFetch}
              className="hit-target h-auto gap-1 border-primary/30 bg-primary/10 px-2.5 py-1.5 text-caption-sm text-primary hover:bg-primary/20 hover:text-primary"
              title={`Try reading the posting from ${hostname} again`}
            >
              {retryingJdFetch ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {retryingJdFetch ? 'Reading...' : 'Read the posting again'}
            </Button>
          )}
          {pendingJobUrl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hit-target h-auto gap-1 px-2.5 py-1.5 text-caption-sm text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <a
                href={pendingJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the original posting in a new tab"
              >
                Open posting
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePaste}
            disabled={disabled}
            className="hit-target h-9 gap-1.5 px-3 text-xs font-medium"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
            Paste
          </Button>
          {jdText && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onJdTextChange('')}
              disabled={disabled}
              className="hit-target h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Textarea
          placeholder="Paste the job description here. For example: About the role, responsibilities, requirements..."
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
          rows={5}
          maxLength={10000}
          disabled={disabled}
          className={cn(
            'resize-none rounded-container leading-relaxed focus-visible:ring-primary',
            starting ? 'min-h-[150px] lg:min-h-[230px]' : 'min-h-[200px]',
          )}
        />
        <span id="jd-char-count" className="pointer-events-none absolute bottom-3 right-3 text-caption-sm tabular-nums text-muted-foreground">
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

      {/* The two choices most people leave alone, one line each. */}
      {starting && (resumePicker || formatControls) && (
        <div className="space-y-2">
          {resumePicker}
          {formatControls && (
            <details className="group rounded-container border border-border bg-muted/30">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-container px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0">
                  <span className="font-medium text-foreground">Format</span>
                  {formatSummary && (
                    <span className="ml-2 text-caption text-muted-foreground">{formatSummary}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-caption font-medium text-primary">
                  Change
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                </span>
              </summary>
              <div className="border-t border-border px-4 py-4">{formatControls}</div>
            </details>
          )}
        </div>
      )}

      {/* Quota-exhausted banner - shown above the CTA so the reason is clear. */}
      {quotaBlocked && (
        <div className="rounded-container border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-xs font-bold text-warning">
              !
            </span>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-warning">Daily limit reached</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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

      <div className="space-y-2">
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
          className="h-auto min-h-12 w-full rounded-container py-3.5 text-sm font-semibold shadow-soft transition-colors duration-200"
        >
          {disabled ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Tailoring...
            </>
          ) : quotaBlocked ? (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Daily limit reached. See options
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {result ? 'Tailor again with this posting' : 'Tailor my resume'}
            </>
          )}
        </Button>

        {starting && !jdText.trim() && !disabled && (
          <p className="text-center text-caption-sm text-muted-foreground">
            Paste a job posting above to turn this on.
          </p>
        )}
        {!usageLoading && dailyRemaining !== null && dailyRemaining > 0 && (
          <p className="text-center text-caption-sm tabular-nums text-muted-foreground">
            {dailyRemaining} {dailyRemaining === 1 ? 'resume' : 'resumes'} left to tailor today
          </p>
        )}
      </div>

      {starting && (
        <p className="flex items-start gap-2 rounded-container bg-muted/40 px-3.5 py-3 text-caption leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
          <span>
            We work from what is already in your resume. Anything we cannot trace back to it is
            flagged for you to check before you download.
          </span>
        </p>
      )}
    </div>
  );
}
