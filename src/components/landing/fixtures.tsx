import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared illustrative fixture data + atoms for the landing's animated
 * product stages (How it works, Capabilities). Built from the real UI
 * patterns (score badge, skill chips, sponsorship row, tailor diff) rather
 * than screenshots, so they stay on-token and weightless.
 *
 * All data is clearly fictional: made-up companies, no real names, and every
 * stage carries the Illustrative chip. Scores always read as estimates;
 * success green appears only on positive evidence and integrity-pass rows.
 */

export const FIXTURE_SKILLS = ['SQL', 'Python', 'Tableau', 'dbt'] as const;

export const FIXTURE_REQUIREMENTS = [
  { label: 'SQL', matched: true },
  { label: 'Tableau', matched: true },
  { label: 'Python', matched: true },
  { label: 'Snowflake', matched: false },
] as const;

export const FIXTURE_JOBS = [
  { title: 'Senior data analyst', company: 'Brightpath Health', score: 87 },
  { title: 'Analytics engineer', company: 'Northgate Mobility', score: 82 },
  { title: 'BI developer', company: 'Cobalt Grid Energy', score: 78 },
  { title: 'Data analyst', company: 'Juniper Retail Group', score: 74 },
  { title: 'Reporting analyst', company: 'Harborline Logistics', score: 71 },
] as const;

export const FIXTURE_BULLET = {
  before: 'Worked on data pipelines and reporting for the clinical team',
  after: 'Built and maintained SQL data pipelines powering clinical reporting',
} as const;

export const FIXTURE_LOCKED_FACTS = [
  { kind: 'Employer', value: 'Brightpath Health' },
  { kind: 'Title', value: 'Data analyst' },
  { kind: 'Dates', value: '2021 to 2025' },
  { kind: 'Skills', value: 'SQL, Python' },
] as const;

/** "Illustrative example" marker every fixture stage wears. */
export function IllustrativeChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
        className,
      )}
    >
      Illustrative
    </span>
  );
}

/**
 * A number that counts up to `value` on mount. Starts at 40% of the target so
 * the digit count (and therefore layout, with tabular-nums) never changes.
 * Static under reduced motion. Remount (key it) to replay inside loops.
 */
export function CountUpNumber({ value, duration = 0.8, className }: { value: number; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduce ? value : Math.round(value * 0.4)));

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(Math.round(value * 0.4), value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={className}>{display}</span>;
}

/** Match score, always visibly framed as an estimate. */
export function ScoreBadge({
  score,
  size = 'sm',
  countUp = false,
  className,
}: {
  score: number;
  size?: 'sm' | 'xs';
  /** Animate the number up on mount (reduced-motion aware). */
  countUp?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-baseline gap-1 rounded-control bg-primary/10 font-mono font-bold tabular-nums text-primary',
        size === 'sm' ? 'px-2 py-0.5 text-sm' : 'px-1.5 py-0.5 text-xs',
        className,
      )}
    >
      {countUp ? <CountUpNumber value={score} /> : score}
      <span className="text-[10px] font-medium text-primary/80">est.</span>
    </span>
  );
}

/** Skill / requirement chip. `matched` = solid indigo, `gap` = dashed muted. */
export function SkillChip({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'matched' | 'gap';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone === 'neutral' && 'border-border bg-card text-muted-foreground',
        tone === 'matched' && 'border-primary/30 bg-primary/10 text-primary',
        tone === 'gap' && 'border-dashed border-input bg-card text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The immutable-facts strip: employer, title, dates, skills with lock
 * glyphs. Visibly unchanged while tailoring animates around it.
 */
export function LockedFactsRow({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Locked facts</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {FIXTURE_LOCKED_FACTS.map((fact) => (
          <li
            key={fact.kind}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {fact.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The IntegrityGuard pass state, the one sanctioned success-green ending. */
export function IntegrityPassRow({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 rounded-control border border-success/25 bg-success/5 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-success',
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
      IntegrityGuard passed. Same employers, titles, dates, and skills.
    </p>
  );
}
