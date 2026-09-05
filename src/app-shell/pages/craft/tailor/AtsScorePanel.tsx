/**
 * CareerOS ATS assessment panel (Tailor right column).
 *
 * Shows required/preferred document coverage from one ledger, file checks,
 * and human-review findings. Not an employer ATS pass probability.
 */
import { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  ScoreRing,
  ScoreBar,
  PDFParseabilityCard,
} from '@/components/resume/tailored/ScoreDisplay';
import { isAssessmentV2 } from '@/lib/atsScores';
import { MatchGapsPanel, type EvidenceTarget } from './MatchGapsPanel';
import { DocumentAssessmentPanel } from './DocumentAssessmentPanel';
import { AssessmentV2Panel } from './AssessmentV2Panel';

import type { ATSScores, MatchGaps, TailoredFullResume } from '@/types/resume';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

const DISCLAIMER =
  'CareerOS evaluates your resume against the job description. This is not an employer-specific score or a guarantee of passing screening.';

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

type CoverageBlock = {
  percentage?: number | null;
  satisfied?: number;
  partial?: number;
  not_demonstrated?: number;
  uncertain?: number;
  total?: number;
  numerator?: number;
  denominator?: number;
  provisional?: boolean;
  status?: string;
};

function coverageFromScores(scores: ATSScores): CoverageBlock {
  const rc = scores.required_coverage;
  if (rc && typeof rc === 'object') return rc as CoverageBlock;
  return {
    percentage: scores.overall_unavailable ? null : scores.overall,
    numerator: scores.coverage_numerator ?? undefined,
    denominator: scores.coverage_denominator ?? undefined,
    status: scores.coverage_status,
    provisional: scores.coverage_provisional,
  };
}

function formatRequiredLine(cov: CoverageBlock): string {
  const num = cov.numerator ?? cov.satisfied;
  const den = cov.denominator ?? cov.total;
  if (cov.status === 'unavailable' || den === 0 || (num == null && den == null)) {
    return 'Required coverage unavailable — no assessable required requirements.';
  }
  if (cov.status === 'incomplete_extraction' || cov.percentage == null) {
    return 'Required coverage withheld — requirement extraction is incomplete.';
  }
  const pct = cov.percentage;
  let line = `Required coverage: ${pct}% — ${num} of ${den} requirements demonstrated.`;
  const parts: string[] = [];
  if ((cov.partial ?? 0) > 0) {
    parts.push(
      `${cov.partial} partially demonstrated`,
    );
  }
  if ((cov.not_demonstrated ?? 0) > 0) {
    parts.push(`${cov.not_demonstrated} not shown`);
  }
  if ((cov.uncertain ?? 0) > 0) {
    parts.push(`${cov.uncertain} uncertain`);
  }
  if (parts.length) {
    line += ` ${parts.join('; ').replace(/^./, (c) => c.toUpperCase())}.`;
  }
  if (cov.provisional) {
    line += ' Percentage is provisional (confirmed coverage so far).';
  }
  return line;
}

function fileChecksLine(scores: ATSScores): string {
  const layout = scores.layout_warnings;
  if (scores.render_error) return 'File checks: Failed.';
  if (typeof scores.format_score === 'number') {
    if (scores.format_score >= 80) return 'File checks: Passed.';
    if (scores.format_score >= 50) return 'File checks: Issues found.';
    return 'File checks: Failed.';
  }
  if (scores.pdf_parseable_score !== undefined) {
    const s = scores.pdf_parseable_score;
    if (s >= 80) return 'File checks: Passed.';
    if (s >= 50) return 'File checks: Issues found.';
    return 'File checks: Failed.';
  }
  if (Array.isArray(layout) && layout.length > 0) {
    return `File checks: Layout warnings (${layout.length}).`;
  }
  return 'File checks: Not checked.';
}

