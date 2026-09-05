/**
 * ATS score inspector panel (Tailor right column).
 *
 * Always the hybrid engine: overall + keyword/skills/impact bars +
 * per-vendor scanner scores. Never hide a stored score as "legacy".
 */
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  ScoreRing,
  ScoreBar,
  PDFParseabilityCard,
} from '@/components/resume/tailored/ScoreDisplay';
import { VENDOR_LABELS, isAssessmentV2 } from '@/lib/atsScores';
import { MatchGapsPanel, type EvidenceTarget } from './MatchGapsPanel';
import { DocumentAssessmentPanel } from './DocumentAssessmentPanel';
import { AssessmentV2Panel } from './AssessmentV2Panel';

import type { ATSScores, MatchGaps, TailoredFullResume } from '@/types/resume';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

interface AtsScorePanelProps {
  recordId?: string;
  scores: ATSScores | null;
  resume?: TailoredFullResume | null;
  matchGaps?: MatchGaps | null;
  onAttachEvidence?: (term: string, target: EvidenceTarget) => void;
  /** True when the resume changed after this score was computed. */
  stale?: boolean;
  onRescore?: () => void;
  rescoring?: boolean;
  /** Overall delta after an edit-triggered rescore. Null when none. */
  delta?: number | null;
}

export function AtsScorePanel({
  recordId,
  scores,
  resume = null,
  matchGaps = null,
  onAttachEvidence,
  stale = false,
  onRescore,
  rescoring = false,
  delta = null,
}: AtsScorePanelProps) {
  const assessment = scores?.document_assessment ?? resume?.document_assessment;
  if (scores && isAssessmentV2(scores)) {
    return (
      <AssessmentV2Panel
        scores={scores}
        stale={stale}
        onRecheck={onRescore}
        checking={rescoring}
      />
    );
  }
  if (assessment) return <DocumentAssessmentPanel assessment={assessment} resume={resume} recordId={recordId} stale={stale} onRecheck={onRescore} checking={rescoring} />;
  // ── Loading state - mirror the real layout (ring card + bar rows). ──
  if (scores === null) {
    return (
      <div className="space-y-5 p-5 sm:p-6" aria-busy="true">
        <div className="rounded-container border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className={SURFACE}>
              <Skeleton className="mb-4 h-4 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">

      {stale && (
        <div className="flex items-center justify-between gap-3 rounded-container border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-xs text-foreground">
            <span className="font-semibold">
              {rescoring ? 'Updating ATS score…' : 'Edited since scored'}
            </span>
            {!rescoring &&
              ' The numbers below reflect the pre-edit resume and will refresh shortly.'}
          </p>
        </div>
      )}

      {scores.render_error && (
        <div className="flex items-start gap-2.5 rounded-container border border-destructive/40 bg-destructive/10 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-foreground">
            <span className="font-semibold text-destructive">
              Your resume PDF failed to render or parse.
            </span>{' '}
            No ATS can read it in this state. The overall score is capped
            until this is fixed. ({scores.render_error})
          </p>
        </div>
      )}

      <div className="rounded-container border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-6">
          {typeof scores.overall === 'number' && <ScoreRing score={scores.overall} delta={delta} />}
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">
              Internal document coverage
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Required JD terms clearly shown on this resume
              {typeof scores.coverage_numerator === 'number' &&
              typeof scores.coverage_denominator === 'number'
                ? ` (${scores.coverage_numerator}/${scores.coverage_denominator})`
                : ''}
              . This is not an ATS pass probability or employer score.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            Score Breakdown
          </p>
          <div className="space-y-3">
            <ScoreBar label="Required-term coverage" score={scores.keyword_match} />
            <ScoreBar label="Skills alignment" score={scores.skills_alignment} />
            {typeof scores.experience_relevance === 'number' && (
              <ScoreBar
                label="Experience relevance (reviewer)"
                score={scores.experience_relevance}
              />
            )}
            <ScoreBar
              label="Quantifiable impact"
              score={scores.quantifiable_impact}
            />
            {typeof scores.format_score === 'number' && (
              <ScoreBar label="File format check" score={scores.format_score} />
            )}
            <ScoreBar
              label="Section completeness"
              score={scores.section_completeness}
            />
          </div>
        </div>
        {scores.vendor_scores_measured && scores.scanners && (
          <div className={SURFACE}>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Vendor checklist
            </p>
            <div className="mt-3 space-y-3">
              {Object.entries(scores.scanners).map(([n, s]) => (
                <ScoreBar
                  key={n}
                  label={VENDOR_LABELS[n] ?? n}
                  score={s}
                />
              ))}
            </div>
          </div>
        )}
        {!scores.vendor_scores_measured && (
          <div className={SURFACE}>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Employer / vendor scores
            </p>
            <p className="text-xs text-muted-foreground">
              Not measured. Simulated Workday, Greenhouse, or other vendor
              numbers are not shown as results.
            </p>
          </div>
        )}
      </div>

      {scores.vendor_scores_measured && scores.ai_screener && (
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            Reviewer notes
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Overall" score={scores.ai_screener.overall} color="bg-primary" />
            <ScoreBar label="Relevance" score={scores.ai_screener.relevance} color="bg-primary" />
            <ScoreBar label="Seniority Fit" score={scores.ai_screener.seniority_fit} color="bg-primary" />
          </div>
        </div>
      )}

      {/* PDF parseability */}
      {scores.pdf_parseable_score !== undefined && (
        <PDFParseabilityCard
          score={scores.pdf_parseable_score}
          checks={scores.pdf_parseable_checks || {}}
          warnings={scores.pdf_parseable_warnings || []}
        />
      )}

      {/* Strengths + suggestions */}
      <div className="grid gap-4 md:grid-cols-2">
        {scores.strengths?.length > 0 && (
          <div className={SURFACE}>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold text-success">Strengths</p>
            </div>
            <ul className="space-y-2">
              {scores.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="mt-0.5 shrink-0 text-success">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {scores.suggestions?.length > 0 && (
          <div className={SURFACE}>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm font-semibold text-warning">Suggestions</p>
            </div>
            <ul className="space-y-2">
              {scores.suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="mt-0.5 shrink-0 text-warning">!</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {scores.stuffing_warnings && scores.stuffing_warnings.length > 0 && (
        <div className={SURFACE}>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-foreground">
              Screeners will notice
            </p>
          </div>
          <ul className="space-y-1.5">
            {scores.stuffing_warnings.map((w) => (
              <li key={w} className="text-xs leading-relaxed text-muted-foreground">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scores.unevidenced_keywords && scores.unevidenced_keywords.length > 0 && (
        <div className={SURFACE}>
          <p className="text-sm font-semibold text-foreground">Listed, not demonstrated</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            These JD terms sit only in Skills. Mention them in a bullet to earn
            credit — listing them moves the ATS score by +0.
          </p>
          <p className="mt-2 text-xs text-foreground">
            {scores.unevidenced_keywords.join(', ')}
          </p>
        </div>
      )}

      {onAttachEvidence &&
        matchGaps &&
        ((matchGaps.already_demonstrated?.length ?? 0) +
          (matchGaps.defensible?.length ?? 0) +
          (matchGaps.learnable?.length ?? 0) +
          (matchGaps.stretch?.length ?? 0) >
          0) && (
        <div className={SURFACE}>
          <p className="mb-3 text-sm font-semibold text-foreground">
            What the role asks that you have not shown
          </p>
          <MatchGapsPanel
            gaps={matchGaps}
            resume={resume}
            onAttachEvidence={onAttachEvidence}
          />
        </div>
      )}

    </div>
  );
}
