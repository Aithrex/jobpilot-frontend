/**
 * ProgressStepper - the three things that happen on the Tailor page, in the
 * words a first-time user would use: add the job, we tailor it, you check and
 * download.
 *
 * It used to open on "Upload Resume", a step that is always already done by
 * the time this page renders, inside a full-width card. It is now one quiet
 * line: it orients, it does not compete with the form under it.
 *
 * Presentational: derives per-step status from `currentStep` alone.
 */
import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1 as const, label: 'Add the job posting' },
  { n: 2 as const, label: 'We tailor your resume' },
  { n: 3 as const, label: 'Check it and download' },
];

export function ProgressStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Tailoring progress" className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i, arr) => {
        const status =
          currentStep > s.n ? 'done' : currentStep === s.n ? 'active' : 'upcoming';
        return (
          <Fragment key={s.n}>
            <li
              aria-current={status === 'active' ? 'step' : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200',
                  status === 'done' && 'bg-signal text-signal-foreground',
                  status === 'active' && 'bg-primary text-primary-foreground',
                  status === 'upcoming' && 'bg-muted text-muted-foreground',
                )}
              >
                {status === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s.n}
              </span>
              {/* Visible from sm up; below it only the current step is named,
                  and every label stays in the accessibility tree. */}
              <span
                className={cn(
                  'truncate text-caption font-medium transition-colors',
                  status === 'active' ? 'text-foreground' : 'sr-only text-muted-foreground sm:not-sr-only',
                )}
              >
                {s.label}
                {status === 'done' && <span className="sr-only"> (completed)</span>}
              </span>
            </li>
            {i < arr.length - 1 && (
              <li
                role="presentation"
                aria-hidden="true"
                className={cn(
                  'h-px w-5 shrink-0 rounded-full transition-colors duration-200 sm:w-8',
                  currentStep > s.n ? 'bg-signal' : 'bg-border',
                )}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
