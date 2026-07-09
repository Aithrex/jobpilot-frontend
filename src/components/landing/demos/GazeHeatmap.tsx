import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { DemoFrame, EASE, useDemoActive } from './_demoKit';

// One 6s gaze cycle. `reveal` is the fraction of the cycle at which the sweep
// reaches each hotspot — the heat only appears once the eye has landed there,
// then everything fades at cycle end and the pass re-runs.
const SWEEP = {
  left: ['30%', '66%', '26%', '46%', '24%', '24%'],
  top: ['15%', '17%', '46%', '46%', '72%', '72%'],
  opacity: [0.2, 0.75, 0.7, 0.6, 0.5, 0],
  times: [0, 0.22, 0.45, 0.65, 0.82, 1],
};

const HOTSPOTS = [
  { left: '30%', top: '15%', size: 88, reveal: 0.03 },
  { left: '62%', top: '17%', size: 64, reveal: 0.22 },
  { left: '26%', top: '46%', size: 72, reveal: 0.45 },
  { left: '24%', top: '72%', size: 60, reveal: 0.82 },
];

/** The recruiter's six seconds: a gaze heatmap sweeps a résumé in an F-pattern,
 *  showing what actually gets read. Static heat hotspots remain under reduced motion. */
export default function GazeHeatmap() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const [secs, setSecs] = useState(6);

  useEffect(() => {
    if (!active) {
      setSecs(6);
      return;
    }
    setSecs(6);
    const id = window.setInterval(() => setSecs((s) => (s <= 1 ? 6 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A résumé with a six-second recruiter gaze heatmap sweeping across the name, top role, and left column in an F-pattern."
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Eye className="h-3.5 w-3.5 text-primary" aria-hidden /> Recruiter gaze
          </span>
          <span className="font-display text-sm font-bold tabular-nums text-foreground">
            {secs}s<span className="ml-1 text-[11px] font-medium text-muted-foreground">to decide</span>
          </span>
        </div>

        {/* résumé surface */}
        <div className="relative h-[236px] overflow-hidden rounded-xl border border-border bg-card p-4">
          {/* skeleton content */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-2/5 rounded bg-foreground/25" />
            <div className="h-2 w-3/5 rounded bg-muted-foreground/25" />
          </div>
          <div className="mt-4 grid grid-cols-[1fr_1.6fr] gap-4">
            <div className="space-y-1.5">
              {[5, 4, 4, 3, 4].map((w, i) => (
                <div key={i} className="h-2 rounded bg-muted-foreground/20" style={{ width: `${w * 18}%` }} />
              ))}
            </div>
            <div className="space-y-1.5">
              {[6, 5, 6, 4, 5, 5].map((w, i) => (
                <div key={i} className="h-2 rounded bg-muted-foreground/20" style={{ width: `${w * 15}%` }} />
              ))}
            </div>
          </div>

          {/* hotspots — each fades in only once the sweep reaches it; all fade
              at cycle end. Static (all visible) when inactive or reduced-motion. */}
          {HOTSPOTS.map((h, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-warning/25 blur-lg"
              style={{ left: h.left, top: h.top, width: h.size, height: h.size }}
              initial={false}
              animate={active ? { opacity: [0, 0, 1, 1, 0] } : { opacity: 1 }}
              transition={
                active
                  ? {
                      duration: 6,
                      times: [0, h.reveal, Math.min(h.reveal + 0.06, 0.93), 0.94, 1],
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : { duration: 0.3, ease: EASE }
              }
            />
          ))}

          {/* sweeping gaze blob */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warning/50 blur-xl"
            initial={{ left: '30%', top: '15%', opacity: 0 }}
            animate={
              active
                ? { left: SWEEP.left, top: SWEEP.top, opacity: SWEEP.opacity }
                : { opacity: 0 }
            }
            transition={
              active
                ? { duration: 6, times: SWEEP.times, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3, ease: EASE }
            }
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          We rewrite your top third so the six seconds land on <span className="font-semibold text-foreground">what matters</span>.
        </p>
      </div>
    </DemoFrame>
  );
}
