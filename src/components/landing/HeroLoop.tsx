import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { BadgeCheck, CalendarClock, Check, Inbox, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from './_shared';
import { CountUp, IllustrativeTag, MOTION, useDemoInView } from './demos/_kit';

/**
 * HeroLoop - the hero's centerpiece: the PRODUCT LOOP running as a living
 * machine. Four connected stages with a luminous pulse traveling a drawn
 * connector path between them:
 *
 *   01 MATCHED  - a matching card slides in (monogram, role, salary, emerald
 *                 sponsor badge, a match ring animating to its score) with a
 *                 ticking "matching jobs" counter chip nearby.
 *   02 APPROVED - the job lands in a phone vignette; a tap ring fires and the
 *                 APPROVE pill flips emerald under a mono 5 MAX tag.
 *   03 APPLIED  - a mini browser autofills two fields, the fill STOPS at a
 *                 dashed hairline, SUBMIT glows under a YOUR CLICK tag, a
 *                 cursor ring clicks, and a LOGGED tick stamps the ledger.
 *   04 REPLY    - "Interview Thursday?" slides into an inbox chip with an
 *                 emerald ping while an OPT chip shows the days still left.
 *
 * One full cycle runs ~10s, then the next fictional job flows through (five
 * seeded jobs, forever). In-view gated, hover pauses, deterministic data.
 * Under prefers-reduced-motion the loop renders as a fully composed static
 * tableau of all four stages - connector drawn, every stage resolved.
 *
 * Desktop (lg+): a diagonal cascade of glassy chips joined by one continuous
 * SVG path; the pulse = a glowing dot + trailing gradient dash traveling the
 * active segment. Chips sit on three pointer-parallax depth layers (max 6px,
 * spring-damped). Mobile: a compact 2-up grid, no pulse - stages sequence by
 * highlight on the same clock.
 *
 * Integrity: companies are fictional (letter monograms, no trademarks); the
 * counter, filings and salaries are examples inside the ILLUSTRATIVE-tagged
 * area; the inbox chip carries a DEMO tag. The whole loop is role="img" with
 * a narrative label - nothing inside is interactive.
 */

// -- Seeded, deterministic fictional jobs ------------------------------------
type Job = {
  id: string;
  company: string;
  role: string;
  salary: string;
  filings: number;
  match: number;
  /** chart-token text class for the monogram initial */
  mark: string;
};

const JOBS: Job[] = [
  { id: 'nim', company: 'Nimbus Analytics', role: 'Senior Data Engineer', salary: '$135K-$170K', filings: 214, match: 94, mark: 'text-chart-4' },
  { id: 'bri', company: 'Brightpath Systems', role: 'Backend Engineer', salary: '$120K-$155K', filings: 118, match: 92, mark: 'text-chart-2' },
  { id: 'van', company: 'Vantora Labs', role: 'ML Engineer', salary: '$145K-$185K', filings: 173, match: 96, mark: 'text-chart-1' },
  { id: 'mer', company: 'Meridian Biotech', role: 'Data Scientist', salary: '$128K-$162K', filings: 141, match: 91, mark: 'text-chart-6' },
  { id: 'osp', company: 'Osprey Cloud', role: 'Platform Engineer', salary: '$130K-$165K', filings: 87, match: 93, mark: 'text-chart-5' },
];

// -- The act clock -----------------------------------------------------------
// Phases: 0 matched · 1 travel · 2 approved · 3 travel · 4 applied · 5 travel
// · 6 reply · 7 reset. Total = 10.0s per cycle.
const ACTS = [1900, 650, 1700, 650, 2300, 650, 1800, 350] as const;
const STAGE_PHASE = [0, 2, 4, 6] as const;
const BASE_COUNT = 1248;

// -- Desktop geometry --------------------------------------------------------
// Chips are centered on % anchors; the SVG stretches to the same box
// (preserveAspectRatio="none"), so viewBox coords = anchor % x (560, 620).
// S1 (30%, 16%) -> S2 (71.5%, 39%) -> S3 (30%, 63.5%) -> S4 (71%, 87%).
const SEGS = [
  'M168 99 C300 99 400 138 400 242',
  'M400 242 C400 342 286 394 168 394',
  'M168 394 C168 496 288 540 398 540',
] as const;

const SPRING = { stiffness: 120, damping: 20, mass: 0.4 } as const;

const ARIA_LABEL =
  'How Aspirely works, shown as a repeating illustrative demo: a matched job card appears with its H1B sponsorship filings and a match score, you approve it with one tap on your phone, the application autofills and stops so the final submit click is yours and gets logged, then an interview reply lands in your inbox while an OPT chip shows the days you still have. A new example job then flows through the same loop.';

/** lg-and-up media query - one render tree, so the DOM stays lean. */
function useWide() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

// -- Shared atoms ------------------------------------------------------------
function Mark({ job, className }: { job: Job; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-lg border border-border bg-muted/50 font-display font-bold leading-none',
        className,
      )}
    >
      <span className={job.mark}>{job.company.slice(0, 1)}</span>
    </span>
  );
}

