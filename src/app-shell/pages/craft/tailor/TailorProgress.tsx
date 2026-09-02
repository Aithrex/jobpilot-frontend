/**
 * TailorProgress - the live progress card shown in the left preview column
 * while a tailoring job runs.
 *
 * Presentational and HONEST: every step transition is driven by a real
 * backend phase marker (job.result.progress) - there is no elapsed-time
 * guessing. If an older backend never emits markers, the card truthfully
 * sits on the step the status floor implies.
 * Done = success, active = primary + pulse, pending = muted.
 */
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TailorPhase } from './types';

const STEPS: Array<{
  key: string;
  phases: TailorPhase[];
  label: string;
  hint: string;
}> = [
  {
    key: 'extract',
    phases: ['submitting', 'queued', 'extracting_jd', 'selecting_base'],
    label: 'Extract job requirements',
    hint: 'Pulling skills, responsibilities, and ATS keywords',
  },
  {
    key: 'tailor',
    phases: ['tailoring'],
    label: 'Tailor resume content',
    hint: 'Rewriting bullets and summary to match the role',
  },
  {
    key: 'augment',
    phases: ['augmenting'],
    label: 'Optimize keywords & impact',
    hint: 'Strengthening bullets and hardening for ATS',
  },
  {
    key: 'verify',
    phases: ['verifying'],
    label: 'Verify claims against your resume',
    hint: 'Checking every bullet is grounded in your real history',
  },
  {
    key: 'finalize',
    phases: ['finalizing'],
    label: 'Finalize and format',
    hint: 'Keyword audit and final cleanup',
  },
];

/** Map the real backend phase to the active visual step index. */
function activeStep(phase: TailorPhase): number {
  const i = STEPS.findIndex((s) => s.phases.includes(phase));
  return i === -1 ? 0 : i;
}

export function TailorProgress({
  phase,
  pct,
  elapsedSeconds,
  onCancel,
}: {
  phase: TailorPhase;
  /** Real backend progress percent, null when the backend hasn't reported one. */
  pct: number | null;
  elapsedSeconds: number;
  onCancel: () => void;
}) {
  const current = activeStep(phase);

  return (
    <div className="px-6 sm:px-8 py-8 sm:py-10 min-h-[480px] flex flex-col">
      {/* Screen-reader progress announcement - a persistent live region (a
          region that mounts with the active step wouldn't reliably announce). */}
      <p role="status" aria-live="polite" className="sr-only">
        Step {current + 1} of {STEPS.length}: {STEPS[current].label}
      </p>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">
              Tailoring your resume
            </p>
            <p className="text-[11px] text-muted-foreground">
              {elapsedSeconds >= 90
                ? 'Taking longer than expected'
                : 'Usually takes 30 to 60 seconds'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {elapsedSeconds > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
              {elapsedSeconds}s
            </span>
          )}
          {elapsedSeconds >= 90 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-auto px-2.5 py-1 text-[11px] hover:border-destructive/60 hover:text-destructive"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <ol className="space-y-3 flex-1">
        {STEPS.map((step, i) => {
          const status = i < current ? 'done' : i === current ? 'active' : 'pending';
          return (
            <li key={step.key} className="flex items-start gap-3">
              <div
                className={cn(
                  'shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                  status === 'done' && 'bg-success/15 text-success ring-1 ring-success/40',
                  status === 'active' &&
                    'bg-primary/15 text-primary ring-2 ring-primary/40 animate-pulse',
                  status === 'pending' &&
                    'bg-muted text-muted-foreground ring-1 ring-border',
                )}
              >
                {status === 'done' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : status === 'active' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-current" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    'text-[14px] font-medium transition-colors',
                    status === 'done' && 'text-success',
                    status === 'active' && 'text-foreground',
                    status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                {status === 'active' && (
                  <>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {phase === 'selecting_base'
                        ? 'Choosing the resume that fits this role best'
                        : step.hint}
                    </p>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      {pct !== null ? (
                        <div
                          className="h-full rounded-full brand-gradient transition-[width] duration-700"
                          style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                        />
                      ) : (
                        <div className="h-full w-1/2 rounded-full brand-gradient animate-pulse" />
                      )}
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
