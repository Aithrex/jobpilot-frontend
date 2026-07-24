import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuestStep } from '@/hooks/useGuestFlow';

const FLOW_STEPS = ['Upload', 'Profile', 'Matches', 'Tailor'] as const;

const STEP_INDEX: Record<GuestStep, number> = {
  hero: 0,
  parsing: 0,
  profile: 1,
  matches: 2,
  tailor: 3,
};

/**
 * Compact four-step rail so guests always know where they are in the flow
 * (on the idle hero it previews the journey). Purely presentational - state
 * is conveyed by number/check + label, never colour alone. Extracted from
 * pages/Start.tsx so the landing workspace and any future host share ONE
 * implementation.
 */
export function GuestProgressRail({ step, className }: { step: GuestStep; className?: string }) {
  const current = STEP_INDEX[step];
  return (
    <ol
      aria-label={`Progress: step ${current + 1} of ${FLOW_STEPS.length}`}
      className={cn('flex items-center justify-center', className)}
    >
      {FLOW_STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <li key={label} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'mx-1.5 h-px w-4 transition-colors sm:mx-2 sm:w-8',
                  isDone || isActive ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
            <span
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : isDone
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border text-muted-foreground',
              )}
            >
              {isDone ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  <span className="sr-only">Done: </span>
                </>
              ) : (
                <span className="tabular-nums" aria-hidden>
                  {i + 1}.
                </span>
              )}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
