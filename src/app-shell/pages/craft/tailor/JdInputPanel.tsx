/**
 * JdInputPanel — the Job Description inspector tab body.
 *
 * Presentational: a shadcn Textarea (10k cap + char counter), Paste / Clear /
 * Retry-fetch / Open-posting affordances, the extracted-requirements chips
 * (when a result exists), and the primary "Tailor My Resume" CTA. All data +
 * handlers arrive via props; the only local behavior is clipboard read.
 */
import { Clipboard, RotateCw, ExternalLink, Sparkles } from 'lucide-react';
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
  dailyRemaining,
  usageLoading,
  onQuotaBlocked,
}: JdInputPanelProps) {
  const quotaBlocked = dailyRemaining === 0;

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) onJdTextChange(t.slice(0, 10000));
    } catch {
      // Clipboard access denied — orchestrator surfaces toasts; stay silent here.
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
          <h2 className="text-base font-semibold text-foreground">Job Description</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste the complete job posting — we'll extract requirements automatically
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
              className="h-auto gap-1 px-2.5 py-1.5 text-[11px] text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 hover:text-primary"
              title={`Re-attempt auto-fetch from ${hostname}`}
            >
              {retryingJdFetch ? (
                <span className="inline-block h-3 w-3 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {retryingJdFetch ? 'Fetching…' : 'Retry JD fetch'}
            </Button>
          )}
          {pendingJobUrl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-success hover:bg-success/10"
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
            className="h-auto gap-1 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/10"
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
              className="h-auto px-2 py-1.5 text-[11px] text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Textarea
          placeholder="Paste the job description here — we'll extract key requirements and tailor your resume automatically..."
          value={jdText}
          onChange={(e) => onJdTextChange(e.target.value)}
          rows={10}
          maxLength={10000}
          disabled={disabled}
          className="min-h-[280px] rounded-container leading-relaxed resize-none focus-visible:ring-primary"
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-muted-foreground tabular-nums pointer-events-none">
          {jdText.length.toLocaleString()} / 10,000
        </span>
      </div>

      {/* Extracted requirements preview — chips color-coded matched/missing. */}
      {result?.jd_analysis && (
        <RequirementsChips
          jdAnalysis={result.jd_analysis}
          tailoredResume={result.tailored_resume}
        />
      )}

      {/* Quota-exhausted banner — shown above the CTA so the reason is clear. */}
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
                className="mt-2 text-xs font-semibold text-warning underline underline-offset-2 hover:text-warning/80"
              >
                See options →
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
          'w-full h-auto py-3.5 rounded-container text-sm font-semibold shadow-soft active:scale-[0.98] transition-all duration-200',
        )}
      >
        {disabled ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Tailoring…
          </>
        ) : quotaBlocked ? (
          <>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Daily limit reached — see options
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {result ? 'Re-tailor with new JD' : 'Tailor My Resume'}
          </>
        )}
      </Button>

      {!usageLoading && dailyRemaining !== null && dailyRemaining > 0 && (
        <p className="text-center text-[11px] text-muted-foreground tabular-nums">
          {dailyRemaining} tailor{dailyRemaining === 1 ? '' : 's'} left today
        </p>
      )}
    </div>
  );
}
