import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, Github, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountUp,
  DemoStage,
  IllustrativeTag,
  MOTION,
  Panel,
  ReplayButton,
  StepIn,
  useCountUp,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * GROW evidence panel — the growth loop as a live simulation, three acts:
 *   1 AUDIT    the Career Readiness ring fills to 72, three checks tick,
 *              and a gap surfaces: MISSING: Kubernetes.
 *   2 THE LOOP four stations around a circuit — LEARN (7-day plan ticking)
 *              -> SHIP (commit graph lights, VERIFIED stamp) -> POST
 *              (impressions climb 0 -> 2.4K) -> REACH (recruiter view ping);
 *              the circuit draws as it runs and the ring ticks 72 -> 78.
 *   3 PAYOFF   STATIC RESUME stays flat while COMPOUNDING EDGE bends up:
 *              every week adds proof.
 * Deterministic ~10s loop, in-view gated, pauses on hover/focus; reduced
 * motion parks on the composed end state. All data fictional.
 */

// audit -> learn -> ship -> post -> reach -> payoff  (~10.0s)
const STEP_MS = [2000, 1500, 1500, 1700, 1500, 1800];

const NODES = [
  { label: 'LEARN', x: 38, y: 36, tx: 38, ty: 22 },
  { label: 'SHIP', x: 202, y: 36, tx: 202, ty: 22 },
  { label: 'POST', x: 202, y: 114, tx: 202, ty: 134 },
  { label: 'REACH', x: 38, y: 114, tx: 38, ty: 134 },
] as const;
const CIRCUIT =
  'M 38 36 L 194 36 Q 202 36 202 44 L 202 106 Q 202 114 194 114 L 46 114 Q 38 114 38 106 L 38 44 Q 38 36 46 36 Z';
// how much of the circuit is drawn at each step
const PROGRESS = [0, 0.06, 0.34, 0.5, 0.84, 1];
const CHECKS = ['Resume', 'Projects', 'Network'];
const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

function ReadinessPanel({ step, inView, reduce }: { step: number; inView: boolean; reduce: boolean }) {
  const closed = step >= 4 || reduce;
  const target = closed ? 78 : 72;
  const score = useCountUp(target, inView && !reduce, reduce, 900);
  const shown = inView || reduce;
  return (
    <Panel className="flex min-h-0 flex-col items-center overflow-hidden p-3">
      <p className="self-start font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Career readiness
      </p>
      <div className="relative mt-1.5 grid h-[84px] w-[84px] place-items-center">
        <svg viewBox="0 0 84 84" className="h-[84px] w-[84px] -rotate-90" aria-hidden>
          <circle cx="42" cy="42" r={RING_R} fill="none" strokeWidth="6" className="stroke-muted" />
          <motion.circle
            cx="42"
            cy="42"
            r={RING_R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={RING_C}
            initial={false}
            animate={{ strokeDashoffset: shown ? RING_C * (1 - target / 100) : RING_C }}
            transition={{ duration: reduce ? 0 : 1, ease: MOTION.ease }}
          />
        </svg>
        <span className="absolute font-display text-lg font-bold tabular-nums text-foreground">{score}</span>
      </div>
      <ul className="mt-2 w-full space-y-1">
        {CHECKS.map((c, i) => (
          <StepIn key={c} show={shown} delay={0.3 + i * 0.28} reduce={reduce}>
            <li className="flex items-center gap-1.5">
              <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-success/15 text-success" aria-hidden>
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="text-[10px] text-foreground">{c}</span>
            </li>
          </StepIn>
        ))}
      </ul>
      <StepIn show={shown} delay={1.2} reduce={reduce} className="mt-auto w-full pt-1.5">
        <span
          className={cn(
            'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider',
            closed ? 'border-success/40 bg-success/10 text-success' : 'border-warning/50 bg-warning/10 text-warning',
          )}
        >
          {closed && <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} aria-hidden />}
          {closed ? 'Kubernetes: proven' : 'Missing: Kubernetes'}
        </span>
      </StepIn>
    </Panel>
  );
}

