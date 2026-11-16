/**
 * The ATS score card: the one number shown after tailoring.
 *
 * Reads the backend's `ats` block (`services/ats_score.py`): a strict 0 to 100
 * score, its band word, the resume it was tailored from scored by the same
 * rules, which must-have skills are shown in real work, and at most three next
 * steps. Everything else the old panel showed (coverage bars, vendor guesses,
 * screener grades) is gone: one number, what moved it, what to do.
 *
 * The ring sweeps from the original resume's score to the tailored one, so the
 * gain is felt before it is read. Reduced motion shows the end state at once.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDashed,
  FolderGit2,
  Info,
  ListChecks,
  Lock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCountUp } from '@/hooks/useCountUp';
import { EASE_DECELERATE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { ATSScores, AtsResult } from '@/types/resume';

type Tone = { stroke: string; text: string; tint: string; glow: string };

const TONES: Record<string, Tone> = {
  excellent: { stroke: 'hsl(var(--signal))', text: 'text-signal', tint: 'bg-signal-tint', glow: 'hsl(var(--signal) / 0.22)' },
  strong: { stroke: 'hsl(var(--signal))', text: 'text-signal', tint: 'bg-signal-tint', glow: 'hsl(var(--signal) / 0.18)' },
  good: { stroke: 'hsl(var(--primary))', text: 'text-primary', tint: 'bg-primary/10', glow: 'hsl(var(--primary) / 0.14)' },
  fair: { stroke: 'hsl(var(--warning))', text: 'text-warning', tint: 'bg-warning/10', glow: 'hsl(var(--warning) / 0.14)' },
  weak: { stroke: 'hsl(var(--destructive))', text: 'text-destructive', tint: 'bg-destructive/10', glow: 'hsl(var(--destructive) / 0.12)' },
  needs_work: { stroke: 'hsl(var(--destructive))', text: 'text-destructive', tint: 'bg-destructive/10', glow: 'hsl(var(--destructive) / 0.12)' },
  unavailable: { stroke: 'hsl(var(--muted-foreground))', text: 'text-muted-foreground', tint: 'bg-muted', glow: 'transparent' },
};

/** One line that answers "can I send this?". */
function verdict(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 80) return 'Ready to send';
  if (score >= 70) return 'Close. The fixes below help most.';
  if (score >= 55) return 'Worth fixing before you apply';
  return 'Needs work before you apply';
}

/** Band for a score with no `ats` block (records scored before ats-1.0). */
function legacyBand(score: number): { band: string; label: string } {
  if (score >= 90) return { band: 'excellent', label: 'Excellent' };
  if (score >= 80) return { band: 'strong', label: 'Strong' };
  if (score >= 70) return { band: 'good', label: 'Good' };
  if (score >= 55) return { band: 'fair', label: 'Fair' };
  if (score >= 40) return { band: 'weak', label: 'Weak' };
  return { band: 'needs_work', label: 'Needs work' };
}

export const ATS_SCORE_HINT =
  'How an applicant tracking system and a recruiter would rank this resume for this job. Skills count most when a job bullet shows them with a result.';

