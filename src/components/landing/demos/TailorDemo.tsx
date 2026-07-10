import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Eye, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountUp,
  DemoStage,
  MOTION,
  ReplayButton,
  SegButton,
  SegGroup,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * Become the candidate they pick — Vision: the strongest HONEST version of you
 * for each role. JD keywords lock into your resume and the ATS score rises,
 * then the recruiter's 6-second gaze sweeps it in an F-pattern and settles on
 * the lines that earn the read. Every insertion is authored from your history —
 * the "Authored" mark makes clear nothing is fabricated.
 */

const KEYWORDS = ['Kubernetes', 'Go', 'gRPC', 'PostgreSQL', 'Observability'];
const ATS_BEFORE = 61;
const ATS_AFTER = 89;

// F-pattern gaze path over the resume viewBox (0 0 240 300)
const GAZE_X = [46, 188, 46, 172, 46, 60];
const GAZE_Y = [40, 40, 100, 100, 172, 100];

function useCountdown(from: number, run: boolean, reduce: boolean, dur = 6000) {
  const [n, setN] = useState(reduce ? 0 : from);
  useEffect(() => {
    if (reduce || !run) {
      setN(reduce ? 0 : from);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.ceil(from * (1 - p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, run, reduce, dur]);
  return n;
}

function ResumeDoc({ tailored, gazing, reduce, active }: { tailored: boolean; gazing: boolean; reduce: boolean; active: boolean }) {
  // bullet rows; indices 0 & 2 receive keyword insertions (highlighted)
  const bullets = [0, 1, 2, 3];
  const hot = [0, 2]; // highlighted bullet indices
  return (
    <svg viewBox="0 0 240 300" className="h-full w-full" role="presentation" aria-hidden>
      <defs>
        <radialGradient id="gaze-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
          <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* page */}
      <rect x="12" y="10" width="216" height="280" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />

      {/* name + title */}
      <motion.rect
        x="28"
        y="28"
        height="11"
        rx="3"
        className={tailored ? 'fill-primary' : 'fill-muted-foreground'}
        initial={false}
        animate={{ width: 118, opacity: tailored ? 1 : 0.5 }}
        transition={{ duration: MOTION.settle, ease: MOTION.ease }}
      />
      <rect x="28" y="46" width="86" height="6" rx="3" className="fill-muted-foreground" opacity="0.4" />

      {/* section header */}
      <rect x="28" y="72" width="60" height="6" rx="3" className="fill-muted-foreground" opacity="0.6" />

      {/* bullets */}
      {bullets.map((b, i) => {
        const y = 92 + i * 22;
        const isHot = hot.includes(i) && tailored;
        return (
          <g key={b}>
            <circle cx="32" cy={y + 3} r="2" className={isHot ? 'fill-primary' : 'fill-muted-foreground'} opacity={isHot ? 1 : 0.5} />
            <motion.rect
              x="40"
              y={y}
              height="6"
              rx="3"
              className={isHot ? 'fill-primary' : 'fill-muted-foreground'}
              initial={false}
              animate={{ width: i % 2 === 0 ? 168 : 140, opacity: isHot ? 0.9 : 0.4 }}
              transition={{ duration: MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : i * 0.06 }}
            />
          </g>
        );
      })}

      {/* second section */}
      <rect x="28" y="196" width="52" height="6" rx="3" className="fill-muted-foreground" opacity="0.6" />
      {[0, 1].map((i) => (
        <rect key={i} x="40" y={214 + i * 20} width={i === 0 ? 160 : 120} height="6" rx="3" className="fill-muted-foreground" opacity="0.35" />
      ))}

      {/* recruiter's gaze heatmap */}
      {reduce ? (
        <>
          <circle cx="60" cy="40" r="34" fill="url(#gaze-heat)" />
          <circle cx="70" cy="100" r="30" fill="url(#gaze-heat)" />
        </>
      ) : (
        gazing && (
          <motion.circle
            r="30"
            fill="url(#gaze-heat)"
            initial={{ cx: GAZE_X[0], cy: GAZE_Y[0], opacity: 0 }}
            animate={active ? { cx: GAZE_X, cy: GAZE_Y, opacity: [0, 1, 1, 1, 1, 1] } : {}}
            transition={{ duration: 6, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
          />
        )
      )}
    </svg>
  );
}

export function TailorDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  // 0 = before/raw · 1 = tailored · 2 = gaze sweep
  const { step, set, replay } = useDemoLoop(3, { active, reduce, durations: [2600, 2800, 6600] });
  const tailored = step >= 1;
  const gazing = step >= 2;
  const ats = tailored ? ATS_AFTER : ATS_BEFORE;
  const secs = useCountdown(6, active && gazing, reduce);

  const label = `Resume tailored to a job description: ${KEYWORDS.length} authored keywords lock in and the ATS match score rises from ${ATS_BEFORE} to ${ATS_AFTER}, then a recruiter's 6-second gaze sweeps the page and settles on the name and top achievement.`;

  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div ref={ref}>
      <DemoStage label={label} reserve={400} className="p-4 sm:p-5">
        <div className="grid h-full grid-cols-[1.05fr_1fr] gap-3 sm:gap-4">
          {/* resume + gaze */}
          <div className="relative overflow-hidden rounded-control border border-border bg-muted/20 p-1">
            <ResumeDoc tailored={tailored} gazing={gazing} reduce={reduce} active={active} />
            {/* gaze label */}
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-[7px] bg-background/85 px-2 py-1 backdrop-blur-sm">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                <Eye className="h-3 w-3 text-primary" aria-hidden /> Recruiter gaze
              </span>
              <span className="font-display text-[11px] font-bold tabular-nums text-primary">
                {reduce ? '6s' : `${gazing ? secs : 6}s`}
              </span>
            </div>
          </div>

          {/* ATS + keywords */}
          <div className="flex flex-col">
            {/* ATS ring */}
            <div className="flex items-center gap-3">
              <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center">
                <svg viewBox="0 0 68 68" className="h-[68px] w-[68px] -rotate-90">
                  <circle cx="34" cy="34" r={ringR} fill="none" strokeWidth="5" className="stroke-muted" />
                  <motion.circle
                    cx="34"
                    cy="34"
                    r={ringR}
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={ringC}
                    initial={false}
                    animate={{ strokeDashoffset: ringC - (ats / 100) * ringC }}
                    transition={{ duration: 0.9, ease: MOTION.ease }}
                  />
                </svg>
                <div className="absolute text-center leading-none">
                  <CountUp
                    key={`ats-${tailored}`}
                    target={ats}
                    run={active}
                    reduce={reduce}
                    dur={900}
                    className="font-display text-lg font-bold text-foreground"
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">ATS match</p>
                <p className="text-caption text-foreground">
                  {tailored ? (
                    <span className="text-success">+{ATS_AFTER - ATS_BEFORE} to the JD</span>
                  ) : (
                    'raw resume vs JD'
                  )}
                </p>
              </div>
            </div>

            {/* keyword lock-in */}
            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <PenLine className="h-3 w-3" aria-hidden /> JD keywords
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {KEYWORDS.map((k, i) => {
                const locked = tailored;
                return (
                  <li key={k}>
                    <StepIn show delay={locked ? 0.08 * i : 0} reduce={reduce}>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                          locked
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-dashed border-border bg-muted/30 text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-3 w-3 place-items-center rounded-full transition-colors',
                            locked ? 'bg-primary text-primary-foreground' : 'bg-transparent text-transparent',
                          )}
                          aria-hidden
                        >
                          <Check className="h-2 w-2" strokeWidth={3.5} />
                        </span>
                        {k}
                      </span>
                    </StepIn>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto flex items-center gap-1.5 rounded-control border border-primary/25 bg-primary/[0.05] px-2.5 py-1.5">
              <PenLine className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <p className="text-[11px] leading-snug text-foreground">
                Authored from your history — <span className="font-semibold">never fabricated</span>.
              </p>
            </div>
          </div>
        </div>
      </DemoStage>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <SegGroup label="Resume state">
          <SegButton active={!tailored} onClick={() => set(0)}>
            Before
          </SegButton>
          <SegButton active={tailored} onClick={() => set(1)}>
            After
          </SegButton>
        </SegGroup>
        <ReplayButton onClick={() => (tailored ? set(2) : replay())} label="Replay gaze" />
      </div>
    </div>
  );
}

export default TailorDemo;
