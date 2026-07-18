import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Eye, FileText, ShieldCheck } from 'lucide-react';
import {
  DemoStage,
  IllustrativeTag,
  MOTION,
  Panel,
  ReplayButton,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * CRAFT evidence panel — tailoring as a live simulation, three acts:
 *   1 MECHANIC   JD requirement chips fly across and lock into resume lines
 *                while the ATS ring climbs 58 -> 94.
 *   2 INTEGRITY  a fifth claim ("6 yrs Java") tries to enter; the
 *                IntegrityGuard shield blocks it — "NOT IN YOUR HISTORY" —
 *                and the ledger reads 0 FABRICATED CLAIMS.
 *   3 PAYOFF     the recruiter's six-second scan sweeps the page (6.0 -> 0);
 *                the tailored resume survives it, the generic one is struck.
 * Deterministic ~10s loop, in-view gated, pauses on hover/focus; reduced
 * motion parks on the composed end state. All data fictional.
 */

// keyword + rendered text width (px in the 240x300 resume viewBox)
const KW = [
  { t: 'Kubernetes', w: 56 },
  { t: 'Terraform', w: 50 },
  { t: 'CI/CD', w: 30 },
  { t: 'Python', w: 36 },
] as const;
const ATS_BEFORE = 58;
const ATS_AFTER = 94;
const LAND = 0.42; // seconds between keyword landings
const ATS_R = 14;
const ATS_C = 2 * Math.PI * ATS_R;
// before(hold) -> tailor -> guard -> sweep -> verdict  (~10.0s)
const STEP_MS = [1200, 2400, 2200, 2400, 1800];

/** Climb from -> to on cubic ease when `run` flips true; exact under reduce. */
function useClimb(from: number, to: number, run: boolean, reduce: boolean, dur = 1900) {
  const [v, setV] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) {
      setV(to);
      return;
    }
    if (!run) {
      setV(from);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, run, reduce, dur]);
  return v;
}

/** 6.0s -> 0.0 countdown in tenths, synced to the gaze sweep. */
function useGazeTenths(run: boolean, reduce: boolean, dur = 2200) {
  const [t, setT] = useState(reduce ? 0 : 60);
  useEffect(() => {
    if (reduce) {
      setT(0);
      return;
    }
    if (!run) {
      setT(60);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setT(Math.round(60 * (1 - p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, reduce, dur]);
  return (t / 10).toFixed(1);
}

// ── The resume page (scales with its panel via viewBox) ──────────────────────
function ResumePage({ tailored, sweeping, reduce }: { tailored: boolean; sweeping: boolean; reduce: boolean }) {
  return (
    <svg viewBox="0 0 240 300" className="h-full w-full" role="presentation" aria-hidden>
      <defs>
        <radialGradient id="tailor-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.14" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* page */}
      <rect x="10" y="8" width="220" height="284" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />

      {/* name + contact */}
      <motion.rect
        x="26"
        y="26"
        width="112"
        height="10"
        rx="3"
        className={tailored ? 'fill-primary' : 'fill-muted-foreground'}
        initial={false}
        animate={{ opacity: tailored ? 1 : 0.55 }}
        transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
      />
      <rect x="26" y="43" width="80" height="5" rx="2.5" className="fill-muted-foreground" opacity="0.35" />

      {/* skills — the four lines the chips lock into */}
      <text x="26" y="74" className="fill-muted-foreground font-mono text-[8px] font-semibold" style={{ letterSpacing: 1.5 }}>
        SKILLS
      </text>
      {KW.map((k, i) => {
        const y = 86 + i * 24;
        const delay = reduce ? 0 : i * LAND;
        return (
          <g key={k.t}>
            <circle
              cx="30"
              cy={y + 4}
              r="2"
              className={tailored ? 'fill-primary' : 'fill-muted-foreground'}
              opacity={tailored ? 1 : 0.45}
            />
            {/* generic line, rewritten away */}
            <motion.rect
              x="38"
              y={y}
              width="152"
              height="7"
              rx="3.5"
              className="fill-muted-foreground"
              initial={false}
              animate={{ opacity: tailored ? 0 : 0.4 }}
              transition={{ duration: reduce ? 0 : MOTION.micro, ease: MOTION.ease, delay }}
            />
            {/* rewritten line: keyword locks in + rest of the sentence */}
            <motion.g
              initial={false}
              animate={tailored ? { opacity: 1, x: 0 } : { opacity: 0, x: reduce ? 0 : -12 }}
              transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay }}
            >
              <text x="38" y={y + 7} className="fill-foreground text-[9px] font-bold">
                {k.t}
              </text>
              <rect x={38 + k.w + 6} y={y + 1} width={158 - k.w} height="6" rx="3" className="fill-muted-foreground" opacity="0.4" />
            </motion.g>
            {/* lock flash */}
            <motion.rect
              x="24"
              y={y - 4}
              width="194"
              height="16"
              rx="4"
              className="fill-primary"
              initial={false}
              animate={tailored && !reduce ? { opacity: [0, 0.16, 0] } : { opacity: 0 }}
              transition={{ duration: 0.7, times: [0, 0.35, 1], delay }}
            />
          </g>
        );
      })}

      {/* impact — where the gaze settles */}
      <text x="26" y="202" className="fill-muted-foreground font-mono text-[8px] font-semibold" style={{ letterSpacing: 1.5 }}>
        IMPACT
      </text>
      <motion.rect
        x="38"
        y="212"
        width="164"
        height="7"
        rx="3.5"
        className="fill-muted-foreground"
        initial={false}
        animate={{ opacity: tailored ? 0 : 0.4 }}
        transition={{ duration: reduce ? 0 : MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : 4 * LAND }}
      />
      <motion.g
        initial={false}
        animate={tailored ? { opacity: 1, x: 0 } : { opacity: 0, x: reduce ? 0 : -12 }}
        transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : 4 * LAND }}
      >
        <text x="38" y="219" className="fill-foreground text-[9px] font-bold">
          Cut deploy time 43%
        </text>
        <rect x="140" y="213" width="62" height="6" rx="3" className="fill-muted-foreground" opacity="0.4" />
      </motion.g>
      <rect x="38" y="236" width="130" height="6" rx="3" className="fill-muted-foreground" opacity="0.3" />
      <rect x="38" y="256" width="150" height="6" rx="3" className="fill-muted-foreground" opacity="0.22" />

      {/* the six-second gaze: name -> skills -> impact */}
      {reduce ? (
        <>
          <circle cx="70" cy="30" r="30" fill="url(#tailor-heat)" />
          <circle cx="84" cy="218" r="26" fill="url(#tailor-heat)" />
        </>
      ) : (
        sweeping && (
          <motion.circle
            r="32"
            fill="url(#tailor-heat)"
            initial={{ cx: 50, cy: 30, opacity: 0 }}
            animate={{ cx: [50, 180, 60, 160, 84], cy: [30, 30, 112, 112, 218], opacity: [0, 1, 1, 1, 1] }}
            transition={{ duration: 2.2, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.72, 1] }}
          />
        )
      )}
    </svg>
  );
}

