import {
  type ReactNode,
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { RotateCcw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from '../_shared';

/**
 * Shared motion kit for the Aspirely feature demos.
 *
 * One timing + easing + control vocabulary so every demo reads as a single
 * product, not a pile of widgets. Every demo composes these primitives:
 *   · `DemoStage`   — the fixed-height, role="img" scene frame (zero CLS).
 *   · `useDemoLoop` — the single ambient loop, gated in-view + off under
 *                     prefers-reduced-motion, controllable by real buttons.
 *   · `useCountUp`  — honest, tabular counters that settle (never bounce).
 *   · `SegGroup` / `ReplayButton` — the cohesive interactive controls.
 *
 * Calm, decisive settle — enter with intent, settle, never bounce.
 */

export { EASE };

// ── Motion tokens ────────────────────────────────────────────────────────────
// One shared scale. Durations in seconds (framer) — enter with intent (`entrance`),
// resolve (`settle`), micro-feedback (`micro`); stations hold `dwell` ms per loop.
export const MOTION = {
  ease: EASE,
  micro: 0.22,
  settle: 0.42,
  entrance: 0.52,
  stagger: 0.07,
  /** ambient-loop dwell per station (ms) */
  dwell: 2600,
} as const;

// ── In-view gating ───────────────────────────────────────────────────────────
/**
 * A demo's ambient motion runs only when it's on screen and motion is allowed.
 * `once:false` so scrolling away genuinely pauses the loop (perf + calm).
 */
export function useDemoInView<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { margin: '-12% 0px' } as Parameters<typeof useInView>[1]);
  const reduce = !!useReducedMotion();
  return { ref, inView, reduce, active: inView && !reduce };
}

// ── The single ambient loop ──────────────────────────────────────────────────
/**
 * Advances a step index 0…count-1 and loops, but ONLY while `active`
 * (on-screen, motion allowed). Under reduced motion it parks on the resolved
 * end-state (last step) and never ticks. Real buttons can `set()` any step;
 * the loop simply resumes from there — so interaction and the ambient loop
 * share one source of truth.
 *
 * `durations` may be a single ms value or a per-step array (e.g. a longer hold
 * on the resolved frame).
 */
export function useDemoLoop(
  count: number,
  {
    active,
    reduce,
    durations = MOTION.dwell,
    start = 0,
    restAt,
  }: {
    active: boolean;
    reduce: boolean;
    durations?: number | number[];
    start?: number;
    /** the frame to rest on under reduced motion (defaults to the last step) */
    restAt?: number;
  },
) {
  const rest = restAt ?? count - 1;
  const [step, setStep] = useState(reduce ? rest : start);
  const paused = useRef(false);

  useEffect(() => {
    if (reduce) {
      setStep(rest);
    }
  }, [reduce, rest]);

  useEffect(() => {
    if (reduce || !active || paused.current) return;
    const d = Array.isArray(durations) ? durations[step] ?? MOTION.dwell : durations;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % count), d);
    return () => window.clearTimeout(id);
  }, [step, active, reduce, count, durations]);

  const set = useCallback((s: number) => setStep(((s % count) + count) % count), [count]);
  const replay = useCallback(() => setStep(0), []);
  return { step, set, replay, setPaused: (p: boolean) => (paused.current = p) };
}

// ── Honest settling counter ──────────────────────────────────────────────────
/** Counts to `target` on cubic-ease when `run` flips true; instant + exact
 *  under reduced motion. tabular-nums at the call site keeps digits from jumping. */
export function useCountUp(target: number, run: boolean, reduce: boolean, dur = 900) {
  const [val, setVal] = useState(reduce ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) {
      setVal(target);
      return;
    }
    if (!run) return;
    const startVal = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(startVal + (target - startVal) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduce, dur]);
  return val;
}

/** Declarative counter — key it (e.g. by loop step) to recount on each cycle. */
export function CountUp({
  target,
  run,
  reduce,
  dur = 900,
  format = (n) => n.toLocaleString(),
  className,
}: {
  target: number;
  run: boolean;
  reduce: boolean;
  dur?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const val = useCountUp(target, run, reduce, dur);
  return <span className={cn('tabular-nums', className)}>{format(val)}</span>;
}

// ── The scene frame ──────────────────────────────────────────────────────────
/**
 * Fixed-height, single-accent card that houses a demo scene. `role="img"` +
 * `label` make the whole visual one announced element (interactive controls
 * live OUTSIDE the stage, as real buttons, so they keep their own semantics).
 * `reserve` pins the height so mounting the demo never shifts layout.
 */
export function DemoStage({
  label,
  reserve,
  className,
  bare = false,
  children,
}: {
  label: string;
  reserve: number;
  className?: string;
  /** drop the card chrome (for demos that draw their own frame) */
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ height: reserve }}
      className={cn(
        'relative w-full overflow-hidden',
        !bare && 'rounded-container border border-border bg-card shadow-panel',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A resting inner panel used inside stages — the demos' shared surface. */
export function Panel({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={style} className={cn('rounded-control border border-border bg-background', className)}>
      {children}
    </div>
  );
}

// ── Cohesive interactive controls ────────────────────────────────────────────
export function SegGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-control border border-border bg-muted/40 p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SegButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-caption font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

export function ReplayButton({ onClick, label = 'Replay' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-3 py-1.5 text-caption font-medium text-muted-foreground transition-colors',
        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

// ── Reusable atoms shared across demos ───────────────────────────────────────
/** A soft, honest "illustrative" tag — integrity is the product. */
export function IllustrativeTag({ children = 'Illustrative', className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small company monogram tile (no external logos — a token-tinted initial). */
export function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-control border border-border bg-muted/60 font-display text-sm font-bold text-foreground',
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** Cohesive step-enter wrapper for elements inside a demo scene. */
export function StepIn({
  show,
  delay = 0,
  y = 8,
  reduce,
  className,
  children,
}: {
  show: boolean;
  delay?: number;
  y?: number;
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : y }}
      transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