function Circuit({ step, reduce, active }: { step: number; reduce: boolean; active: boolean }) {
  const idx = step >= 1 && step <= 4 ? step - 1 : step === 5 ? 3 : -1;
  const done = step >= 5;
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" role="presentation" aria-hidden>
      <path d={CIRCUIT} fill="none" strokeWidth="1.5" className="stroke-border" />
      <motion.path
        d={CIRCUIT}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-primary"
        initial={false}
        animate={{ pathLength: PROGRESS[step] }}
        transition={{ duration: reduce ? 0 : 0.6, ease: MOTION.ease }}
      />
      {NODES.map((n, i) => {
        const isActive = i === idx;
        const visited = done || (idx >= 0 && i <= idx);
        return (
          <g key={n.label}>
            {isActive && active && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r="11"
                className="fill-primary/20"
                animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={isActive ? 6 : 4.5}
              className={visited ? 'fill-primary' : 'fill-muted-foreground'}
              opacity={visited ? 1 : 0.45}
            />
            <text
              x={n.tx}
              y={n.ty}
              textAnchor="middle"
              className={cn(
                'font-mono text-[9px] font-bold',
                isActive ? 'fill-primary' : visited ? 'fill-foreground' : 'fill-muted-foreground',
              )}
              style={{ letterSpacing: 1 }}
            >
              {n.label}
            </text>
          </g>
        );
      })}
      {idx >= 0 && (
        <motion.circle
          r="4"
          className="fill-primary"
          initial={false}
          animate={{ cx: NODES[idx].x, cy: NODES[idx].y }}
          transition={{ duration: reduce ? 0 : 0.55, ease: MOTION.ease }}
        />
      )}
    </svg>
  );
}

// ── Station micro-cards ──────────────────────────────────────────────────────
function Kicker({ children, tone = 'primary' }: { children: string; tone?: 'primary' | 'warning' }) {
  return (
    <p
      className={cn(
        'font-mono text-[9px] font-bold uppercase tracking-wider',
        tone === 'warning' ? 'text-warning' : 'text-primary',
      )}
    >
      {children}
    </p>
  );
}

function GapCard() {
  return (
    <>
      <Kicker tone="warning">Gap found</Kicker>
      <p className="mt-0.5 font-display text-[13px] font-bold leading-tight text-foreground">Kubernetes</p>
      <p className="text-[10px] text-muted-foreground">Roles want proof</p>
    </>
  );
}

function LearnCard({ reduce }: { reduce: boolean }) {
  return (
    <>
      <Kicker>7 day plan</Kicker>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="grid h-5 flex-1 place-items-center rounded-[4px] border border-primary/30 bg-primary/[0.06]">
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : 0.15 + i * 0.14 }}
              aria-hidden
            >
              <Check className="h-3 w-3 text-primary" strokeWidth={3} />
            </motion.span>
          </span>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">One task a day</p>
    </>
  );
}

function ShipCard({ reduce }: { reduce: boolean }) {
  const lit = [1, 4, 8, 9, 12];
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Github className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <code className="truncate rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground">kafka-lab</code>
        <motion.span
          initial={reduce ? false : { opacity: 0, scale: 1.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : 0.6 }}
          className="ml-auto rounded border border-success px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-success"
        >
          Verified
        </motion.span>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className={cn('h-2.5 w-full rounded-[2px]', lit.includes(i) ? 'bg-primary' : 'bg-muted')}
            initial={reduce || !lit.includes(i) ? false : { opacity: 0.25, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : 0.2 + i * 0.04 }}
          />
        ))}
      </div>
    </>
  );
}

