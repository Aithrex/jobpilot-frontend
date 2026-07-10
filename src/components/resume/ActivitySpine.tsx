/**
 * ActivitySpine — the signed-in Home's honest funnel, drawn as a single line.
 *
 * Four nodes — scanned → matched → applied → responded — sit on one horizontal
 * indigo line (the app's landing signature, rebuilt fresh here). Each node is a
 * dot with a tabular-nums count and a small label. Every count is REAL: it comes
 * straight from what DashboardTab already fetched. A node at zero is shown
 * calmly, never hidden — an honest empty funnel still reads as a funnel.
 *
 * On mount the line draws left → right and the counts settle up from zero, all
 * driven by one shared progress value so nothing desyncs. Under
 * prefers-reduced-motion the progress starts (and stays) at 1 — the static
 * end-state, no animation, no rAF loop.
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SpineNode {
  key: string;
  label: string;
  value: number;
}

/**
 * One shared 0→1 mount progress (cubic ease-out), or a constant 1 under reduced
 * motion. Drives the line, the dots, and the count-ups together.
 */
function useMountProgress(reduce: boolean): number {
  const [p, setP] = useState(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      setP(1);
      return;
    }
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const prog = Math.min(1, (t - start) / dur);
      setP(1 - Math.pow(1 - prog, 3));
      if (prog < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  return p;
}

export function ActivitySpine({ nodes }: { nodes: SpineNode[] }) {
  const reduce = useReducedMotion();
  const progress = useMountProgress(!!reduce);
  const last = nodes.length - 1;

  const label =
    'Activity funnel: ' +
    nodes.map((n) => `${n.value} ${n.label.toLowerCase()}`).join(', ') +
    '.';

  return (
    <div
      role="img"
      aria-label={label}
      className="rounded-container border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[260px]">
          {/* Counts */}
          <div className="flex">
            {nodes.map((n) => (
              <div key={n.key} className="flex-1 px-1 text-center">
                <span className="font-display text-2xl font-extrabold tabular-nums leading-none tracking-tight text-foreground sm:text-3xl">
                  {Math.round(n.value * progress)}
                </span>
              </div>
            ))}
          </div>

          {/* Dots on the drawn line */}
          <div className="relative my-3 flex items-center">
            {/* faint full track */}
            <div
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-border"
            />
            {/* indigo line, drawn left → right by shared progress */}
            <div
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-1/2 h-[2px] origin-left rounded-full bg-primary"
              style={{ transform: `translateY(-50%) scaleX(${progress})` }}
            />
            {nodes.map((n, i) => {
              const pos = last > 0 ? i / last : 0;
              const reached = progress >= pos - 0.001;
              const active = n.value > 0;
              return (
                <div key={n.key} className="relative z-10 flex flex-1 justify-center">
                  <span
                    className={cn(
                      'grid h-4 w-4 place-items-center rounded-full ring-4 ring-card transition-colors',
                      reached && active
                        ? 'bg-primary'
                        : reached
                          ? 'bg-muted-foreground/40'
                          : 'bg-border',
                    )}
                  >
                    {reached && active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex">
            {nodes.map((n) => (
              <div key={n.key} className="flex-1 px-1 text-center">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {n.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivitySpine;
