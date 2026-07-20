import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Shared presentational pieces for the guest onboarding flow (/start + the
 * landing hero embed). Purely visual — all state lives in useGuestFlow.
 */

// Editorial easing shared with the landing (_shared.tsx EASE) — a confident
// settle, never springy.
export const EASE = [0.16, 1, 0.3, 1] as const;
export const stepTransition = { duration: 0.28, ease: EASE } as const;

/** Match score chip — always framed as an ESTIMATE, never a hiring odds. */
export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-primary/30 bg-primary/10 text-primary';
  return (
    <span
      title="Estimated match score based on skill and role overlap"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
        tone,
      )}
    >
      <Target className="h-3 w-3" aria-hidden />
      <span aria-label={`Estimated ${score} percent match`}>Est. {score}% match</span>
    </span>
  );
}

/** Draining "free tailors left" meter. Counters are clamped upstream so a
 * returning v1 guest with more used than the v2 limit never goes negative. */
export function TailorQuota({
  used,
  limit,
  className,
}: {
  used: number;
  limit: number;
  className?: string;
}) {
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;
  // The bar shows what's LEFT (it drains as you tailor) so it always agrees
  // with the "X of Y left" wording.
  const pct = Math.round((remaining / Math.max(1, limit)) * 100);
  return (
    <div className={cn('w-36 space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          Free {limit === 1 ? 'tailor' : 'tailors'}
        </span>
        <span className={cn('font-medium tabular-nums', exhausted && 'text-warning')}>
          {remaining} of {limit} left
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${remaining} of ${limit} free ${limit === 1 ? 'tailor' : 'tailors'} left`}
        className="h-1.5"
      />
    </div>
  );
}

/** Conversion CTA card (quota / capacity / challenge) — a friendly signup
 * prompt, deliberately NOT an error surface. */
export function SignupCta({
  title,
  body,
  loginLabel = 'Sign in',
}: {
  title: string;
  body: string;
  loginLabel?: string;
}) {
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/login">{loginLabel}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Create free account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Spinner + crossfading stage line + steady hint — the shared "alive"
 *  header for every long-running phase. The crossfade keys on the stage
 *  string so each cadence tick visibly moves, and is inert under
 *  prefers-reduced-motion (the spinner still turns via CSS until the global
 *  reduced-motion net freezes it). */
export function WorkingHeader({ stage, hint }: { stage: string; hint: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      </span>
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={stage}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="font-semibold"
          >
            {stage}
          </motion.p>
        </AnimatePresence>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** One backend phase in a truthful progress stepper. */
export interface PhaseDef {
  key: string;
  label: string;
}

/**
 * Truthful stepper for a long-running guest job, fed by the SERVER's
 * update_job_progress markers — never a wall-clock guess. `activeKey` null
 * (no marker yet) shows the first phase active; an unknown phase keeps the
 * current rendering (per contract: treat unknown phases as "keep step").
 * State is conveyed by check/number + label, never colour alone.
 */
export function PhaseStepper({
  phases,
  activeKey,
  className,
}: {
  phases: readonly PhaseDef[];
  activeKey: string | null;
  className?: string;
}) {
  const found = activeKey ? phases.findIndex((p) => p.key === activeKey) : -1;
  const current = found >= 0 ? found : 0;
  return (
    <ol className={cn('flex flex-wrap items-center gap-y-1.5', className)} aria-label="Progress">
      {phases.map(({ key, label }, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <li key={key} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'mx-1.5 h-px w-3 transition-colors sm:w-5',
                  isDone || isActive ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
            <span
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : isDone
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border text-muted-foreground',
              )}
            >
              {isDone && (
                <>
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  <span className="sr-only">Done: </span>
                </>
              )}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The ONE aria-live region for async phase announcements: visually hidden,
 * polite, and debounced so rapid poll ticks never spam screen readers. Only
 * mounted by the currently active working state (parsing OR matches — never
 * both), keeping a single live region per contract.
 */
export function PhaseAnnouncer({ message }: { message: string | null }) {
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    if (!message || message === announced) return;
    const t = window.setTimeout(() => setAnnounced(message), 400);
    return () => window.clearTimeout(t);
  }, [message, announced]);
  return (
    <p aria-live="polite" className="sr-only">
      {announced}
    </p>
  );
}

/** Recoverable error surface — consistent icon + title + body + actions,
 *  announced via role="alert". Never a raw string dump. */
export function ErrorCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string | null;
  children?: ReactNode;
}) {
  return (
    <Card className="border-destructive/30" role="alert">
      <CardContent className="space-y-4 p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        {children && <div className="flex flex-col justify-center gap-2 sm:flex-row">{children}</div>}
      </CardContent>
    </Card>
  );
}
