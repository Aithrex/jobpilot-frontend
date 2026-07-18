import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  FileText,
  FolderGit2,
  Mail,
  Orbit,
  PenLine,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE, MonoChip, Reveal, SectionHeading } from './_shared';

/**
 * "Every feature, working" - the supporting features as an asymmetric bento
 * grid of LIVE micro-demos. Each cell runs a tiny deterministic loop (a step
 * machine driven by one timeout chain) instead of an icon + sentence:
 *   - in-view gated as a GROUP (one observer on the grid) with per-cell start
 *     offsets so the loops never pulse in sync;
 *   - hovering a card pauses that card's loop (a courtesy, not a control);
 *   - prefers-reduced-motion parks every demo on its composed end state;
 *   - movement is transform/opacity only; tint changes are tiny
 *     transition-colors on hairline bars.
 * All data in the demos is fictional (the section header carries one
 * "Illustrative data" chip). Cards are non-interactive: hover is a lift only.
 */

// ── Loop timings (ms per step) ───────────────────────────────────────────────
const SCAM_STEPS = [1500, 1500, 1300, 1500, 2600] as const;
const READY_STEPS = [1700, 650, 650, 650, 2600] as const;
const GIT_STEPS = [500, 1900, 1100, 2800] as const;
const LI_STEPS = [700, 1800, 1000, 2800] as const;
const PREP_STEPS = [1300, 1700, 1500, 2800] as const;
const PIPE_STEPS = [900, 1500, 1300, 3000] as const;
const OPT_STEPS = [500, 2000, 3000] as const;
const COVER_STEPS = [700, 1200, 1400, 2800] as const;
const BATCH_STEPS = [800, 1300, 1200, 2800] as const;
const TREND_STEPS = [500, 1800, 3000] as const;

// ── The per-cell step loop ───────────────────────────────────────────────────
interface CellLoop {
  step: number;
  cycle: number;
  onPause: () => void;
  onResume: () => void;
}

/**
 * Advances 0..count-1 and wraps (incrementing `cycle` so scenes can remount
 * and replay). Runs only while the grid is in view and motion is allowed;
 * `offset` staggers the very first tick so neighbouring cells desync. Under
 * reduced motion it parks on `restAt` (the composed end state) forever.
 */
function useCellLoop(
  count: number,
  {
    active,
    reduce,
    durations,
    offset = 0,
    restAt,
  }: { active: boolean; reduce: boolean; durations: readonly number[]; offset?: number; restAt?: number },
): CellLoop {
  const rest = restAt ?? count - 1;
  const [frame, setFrame] = useState({ step: 0, cycle: 0 });
  const [paused, setPaused] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (reduce || !active || paused) return;
    const dwell = (durations[frame.step] ?? 2000) + (started.current ? 0 : offset);
    const id = window.setTimeout(() => {
      started.current = true;
      setFrame((f) => (f.step + 1 >= count ? { step: 0, cycle: f.cycle + 1 } : { step: f.step + 1, cycle: f.cycle }));
    }, dwell);
    return () => window.clearTimeout(id);
  }, [frame, active, reduce, paused, count, durations, offset]);

  return {
    step: reduce ? rest : frame.step,
    cycle: frame.cycle,
    onPause: () => setPaused(true),
    onResume: () => setPaused(false),
  };
}

/** Honest settling counter: eases prev -> target; snaps to `from` each cycle;
 *  exact and instant under reduced motion. */
function useCount(
  target: number,
  { run, reduce, from = 0, dur = 900, resetKey = 0 }: { run: boolean; reduce: boolean; from?: number; dur?: number; resetKey?: number },
) {
  const [val, setVal] = useState(reduce ? target : from);
  const shown = useRef(reduce ? target : from);
  const lastReset = useRef(resetKey);

  useEffect(() => {
    if (reduce) {
      shown.current = target;
      setVal(target);
      return;
    }
    if (lastReset.current !== resetKey) {
      lastReset.current = resetKey;
      shown.current = from;
    }
    if (!run) {
      setVal(shown.current);
      return;
    }
    const start = shown.current;
    if (start === target) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (target - start) * e);
      shown.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduce, from, dur, resetKey]);

  return val;
}