function MatchRing({ pct, run, reduce }: { pct: number; run: boolean; reduce: boolean }) {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx={22} cy={22} r={19} fill="none" className="stroke-muted" strokeWidth={3.5} />
        <motion.circle
          cx={22}
          cy={22}
          r={19}
          fill="none"
          className="stroke-success"
          strokeWidth={3.5}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: run ? pct / 100 : 0 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: MOTION.ease, delay: run && !reduce ? 0.35 : 0 }}
        />
      </svg>
      <span className="font-mono text-[10px] font-bold tabular-nums text-foreground">
        <CountUp target={pct} run={run} reduce={reduce} dur={900} format={(n) => `${n}%`} />
      </span>
    </span>
  );
}

/** Crossfades stage content when the next seeded job flows through. */
function JobSwap({ job, reduce, children }: { job: Job; reduce: boolean; children: ReactNode }) {
  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={job.id}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 14 }}
        transition={{ duration: 0.24, ease: MOTION.ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** The glassy stage card: mono step label + a chip that lifts when the pulse
 *  arrives (shadow-pop + primary border tint) and dims gently after. */
function StageShell({
  step,
  title,
  lit,
  reduce,
  className,
  children,
}: {
  step: string;
  title: string;
  lit: boolean;
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  const active = lit && !reduce;
  return (
    <div className={cn('flex flex-col', className)}>
      <span
        className={cn(
          'mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-colors duration-300',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {step} {title}
      </span>
      <motion.div
        initial={false}
        animate={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: lit ? 1 : 0.72, y: lit ? -3 : 0, scale: lit ? 1.01 : 1 }}
        transition={{ duration: 0.3, ease: MOTION.ease }}
        className={cn(
          'flex-1 rounded-2xl border bg-card/90 p-3 backdrop-blur-sm transition-[border-color,box-shadow] duration-300',
          active ? 'border-primary/40 shadow-pop' : 'border-border shadow-panel',
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** The ticking counter chip - the old panel's DNA, kept near stage 01. */
function CounterChip({ count, reduce }: { count: number; reduce: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 shadow-soft backdrop-blur-sm">
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 [animation-duration:2.4s] motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      <span className="font-display text-xs font-bold text-foreground">
        {reduce ? (
          <span className="tabular-nums">{count.toLocaleString('en-US')}</span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={count}
              className="inline-block tabular-nums"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: MOTION.micro, ease: MOTION.ease }}
            >
              {count.toLocaleString('en-US')}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">matching jobs</span>
    </span>
  );
}

// -- Stage 01 · MATCHED ------------------------------------------------------
function StageMatched({ job, reached, reduce }: { job: Job; reached: boolean; reduce: boolean }) {
  return (
    <JobSwap job={job} reduce={reduce}>
      <div className="flex items-center gap-2.5">
        <Mark job={job} className="h-9 w-9 text-sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display text-[13px] font-bold text-foreground">{job.role}</p>
          <p className="truncate text-[11px] text-muted-foreground">{job.company}</p>
        </div>
        <MatchRing pct={job.match} run={reached} reduce={reduce} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold tabular-nums text-foreground/80">{job.salary}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wide text-success">
          <BadgeCheck className="h-2.5 w-2.5" aria-hidden />
          H1B - {job.filings} FILINGS
        </span>
      </div>
    </JobSwap>
  );
}

// -- Stage 02 · APPROVED (phone vignette) ------------------------------------
function StageApproved({ job, reached, reduce }: { job: Job; reached: boolean; reduce: boolean }) {
  const [approved, setApproved] = useState(reduce);
  useEffect(() => {
    if (reduce) {
      setApproved(true);
      return;
    }
    if (!reached) {
      setApproved(false);
      return;
    }
    const id = window.setTimeout(() => setApproved(true), 600);
    return () => window.clearTimeout(id);
  }, [reached, reduce]);

  return (
    <JobSwap job={job} reduce={reduce}>
      <div className="mx-auto w-[164px] rounded-2xl border border-border bg-background p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span aria-hidden className="h-1 w-8 rounded-full bg-muted" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-wide text-muted-foreground">5 MAX</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1.5">
            <Mark job={job} className="h-6 w-6 rounded-[6px] text-[10px]" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[10px] font-semibold text-foreground">{job.company}</p>
              <p className="truncate text-[8.5px] text-muted-foreground">{job.role}</p>
            </div>
          </div>
          <div className="mt-2 flex justify-center pb-0.5">
            <span className="relative inline-flex">
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute -inset-1.5 rounded-full border-2 border-success"
                  initial={{ opacity: 0 }}
                  animate={reached ? { opacity: [0, 1, 0], scale: [1.6, 1, 0.9] } : { opacity: 0, scale: 1.6 }}
                  transition={reached ? { duration: 0.6, delay: 0.2, ease: MOTION.ease } : { duration: 0.1 }}
                />
              )}
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-full px-2.5 font-mono text-[8.5px] font-bold uppercase tracking-wide transition-colors duration-200',
                  approved ? 'bg-success text-success-foreground' : 'border border-border bg-card text-muted-foreground',
                )}
              >
                {approved && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />}
                {approved ? 'Approved' : 'Approve'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </JobSwap>
  );
}

// -- Stage 03 · APPLIED (mini browser) ---------------------------------------
function FillBar({ label, reached, reduce, delay }: { label: string; reached: boolean; reduce: boolean; delay: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-11 shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary/30"
          initial={false}
          animate={{ scaleX: reached ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.32, ease: MOTION.ease, delay: reached && !reduce ? delay : 0 }}
        />
      </span>
    </div>
  );
}

function StageApplied({ job, reached, reduce }: { job: Job; reached: boolean; reduce: boolean }) {
  return (
    <JobSwap job={job} reduce={reduce}>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-1 border-b border-border px-2.5 py-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-input" />
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-input" />
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-input" />
          <span className="ms-auto font-mono text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            AUTOFILL
          </span>
        </div>
        <div className="p-2.5">
          <div className="space-y-1.5">
            <FillBar label="Name" reached={reached} reduce={reduce} delay={0.15} />
            <FillBar label="Resume" reached={reached} reduce={reduce} delay={0.5} />
          </div>
          {/* The hairline where automation stops - below it, the click is yours. */}
          <div className="my-2 border-t border-dashed border-input" />
          <div className="flex items-end justify-between gap-2">
            <motion.span
              className="inline-flex h-6 items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 font-mono text-[8px] font-bold uppercase tracking-wide text-success"
              initial={false}
              animate={{ opacity: reached ? 1 : 0, y: reached ? 0 : 4 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: MOTION.ease, delay: reached && !reduce ? 1.75 : 0 }}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              Logged
            </motion.span>
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                YOUR CLICK
              </span>
              <span className="relative inline-flex">
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute -inset-1 rounded-lg bg-primary/25 blur-[5px]"
                    initial={{ opacity: 0 }}
                    animate={reached ? { opacity: [0, 0.9, 0.9, 0] } : { opacity: 0 }}
                    transition={reached ? { duration: 0.9, delay: 0.85, ease: MOTION.ease } : { duration: 0.1 }}
                  />
                )}
                <motion.span
                  className="relative inline-flex h-7 items-center rounded-md bg-primary px-3 font-mono text-[9px] font-bold uppercase tracking-wide text-primary-foreground"
                  initial={false}
                  animate={reached && !reduce ? { scale: [1, 0.94, 1] } : { scale: 1 }}
                  transition={reached && !reduce ? { duration: 0.3, delay: 1.45, ease: MOTION.ease } : { duration: 0.1 }}
                >
                  Submit
                </motion.span>
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-md border-2 border-primary"
                    initial={{ opacity: 0 }}
                    animate={reached ? { opacity: [0, 0.8, 0], scale: [1.5, 1, 0.95] } : { opacity: 0 }}
                    transition={reached ? { duration: 0.5, delay: 1.4, ease: MOTION.ease } : { duration: 0.1 }}
                  />
                )}
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute -bottom-1.5 -right-1.5"
                    initial={{ opacity: 0 }}
                    animate={reached ? { opacity: [0, 1, 1, 0], x: [8, 0, 0, 2], y: [6, 0, 0, 2] } : { opacity: 0 }}
                    transition={
                      reached
                        ? { duration: 0.8, delay: 1.15, times: [0, 0.4, 0.8, 1], ease: MOTION.ease }
                        : { duration: 0.1 }
                    }
                  >
                    <MousePointer2 className="h-3.5 w-3.5 text-foreground" fill="currentColor" aria-hidden />
                  </motion.span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </JobSwap>
  );
}

// -- Stage 04 · REPLY (inbox + the clock) ------------------------------------
function StageReply({ job, reached, reduce }: { job: Job; reached: boolean; reduce: boolean }) {
  return (
    <JobSwap job={job} reduce={reduce}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Inbox className="h-3 w-3" aria-hidden />
          Inbox
        </span>
        <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
          Demo
        </span>
      </div>
      {/* Fixed-height slot so the reply sliding in never shifts the chip. */}
      <div className="mt-2 h-[46px]">
        <motion.div
          initial={false}
          animate={{ opacity: reached ? 1 : 0, x: reached ? 0 : -12 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: MOTION.ease, delay: reached && !reduce ? 0.2 : 0 }}
          className="flex h-full items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-2.5"
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            {!reduce && (
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-success"
                initial={{ opacity: 0 }}
                animate={reached ? { opacity: [0, 0.6, 0], scale: [1, 2.6, 3] } : { opacity: 0 }}
                transition={reached ? { duration: 1, delay: 0.45, ease: 'easeOut' } : { duration: 0.1 }}
              />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11.5px] font-semibold text-foreground">Interview Thursday?</p>
            <p className="truncate text-[9.5px] text-muted-foreground">{job.company}</p>
          </div>
        </motion.div>
      </div>
      {/* The payoff: the visa clock still has room on it. */}
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wide text-foreground/80">
          <CalendarClock className="h-3 w-3 text-primary" aria-hidden />
          OPT 292 DAYS
        </span>
      </div>
    </JobSwap>
  );
}

// -- The loop ----------------------------------------------------------------
export function HeroLoop({ className }: { className?: string }) {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const wide = useWide();
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [begun, setBegun] = useState(false);

  // Entrance hold: the connector draws and the chips settle before the clock
  // starts ticking.
  useEffect(() => {
    if (reduce || begun || !active) return;
    const id = window.setTimeout(() => setBegun(true), 1300);
    return () => window.clearTimeout(id);
  }, [reduce, begun, active]);

  // The act clock - one setTimeout per phase; paused on hover, off-screen and
  // entirely under prefers-reduced-motion.
  useEffect(() => {
    if (reduce || !active || paused || !begun) return;
    const id = window.setTimeout(() => {
      const next = (phase + 1) % ACTS.length;
      if (next === 0) setCycle((c) => c + 1);
      setPhase(next);
    }, ACTS[phase]);
    return () => window.clearTimeout(id);
  }, [phase, reduce, active, paused, begun]);

  const job = JOBS[cycle % JOBS.length];
  const reached = (i: number) => reduce || phase >= STAGE_PHASE[i];
  const lit = (i: number) => !reduce && (phase === STAGE_PHASE[i] || phase === STAGE_PHASE[i] + 1);

  // -- The pulse: a glowing dot + trailing dash traveling the active segment.
  const segRefs = useRef<Array<SVGPathElement | null>>([]);
  const prog = useMotionValue(0);
  const dotX = useMotionValue(168);
  const dotY = useMotionValue(99);
  const trailWide = useTransform(prog, (p) => 0.2 - p);
  const trailCore = useTransform(prog, (p) => 0.1 - p);
  const trailOpacity = useTransform(prog, [0, 0.06, 0.85, 1], [0, 1, 1, 0]);
  const traveling = !reduce && wide && phase % 2 === 1 && phase < 7;
  const segIdx = traveling ? (phase - 1) / 2 : 0;

  useEffect(() => {
    if (!traveling) return;
    const el = segRefs.current[segIdx];
    if (!el) return;
    const len = el.getTotalLength();
    const setPt = (p: number) => {
      const pt = el.getPointAtLength(Math.max(0, Math.min(1, p)) * len);
      dotX.set(pt.x);
      dotY.set(pt.y);
    };
    prog.set(0);
    setPt(0);
    const unsub = prog.on('change', setPt);
    const controls = animate(prog, 1, { duration: 0.62, ease: [0.45, 0, 0.25, 1] });
    return () => {
      unsub();
      controls.stop();
    };
  }, [traveling, segIdx, prog, dotX, dotY]);

  // -- Pointer parallax: three depth layers, spring-damped, mouse-only.
  const nX = useMotionValue(0);
  const nY = useMotionValue(0);
  const aX = useSpring(useTransform(nX, (v) => v * 6), SPRING);
  const aY = useSpring(useTransform(nY, (v) => v * 6), SPRING);
  const bX = useSpring(useTransform(nX, (v) => v * -4), SPRING);
  const bY = useSpring(useTransform(nY, (v) => v * -4), SPRING);
  const cX = useSpring(useTransform(nX, (v) => v * 2), SPRING);
  const cY = useSpring(useTransform(nY, (v) => v * 2), SPRING);

  useEffect(() => {
    if (reduce || !wide || !active) {
      nX.set(0);
      nY.set(0);
      return;
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      nX.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))));
      nY.set(Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, wide, active, nX, nY, ref]);

  // -- Entrance choreography for the chips (calm settle, house ease).
  const chipEnter = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.5, ease: EASE, delay: 0.55 + i * 0.12 },
        };

  const count = BASE_COUNT + cycle;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ARIA_LABEL}
      className={cn('w-full select-none', className)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {wide ? (
        /* -- Desktop: the diagonal cascade + drawn connector + pulse -------- */
        <div className="relative ml-auto aspect-[560/620] w-full max-w-[560px]">
          {/* Depth layer C: the connector path (subtlest parallax) */}
          <motion.div aria-hidden className="absolute inset-0" style={reduce ? undefined : { x: cX, y: cY }}>
            <svg className="h-full w-full" viewBox="0 0 560 620" preserveAspectRatio="none" fill="none">
              {SEGS.map((d, i) => (
                <motion.path
                  key={d}
                  ref={(el) => {
                    segRefs.current[i] = el;
                  }}
                  d={d}
                  className="stroke-border"
                  strokeWidth={1.5}
                  initial={reduce ? undefined : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: reduce ? 0 : 0.7 + i * 0.2 }}
                />
              ))}
              {traveling && (
                <>
                  <motion.path
                    d={SEGS[segIdx]}
                    pathLength={1}
                    className="stroke-primary"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeOpacity={0.3}
                    strokeDasharray="0.2 1"
                    style={{ strokeDashoffset: trailWide, opacity: trailOpacity }}
                  />
                  <motion.path
                    d={SEGS[segIdx]}
                    pathLength={1}
                    className="stroke-primary"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeOpacity={0.7}
                    strokeDasharray="0.1 1"
                    style={{ strokeDashoffset: trailCore, opacity: trailOpacity }}
                  />
                  <motion.g style={{ x: dotX, y: dotY }}>
                    <circle r={9} className="fill-primary" opacity={0.15} />
                    <circle r={4.5} className="fill-primary" opacity={0.35} />
                    <circle r={2.4} className="fill-primary" />
                  </motion.g>
                </>
              )}
            </svg>
          </motion.div>

          {/* Depth layer A: stages 01 + 04 and the counter chip */}
          <motion.div className="absolute inset-0" style={reduce ? undefined : { x: aX, y: aY }}>
            <motion.div {...chipEnter(0)} className="absolute left-[2%] top-0">
              <CounterChip count={count} reduce={reduce} />
            </motion.div>
            <div className="absolute left-[30%] top-[16%] -translate-x-1/2 -translate-y-1/2">
              <motion.div {...chipEnter(0)} className="w-[250px]">
                <StageShell step="01" title="Matched" lit={lit(0)} reduce={reduce}>
                  <StageMatched job={job} reached={reached(0)} reduce={reduce} />
                </StageShell>
              </motion.div>
            </div>
            <div className="absolute left-[71%] top-[87%] -translate-x-1/2 -translate-y-1/2">
              <motion.div {...chipEnter(3)} className="w-[240px]">
                <StageShell step="04" title="Reply" lit={lit(3)} reduce={reduce}>
                  <StageReply job={job} reached={reached(3)} reduce={reduce} />
                </StageShell>
              </motion.div>
            </div>
          </motion.div>

          {/* Depth layer B: stages 02 + 03 (counter-drift) */}
          <motion.div className="absolute inset-0" style={reduce ? undefined : { x: bX, y: bY }}>
            <div className="absolute left-[71.5%] top-[39%] -translate-x-1/2 -translate-y-1/2">
              <motion.div {...chipEnter(1)} className="w-[200px]">
                <StageShell step="02" title="Approved" lit={lit(1)} reduce={reduce}>
                  <StageApproved job={job} reached={reached(1)} reduce={reduce} />
                </StageShell>
              </motion.div>
            </div>
            <div className="absolute left-[30%] top-[63.5%] -translate-x-1/2 -translate-y-1/2">
              <motion.div {...chipEnter(2)} className="w-[248px]">
                <StageShell step="03" title="Applied" lit={lit(2)} reduce={reduce}>
                  <StageApplied job={job} reached={reached(2)} reduce={reduce} />
                </StageShell>
              </motion.div>
            </div>
          </motion.div>

          {/* The honest tag, worn once over the whole loop */}
          <motion.div {...chipEnter(1)} className="absolute right-0 top-0">
            <IllustrativeTag />
          </motion.div>
        </div>
      ) : (
        /* -- Mobile: a compact grid, stages sequence by highlight ----------- */
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <CounterChip count={count} reduce={reduce} />
            <IllustrativeTag />
          </div>
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <motion.div {...chipEnter(0)}>
              <StageShell step="01" title="Matched" lit={lit(0)} reduce={reduce} className="h-full">
                <StageMatched job={job} reached={reached(0)} reduce={reduce} />
              </StageShell>
            </motion.div>
            <motion.div {...chipEnter(1)}>
              <StageShell step="02" title="Approved" lit={lit(1)} reduce={reduce} className="h-full">
                <StageApproved job={job} reached={reached(1)} reduce={reduce} />
              </StageShell>
            </motion.div>
            <motion.div {...chipEnter(2)}>
              <StageShell step="03" title="Applied" lit={lit(2)} reduce={reduce} className="h-full">
                <StageApplied job={job} reached={reached(2)} reduce={reduce} />
              </StageShell>
            </motion.div>
            <motion.div {...chipEnter(3)}>
              <StageShell step="04" title="Reply" lit={lit(3)} reduce={reduce} className="h-full">
                <StageReply job={job} reached={reached(3)} reduce={reduce} />
              </StageShell>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroLoop;
