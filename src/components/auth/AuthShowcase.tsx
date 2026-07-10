import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountUp,
  DemoStage,
  IllustrativeTag,
  MOTION,
  Monogram,
  Panel,
  useDemoInView,
} from '@/components/landing/demos/_kit';

/**
 * AuthShowcase — the auth screen's calm, living brand vignette.
 *
 * A single framed "glimpse of the product" that softly cycles through three
 * value beats on ONE ambient loop, each a small, legible animated scene:
 *   1. Sponsorship-honest matching — a matched job card with a match ring and
 *      a green "H-1B sponsor" badge sourced from public filings.
 *   2. The OPT clock, handled — a warning-toned countdown ring turning a visa
 *      deadline into this week's plan.
 *   3. Authored, never fabricated — a résumé claim traced back through the
 *      "your work → your résumé → this claim" chain.
 *
 * Choreography = the landing's motion language (`demos/_kit`): enter with
 * intent, settle, never bounce. Scenes cross-fade; a caption + beat dots name
 * each promise. The loop runs ONLY while the panel is on-screen AND the tab is
 * visible, and pauses on hover/focus so it's readable. Every value is an
 * `Illustrative` example — never a fabricated stat.
 *
 * Reduced motion: renders all three beats as a static, fully-resolved stack —
 * no loop, no cross-fade — so the value still lands with zero movement.
 * The panel only mounts at lg+ (the parent hides it below), and every scene
 * reserves its height so nothing shifts.
 */

const RESERVE = 292;
const OPT_LEFT = 78;
const OPT_TOTAL = 90;

const BEATS = [
  { feature: 'Sponsorship-honest matching', promise: 'Real H-1B data from public filings — never a guess.' },
  { feature: 'The OPT clock, handled', promise: 'Your visa deadline becomes this week’s plan.' },
  { feature: 'Authored, never fabricated', promise: 'Every claim traces back to your real work.' },
] as const;

interface SceneProps {
  reduce: boolean;
}

/** Staggered entrance for elements inside a scene — settle, never bounce. */
function In({
  i = 0,
  reduce,
  className,
  children,
}: {
  i?: number;
  reduce: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : 0.05 + i * 0.08 }}
    >
      {children}
    </motion.div>
  );
}

/** A progress ring that draws once on mount (or sits resolved under reduce). */
function ProgressRing({
  value,
  reduce,
  tone,
  children,
  className,
}: {
  value: number; // 0..1
  reduce: boolean;
  tone: 'primary' | 'warning';
  children: React.ReactNode;
  className?: string;
}) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)}>
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth={3.4} className="stroke-muted" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth={3.4}
          strokeLinecap="round"
          className={tone === 'primary' ? 'stroke-primary' : 'stroke-warning'}
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - value * c }}
          transition={{ duration: reduce ? 0 : 1, ease: MOTION.ease, delay: reduce ? 0 : 0.25 }}
        />
      </svg>
      <span className="absolute font-display text-xs font-bold tabular-nums text-foreground">{children}</span>
    </div>
  );
}

function SceneHeader({ label, reduce }: { label: string; reduce: boolean }) {
  return (
    <In reduce={reduce} className="flex items-center justify-between">
      <p className="overline">{label}</p>
      <IllustrativeTag />
    </In>
  );
}

/* Beat 1 — sponsorship-honest matching */
function SponsorScene({ reduce }: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <SceneHeader label="Matched to your résumé" reduce={reduce} />
      <In i={1} reduce={reduce}>
        <Panel className="flex items-center gap-3 p-3.5 shadow-soft">
          <Monogram name="Vantage" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Software Engineer II</p>
            <p className="truncate text-xs text-muted-foreground">Vantage Cloud · Austin, TX</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              H-1B sponsor · public filings
            </span>
          </div>
          <ProgressRing value={0.94} reduce={reduce} tone="primary" className="h-12 w-12">
            <CountUp target={94} run reduce={reduce} format={(n) => `${n}`} />
          </ProgressRing>
        </Panel>
      </In>
    </div>
  );
}