function humanReviewLine(scores: ATSScores): string {
  const findings = scores.findings || [];
  const human = findings.filter(
    (f) =>
      f.kind === 'human_review' ||
      f.kind === 'repetition' ||
      f.kind === 'clarity' ||
      f.severity === 'info',
  );
  const suggestions = scores.suggestions || [];
  if (human.length > 0) {
    return `Human review: ${human.length} finding${human.length === 1 ? '' : 's'}.`;
  }
  if (suggestions.length > 0 && suggestions[0] !== 'No suggestions available') {
    return `Human review: ${suggestions.length} note${suggestions.length === 1 ? '' : 's'}.`;
  }
  return 'Human review: No issues flagged.';
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
  const [openDiag, setOpenDiag] = useState<string | null>(null);
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
  if (assessment) {
    return (
      <DocumentAssessmentPanel
        assessment={assessment}
        resume={resume}
        recordId={recordId}
        stale={stale}
        onRecheck={onRescore}
        checking={rescoring}
      />
    );
  }
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
                {Array.from({ length: 4 }).map((_, i) => (
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

  const reqCov = coverageFromScores(scores);
  const prefCov = (scores.preferred_coverage || null) as CoverageBlock | null;
  const diagnostics = scores.requirement_diagnostics || [];
  const termPresence = scores.term_presence;
  const showRing =
    !scores.overall_unavailable &&
    typeof reqCov.percentage === 'number' &&
    reqCov.status !== 'unavailable' &&
    reqCov.status !== 'incomplete_extraction';

  return (
    <div className="space-y-5 p-5 sm:p-6">
      {stale && (
        <div className="flex items-center justify-between gap-3 rounded-container border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-xs text-foreground">
            <span className="font-semibold">
              {rescoring ? 'Updating assessment…' : 'Edited since assessed'}
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
            File checks failed. Requirement coverage is unchanged by this failure.
            ({scores.render_error})
          </p>
        </div>
      )}

      <div className="rounded-container border border-border bg-card p-6 shadow-soft space-y-3">
        <div className="flex items-center gap-6">
          {showRing && (
            <ScoreRing score={reqCov.percentage as number} delta={delta} />
          )}
          <div className="flex-1 space-y-1">
            <p className="text-base font-semibold text-foreground">
              ATS Score
            </p>
            <p className="text-sm text-foreground">{formatRequiredLine(reqCov)}</p>
            {prefCov &&
              typeof prefCov.denominator === 'number' &&
              prefCov.denominator > 0 &&
              prefCov.percentage != null && (
                <p className="text-xs text-muted-foreground">
                  Preferred coverage: {prefCov.percentage}% —{' '}
                  {prefCov.numerator ?? prefCov.satisfied} of{' '}
                  {prefCov.denominator} preferred requirements demonstrated.
                </p>
              )}
            <p className="text-xs text-muted-foreground">{fileChecksLine(scores)}</p>
            <p className="text-xs text-muted-foreground">{humanReviewLine(scores)}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{DISCLAIMER}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            Supporting checks
          </p>
          <div className="space-y-3">
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
            {termPresence && typeof termPresence.percentage === 'number' && (
              <div className="pt-2 border-t border-border/60">
                <ScoreBar
                  label="Term presence (advisory)"
                  score={termPresence.percentage}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {termPresence.note ||
                    'Search-term presence only; separate from requirement satisfaction.'}
                  {typeof termPresence.denominator === 'number'
                    ? ` Denominator: ${termPresence.denominator} terms.`
                    : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={SURFACE}>
          <p className="mb-1 text-sm font-semibold text-foreground">
            Requirement evaluations
          </p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Every count above reconciles with this ledger.
          </p>
          {diagnostics.length === 0 ? (
            <p className="text-xs text-muted-foreground">No requirement rows yet.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {diagnostics.map((d, i) => {
                const id = `${d.canonical_identity || d.jd_text}-${i}`;
                const open = openDiag === id;
                const state =
                  (d as { document_state?: string }).document_state ||
                  d.classification ||
                  d.match_method ||
                  'unknown';
                return (
                  <li key={id} className="text-xs border-b border-border/50 pb-2">
                    <button
                      type="button"
                      className="w-full text-left font-medium text-foreground"
                      onClick={() => setOpenDiag(open ? null : id)}
                      aria-expanded={open}
                    >
                      {d.jd_text || d.canonical_identity}
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · {state}
                      </span>
                    </button>
                    {open && (
                      <div className="mt-1.5 space-y-1 text-muted-foreground pl-0.5">
                        {d.matched_span && (
                          <p>Matched: “{d.matched_span}”</p>
                        )}
                        {d.matched_section && <p>Section: {d.matched_section}</p>}
                        {d.match_method && <p>Method: {d.match_method}</p>}
                        {(d.unmet_qualifiers?.length ?? 0) > 0 && (
                          <p>Unmet: {d.unmet_qualifiers!.join(', ')}</p>
                        )}
                        {d.source_support && (
                          <p>Source support: {d.source_support}</p>
                        )}
                        {'reason' in d && (d as { reason?: string }).reason && (
                          <p>{(d as { reason?: string }).reason}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {scores.pdf_parseable_score !== undefined && (
        <PDFParseabilityCard
          score={scores.pdf_parseable_score}
          checks={scores.pdf_parseable_checks || {}}
          warnings={scores.pdf_parseable_warnings || []}
        />
      )}

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
