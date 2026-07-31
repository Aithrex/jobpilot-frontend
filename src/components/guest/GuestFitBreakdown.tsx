import { AlertTriangle, Check, Quote, ScrollText } from 'lucide-react';
import { humanizeBand } from '@/components/guest/_shared';
import { cn } from '@/lib/utils';
import type {
  GuestFitComponent,
  GuestFitConstraint,
  GuestFitEvidence,
  GuestFitScore,
  GuestJobMatch,
} from '@/types/guest';

/**
 * FitScore v2 breakdown: WHY the headline number is what it is.
 *
 * Every part of this renders only from what the server sent. There is no
 * client-side scoring, no inferred component, no synthesized reason: when the
 * v2 block is absent (older backend / older cache) `normalizeFit` returns null
 * and the caller keeps today's single-scalar presentation with no crash.
 *
 * The one thing resolved locally is DISPLAY: a component key's human label and
 * its published weight, used only to caption and scale a bar the server's own
 * numbers drive.
 */

/** Published component weights, used ONLY to caption a component and to scale
 * its bar when the server did not send an explicit `max`. Never to compute a
 * score. Unknown keys fall back to the raw key and no bar. */
// Keys MUST match what shared/python/services/fit_score.py emits in
// `components`. They were written from the ADR first and drifted: four of the
// seven (role_title / experience_seniority / location_work_mode /
// education_certification) did not exist in the payload, so those rows fell
// through to a humanized key with no bar. Verified against a live score_one()
// call. The aliases below keep the ADR spellings working if the server ever
// emits them, so this cannot silently regress a second time.
const COMPONENT_META: Record<string, { label: string; max: number }> = {
  role_alignment: { label: 'Role and title', max: 25 },
  required_skills: { label: 'Required skills', max: 30 },
  experience: { label: 'Experience and seniority', max: 20 },
  preferred_skills: { label: 'Preferred skills', max: 10 },
  domain: { label: 'Domain', max: 5 },
  location: { label: 'Location and work mode', max: 5 },
  education: { label: 'Education, certification, license', max: 5 },
  // ADR-002 spellings, tolerated as aliases.
  role_title: { label: 'Role and title', max: 25 },
  experience_seniority: { label: 'Experience and seniority', max: 20 },
  location_work_mode: { label: 'Location and work mode', max: 5 },
  education_certification: { label: 'Education, certification, license', max: 5 },
};

export interface NormalizedFitComponent {
  key: string;
  label: string;
  score: number;
  /** Undefined when neither the server nor the published table gives a max  - 
  * then the points render without a proportion bar. */
  max?: number;
}

export interface NormalizedFit {
  score?: number;
  band?: string;
  confidence?: string;
  scoreVersion?: string;
  explanation?: string;
  components: NormalizedFitComponent[];
  /** Evidence-backed fit reasons (evidence first, strengths as the fallback). */
  reasons: Array<{ label?: string; text: string }>;
  missing: GuestFitConstraint[];
  hardConstraints: GuestFitConstraint[];
}

function toConstraint(item: GuestFitConstraint | string): GuestFitConstraint | null {
  if (typeof item === 'string') return item.trim() ? { text: item.trim() } : null;
  if (!item || typeof item !== 'object') return null;
  const text = typeof item.text === 'string' ? item.text.trim() : '';
  const label = typeof item.label === 'string' ? item.label.trim() : '';
  if (!text && !label) return null;
  return {
  ...(label ? { label } : {}),
  ...(text ? { text } : {}),
  ...(typeof item.satisfied === 'boolean' ? { satisfied: item.satisfied } : {}),
  };
}

function toReason(item: GuestFitEvidence | string): { label?: string; text: string } | null {
  if (typeof item === 'string') return item.trim() ? { text: item.trim() } : null;
  if (!item || typeof item !== 'object') return null;
  const text = typeof item.text === 'string' ? item.text.trim() : '';
  if (!text) return null;
  const rawLabel =
  (typeof item.label === 'string' && item.label.trim()) ||
  (typeof item.component === 'string' && item.component.trim()) ||
  '';
  const label = rawLabel ? (COMPONENT_META[rawLabel]?.label ?? humanizeBand(rawLabel)) : '';
  return label ? { label, text } : { text };
}

