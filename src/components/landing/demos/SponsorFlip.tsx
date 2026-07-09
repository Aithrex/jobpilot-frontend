import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

/** Job cards flip to reveal verified sponsorship history; a match ring fills. */
export default function SponsorFlip() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const entered = useEntered(ref);
  const [flipped, setFlipped] = useState<boolean[]>(CARDS.map(() => false));

  useEffect(() => {
    if (!active) {
      setFlipped(CARDS.map(() => false));
      return;
    }
    const timers = CARDS.map((_, i) =>
      window.setInterval(() => {
        setFlipped((f) => {
          const n = [...f];
          n[i] = !n[i];
          return n;
        });
      }, 2600 + i * 650),
    );
    return () => timers.forEach((t) => clearInterval(t));
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
          {FILTERS.map((f) => (
            <span
              key={f.label}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                f.on ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {f.label}
            </span>
          ))}
        </div>

        <div className="space-y-2.5">
          {CARDS.map((c, i) => {
            const showBack = active ? flipped[i] : true;
            return (
              <div key={c.co} className="relative h-[70px]" style={{ perspective: 1000 }}>
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