/* Beat 2 — the OPT clock, handled */
function OptScene({ reduce }: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <SceneHeader label="OPT clock" reduce={reduce} />
      <In i={1} reduce={reduce}>
        <Panel className="flex items-center gap-4 p-4 shadow-soft">
          <ProgressRing value={OPT_LEFT / OPT_TOTAL} reduce={reduce} tone="warning" className="h-14 w-14">
            <CountUp target={OPT_LEFT} run reduce={reduce} format={(n) => `${n}`} />
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              <CountUp target={OPT_LEFT} run reduce={reduce} format={(n) => `${n}`} /> days left{' '}
              <span className="font-medium text-muted-foreground">of {OPT_TOTAL}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Counted for you — turned into this week’s plan.</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <ArrowRight className="h-3 w-3" aria-hidden />3 tasks queued this week
            </div>
          </div>
        </Panel>
      </In>
    </div>
  );
}

/* Beat 3 — authored, never fabricated */
const CHAIN = ['your work', 'your résumé', 'this claim'] as const;
function AuthoredScene({ reduce }: SceneProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <SceneHeader label="Authored, never fabricated" reduce={reduce} />
      <In i={1} reduce={reduce}>
        <Panel className="p-4 shadow-soft">
          <p className="text-sm font-medium text-foreground">
            “Cut pipeline build times 38% at my internship.”
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs text-muted-foreground">
            {CHAIN.map((node, i) => (
              <span key={node} className="inline-flex items-center gap-x-1.5">
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-medium text-success"
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : 0.2 + i * 0.16 }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  {node}
                </motion.span>
                {i < CHAIN.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/70" aria-hidden />}
              </span>
            ))}
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
            Traceable end to end — nothing invented
          </div>
        </Panel>
      </In>
    </div>
  );
}

const SCENES = [SponsorScene, OptScene, AuthoredScene] as const;

export function AuthShowcase({ className }: { className?: string }) {
  const { ref, inView, reduce } = useDemoInView<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = inView && !reduce && tabVisible && !paused;

  // The single ambient loop — advances only while active; parked otherwise.
  useEffect(() => {
    if (!active) return;
    const durations = [3200, 3200, 3600];
    const id = window.setTimeout(() => setStep((s) => (s + 1) % SCENES.length), durations[step]);
    return () => window.clearTimeout(id);
  }, [active, step]);

  // ── Reduced motion: a calm, fully-resolved static stack of all three beats ──
  if (reduce) {
    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {SCENES.map((Scene, i) => (
          <div key={i} className="surface p-4 shadow-soft">
            <Scene reduce />
          </div>
        ))}
      </div>
    );
  }

  const Current = SCENES[step];
  const beat = BEATS[step];

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <DemoStage label={`${beat.feature}. ${beat.promise} Illustrative example.`} reserve={RESERVE}>
        <AnimatePresence>
          <motion.div
            key={step}
            className="absolute inset-0 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: MOTION.entrance, ease: MOTION.ease }}
          >
            <Current reduce={false} />
          </motion.div>
        </AnimatePresence>
      </DemoStage>

      {/* Caption — names the feature + its promise; cross-fades per beat. */}
      <div className="relative mt-4 min-h-[38px]">
        <AnimatePresence>
          <motion.p
            key={step}
            className="absolute inset-x-0 text-[13px] leading-relaxed text-muted-foreground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: MOTION.settle, ease: MOTION.ease }}
          >
            <span className="font-semibold text-foreground">{beat.feature}</span>
            <span aria-hidden> · </span>
            {beat.promise}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Beat dots — real controls that jump to a beat (loop resumes from there). */}
      <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Brand highlights">
        {BEATS.map((b, i) => (
          <button
            key={b.feature}
            type="button"
            role="tab"
            aria-selected={i === step}
            aria-label={b.feature}
            onClick={() => setStep(i)}
            className="group -my-1 flex items-center py-1 focus-visible:outline-none"
          >
            <span
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background',
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border group-hover:bg-muted-foreground/50',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default AuthShowcase;
