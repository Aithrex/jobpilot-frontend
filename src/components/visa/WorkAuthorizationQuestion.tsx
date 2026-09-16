/**
 * One question, asked once, editable forever.
 *
 * "Will you need visa sponsorship?" was a yes/no chip pair, and a yes/no cannot
 * hold the answer a large share of this product's users actually have: "I am
 * authorized right now on OPT, and I will need an H-1B in fourteen months."
 * That person answered "no" and got a feed full of postings that will not
 * sponsor them, or answered "yes" and got told they were not authorized.
 *
 * Design rules, all of them load-bearing:
 *  - the default is UNSET and unset is a real state, rendered as "not
 *    answered". It is never inferred from a resume, a country of birth or a
 *    name;
 *  - "prefer not to say" is present, last, and costs the user nothing;
 *  - nothing here gates anything. There is no required answer, no blocking
 *    validation, and skipping is always one visible control away;
 *  - the answer is a FACT ABOUT THE USER that steers ranking. The copy under
 *    the question says exactly what we do with it and promises nothing else.
 *    It is not advice and it never decides what someone may apply for.
 */
import { useId } from 'react';
import { CheckCircle2, Loader2, ShieldQuestion } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  WORK_AUTHORIZATION_OPTIONS,
  type WorkAuthorizationStatus,
} from '@/types/workAuthorization';

export interface WorkAuthorizationQuestionProps {
  value: WorkAuthorizationStatus;
  onChange: (value: WorkAuthorizationStatus) => void;
  /** Rendered while a save is in flight. Never disables the control. */
  saving?: boolean;
  /** True once the SERVER has the answer. Drives the "saved" acknowledgement. */
  saved?: boolean;
  /** A save that did not land, verbatim. Shown as a caveat, not as a failure. */
  error?: string | null;
  /** Compact variant for the onboarding wizard - no card chrome. */
  bare?: boolean;
  className?: string;
}

export function WorkAuthorizationQuestion({
  value,
  onChange,
  saving = false,
  saved = false,
  error = null,
  bare = false,
  className,
}: WorkAuthorizationQuestionProps) {
  const groupId = useId();

  return (
    <section
      className={cn(
        'space-y-3',
        !bare && 'rounded-xl border border-border bg-card p-4 text-card-foreground',
        className,
      )}
      aria-labelledby={`${groupId}-heading`}
      data-testid="work-authorization-question"
    >
      <div className="space-y-1">
        <h3
          id={`${groupId}-heading`}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <ShieldQuestion className="h-4 w-4 text-muted-foreground" aria-hidden />
          What is your work authorization in the US?
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Optional, and you can change it whenever you like. We use it to rank your
          feed - to stop putting postings in front of you that state a barrier you
          would hit. It never hides a job you can still apply for, and it is not
          immigration advice.
        </p>
      </div>

      <RadioGroup
        value={value === 'unset' ? '' : value}
        onValueChange={(next) => onChange(next as WorkAuthorizationStatus)}
        className="gap-2"
        aria-labelledby={`${groupId}-heading`}
      >
        {WORK_AUTHORIZATION_OPTIONS.map((option) => {
          const id = `${groupId}-${option.value}`;
          const active = value === option.value;
          return (
            <div
              key={option.value}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
              <Label htmlFor={id} className="cursor-pointer space-y-0.5 font-normal">
                <span className="block text-xs font-medium text-foreground">{option.label}</span>
                <span className="block text-[11px] font-normal leading-snug text-muted-foreground">
                  {option.detail}
                </span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Status line. Three distinct truths, never conflated: in flight, on the
          server, or only in this browser. */}
      <p className="flex min-h-4 items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
        {saving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Saving your answer
          </>
        ) : error ? (
          <span className="text-warning">Not saved - {error}</span>
        ) : saved && value !== 'unset' ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-success" aria-hidden />
            Saved. Your feed will use this from the next search.
          </>
        ) : value === 'unset' ? (
          <>Not answered yet. Leaving it blank is fine - nothing is filtered on a blank.</>
        ) : null}
      </p>
    </section>
  );
}

export default WorkAuthorizationQuestion;