// ── Tiny scene atoms ─────────────────────────────────────────────────────────
type Tone = 'danger' | 'success' | 'warning' | 'primary' | 'neutral';

const TONE: Record<Tone, string> = {
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  primary: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-border bg-muted/60 text-muted-foreground',
};

function MicroTag({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Pop-in (opacity + scale). `initial` hidden so remount-per-cycle replays. */
function Popin({
  on,
  reduce,
  delay = 0,
  from = 0.85,
  className,
  children,
}: {
  on: boolean;
  reduce: boolean;
  delay?: number;
  from?: number;
  className?: string;
  children: ReactNode;
}) {
  const hidden = { opacity: 0, scale: reduce ? 1 : from };
  return (
    <motion.span
      className={className}
      initial={reduce ? false : hidden}
      animate={on ? { opacity: 1, scale: 1 } : hidden}
      transition={{ duration: reduce ? 0 : 0.26, ease: EASE, delay: on && !reduce ? delay : 0 }}
    >
      {children}
    </motion.span>
  );
}

/** Rise-in (opacity + y) for bubbles and blocks. */
function Rise({
  on,
  reduce,
  delay = 0,
  y = 8,
  className,
  children,
}: {
  on: boolean;
  reduce: boolean;
  delay?: number;
  y?: number;
  className?: string;
  children: ReactNode;
}) {
  const hidden = { opacity: 0, y: reduce ? 0 : y };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : hidden}
      animate={on ? { opacity: 1, y: 0 } : hidden}
      transition={{ duration: reduce ? 0 : 0.38, ease: EASE, delay: on && !reduce ? delay : 0 }}
    >
      {children}
    </motion.div>
  );
}

/** Stamp slam: scales DOWN into place. */
function Slam({ on, reduce, className, children }: { on: boolean; reduce: boolean; className?: string; children: ReactNode }) {
  const hidden = { opacity: 0, scale: reduce ? 1 : 1.4 };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : hidden}
      animate={on ? { opacity: 1, scale: 1 } : hidden}
      transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Scan beam sweeping a mini card. Mounts only for its step; never renders
 *  under reduced motion. */
