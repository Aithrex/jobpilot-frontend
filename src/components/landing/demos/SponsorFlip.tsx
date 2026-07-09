import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { DemoFrame, EASE, useDemoActive, useEntered } from './_demoKit';

const CARDS = [
  { co: 'Ramp', initials: 'Ra', role: 'Data Analyst', count: 63, match: 88 },
  { co: 'Notion', initials: 'No', role: 'ML Engineer', count: 128, match: 81 },
  { co: 'Figma', initials: 'Fi', role: 'Product Analyst', count: 41, match: 76 },
];
const FILTERS = [
  { label: 'H-1B sponsor', on: true },
  { label: 'Cap-exempt', on: true },
  { label: 'OPT/CPT ok', on: false },
  { label: 'STEM', on: false },
];

// One choreographed loop: each card flips over, holds long enough to read,
// flips home; after the last card, everything rests front-side before repeating.
const FLIP_MS = 600;
const HOLD_MS = 1800;
const GAP_MS = 500;
const REST_MS = 1700;

/** Job cards flip to reveal verified sponsorship history; a match ring fills. */
export default function SponsorFlip() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const entered = useEntered(ref);
  const reduce = useReducedMotion();
  const show = reduce || entered;
  const [flippedIdx, setFlippedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setFlippedIdx(null);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms)));
    void (async () => {
      await wait(1200); // let the entrance settle before the first flip
      while (!cancelled) {
        for (let i = 0; i < CARDS.length; i += 1) {
          setFlippedIdx(i);
          await wait(FLIP_MS + HOLD_MS);
          if (cancelled) return;
          setFlippedIdx(null);
          await wait(FLIP_MS + GAP_MS);
          if (cancelled) return;
        }
        await wait(REST_MS); // all-front beat before the loop repeats
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [active]);

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="Job matches with visa filters. Each card flips to reveal verified H-1B sponsorship history and a match score."
      >
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Visa filters</span>
          {FILTERS.map((f, i) => (
            <motion.span
              key={f.label}
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 4 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 4 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: EASE, delay: reduce ? 0 : 0.05 + i * 0.07 }}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                f.on ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {f.label}
            </motion.span>
          ))}
        </div>

        <div className="space-y-2.5">
          {CARDS.map((c, i) => {
            const showBack = active ? flippedIdx === i : true;
            return (
              <div
                key={c.co}
                className="relative h-[70px] transition-transform duration-200 hover:-translate-y-0.5"
                style={{ perspective: 1000 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: showBack ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  {/* front */}
                  <div
                    className="absolute inset-0 flex items-center gap-3 rounded-xl border border-border bg-card px-4"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {c.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{c.role}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.co} · Remote (US)</p>
                    </div>
                    <MatchRing value={c.match} active={entered} className="ml-auto" />
                  </div>
                  {/* back */}
                  <div
                    className="absolute inset-0 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
                      <ShieldCheck className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Sponsored {c.count} H-1Bs</p>
                      <p className="truncate text-xs text-muted-foreground">{c.co} · FY2024 · public filings</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </DemoFrame>
  );
}

function MatchRing({ value, active, className }: { value: number; active: boolean; className?: string }) {
  return (
    <div className={`relative h-10 w-10 shrink-0 ${className ?? ''}`}>
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" pathLength={100} className="fill-none stroke-border" strokeWidth={3} />
        <motion.circle
          cx="18"
          cy="18"
          r="15.5"
          pathLength={100}
          className="fill-none stroke-primary"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ strokeDasharray: '0 100' }}
          animate={{ strokeDasharray: `${active ? value : 0} 100` }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-[10px] font-bold text-foreground">{value}</span>
    </div>
  );
}