function PostCard({ reduce, active }: { reduce: boolean; active: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: MOTION.settle, ease: MOTION.ease }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-4 w-4 shrink-0 rounded-full bg-primary/20" aria-hidden />
        <span className="h-1.5 w-16 rounded-full bg-muted-foreground/40" aria-hidden />
      </div>
      <div className="mt-1.5 space-y-1" aria-hidden>
        <span className="block h-1.5 w-full rounded-full bg-muted" />
        <span className="block h-1.5 w-3/4 rounded-full bg-muted" />
      </div>
      <p className="mt-1.5 flex items-baseline gap-1">
        <TrendingUp className="h-3 w-3 self-center text-success" aria-hidden />
        <CountUp
          target={2400}
          run={active || reduce}
          reduce={reduce}
          dur={1100}
          format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`)}
          className="font-mono text-[13px] font-bold text-foreground"
        />
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">views</span>
      </p>
    </motion.div>
  );
}

function ReachCard({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative shrink-0">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
          <Eye className="h-3.5 w-3.5" aria-hidden />
        </span>
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full border border-primary"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
            aria-hidden
          />
        )}
      </span>
      <div className="leading-tight">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">Recruiter view</p>
        <p className="text-[10px] font-semibold text-success">Readiness +6</p>
      </div>
    </div>
  );
}

export function GrowthLoopDemo() {
  const { ref, inView, reduce } = useDemoInView<HTMLDivElement>();
  const [held, setHeld] = useState(false);
  const active = inView && !reduce && !held;
  const { step, replay } = useDemoLoop(STEP_MS.length, { active, reduce, durations: STEP_MS });

  const phase = step === 0 ? 'gap' : (['learn', 'ship', 'post', 'reach', 'reach'] as const)[step - 1];
  const payoff = step >= 5;

  const label =
    'Live growth loop simulation: a Career Readiness ring fills to 72 with three checks, a gap surfaces (missing Kubernetes), then four stations run around a circuit: learn a 7 day plan, ship a GitHub verified repo, post with impressions climbing to 2.4K, and reach a recruiter view. The ring ticks from 72 to 78, and a payoff chart shows a flat static resume line versus a compounding edge curve bending up: every week adds proof. Illustrative data.';

  return (
    <div
      ref={ref}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <DemoStage label={label} reserve={376} className="p-4">
        <div className="flex h-full flex-col gap-3">
          <div className="grid min-h-0 flex-1 grid-cols-[0.82fr_1.18fr] gap-3">
            {/* Act 1 — the readiness audit */}
            <ReadinessPanel step={step} inView={inView} reduce={reduce} />

            {/* Act 2 — the loop runs */}
            <Panel className="relative min-h-0 overflow-hidden p-2">
              <Circuit step={step} reduce={reduce} active={active} />
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={phase}
                    className="w-full max-w-[176px] rounded-control border border-border bg-card p-2.5 shadow-soft"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: reduce ? 0 : MOTION.micro, ease: MOTION.ease }}
                  >
                    {phase === 'gap' && <GapCard />}
                    {phase === 'learn' && <LearnCard reduce={reduce} />}
                    {phase === 'ship' && <ShipCard reduce={reduce} />}
                    {phase === 'post' && <PostCard reduce={reduce} active={active} />}
                    {phase === 'reach' && <ReachCard reduce={reduce} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Panel>
          </div>

          {/* Act 3 payoff — flat line vs compounding curve */}
          <motion.div
            initial={false}
            animate={{ opacity: payoff || reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
            className="flex h-[64px] shrink-0 items-center gap-3 rounded-control border border-border bg-background px-3"
          >
            <svg viewBox="0 0 150 52" className="h-[44px] w-[130px] shrink-0" role="presentation" aria-hidden>
              <line x1="4" y1="40" x2="146" y2="39" strokeWidth="1.5" className="stroke-muted-foreground" opacity="0.5" />
              <motion.path
                d="M 4 44 C 55 42, 100 34, 146 8"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-primary"
                initial={false}
                animate={{ pathLength: payoff || reduce ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: MOTION.ease }}
              />
              <motion.circle
                cx="146"
                cy="8"
                r="2.5"
                className="fill-primary"
                initial={false}
                animate={{ opacity: payoff || reduce ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : MOTION.micro, delay: reduce ? 0 : 0.8 }}
              />
            </svg>
            <div className="hidden shrink-0 space-y-1 sm:block">
              <p className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-muted-foreground/60" aria-hidden />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Static resume
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-primary" aria-hidden />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-primary">
                  Compounding edge
                </span>
              </p>
            </div>
            <p className="ml-auto text-right font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
              Every week adds proof
            </p>
          </motion.div>
        </div>
      </DemoStage>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <IllustrativeTag>Illustrative numbers</IllustrativeTag>
        <ReplayButton onClick={replay} />
      </div>
    </div>
  );
}

// ── Track strip — pipeline funnel + warm referrals ───────────────────────────
const PIPE = [
  { stage: 'Applied', n: 24, w: 100 },
  { stage: 'Screen', n: 8, w: 62 },
  { stage: 'Onsite', n: 3, w: 38 },
  { stage: 'Offer', n: 1, w: 20 },
];

export function TrackStrip() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const label =
    'Track: an application pipeline funnel with 24 applied, 8 screens, 3 onsites, 1 offer (illustrative), alongside 2 warm referral introductions.';
  return (
    <div ref={ref}>
      <DemoStage label={label} reserve={132} className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
        <div className="grid flex-1 grid-cols-4 gap-2 sm:gap-3">
          {PIPE.map((p, i) => (
            <div key={p.stage}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{p.stage}</span>
                <span className="font-display text-sm font-bold tabular-nums text-foreground">{p.n}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  style={{ opacity: 1 - i * 0.16 }}
                  initial={reduce ? false : { width: 0 }}
                  animate={active ? { width: `${p.w}%` } : reduce ? { width: `${p.w}%` } : {}}
                  transition={{ duration: MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : i * 0.08 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-2 border-l border-border pl-4 sm:flex sm:pl-6">
          <span className="grid h-8 w-8 place-items-center rounded-control bg-success/10 text-success">
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold leading-none text-foreground">2 warm</p>
            <p className="text-[10px] text-muted-foreground">referral intros</p>
          </div>
        </div>
      </DemoStage>
      <div className="mt-2 flex justify-center">
        <IllustrativeTag>Illustrative pipeline</IllustrativeTag>
      </div>
    </div>
  );
}

export default GrowthLoopDemo;