function Beam({ on, reduce }: { on: boolean; reduce: boolean }) {
  if (reduce || !on) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
      initial={{ x: -48, opacity: 0 }}
      animate={{ x: 340, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    />
  );
}

/** Skeleton text line. */
function Bar({ w, className }: { w: string; className?: string }) {
  return <div className={cn('h-1.5 rounded-full bg-muted-foreground/25', w, className)} />;
}

// ── Card chrome ──────────────────────────────────────────────────────────────
interface CellProps {
  active: boolean;
  reduce: boolean;
  offset: number;
}

function BentoCard({
  index,
  tag,
  title,
  line,
  demoLabel,
  onPause,
  onResume,
  children,
}: {
  index: string;
  tag: string;
  title: string;
  line: string;
  demoLabel: string;
  onPause: () => void;
  onResume: () => void;
  children: ReactNode;
}) {
  return (
    <article
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      className={cn(
        'flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-soft',
        'transition-[border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-panel',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div role="img" aria-label={demoLabel} className="relative h-36 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        {children}
      </div>
      <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {index} · {tag}
      </p>
      <h3 className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{line}</p>
    </article>
  );
}

// ── 01 · Scam shield (featured) ──────────────────────────────────────────────
function ScamShieldCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(SCAM_STEPS.length, {
    active,
    reduce,
    durations: SCAM_STEPS,
    offset,
    restAt: 4,
  });
  return (
    <BentoCard
      index="01"
      tag="Shield"
      title="Scam and ghost-job shield"
      line="Fraud signals caught before you spend a single minute."
      demoLabel="Animated demo: a fake posting is scanned, flagged for no website, six reposts and upfront pay, then stamped blocked; a real posting scans clean and is marked legit."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex items-stretch gap-3 p-3">
        {/* The scam posting */}
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-card p-2.5 shadow-soft">
          <Bar w="w-3/5" className="bg-foreground/60" />
          <Bar w="w-2/5" className="mt-1.5" />
          <div className="mt-3 flex flex-wrap gap-1">
            {['NO WEBSITE', 'REPOSTED 6X', 'PAY UPFRONT'].map((flag, fi) => (
              <Popin key={flag} on={step >= 1} reduce={reduce} delay={fi * 0.14}>
                <MicroTag tone="danger">{flag}</MicroTag>
              </Popin>
            ))}
          </div>
          <Slam on={step >= 2} reduce={reduce} className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="-rotate-6 rounded border-2 border-destructive bg-card/85 px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.2em] text-destructive">
              BLOCKED
            </span>
          </Slam>
          <Beam on={step === 0} reduce={reduce} />
        </div>
        {/* The real posting */}
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-card p-2.5 shadow-soft">
          <Bar w="w-1/2" className="bg-foreground/60" />
          <Bar w="w-2/3" className="mt-1.5" />
          <Bar w="w-2/5" className="mt-1.5" />
          <div className="mt-3">
            <Popin on={step >= 4} reduce={reduce}>
              <MicroTag tone="success">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                LEGIT
              </MicroTag>
            </Popin>
          </div>
          <Beam on={step === 3} reduce={reduce} />
        </div>
      </div>
    </BentoCard>
  );
}

// ── 02 · Readiness score ─────────────────────────────────────────────────────
const READY_ROWS = ['RESUME', 'PROJECTS', 'REFERRALS'] as const;

function ReadinessCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(READY_STEPS.length, {
    active,
    reduce,
    durations: READY_STEPS,
    offset,
    restAt: 4,
  });
  const score = useCount(72, { run: active, reduce, dur: 1300, resetKey: cycle });
  return (
    <BentoCard
      index="02"
      tag="Score"
      title="Career Readiness Score"
      line="One honest number, and a guided path to raise it."
      demoLabel="Animated demo: a readiness ring fills to 72 out of 100 while resume, projects and referrals check off, then a plus six chip pops."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex items-center justify-center gap-5 p-3">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg aria-hidden viewBox="0 0 84 84" className="h-full w-full -rotate-90">
            <circle cx="42" cy="42" r="35" fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
            <motion.circle
              cx="42"
              cy="42"
              r="35"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="7"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 0.72 }}
              transition={{ duration: reduce ? 0 : 1.4, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-lg font-bold tabular-nums leading-none text-foreground">{score}</div>
              <div className="mt-0.5 font-mono text-[8px] font-semibold tracking-widest text-muted-foreground">SCORE</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {READY_ROWS.map((row, ri) => {
            const done = step >= ri + 1;
            return (
              <div key={row} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'grid h-3.5 w-3.5 place-items-center rounded-full border transition-colors duration-300',
                    done ? 'border-success/40 bg-success/15 text-success' : 'border-border bg-card text-transparent',
                  )}
                >
                  <Popin on={done} reduce={reduce} className="grid">
                    <Check className="h-2 w-2" strokeWidth={3.5} aria-hidden />
                  </Popin>
                </span>
                <span className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">{row}</span>
              </div>
            );
          })}
        </div>
        <Popin on={step >= 4} reduce={reduce} className="absolute right-2 top-2">
          <MicroTag tone="success">+6</MicroTag>
        </Popin>
      </div>
    </BentoCard>
  );
}

// ── 03 · GitHub proof ────────────────────────────────────────────────────────
const GIT_LEVELS = [
  0.15, 0.35, 0.55, 0.25, 0.75, 0.45, 0.9,
  0.3, 0.6, 0.2, 0.8, 0.4, 1, 0.65,
  0.2, 0.45, 0.7, 0.35, 0.85, 0.55, 0.95,
  0.4, 0.25, 0.6, 0.9, 0.5, 0.75, 1,
] as const;

function GithubProofCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(GIT_STEPS.length, {
    active,
    reduce,
    durations: GIT_STEPS,
    offset,
    restAt: 3,
  });
  const lit = step >= 1;
  return (
    <BentoCard
      index="03"
      tag="Proof"
      title="GitHub proof of skill"
      line="Public repos read as verified evidence, not claims."
      demoLabel="Animated demo: a commit graph lights up left to right, then a repository chip receives a verified stamp."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex items-center justify-between gap-3 p-4">
        <div aria-hidden className="grid shrink-0 grid-cols-7 gap-1">
          {GIT_LEVELS.map((level, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-[3px] bg-primary transition-opacity duration-500"
              style={{
                opacity: lit ? Math.max(level, 0.15) : 0.12,
                transitionDelay: lit && !reduce ? `${(i % 7) * 110}ms` : '0ms',
              }}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Popin on={step >= 2} reduce={reduce}>
            <MicroTag tone="neutral" className="normal-case tracking-normal">
              <FolderGit2 className="h-3 w-3" aria-hidden />
              you/ml-agent
            </MicroTag>
          </Popin>
          <Popin on={step >= 3} reduce={reduce}>
            <MicroTag tone="success">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              VERIFIED
            </MicroTag>
          </Popin>
        </div>
      </div>
    </BentoCard>
  );
}

// ── 04 · LinkedIn audit ──────────────────────────────────────────────────────
const LI_COLS: { name: string; widths: string[] }[] = [
  { name: 'PROFILE', widths: ['w-4/5', 'w-3/5', 'w-full', 'w-2/3'] },
  { name: 'RESUME', widths: ['w-3/4', 'w-3/5', 'w-5/6', 'w-1/2'] },
];

function LinkedInAuditCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(LI_STEPS.length, {
    active,
    reduce,
    durations: LI_STEPS,
    offset,
    restAt: 3,
  });
  return (
    <BentoCard
      index="04"
      tag="Audit"
      title="LinkedIn self-audit"
      line="Profile and resume reconciled, gap by gap."
      demoLabel="Animated demo: profile and resume columns are compared, a mismatched line glows amber, a fix slides across, and both turn green in sync."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 p-3">
        <div className="grid h-full grid-cols-2 gap-3">
          {LI_COLS.map((col) => (
            <div key={col.name}>
              <p className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">{col.name}</p>
              <div className="mt-2 space-y-2">
                {col.widths.map((w, ri) => (
                  <div
                    key={ri}
                    className={cn(
                      'h-1.5 rounded-full transition-colors duration-300',
                      w,
                      ri === 1
                        ? step >= 3
                          ? 'bg-success/70'
                          : step >= 1
                            ? 'bg-warning/80'
                            : 'bg-muted-foreground/25'
                        : 'bg-muted-foreground/25',
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* the fix, sliding from RESUME across to PROFILE */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[46px] h-1.5 w-10 rounded-full bg-primary"
            initial={{ x: 34, opacity: 0 }}
            animate={step >= 2 ? { x: -74, opacity: [0, 1, 1, 0] } : { x: 34, opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 grid justify-items-center">
          <Popin on={step >= 1 && step < 3} reduce={reduce} className="col-start-1 row-start-1">
            <MicroTag tone="warning">MISMATCH</MicroTag>
          </Popin>
          <Popin on={step >= 3} reduce={reduce} className="col-start-1 row-start-1">
            <MicroTag tone="success">IN SYNC</MicroTag>
          </Popin>
        </div>
      </div>
    </BentoCard>
  );
}

// ── 05 · Interview prep ──────────────────────────────────────────────────────
function InterviewPrepCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(PREP_STEPS.length, {
    active,
    reduce,
    durations: PREP_STEPS,
    offset,
    restAt: 3,
  });
  const score = useCount(step >= 2 ? 85 : step >= 1 ? 62 : 0, { run: active, reduce, dur: 700, resetKey: cycle });
  return (
    <BentoCard
      index="05"
      tag="Prep"
      title="Real-skill interview prep"
      line="Coaching that raises your answer, never fakes it."
      demoLabel="Animated demo: an interview question arrives, an answer is rated 62, then coached up to 85 and marked coached. Practice builds real skill."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex flex-col p-3">
        <MicroTag tone="neutral" className="absolute right-2 top-2">
          REAL SKILL
        </MicroTag>
        <Rise
          on={step >= 0}
          reduce={reduce}
          className="max-w-[70%] self-start rounded-lg rounded-bl-[3px] border border-border bg-card px-2 py-1 text-[10px] leading-snug text-foreground shadow-soft"
        >
          Tell me about a conflict.
        </Rise>
        <Rise
          on={step >= 1}
          reduce={reduce}
          className="mt-1.5 w-[45%] space-y-1 self-end rounded-lg rounded-br-[3px] border border-primary/25 bg-primary/10 px-2 py-1.5"
        >
          <div className="h-1 w-full rounded-full bg-primary/30" />
          <div className="h-1 w-2/3 rounded-full bg-primary/30" />
        </Rise>
        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">ANSWER</span>
            <span className="flex items-center gap-1.5">
              <Popin on={step >= 3} reduce={reduce}>
                <MicroTag tone="primary">COACHED</MicroTag>
              </Popin>
              <span
                className={cn(
                  'font-mono text-[11px] font-bold tabular-nums transition-colors duration-300',
                  step >= 2 ? 'text-success' : 'text-warning',
                  step < 1 && 'opacity-0',
                )}
              >
                {score}
              </span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn('h-full w-full origin-left rounded-full transition-colors duration-300', step >= 2 ? 'bg-success' : 'bg-warning')}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: step >= 2 ? 0.85 : step >= 1 ? 0.62 : 0 }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
            />
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

// ── 06 · Pipeline board (featured) ───────────────────────────────────────────
function PipeCard({ w1, w2 }: { w1: string; w2: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-1.5 shadow-soft">
      <div className={cn('h-1 rounded-full bg-muted-foreground/30', w1)} />
      <div className={cn('mt-1 h-1 rounded-full bg-muted-foreground/20', w2)} />
    </div>
  );
}

function GhostSlot() {
  return <div aria-hidden className="h-[26px] rounded-md border border-dashed border-border" />;
}

function PipelineCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(PIPE_STEPS.length, {
    active,
    reduce,
    durations: PIPE_STEPS,
    offset,
    restAt: 3,
  });
  return (
    <BentoCard
      index="06"
      tag="Pipeline"
      title="Application pipeline"
      line="Replies detected in your inbox move cards for you."
      demoLabel="Animated demo: a kanban card slides from applied to interview, an email envelope flies in, and reply detection moves the card on to offer."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 p-3">
        <div className="grid h-full grid-cols-3">
          <div className="flex min-w-0 flex-col px-1">
            <p className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">APPLIED</p>
            <div className="mt-1.5 space-y-1.5">
              <motion.div
                className="relative z-10 rounded-md border border-primary/40 bg-card p-1.5 shadow-soft"
                initial={reduce ? false : { x: 'calc(0% + 0px)' }}
                animate={{
                  x: step >= 3 ? 'calc(200% + 16px)' : step >= 1 ? 'calc(100% + 8px)' : 'calc(0% + 0px)',
                }}
                transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
              >
                <div className="h-1 w-3/4 rounded-full bg-primary/40" />
                <div className="mt-1 h-1 w-1/2 rounded-full bg-muted-foreground/25" />
                <Popin on={step >= 3} reduce={reduce} className="absolute -top-2 right-0">
                  <MicroTag tone="success">REPLY DETECTED</MicroTag>
                </Popin>
              </motion.div>
              <PipeCard w1="w-2/3" w2="w-2/5" />
              <PipeCard w1="w-4/5" w2="w-1/2" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col px-1">
            <p className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">INTERVIEW</p>
            <div className="mt-1.5 space-y-1.5">
              <GhostSlot />
              <PipeCard w1="w-3/4" w2="w-2/5" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col px-1">
            <p className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">OFFER</p>
            <div className="mt-1.5 space-y-1.5">
              <GhostSlot />
              <PipeCard w1="w-1/2" w2="w-2/3" />
            </div>
          </div>
        </div>
        {/* the detected email, flying in */}
        <motion.span
          aria-hidden
          className="absolute left-[54%] top-7 z-20 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-primary shadow-soft"
          initial={reduce ? false : { x: 36, y: -20, opacity: 0 }}
          animate={step >= 3 ? { x: 0, y: 0, opacity: 0 } : step >= 2 ? { x: 0, y: 0, opacity: 1 } : { x: 36, y: -20, opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
        >
          <Mail className="h-3 w-3" aria-hidden />
        </motion.span>
      </div>
    </BentoCard>
  );
}

// ── 07 · OPT clock ───────────────────────────────────────────────────────────
const OPT_DAYS = ['24', '25', '26', '27', '28'] as const;

function OptClockCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(OPT_STEPS.length, {
    active,
    reduce,
    durations: OPT_STEPS,
    offset,
    restAt: 2,
  });
  const days = useCount(step >= 1 ? 61 : 90, { run: active, reduce, from: 90, dur: 1600, resetKey: cycle });
  return (
    <BentoCard
      index="07"
      tag="Clock"
      title="The OPT clock"
      line="Your 90-day window tracked, deadlines never a surprise."
      demoLabel="Animated demo: a countdown ring drains from 90 to 61 days while calendar days cross off, then an amber alert says file by March 3."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex items-center gap-4 p-3">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg aria-hidden viewBox="0 0 84 84" className="h-full w-full -rotate-90">
            <circle cx="42" cy="42" r="35" fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
            <motion.circle
              cx="42"
              cy="42"
              r="35"
              fill="none"
              stroke="hsl(var(--warning))"
              strokeWidth="7"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 1 }}
              animate={{ pathLength: step >= 1 ? 0.68 : 1 }}
              transition={{ duration: reduce ? 0 : 1.7, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-lg font-bold tabular-nums leading-none text-foreground">{days}</div>
              <div className="mt-0.5 font-mono text-[8px] font-semibold tracking-widest text-muted-foreground">DAYS</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div aria-hidden className="flex gap-1">
            {OPT_DAYS.map((d, i) => (
              <span
                key={d}
                className={cn(
                  'grid h-5 w-4 place-items-center rounded border border-border bg-card font-mono text-[8px] font-semibold text-muted-foreground transition-opacity duration-300',
                  step >= 1 && i < 3 && 'opacity-40 line-through',
                )}
                style={{ transitionDelay: step >= 1 && !reduce ? `${i * 160}ms` : '0ms' }}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="mt-2.5">
            <Popin on={step >= 2} reduce={reduce}>
              <MicroTag tone="warning">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                FILE BY MAR 3
              </MicroTag>
            </Popin>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

// ── 08 · Cover letters ───────────────────────────────────────────────────────
const LETTERS = [
  { m: 'A', x: -46, rot: -14 },
  { m: 'N', x: 0, rot: 0 },
  { m: 'K', x: 46, rot: 14 },
] as const;

function CoverLettersCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(COVER_STEPS.length, {
    active,
    reduce,
    durations: COVER_STEPS,
    offset,
    restAt: 3,
  });
  return (
    <BentoCard
      index="08"
      tag="Letters"
      title="Cover letters, authored"
      line="One resume, three letters, each written for its company."
      demoLabel="Animated demo: three cover letter pages fan out from one resume, each stamped with a different company monogram and marked authored."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 grid place-items-center p-3">
        <div className="relative h-[104px] w-[168px]">
          {/* the source resume, behind the fan */}
          <div className="absolute bottom-1 left-1/2 h-[86px] w-14 -translate-x-1/2 rounded-md border border-border bg-muted/60 p-1.5">
            <p className="font-mono text-[7px] font-semibold tracking-wide text-muted-foreground">RESUME</p>
            <div className="mt-1 space-y-1">
              <div className="h-1 w-full rounded-full bg-muted-foreground/25" />
              <div className="h-1 w-3/4 rounded-full bg-muted-foreground/25" />
              <div className="h-1 w-5/6 rounded-full bg-muted-foreground/25" />
            </div>
          </div>
          {LETTERS.map((letter, i) => (
            <motion.div
              key={letter.m}
              className="absolute bottom-0 left-1/2 h-[88px] w-14 rounded-md border border-border bg-card p-1.5 shadow-soft"
              style={{ transformOrigin: '50% 130%', zIndex: i + 1 }}
              initial={reduce ? false : { x: 'calc(-50% + 0px)', y: 10, rotate: 0, opacity: 0 }}
              animate={
                step >= 1
                  ? { x: `calc(-50% + ${letter.x}px)`, y: 0, rotate: letter.rot, opacity: 1 }
                  : { x: 'calc(-50% + 0px)', y: 10, rotate: 0, opacity: 0 }
              }
              transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: reduce ? 0 : i * 0.08 }}
            >
              <Popin on={step >= 2} reduce={reduce} delay={i * 0.12} className="grid">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 font-display text-[9px] font-bold text-primary">
                  {letter.m}
                </span>
              </Popin>
              <div className="mt-1.5 space-y-1">
                <div className="h-1 w-full rounded-full bg-muted-foreground/25" />
                <div className="h-1 w-2/3 rounded-full bg-muted-foreground/25" />
              </div>
            </motion.div>
          ))}
        </div>
        <Popin on={step >= 3} reduce={reduce} className="absolute right-2 top-2">
          <MicroTag tone="primary">
            <PenLine className="h-3 w-3" aria-hidden />
            AUTHORED
          </MicroTag>
        </Popin>
      </div>
    </BentoCard>
  );
}

// ── 09 · Batch tailor ────────────────────────────────────────────────────────
const VARIANTS = [
  { kw: 'REACT', ats: 88, best: false },
  { kw: 'SQL', ats: 91, best: false },
  { kw: 'AWS', ats: 86, best: false },
  { kw: 'K8S', ats: 93, best: true },
] as const;

function BatchTailorCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(BATCH_STEPS.length, {
    active,
    reduce,
    durations: BATCH_STEPS,
    offset,
    restAt: 3,
  });
  return (
    <BentoCard
      index="09"
      tag="Tailor"
      title="Batch tailor"
      line="Four ATS-scored variants from one source of truth."
      demoLabel="Animated demo: one resume splits into four tailored variants, each gaining a keyword chip and an ATS score of 88, 91, 86 and 93."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-3">
        <Popin on={step >= 0} reduce={reduce}>
          <MicroTag tone="neutral">
            <FileText className="h-3 w-3" aria-hidden />
            ONE RESUME
          </MicroTag>
        </Popin>
        <div className="grid w-full grid-cols-4 gap-2">
          {VARIANTS.map((v, i) => (
            <motion.div
              key={v.kw}
              className="flex flex-col items-center gap-1 rounded-md border border-border bg-card p-1.5 shadow-soft"
              initial={reduce ? false : { y: -14, opacity: 0, scale: 0.92 }}
              animate={step >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: -14, opacity: 0, scale: reduce ? 1 : 0.92 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: EASE, delay: reduce ? 0 : i * 0.09 }}
            >
              <div className="h-1 w-full rounded-full bg-muted-foreground/25" />
              <div className="h-1 w-2/3 self-start rounded-full bg-muted-foreground/20" />
              <Popin on={step >= 2} reduce={reduce} delay={i * 0.08} className="mt-0.5">
                <span className="rounded border border-primary/30 bg-primary/10 px-1 py-px font-mono text-[8px] font-semibold text-primary">
                  {v.kw}
                </span>
              </Popin>
              <Popin on={step >= 3} reduce={reduce} delay={i * 0.06}>
                <span className={cn('font-mono text-[10px] font-bold tabular-nums', v.best ? 'text-success' : 'text-foreground')}>
                  <span className="font-semibold text-muted-foreground">ATS </span>
                  {v.ats}
                </span>
              </Popin>
            </motion.div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

// ── 10 · Market trends ───────────────────────────────────────────────────────
const TREND_BARS = [30, 42, 36, 52, 48, 64, 82] as const;

function TrendsCell({ active, reduce, offset }: CellProps) {
  const { step, cycle, onPause, onResume } = useCellLoop(TREND_STEPS.length, {
    active,
    reduce,
    durations: TREND_STEPS,
    offset,
    restAt: 2,
  });
  return (
    <BentoCard
      index="10"
      tag="Trends"
      title="Market trends"
      line="Watch demand shift before the postings do."
      demoLabel="Animated demo: a bar chart rises bar by bar and a chip reports Kubernetes demand up 34 percent."
      onPause={onPause}
      onResume={onResume}
    >
      <div key={reduce ? 'static' : cycle} className="absolute inset-0 p-3">
        <Popin on={step >= 2} reduce={reduce} className="absolute left-3 top-2.5 z-10">
          <MicroTag tone="success">
            <TrendingUp className="h-3 w-3" aria-hidden />
            K8S +34%
          </MicroTag>
        </Popin>
        <div aria-hidden className="absolute inset-x-4 bottom-3 top-9 flex items-end gap-1.5 border-b border-border">
          {TREND_BARS.map((h, i) => (
            <motion.div
              key={i}
              className={cn('flex-1 origin-bottom rounded-t-[3px]', i === TREND_BARS.length - 1 ? 'bg-success/70' : 'bg-primary/60')}
              style={{ height: `${h}%` }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: step >= 1 ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : i * 0.09 }}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

// ── The section ──────────────────────────────────────────────────────────────
const CELLS: { id: string; featured?: boolean; Cell: (p: CellProps) => JSX.Element }[] = [
  { id: 'scam', featured: true, Cell: ScamShieldCell },
  { id: 'readiness', Cell: ReadinessCell },
  { id: 'github', Cell: GithubProofCell },
  { id: 'linkedin', Cell: LinkedInAuditCell },
  { id: 'interview', Cell: InterviewPrepCell },
  { id: 'pipeline', featured: true, Cell: PipelineCell },
  { id: 'opt', Cell: OptClockCell },
  { id: 'letters', Cell: CoverLettersCell },
  { id: 'batch', Cell: BatchTailorCell },
  { id: 'trends', Cell: TrendsCell },
];

export function FeatureConstellation() {
  const gridRef = useRef<HTMLUListElement>(null);
  const inView = useInView(gridRef, { margin: '-10% 0px' } as unknown as Parameters<typeof useInView>[1]);
  const reduce = !!useReducedMotion();

  return (
    <section id="everything" aria-label="Every feature, working" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The whole instrument"
            eyebrowIcon={Orbit}
            title={
              <>
                Every feature, <span className="text-primary">working</span>.
              </>
            }
            subtitle="No screenshots and no promises. Each tile below is the real mechanic, running in miniature."
          />
          <div className="mt-5 flex justify-center">
            <MonoChip>Illustrative data</MonoChip>
          </div>
        </Reveal>

        <ul ref={gridRef} className="mt-12 grid list-none grid-cols-1 gap-4 sm:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {CELLS.map(({ id, featured, Cell }, i) => (
            <li key={id} className={cn(featured && 'md:col-span-2')}>
              <Reveal className="h-full" delay={(i % 4) * 0.05} y={14}>
                <Cell active={inView} reduce={reduce} offset={i * 300} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default FeatureConstellation;
