/**
 * ATS score inspector panel (Tailor right column).
 *
 * Presentational only - typed props in, render out. Branches on the score
 * schema version: v2 (honest deterministic rubric + real per-vendor parse
 * checklists) vs v1 (stored records from before the cutover, which still
 * carry the legacy scanner/ai_screener blocks). Old records must render
 * forever - never assume v2 fields.
 */
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  ScoreRing,
  ScoreBar,
  PDFParseabilityCard,
  VendorChecklistCard,
} from '@/components/resume/tailored/ScoreDisplay';
import { isAtsV2, ATS_V2_RUBRIC, VENDOR_LABELS } from '@/lib/atsScores';
import { MatchGapsPanel, type EvidenceTarget } from './MatchGapsPanel';

import type { ATSScores, MatchGaps, TailoredFullResume } from '@/types/resume';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

interface AtsScorePanelProps {
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

const LEVERS: Array<{
  key: ATSScores extends never ? never : keyof ATSScores | string;
  action: string;
  weight: number;
}> = [
  { key: 'quantified_impact', action: 'Add a metric to a bullet that lacks one', weight: 15 },
  { key: 'readability', action: 'Reword a weak bullet opener', weight: 7 },
  { key: 'recency_relevance', action: 'Name a JD term in your most recent role', weight: 8 },
  { key: 'title_alignment', action: 'Align the summary with the target role family', weight: 15 },
  { key: 'ats_parseability', action: 'Resolve a two-page overflow honestly', weight: 15 },
  { key: 'section_completeness', action: 'Fill an empty section', weight: 10 },
];

export function AtsScorePanel({
  scores,
  resume = null,
  matchGaps = null,
  onAttachEvidence,
  stale = false,
  onRescore,
  rescoring = false,
  delta = null,
}: AtsScorePanelProps) {
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

  const v2 = isAtsV2(scores);
  const levers = LEVERS
    .map((row) => {
      const raw = scores[row.key as keyof ATSScores];
      const value = typeof raw === 'number' ? raw : 0;
      return { ...row, score: value, room: ((100 - value) * row.weight) / 100 };
    })
    .filter((row) => row.score < 90)
    .sort((a, b) => b.room - a.room)
    .slice(0, 4);

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
          <ScoreRing score={scores.overall} delta={delta} />
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">
              Overall ATS Score
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Weighted score across keyword match, skills alignment, and ATS scanners.
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
            {v2 ? (
              <>
                {ATS_V2_RUBRIC.map(({ key, label, weight }) => (
                  <ScoreBar
                    key={key}
                    label={`${label} (${weight}%)`}
                    score={scores[key] ?? 0}
                  />
                ))}
                <ScoreBar
                  label="Experience Relevance (advisory)"
                  score={scores.experience_relevance ?? 0}
                  color="bg-primary"
                />
              </>
            ) : (
              <>
                <ScoreBar label="Keyword Match" score={scores.keyword_match} />
                <ScoreBar
                  label="Keyword Frequency"
                  score={scores.keyword_frequency}
                />
                <ScoreBar label="Skills Alignment" score={scores.skills_alignment} />
                <ScoreBar
                  label="Experience Relevance"
                  score={scores.experience_relevance ?? 0}
                />
                <ScoreBar
                  label="Quantifiable Impact"
                  score={scores.quantifiable_impact}
                />
                <ScoreBar label="Bullet Quality" score={scores.bullet_quality} />
                <ScoreBar label="Format Score" score={scores.format_score} />
                <ScoreBar
                  label="Section Completeness"
                  score={scores.section_completeness}
                />
              </>
            )}
          </div>
        </div>
        <div className={SURFACE}>
          <p className="mb-1 text-sm font-semibold text-foreground">
            {v2 ? 'ATS Compatibility Checks' : 'ATS Scanner Scores'}
          </p>
          {v2 ? (
            <>
              <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
                Real parse-compatibility checks per platform. ATS don't score
                resumes; they parse them. These verify yours parses.
              </p>
              <div className="space-y-2.5">
                {scores.vendor_compat &&
                  Object.entries(scores.vendor_compat).map(([vendor, entry]) =>
                    entry ? (
                      <VendorChecklistCard
                        key={vendor}
                        vendor={VENDOR_LABELS[vendor] ?? vendor}
                        entry={entry}
                      />
                    ) : null,
                  )}
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              {scores.scanners &&
                Object.entries(scores.scanners).map(([n, s]) => (
                  <ScoreBar
                    key={n}
                    label={VENDOR_LABELS[n] ?? n}
                    score={s}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {!v2 && scores.ai_screener && (
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            AI Screener Analysis
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Overall" score={scores.ai_screener.overall} color="bg-primary" />
            <ScoreBar label="Relevance" score={scores.ai_screener.relevance} color="bg-primary" />
            <ScoreBar label="Seniority Fit" score={scores.ai_screener.seniority_fit} color="bg-primary" />
            <ScoreBar label="Culture Fit" score={scores.ai_screener.culture_fit} color="bg-primary" />
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
        ((matchGaps.defensible?.length ?? 0) +
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

      {v2 && levers.length > 0 && (
        <div className={SURFACE}>
          <p className="mb-1 text-sm font-semibold text-foreground">
            What would help most
          </p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Ranked by room left on the ATS score. None of these ask you to
            invent a skill.
          </p>
          <ul className="space-y-2">
            {levers.map((row) => (
              <li key={row.key} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-foreground">{row.action}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {row.weight}% of ATS score
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
