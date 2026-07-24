import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ErrorCard,
  SignupCta,
  WorkingHeader,
} from '@/components/guest/_shared';
import {
  TAILOR_STAGES,
  useStagedCopy,
  type GuestCta,
} from '@/hooks/useGuestFlow';
import type { GuestJobMatch } from '@/types/guest';

/**
 * The in-flight tailor: honest staged progress for the REAL async job, with
 * the selected job context and the IntegrityGuard contract stated up front.
 * Quota/capacity/challenge 429s arrive as conversion CTA copy, never errors.
 */
export interface GuestTailoringStateProps {
  activeMatch: GuestJobMatch | null;
  working: boolean;
  error: string | null;
  cta: GuestCta | null;
  onRetry: () => void;
  onBack: () => void;
}

const PROTECTED_FACTS = ['Employers', 'Titles', 'Dates', 'Skills'] as const;

export function GuestTailoringState({
  activeMatch,
  working,
  error,
  cta,
  onRetry,
  onBack,
}: GuestTailoringStateProps) {
  const reduceMotion = useReducedMotion();
  const stage = useStagedCopy(working, TAILOR_STAGES, 7000);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="-my-2 mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to matches
      </button>

      {activeMatch && (
        // Morph target: shares 'guest-tailor-card' with the selected match
        // card on the dashboard, so confirming a tailor visually carries the
        // card into this pane (transform-only layout morph; off under
        // reduced motion).
        <motion.div
          layoutId={reduceMotion ? undefined : 'guest-tailor-card'}
          className="mb-6"
        >
          <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            {activeMatch.title} · {activeMatch.company}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground" role="status">
            Tailoring your resume for this role.
          </p>
        </motion.div>
      )}

      {working && (
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8" aria-live="polite">
            <WorkingHeader
              stage={stage}
              hint="Usually one to two minutes. Every line is checked against your real experience. Nothing invented."
            />

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                IntegrityGuard active
              </span>
              <span className="text-xs text-muted-foreground">Protected from changes:</span>
              {PROTECTED_FACTS.map((fact) => (
                <span
                  key={fact}
                  className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {fact}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      )}

      {cta && <SignupCta title={cta.title} body={cta.body} />}

      {!working && !cta && error && (
        <ErrorCard title="Tailoring didn't finish" body={error}>
          {activeMatch && <Button onClick={onRetry}>Try again</Button>}
          <Button variant="outline" onClick={onBack}>
            Back to matches
          </Button>
        </ErrorCard>
      )}
    </div>
  );
}