function ScoreDial({ score, from, tone }: { score: number | null; from: number | null; tone: Tone }) {
  const reduce = useReducedMotion();
  const size = 120;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Start at the original resume's score, then sweep to the tailored one.
  const [target, setTarget] = useState<number>(reduce ? score ?? 0 : from ?? 0);
  useEffect(() => {
    const id = window.setTimeout(() => setTarget(score ?? 0), reduce ? 0 : 120);
    return () => window.clearTimeout(id);
  }, [score, reduce]);
  const shown = useCountUp(target, 900);
  const offset = c - (Math.max(0, Math.min(100, target)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="pointer-events-none absolute inset-2 rounded-full blur-xl"
        style={{ background: tone.glow }}
        aria-hidden
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        {score != null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE_DECELERATE }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('font-display text-[2.25rem] font-semibold tabular-nums tracking-tight', tone.text)}>
          {score == null ? 'N/A' : shown}
        </span>
        <span className="mt-1 text-caption-sm font-medium text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}

/** One segment per must-have skill, so the gap is seen at a glance. */
function MustHaveBar({ ats }: { ats: AtsResult }) {
  const { proven, in_projects: projects, listed_only: listed, missing } = ats.skills;
  const segments = [
    ...proven.map((s) => ({ s, cls: 'bg-signal', what: 'shown in your work' })),
    ...projects.map((s) => ({ s, cls: 'bg-signal/50', what: 'shown in a project' })),
    ...listed.map((s) => ({ s, cls: 'bg-warning/60', what: 'only in your skills list' })),
    ...missing.map((s) => ({ s, cls: 'bg-muted', what: 'not on your resume' })),
  ];
  if (!segments.length) return null;
  const shown = proven.length + projects.length;
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-body-sm font-semibold text-foreground">Must-have skills</p>
        <p className="text-caption tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{shown}</span> of {segments.length} shown in your work
        </p>
      </div>
      <div className="flex h-2 gap-1" role="img" aria-label={`${shown} of ${segments.length} must-have skills shown in your work`}>
        {segments.map(({ s, cls, what }) => (
          <span key={s} title={`${s}: ${what}`} className={cn('h-full flex-1 rounded-full', cls)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {proven.map((sk) => (
          <span key={`p-${sk}`} title="Shown in a job bullet" className="inline-flex items-center gap-1 rounded-full bg-signal-tint px-2 py-0.5 text-caption-sm font-medium text-signal">
            <Check className="h-3 w-3" aria-hidden />
            {sk}
          </span>
        ))}
        {projects.map((sk) => (
          <span key={`j-${sk}`} title="Shown in a project" className="inline-flex items-center gap-1 rounded-full border border-signal/30 px-2 py-0.5 text-caption-sm font-medium text-signal">
            <FolderGit2 className="h-3 w-3" aria-hidden />
            {sk}
          </span>
        ))}
        {listed.map((sk) => (
          <span
            key={`l-${sk}`}
            title="Only in your skills list. Show it in a job bullet."
            className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-caption-sm font-medium text-warning"
          >
            <ListChecks className="h-3 w-3" aria-hidden />
            {sk}
          </span>
        ))}
        {missing.map((sk) => (
          <span
            key={`m-${sk}`}
            title="Not on your resume"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-caption-sm font-medium text-muted-foreground"
          >
            <CircleDashed className="h-3 w-3" aria-hidden />
            {sk}
          </span>
        ))}
      </div>
    </div>
  );
}

function Breakdown({ ats }: { ats: AtsResult }) {
  if (!ats.components?.length) return null;
  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        How it is scored
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="space-y-2.5 px-5 pb-4">
        {ats.components.map((c) => {
          const pct = c.max ? Math.round((c.points / c.max) * 100) : 0;
          return (
            <li key={c.key} title={c.note || undefined}>
              <div className="flex items-baseline justify-between gap-3 text-caption">
                <span className="text-foreground">{c.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(c.points)}/{c.max}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', pct >= 80 ? 'bg-signal' : pct >= 55 ? 'bg-primary/70' : 'bg-warning/70')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
        {ats.deductions?.map((d) => (
          <li key={d.key} className="flex items-baseline justify-between gap-3 text-caption text-destructive">
            <span>{d.reason}</span>
            <span className="tabular-nums">{(-d.points).toString()}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

interface AtsScoreCardProps {
  scores: ATSScores | null;
  loading: boolean;
  error?: string;
  /** The resume changed after this score was computed. */
  stale?: boolean;
  onRescore?: () => void;
  jobTitle?: string;
  company?: string;
}

export function AtsScoreCard({ scores, loading, error, stale, onRescore, jobTitle, company }: AtsScoreCardProps) {
  const ats = scores?.ats;
  const overall = typeof scores?.overall === 'number' ? scores.overall : null;
  const score = ats ? ats.score : overall;
  const { band, label } = ats ? { band: ats.band, label: ats.label } : score != null ? legacyBand(score) : { band: 'unavailable', label: 'Not scored' };
  const tone = TONES[band] ?? TONES.unavailable;
  const before = typeof scores?.ats_before?.score === 'number' ? scores.ats_before.score : null;
  const gain = before != null && score != null ? score - before : null;
  const role = [jobTitle, company].filter(Boolean).join(' · ');

  return (
    <div className="overflow-hidden rounded-container border border-border bg-card shadow-soft" data-testid="ats-score-card">
      <div className="relative px-5 pb-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            ATS score
            <span
              title={ATS_SCORE_HINT}
              tabIndex={0}
              aria-label="What the ATS score means"
              className="inline-flex cursor-help rounded-full normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
            </span>
          </p>
          {stale && onRescore && !loading && (
            <Button variant="ghost" size="sm" onClick={onRescore} className="h-8 gap-1.5 px-2 text-caption" title="Score the edited resume">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Rescore
            </Button>
          )}
        </div>

        {loading && score == null ? (
          <div className="mt-3 flex items-center gap-5" role="status" aria-live="polite">
            <div className="relative h-[120px] w-[120px] shrink-0">
              <div className="absolute inset-0 rounded-full border-[9px] border-muted" />
              <div className="absolute inset-0 animate-spin rounded-full border-[9px] border-transparent border-t-primary/70 [animation-duration:1.4s]" />
            </div>
            <div className="space-y-2">
              <p className="text-title-sm font-semibold text-foreground">Scoring your resume</p>
              <p className="text-caption text-muted-foreground">Reading it the way an ATS does</p>
            </div>
          </div>
        ) : error && score == null ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3" role="alert">
            <p className="min-w-0 flex-1 text-sm text-destructive">{error}</p>
            {onRescore && (
              <Button variant="outline" size="sm" onClick={onRescore} className="min-h-10 shrink-0">
                Try again
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-5" aria-live="polite">
            <ScoreDial score={score} from={before} tone={tone} />
            <div className="min-w-0 space-y-1.5">
              <p className={cn('font-display text-[1.6rem] font-semibold leading-tight', tone.text)}>{label}</p>
              {role && <p className="truncate text-caption text-muted-foreground" title={role}>{role}</p>}
              {verdict(score) && <p className="text-body-sm font-medium text-foreground">{verdict(score)}</p>}
              {gain != null && (
                <p
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold tabular-nums',
                    gain > 0 ? 'bg-signal-tint text-signal' : 'bg-muted text-muted-foreground',
                  )}
                  title="Your original resume, scored by the same rules"
                >
                  {gain > 0 && <TrendingUp className="h-3.5 w-3.5" aria-hidden />}
                  <span className="font-medium">Before</span> {before}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  <span className="font-medium">Now</span> {score}
                  {gain > 0 && <span className="font-medium">(+{gain})</span>}
                </p>
              )}
              {ats?.band === 'unavailable' && ats.reason && (
                <p className="text-caption text-muted-foreground">{ats.reason}</p>
              )}
            </div>
          </div>
        )}

        {ats?.held_back_by && (
          <p className="mt-4 flex items-start gap-2 rounded-control bg-muted/60 px-3 py-2 text-caption text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{ats.held_back_by}</span>
          </p>
        )}
      </div>

      {ats && ats.score != null && (
        <>
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <MustHaveBar ats={ats} />
          </div>
          {ats.fixes?.length > 0 && (
            <div className="border-t border-border px-5 py-4 sm:px-6">
              <p className="mb-2 text-body-sm font-semibold text-foreground">To raise it</p>
              <ol className="space-y-2">
                {ats.fixes.map((fix, i) => (
                  <li key={fix} className="flex items-start gap-2.5 text-body-sm text-foreground">
                    <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-caption-sm font-bold', tone.tint, tone.text)}>
                      {i + 1}
                    </span>
                    <span className="leading-snug">{fix}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Breakdown ats={ats} />
        </>
      )}
    </div>
  );
}
