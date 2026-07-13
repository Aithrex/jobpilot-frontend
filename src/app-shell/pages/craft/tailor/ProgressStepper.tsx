/**
 * ProgressStepper — the 3-step horizontal stepper for the Tailor page
 * (Upload Resume → Add Job Description → Review & Download).
 *
 * Presentational: derives per-step status from `currentStep` alone.
 * Done + active steps use the brand/primary tone; upcoming steps are muted.
 */
import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1 as const, label: 'Upload Resume' },
  { n: 2 as const, label: 'Add Job Description' },
  { n: 3 as const, label: 'Review & Download' },
];

export function ProgressStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="surface shadow-soft rounded-container px-4 sm:px-8 py-4">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i, arr) => {
          const status =
            currentStep > s.n ? 'done' : currentStep === s.n ? 'active' : 'upcoming';
          return (
            <Fragment key={s.n}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                    status === 'done' &&
                      'bg-primary text-primary-foreground shadow-soft',
                    status === 'active' &&
                      'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-soft',
                    status === 'upcoming' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {status === 'done' ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    s.n
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium hidden sm:inline transition-colors',
                    status === 'active' && 'text-foreground',
                    status === 'done' && 'text-primary',
                    status === 'upcoming' && 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={cn(
                    'h-[2px] flex-1 max-w-[80px] rounded-full transition-colors duration-500',
                    currentStep > s.n ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
