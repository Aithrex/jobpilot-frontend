/**
 * NudgeBar - priority-ordered contextual nudge shown above the split-view.
 * Rules fire in order (score improved → low skills alignment → no cover
 * letter); the first undismissed nudge renders in a brand-tinted bar with an
 * action button and a dismiss control.
 *
 * Presentational: state (result, versions, cover-letter) + handlers via props.
 */
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Lightbulb, PenLine, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TailorPipelineResult } from './types';

interface Nudge {
  id: string;
  icon: LucideIcon;
  text: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NudgeBarProps {
  result: TailorPipelineResult | null;
  versionsCount: number;
  coverLetter: string | null;
  coverLetterLoading: boolean;
  dismissedNudges: Set<string>;
  onDismiss: (id: string) => void;
  onDownload: () => void;
  onReviewAts: () => void;
  onGenerateCoverLetter: () => void;
}

export function NudgeBar({
  result,
  versionsCount,
  coverLetter,
  coverLetterLoading,
  dismissedNudges,
  onDismiss,
  onDownload,
  onReviewAts,
  onGenerateCoverLetter,
}: NudgeBarProps) {
  // Hook before any early return (rules of hooks).
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  const nudges: Nudge[] = [];

  // Score improvement after regen
  if (versionsCount >= 2 && result.ats_scores) {
    nudges.push({
      id: `improved-${versionsCount}`,
      icon: Sparkles,
      text: (
        <>
          Resume regenerated:{' '}
          <strong className="text-foreground">
            ATS score is now {result.ats_scores.overall}/100
          </strong>
          . Download your updated version when ready.
        </>
      ),
      actionLabel: 'Download PDF',
      onAction: onDownload,
    });
  }

  // Weak evidenced coverage — never frame adding a skill as a score bump.
  if (
    result.ats_scores &&
    (result.ats_scores.skills_alignment ?? 100) < 70
  ) {
    nudges.push({
      id: `skills-${result.ats_scores.overall}`,
      icon: Lightbulb,
      text: (
        <>
          Several required skills are not evidenced in bullets.{' '}
          <strong className="text-foreground">
            Review the gaps and only name what you have used.
          </strong>
        </>
      ),
      actionLabel: 'Review ATS',
      onAction: onReviewAts,
    });
  }

  // Cover letter not yet generated
  if (!coverLetter && !coverLetterLoading) {
    nudges.push({
      id: 'cover-letter',
      icon: PenLine,
      text: (
        <>
          You haven't generated a cover letter yet. It takes about{' '}
          <strong className="text-foreground">15 seconds</strong>.
        </>
      ),
      actionLabel: 'Generate',
      onAction: onGenerateCoverLetter,
    });
  }

  const active = nudges.find((n) => !dismissedNudges.has(n.id));
  if (!active) return null;

  const Icon = active.icon;

  return (
    <motion.div
      key={active.id}
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="relative rounded-container border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3 overflow-hidden"
    >
      <div className="relative flex items-center gap-2.5 text-sm min-w-0">
        <Icon className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-muted-foreground leading-snug min-w-0">{active.text}</p>
      </div>
      <div className="relative flex items-center gap-2 shrink-0">
        {active.actionLabel && active.onAction && (
          <button
            onClick={active.onAction}
            className="text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-control hover:bg-primary/10 transition-all whitespace-nowrap"
          >
            {active.actionLabel} →
          </button>
        )}
        <button
          onClick={() => onDismiss(active.id)}
          className="text-muted-foreground hover:text-foreground transition-all p-1 rounded-control"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
