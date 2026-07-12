/**
 * ATS score inspector panel (Tailor right column).
 *
 * Presentational only — typed props in, render out. Ported from the classic
 * `ATSPanel` in ResumeParser, rebuilt on semantic tokens + shadcn/ui. Reuses the
 * shared score atoms (ScoreRing / ScoreBar / PDFParseabilityCard) verbatim so
 * the classic and app-shell flows render identical visuals.
 */
import { CheckCircle2, AlertTriangle, XCircle, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScoreRing,
  ScoreBar,
  PDFParseabilityCard,
} from '@/components/resume/tailored/ScoreDisplay';

import type { ATSScores } from './types';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

interface AtsScorePanelProps {
  scores: ATSScores | null;
  onAddKeyword: (kw: string) => void;
  addedKeywords: Set<string>;
}

export function AtsScorePanel({
  scores,
  onAddKeyword,
  addedKeywords,
}: AtsScorePanelProps) {
  // ── Loading state — mirror the real layout (ring card + bar rows). ──
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

  const pdfScore = (scores as Record<string, unknown>).pdf_parseable_score;

  return (
    <div className="space-y-5 p-5 sm:p-6">
      {/* Overall score ring */}
      <div className="rounded-container border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-6">
          <ScoreRing score={scores.overall} />
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">
              Overall ATS Score
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Weighted score across all dimensions
            </p>
          </div>
        </div>
      </div>

      {/* Score breakdown + scanner scores */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            Score Breakdown
          </p>
          <div className="space-y-3">
            <ScoreBar label="Keyword Match" score={scores.keyword_match} />
            <ScoreBar
              label="Keyword Frequency"
              score={scores.keyword_frequency}
            />
            <ScoreBar label="Skills Alignment" score={scores.skills_alignment} />
            <ScoreBar
              label="Experience Relevance"
              score={scores.experience_relevance}
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
          </div>
        </div>
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            ATS Scanner Scores
          </p>
          <div className="space-y-3">
            {scores.scanners &&
              Object.entries(scores.scanners).map(([n, s]) => (
                <ScoreBar
                  key={n}
                  label={n.charAt(0).toUpperCase() + n.slice(1)}
                  score={s}
                />
              ))}
          </div>
        </div>
      </div>

      {/* PDF parseability (present only on some payloads) */}
      {pdfScore !== undefined && (
        <PDFParseabilityCard
          score={pdfScore as number}
          checks={
            ((scores as Record<string, unknown>)
              .pdf_parseable_checks as Record<string, unknown>) || {}
          }
          warnings={
            ((scores as Record<string, unknown>)
              .pdf_parseable_warnings as string[]) || []
          }
        />
      )}

      {/* AI screener */}
      {scores.ai_screener && (
        <div className={SURFACE}>
          <p className="mb-4 text-sm font-semibold text-foreground">
            AI Screener Analysis
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar
              label="Overall"
              score={scores.ai_screener.overall}
              color="bg-primary"
            />
            <ScoreBar
              label="Relevance"
              score={scores.ai_screener.relevance}
              color="bg-primary"
            />
            <ScoreBar
              label="Seniority Fit"
              score={scores.ai_screener.seniority_fit}
              color="bg-primary"
            />
            <ScoreBar
              label="Culture Fit"
              score={scores.ai_screener.culture_fit}
              color="bg-primary"
            />
          </div>
        </div>
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

      {/* Missing keywords — clickable to add */}
      {scores.missing_keywords?.length > 0 && (
        <div className={SURFACE}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-foreground">
                Missing Keywords
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Click to add to your skills
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scores.missing_keywords.map((kw) => {
              const added = addedKeywords.has(kw);
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => !added && onAddKeyword(kw)}
                  disabled={added}
                  className={cn(
                    'group inline-flex items-center gap-1 rounded-control border px-2.5 py-1 text-[11px] font-medium transition-all duration-200',
                    added
                      ? 'cursor-default border-success/25 bg-success/10 text-success'
                      : 'border-destructive/25 bg-destructive/10 text-destructive hover:-translate-y-px hover:border-primary/40 hover:bg-primary/15 hover:text-primary',
                  )}
                >
                  {added ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  )}
                  {kw}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
