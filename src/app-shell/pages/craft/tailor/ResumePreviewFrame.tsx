/**
 * ResumePreviewFrame — the left-column preview frame for the Tailor page.
 *
 * Composes the frame header (status label + Tailored/Original/Diff segmented
 * control + version history + revert) and one of three body states:
 *   - a loaded result (optional WhatChanged card + the resume/diff view),
 *   - a live TailorProgress card while a job runs, or
 *   - a "Ready to tailor" empty state.
 * A vertical ATS-strength meter hugs the left edge when scores exist.
 *
 * Presentational: all data + handlers arrive via props.
 */
import { motion } from 'framer-motion';
import { FileText, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PanelEmpty } from '@/app-shell/pages/today/primitives';
import { ResumePreview } from '@/components/resume/tailored/ResumePreview';
import { ResumeDiffView } from '@/components/resume/tailored/ResumeDiffView';
import { Button } from '@/components/ui/button';
import { scoreTone } from './primitives';
import { VersionHistoryMenu } from './VersionHistoryMenu';
import { WhatChangedCard } from './WhatChangedCard';
import { TailorProgress } from './TailorProgress';
import type {
  TailorPipelineResult,
  TailoredFullResume,
  PreviewMode,
  TailorPhase,
  VersionEntry,
} from './types';

const SEGMENTS: { key: PreviewMode; label: string; active: string }[] = [
  {
    key: 'tailored',
    label: 'Tailored',
    active: 'bg-primary/20 text-primary ring-1 ring-primary/30 shadow-soft',
  },
  {
    key: 'previous',
    label: 'Original',
    active: 'bg-card text-foreground ring-1 ring-border shadow-soft',
  },
  {
    key: 'diff',
    label: 'Diff',
    active: 'bg-warning/15 text-warning ring-1 ring-warning/30 shadow-soft',
  },
];

export interface ResumePreviewFrameProps {
  result: TailorPipelineResult | null;
  previousResume: TailoredFullResume | null;
  regenView: PreviewMode;
  onRegenViewChange: (v: PreviewMode) => void;
  versions: VersionEntry[];
  onRestoreVersion: (v: VersionEntry) => void;
  onRevert: () => void;
  phase: TailorPhase | null;
  elapsedSeconds: number;
  onCancel: () => void;
}

export function ResumePreviewFrame({
  result,
  previousResume,
  regenView,
  onRegenViewChange,
  versions,
  onRestoreVersion,
  onRevert,
  phase,
  elapsedSeconds,
  onCancel,
}: ResumePreviewFrameProps) {
  const statusLabel = result
    ? 'Tailored Resume'
    : phase !== null
      ? 'Tailoring…'
      : 'Resume Preview';

  return (
    <div className="relative surface shadow-soft rounded-container overflow-hidden flex flex-col lg:max-h-[calc(100vh-140px)]">
      {/* Resume-strength meter — vertical bar hugging the left edge. */}
      {result?.ats_scores &&
        (() => {
          const s = result.ats_scores.overall;
          const tone = scoreTone(s);
          return (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 overflow-hidden z-10"
              aria-hidden="true"
            >
              <div
                className={cn(
                  'absolute left-0 right-0 bottom-0 transition-all duration-1000 ease-out',
                  tone.fill,
                )}
                style={{ height: `${s}%` }}
                title={`Resume strength ${s}%`}
              />
            </div>
          );
        })()}

      {/* Frame header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {statusLabel}
          </p>
          {previousResume && (
            <div
              role="tablist"
              aria-label="Resume version"
              className="inline-flex rounded-control bg-muted p-0.5 border border-border"
            >
              {SEGMENTS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={regenView === t.key}
                  onClick={() => onRegenViewChange(t.key)}
                  className={cn(
                    'relative px-3 py-1 rounded-[6px] text-[11px] font-semibold transition-all',
                    regenView === t.key
                      ? t.active
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {result && versions.length > 1 && (
            <VersionHistoryMenu versions={versions} onRestore={onRestoreVersion} />
          )}
          {result && previousResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevert}
              className="h-auto gap-1.5 px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Revert
            </Button>
          )}
        </div>
      </div>

      {/* Body — scrolls independently. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {result ? (
          <div className="p-3 sm:p-5 bg-muted/40 space-y-3">
            {previousResume && (
              <WhatChangedCard
                previous={previousResume}
                current={result.tailored_resume}
              />
            )}
            <motion.div
              key={`loaded-${regenView}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {previousResume && regenView === 'diff' ? (
                <ResumeDiffView prev={previousResume} curr={result.tailored_resume} />
              ) : previousResume && regenView === 'previous' ? (
                <ResumePreview resume={previousResume} />
              ) : (
                <ResumePreview resume={result.tailored_resume} />
              )}
            </motion.div>
          </div>
        ) : phase !== null ? (
          <TailorProgress
            phase={phase}
            elapsedSeconds={elapsedSeconds}
            onCancel={onCancel}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[480px] p-6">
            <PanelEmpty
              icon={FileText}
              title="Ready to tailor"
              body="Paste a job description in the Job Description panel and click Tailor My Resume to begin."
            />
          </div>
        )}
      </div>
    </div>
  );
}