function toComponent(key: string, value: number | GuestFitComponent): NormalizedFitComponent | null {
  const meta = COMPONENT_META[key];
  if (typeof value === 'number') {
  if (!Number.isFinite(value)) return null;
  return { key, label: meta?.label ?? humanizeBand(key), score: value, max: meta?.max };
  }
  if (!value || typeof value !== 'object') return null;
  const score = typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : null;
  if (score === null) return null;
  const resolvedKey = (typeof value.key === 'string' && value.key.trim()) || key;
  const max =
  typeof value.max === 'number' && Number.isFinite(value.max) && value.max > 0
  ? value.max
  : COMPONENT_META[resolvedKey]?.max;
  const label =
  (typeof value.label === 'string' && value.label.trim()) ||
  COMPONENT_META[resolvedKey]?.label ||
  humanizeBand(resolvedKey);
  return { key: resolvedKey, label, score, max };
}

/**
 * Reduce a server FitScore into exactly what is renderable. Returns null when
 * the payload carries nothing beyond the scalar the card already shows, so
 * callers can degrade to today's behavior.
 */
export function normalizeFit(fit?: GuestFitScore | null): NormalizedFit | null {
  if (!fit || typeof fit !== 'object') return null;

  const components: NormalizedFitComponent[] = [];
  const raw = fit.components;
  if (Array.isArray(raw)) {
  raw.forEach((c, i) => {
  const key = (typeof c?.key === 'string' && c.key.trim()) || `component_${i}`;
  const norm = toComponent(key, c);
  if (norm) components.push(norm);
  });
  } else if (raw && typeof raw === 'object') {
  for (const [key, value] of Object.entries(raw)) {
  const norm = toComponent(key, value);
  if (norm) components.push(norm);
  }
  }

  const evidence = (Array.isArray(fit.evidence) ? fit.evidence : [])
  .map(toReason)
  .filter((r): r is { label?: string; text: string } => !!r);
  const strengths = (Array.isArray(fit.strengths) ? fit.strengths : [])
  .map(toReason)
  .filter((r): r is { label?: string; text: string } => !!r);
  // Evidence is the evidence-backed surface; strengths only fill a gap.
  const reasons = (evidence.length ? evidence : strengths).slice(0, 3);

  const missing = (Array.isArray(fit.missing_requirements) ? fit.missing_requirements : [])
  .map(toConstraint)
  .filter((c): c is GuestFitConstraint => !!c);
  const hardConstraints = (Array.isArray(fit.hard_constraints) ? fit.hard_constraints : [])
  .map(toConstraint)
  .filter((c): c is GuestFitConstraint => !!c);

  const band = typeof fit.band === 'string' && fit.band.trim() ? fit.band.trim() : undefined;
  const explanation =
  typeof fit.explanation === 'string' && fit.explanation.trim()
  ? fit.explanation.trim()
  : undefined;

  const hasContent =
  components.length > 0 ||
  reasons.length > 0 ||
  missing.length > 0 ||
  hardConstraints.length > 0 ||
  !!band ||
  !!explanation;
  if (!hasContent) return null;

  return {
  score: typeof fit.score === 'number' ? fit.score : undefined,
  band,
  confidence:
  typeof fit.confidence === 'string' && fit.confidence.trim()
  ? fit.confidence.trim()
  : undefined,
  scoreVersion:
  typeof fit.score_version === 'string' && fit.score_version.trim()
  ? fit.score_version.trim()
  : undefined,
  explanation,
  components,
  reasons,
  missing,
  hardConstraints,
  };
}

/** Read the fit block off a match (tolerating the `fit_score` alias). */
export function fitOf(match: GuestJobMatch): NormalizedFit | null {
  const raw = match.fit ?? (match as { fit_score?: GuestFitScore }).fit_score;
  return normalizeFit(raw);
}

