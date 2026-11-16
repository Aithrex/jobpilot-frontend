/**
 * The Tailor tool's working column.
 *
 * Before there is a result: only the job posting form.
 *
 * After tailoring (2026-11-16, owner: "keep just the ATS score"): the ATS
 * score card is the whole view. Under it, a warning when lines need the
 * person's check, and three tools as one quiet row. A tool opens in place with
 * a way back to the score, so nothing is hidden in a strip of six tabs and
 * nothing competes with the number.
 *
 * Tools are named for what the person does: "Ask for changes", not
 * "Regenerate"; "Check facts", not "Review".
 */
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ClipboardList, RotateCw, ShieldAlert, Sparkles, type LucideIcon } from 'lucide-react';

import { DURATION, EASE_DECELERATE } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { scoreTone } from './primitives';
import type { InspectorTabKey } from './types';

interface InspectorTabsProps {
  active: InspectorTabKey;
  onChange: (t: InspectorTabKey) => void;
  hasResult: boolean;
  atsScore: number | null;
  atsLoading: boolean;
  /** Score no longer matches the edited resume. */
  atsStale?: boolean;
  /** Unresolved flagged claims (UNSUPPORTED + PARTIAL without a decision). */
  reviewPendingCount?: number;
  /** True when any unresolved flag is UNSUPPORTED (destructive tint). */
  reviewHasUnsupported?: boolean;
  coverLetterReady: boolean;
  coverLetterLoading: boolean;
  jdPanel: ReactNode;
  reviewPanel?: ReactNode;
  atsPanel: ReactNode;
  regeneratePanel: ReactNode;
  coverPanel: ReactNode;
}

interface Tool {
  key: InspectorTabKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  status?: 'ready' | 'busy' | null;
}

export function InspectorTabs({
  active,
  onChange,
  hasResult,
  atsScore,
  atsLoading,
  atsStale = false,
  reviewPendingCount = 0,
  reviewHasUnsupported = false,
  coverLetterReady,
  coverLetterLoading,
  jdPanel,
  reviewPanel,
  atsPanel,
  regeneratePanel,
  coverPanel,
}: InspectorTabsProps) {
  const reduce = useReducedMotion();

  // Nothing tailored yet: the form on its own.
  if (!hasResult) {
    return (
      <div className="min-w-0 rounded-container border border-border bg-card shadow-soft">
        {jdPanel}
      </div>
    );
  }

  const tools: Tool[] = [
    { key: 'regenerate', label: 'Ask for changes', hint: 'Say what to change and get a new version', icon: RotateCw },
    {
      key: 'cover',
      label: 'Cover letter',
      hint: coverLetterReady ? 'Your cover letter for this job' : 'Write a cover letter for this job',
      icon: Sparkles,
      status: coverLetterLoading ? 'busy' : coverLetterReady ? 'ready' : null,
    },
    { key: 'jd', label: 'Job posting', hint: 'See or change the job posting', icon: ClipboardList },
  ];
  const panels: Partial<Record<InspectorTabKey, ReactNode>> = {
    review: reviewPanel,
    regenerate: regeneratePanel,
    cover: coverPanel,
    jd: jdPanel,
  };
  const showingScore = active === 'ats' || active === 'screener' || !panels[active];
  const motionProps = {
    initial: reduce ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? undefined : { opacity: 0, y: -4 },
    transition: { duration: reduce ? 0 : DURATION.fast, ease: EASE_DECELERATE },
  };
  const backLabel =
    atsScore != null ? `ATS score ${atsScore}${atsStale ? ', edited since' : ''}` : atsLoading ? 'ATS score, scoring' : 'ATS score';

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        {showingScore ? (
          <motion.div key="score" className="space-y-3" {...motionProps}>
            {atsPanel}

            {reviewPanel && reviewPendingCount > 0 && (
              <button
                type="button"
                onClick={() => onChange('review')}
                className={cn(
                  'press flex w-full items-center gap-3 rounded-container border px-4 py-3 text-left transition-colors',
                  reviewHasUnsupported
                    ? 'border-destructive/30 bg-destructive/10 hover:bg-destructive/15'
                    : 'border-warning/30 bg-warning/10 hover:bg-warning/15',
                )}
                title="Lines we could not trace back to your resume. Check them before you send it."
              >
                <ShieldAlert
                  className={cn('h-5 w-5 shrink-0', reviewHasUnsupported ? 'text-destructive' : 'text-warning')}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-semibold text-foreground">
                    {reviewPendingCount === 1 ? '1 line needs your check' : `${reviewPendingCount} lines need your check`}
                  </span>
                  <span className="block text-caption text-muted-foreground">Before you send it</span>
                </span>
                <span className="text-caption font-semibold text-foreground">Check</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2" role="group" aria-label="More for this resume">
              {tools.map(({ key, label, hint, icon: Icon, status }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange(key)}
                  title={hint}
                  className="press group relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-container border border-border bg-card px-2 py-3 text-center shadow-soft transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-[18px] w-[18px] text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
                  <span className="text-caption font-semibold leading-tight text-foreground">{label}</span>
                  {status && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 h-1.5 w-1.5 rounded-full',
                        status === 'ready' ? 'bg-success' : 'animate-pulse bg-warning',
                      )}
                      aria-hidden
                    />
                  )}
                  {status && (
                    <span className="sr-only">{status === 'ready' ? 'Ready' : 'Writing'}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={active} className="space-y-3" {...motionProps}>
            <button
              type="button"
              onClick={() => onChange('ats')}
              className="press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-caption font-semibold text-foreground shadow-soft transition-colors hover:border-primary/40 hover:text-primary"
              title="Back to the ATS score"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>ATS score</span>
              {atsScore != null && (
                <span className={cn('tabular-nums', scoreTone(atsScore).text)} aria-hidden>
                  {atsScore}
                </span>
              )}
              <span className="sr-only">{backLabel}</span>
            </button>
            <div className="rounded-container border border-border bg-card shadow-soft">{panels[active]}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