export function TailorDemo() {
  const { ref, inView, reduce } = useDemoInView<HTMLDivElement>();
  const [held, setHeld] = useState(false);
  const active = inView && !reduce && !held;
  const { step, replay } = useDemoLoop(STEP_MS.length, { active, reduce, durations: STEP_MS });

  const tailored = step >= 1;
  const guarded = step >= 2;
  const sweeping = step >= 3;
  const verdict = step >= 4;

  const ats = useClimb(ATS_BEFORE, ATS_AFTER, tailored, reduce);
  const atsTarget = tailored ? ATS_AFTER : ATS_BEFORE;
  const tenths = useGazeTenths(step === 3, reduce);
  const secsLabel = reduce || verdict ? '0.0' : step === 3 ? tenths : '6.0';

  const label = `Live tailoring simulation: four job description requirements (Kubernetes, Terraform, CI/CD, Python) lock into resume lines and the ATS match climbs from ${ATS_BEFORE} to ${ATS_AFTER}. A fifth claim, 6 yrs Java, is blocked by IntegrityGuard because it is not in your history; the ledger shows 0 fabricated claims. A recruiter's six second scan then sweeps the page: the tailored resume survives the scan while the generic resume is skipped. Illustrative data.`;

  return (
    <div
      ref={ref}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <DemoStage label={label} reserve={452} className="p-4">
        <div className="flex h-full flex-col gap-3">
          <div className="grid min-h-0 flex-1 grid-cols-[0.92fr_1.08fr] gap-3">
            {/* JD side — the source of every claim */}
            <Panel className="flex min-h-0 flex-col overflow-hidden p-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3 w-3" aria-hidden /> Job description
              </span>
              <p className="mt-1 font-display text-[13px] font-bold leading-tight text-foreground">Platform Engineer</p>
              <p className="mt-2.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Requirements</p>
              <ul className="mt-1.5 space-y-1.5">
                {KW.map((k, i) => (
                  <motion.li
                    key={k.t}
                    initial={false}
                    animate={tailored ? { x: 10, opacity: 0.6 } : { x: 0, opacity: 1 }}
                    transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : i * LAND }}
                    className="flex items-center justify-between rounded-control border border-primary/30 bg-primary/[0.07] px-2 py-1"
                  >
                    <span className="text-[11px] font-medium text-foreground">{k.t}</span>
                    <motion.span
                      initial={false}
                      animate={{ opacity: tailored ? 1 : 0 }}
                      transition={{ duration: reduce ? 0 : MOTION.micro, delay: reduce ? 0 : i * LAND + 0.2 }}
                      className="grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </motion.span>
                  </motion.li>
                ))}
              </ul>

              {/* Act 2 — IntegrityGuard intercepts the fabricated claim */}
              <motion.div
                initial={false}
                animate={{ opacity: guarded ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
                className="mt-auto border-t border-border pt-2"
              >
                <div className="flex items-center gap-1.5">
                  <motion.span
                    initial={false}
                    animate={guarded && !reduce ? { x: [0, 14, 8] } : { x: reduce ? 8 : 0 }}
                    transition={{ duration: 0.55, times: [0, 0.6, 1], ease: MOTION.ease, delay: reduce ? 0 : 0.15 }}
                    className="inline-flex items-center rounded-control border border-destructive/40 bg-destructive/[0.06] px-2 py-1 text-[11px] font-medium text-destructive"
                  >
                    6 yrs Java
                  </motion.span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  </span>
                  <motion.span
                    initial={false}
                    animate={
                      guarded
                        ? { opacity: 1, scale: 1, rotate: -3 }
                        : { opacity: 0, scale: reduce ? 1 : 1.3, rotate: -3 }
                    }
                    transition={{ duration: reduce ? 0 : MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : 0.6 }}
                    className="ml-auto rounded border-2 border-destructive px-1.5 py-0.5 text-right leading-none"
                  >
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-destructive">Blocked</span>
                    <span className="mt-0.5 block font-mono text-[7px] font-semibold uppercase tracking-wide text-destructive">
                      Not in your history
                    </span>
                  </motion.span>
                </div>
                <motion.p
                  initial={false}
                  animate={{ opacity: guarded ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : MOTION.micro, delay: reduce ? 0 : 1.1 }}
                  className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-success"
                >
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> 0 fabricated claims
                </motion.p>
              </motion.div>
            </Panel>

            {/* Resume side — where the proof lands */}
            <Panel className="relative min-h-0 overflow-hidden bg-muted/20 p-1">
              <ResumePage tailored={tailored} sweeping={sweeping} reduce={reduce} />

              {/* ATS ring, climbing as keywords land */}
              <div className="absolute right-2 top-2 flex items-center gap-2 rounded-control border border-border bg-background/90 px-2 py-1.5 backdrop-blur-sm">
                <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r={ATS_R} fill="none" strokeWidth="3.5" className="stroke-muted" />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r={ATS_R}
                    fill="none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={ATS_C}
                    initial={false}
                    animate={{ strokeDashoffset: ATS_C * (1 - atsTarget / 100) }}
                    transition={{ duration: reduce ? 0 : 1.7, ease: MOTION.ease }}
                  />
                </svg>
                <div className="leading-none">
                  <p className="font-mono text-sm font-bold tabular-nums text-foreground">{ats}</p>
                  <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">ATS</p>
                </div>
              </div>

              {/* the six-second timer */}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-control border border-border bg-background/90 px-2 py-1 backdrop-blur-sm">
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Eye className="h-3 w-3 text-primary" aria-hidden /> Recruiter scan
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">{secsLabel}s</span>
              </div>
            </Panel>
          </div>

          {/* Act 3 payoff — tailored survives, generic is struck */}
          <StepIn show={verdict} reduce={reduce} className="shrink-0">
            <div className="grid h-[56px] grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-control border border-success/40 bg-success/[0.06] px-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-success-foreground" aria-hidden>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <div className="leading-tight">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-success">Survives the scan</p>
                  <p className="text-[10px] text-muted-foreground">Tailored, every claim yours</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-control border border-border bg-muted/30 px-3 opacity-70">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="leading-tight">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground line-through">
                    Generic resume
                  </p>
                  <p className="text-[10px] text-muted-foreground">Skipped at 6s</p>
                </div>
              </div>
            </div>
          </StepIn>
        </div>
      </DemoStage>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <IllustrativeTag>Illustrative resume</IllustrativeTag>
        <ReplayButton onClick={replay} />
      </div>
    </div>
  );
}

export default TailorDemo;