function ConstraintList({
  title, note, items, tone,
}: {
  title: string;
  note: string;
  items: GuestFitConstraint[];
  tone: 'warning' | 'muted';
}) {
  if (items.length === 0) return null;
  return (
  <div>
  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  {title}
  </p>
  <ul className="space-y-1.5">
  {items.map((c, i) => {
  const satisfied = c.satisfied === true;
  const label = [c.label, c.text].filter(Boolean).join(': ');
  return (
  <li
  key={`${c.label ?? ''}-${c.text ?? ''}-${i}`}
  className="flex items-start gap-2 text-sm leading-relaxed"
  >
  {satisfied ? (
  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
  ) : (
  <AlertTriangle
  className={cn(
  'mt-0.5 h-3.5 w-3.5 shrink-0',
  tone === 'warning' ? 'text-warning' : 'text-muted-foreground',
  )}
  aria-hidden
  />
  )}
  <span>
  {label}
  {satisfied && <span className="sr-only"> (your resume meets this)</span>}
  </span>
  </li>
  );
  })}
  </ul>
  <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>
  </div>
  );
}

export interface GuestFitBreakdownProps {
  fit: NormalizedFit;
  className?: string;
}

export function GuestFitBreakdown({ fit, className }: GuestFitBreakdownProps) {
  const totalMax = fit.components.reduce((sum, c) => sum + (c.max ?? 0), 0);
  const totalScore = fit.components.reduce((sum, c) => sum + c.score, 0);

  return (
  <section
  className={cn('space-y-4 rounded-xl border border-border bg-muted/20 p-3.5', className)}
  aria-label="How this fit score was calculated"
  data-testid="fit-breakdown"
  >
  <div className="flex flex-wrap items-baseline justify-between gap-2">
  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  <ScrollText className="h-3.5 w-3.5" aria-hidden />
  How we scored this fit
  </p>
  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
  {fit.band && (
  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
  {humanizeBand(fit.band)} fit
  </span>
  )}
  {fit.confidence && <span>Confidence: {humanizeBand(fit.confidence)}</span>}
  {fit.scoreVersion && <span className="tabular-nums">Scorer {fit.scoreVersion}</span>}
  </div>
  </div>

  {fit.explanation && <p className="text-sm leading-relaxed">{fit.explanation}</p>}

  {fit.components.length > 0 && (
  <div>
  <ul className="space-y-2">
  {fit.components.map((c) => {
  const pct =
  typeof c.max === 'number' && c.max > 0
  ? Math.max(0, Math.min(100, (c.score / c.max) * 100))
  : null;
  return (
  <li key={c.key} className="space-y-1">
  <div className="flex items-baseline justify-between gap-3 text-xs">
  <span className="min-w-0 truncate">{c.label}</span>
  <span className="shrink-0 font-semibold tabular-nums">
  {typeof c.max === 'number' ? `${c.score} of ${c.max}` : `${c.score}`}
  </span>
  </div>
  {pct !== null && (
  <div className="h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
  </div>
  )}
  </li>
  );
  })}
  </ul>
  {totalMax > 0 && (
  <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
  {totalScore} of {totalMax} points across the components above.
  </p>
  )}
  </div>
  )}

  {fit.reasons.length > 0 && (
  <div>
  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  Why this scored the way it did
  </p>
  <ul className="space-y-1.5">
  {fit.reasons.map((r, i) => (
  <li key={`${r.label ?? ''}-${i}`} className="flex items-start gap-2 text-sm leading-relaxed">
  <Quote className="mt-1 h-3 w-3 shrink-0 text-primary" aria-hidden />
  <span>
  {r.label && <span className="font-medium">{r.label}: </span>}
  {r.text}
  </span>
  </li>
  ))}
  </ul>
  </div>
  )}

  <ConstraintList
  title="Requirements your resume does not show"
  note="Read off this posting, not a judgement of your experience."
  items={fit.missing}
  tone="warning"
  />
  <ConstraintList
  title="Hard requirements in this posting"
  note="These are stated as non-negotiable by the employer."
  items={fit.hardConstraints}
  tone="muted"
  />
  </section>
  );
}
