/**
 * ATS score inspector panel (Tailor right column).
 *
 * Presentational only — typed props in, render out. Branches on the score
 * schema version: v2 (honest deterministic rubric + real per-vendor parse
 * checklists) vs v1 (stored records from before the cutover, which still
 * carry the legacy scanner/ai_screener blocks). Old records must render
 * forever — never assume v2 fields.
 */
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScoreRing,
  ScoreBar,
  PDFParseabilityCard,
  VendorChecklistCard,
} from '@/components/resume/tailored/ScoreDisplay';
import { isAtsV2, ATS_V2_RUBRIC, VENDOR_LABELS } from '@/lib/atsScores';

import type { ATSScores } from './types';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

interface AtsScorePanelProps {
  scores: ATSScores | null;
  onAddKeyword: (kw: string) => void;
  addedKeywords: Set<string>;
  /** True when the resume changed after this score was computed. */
  stale?: boolean;
  onRescore?: () => void;
  rescoring?: boolean;
}

export function AtsScorePanel({
  scores,
  onAddKeyword,
  addedKeywords,
  stale = false,
  onRescore,
  rescoring = false,
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

  const v2 = isAtsV2(scores);
  const classified = scores.missing_keywords_classified;

  return (
    <div className="space-y-5 p-5 sm:p-6">
      {/* Staleness banner — the score describes a previous version */}
      {stale && (
        <div className="flex items-center justify-between gap-3 rounded-container border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-xs text-foreground">
            <span className="font-semibold">Edited since scored</span> — the
            numbers below reflect the pre-edit resume.
          </p>
          {onRescore && (
            <button
              type="button"
              onClick={onRescore}
              disabled={rescoring}
              className="shrink-0 rounded-control border border-warning/50 px-2.5 py-1 text-[11px] font-semibold text-warning hover:bg-warning/15 disabled:opacity-50"
            >
              {rescoring ? 'Re-scoring…' : 'Re-score'}
            </button>
          )}
        </div>
      )}

      {/* Render failure — invalidates everything else, lead with it */}
      {v2 && scores.render_error && (
        <div className="flex items-start gap-2.5 rounded-container border border-destructive/40 bg-destructive/10 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-foreground">
            <span className="font-semibold text-destructive">
              Your resume PDF failed to render or parse.
            </span>{' '}
            No ATS can read it in this state — the overall score is capped
            until this is fixed. ({scores.render_error})
          </p>
        </div>
      )}

      {/* Overall score ring */}
      <div className="rounded-container border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-6">
          <ScoreRing score={scores.overall} />
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">
              Overall ATS Score
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {v2
                ? 'Deterministic, research-backed rubric — 75-80 is the honest target band; scores above 85 usually mean keyword stuffing, not a better resume.'
                : 'Weighted score across all dimensions'}
            </p>
          </div>
        </div>
      </div>

      {/* Score breakdown + per-vendor column */}
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
                  score={scores.experience_relevance}
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
                Real parse-compatibility checks per platform — ATS don't score
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

      {/* PDF parseability */}
      {scores.pdf_parseable_score !== undefined && (
        <PDFParseabilityCard
          score={scores.pdf_parseable_score}
          checks={scores.pdf_parseable_checks || {}}
          warnings={scores.pdf_parseable_warnings || []}
        />
      )}

      {/* AI screener — v1 records only (v2 removed the pseudo-signal) */}
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

      {/* Missing keywords — classification-aware when the backend provides it:
          only real SKILLS are one-click addable; logistics terms are
          informational; compliance frameworks need real domain evidence. */}
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
              Click a skill to add it — only claim what you can defend
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(classified?.skills ?? scores.missing_keywords).map((kw) => {
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
                    <span className="text-[13px] leading-none opacity-60 group-hover:opacity-100">+</span>
                  )}
                  {kw}
                </button>
              );
            })}
            {classified?.compliance.map((kw) => (
              <span
                key={kw}
                title="Compliance frameworks need real domain experience — add only if your history genuinely shows it."
                className="inline-flex items-center gap-1 rounded-control border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
              >
                <AlertTriangle className="h-3 w-3" />
                {kw}
              </span>
            ))}
            {classified?.logistics.map((kw) => (
              <span
                key={kw}
                title="Describes the job's working arrangement — not a resume skill."
                className="inline-flex items-center gap-1 rounded-control border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                <Info className="h-3 w-3" />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
