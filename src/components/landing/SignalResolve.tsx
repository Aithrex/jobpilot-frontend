import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Briefcase, CalendarClock, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Signal Resolve" — Aspirely's signature motif.
 *
 * A field of faint listing-dots RESOLVES as filter chips fire: the noise dims
 * and the handful of dots that pass every active filter light up indigo and
 * connect along a single routed line, while a live count settles from the raw
 * listing volume to the matched few. In the hero it is fully interactive —
 * toggling a chip changes the resolved set and the count in real DOM/SVG state.
 *
 * The data is honest illustrative sample data (labelled as such), tied to the
 * real product meaning: sponsorship-verified matching, not decoration. Under
 * prefers-reduced-motion it renders the resolved end-state statically and the
 * chips still work — they just switch instantly.
 */

// ── Deterministic illustrative field ────────────────────────────────────────
// A fixed multiset of attribute combos guarantees a believable funnel: with all
// three filters on, exactly 7 of the 60 sample dots survive; relaxing a filter
// visibly widens the set. Positions are seeded so the layout never shifts (CLS).
type Attr = { role: boolean; sponsor: boolean; start: boolean };

const SPEC: Array<[boolean, boolean, boolean, number]> = [
  [true, true, true, 7], //  matches every filter — the resolved set
  [true, true, false, 6], //  right role + sponsors, starts too late
  [true, false, true, 12], //  right role + timing, no sponsorship
  [true, false, false, 8],
  [false, true, true, 5],
  [false, false, true, 6],
  [false, true, false, 4],
  [false, false, false, 12], //  pure noise
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEW_W = 420;
const VIEW_H = 300;

type Dot = Attr & { id: number; cx: number; cy: number };

const DOTS: Dot[] = (() => {
  const rand = mulberry32(20260709);
  // build + deterministically shuffle the attribute multiset
  const attrs: Attr[] = [];
  for (const [role, sponsor, start, n] of SPEC) {
    for (let i = 0; i < n; i++) attrs.push({ role, sponsor, start });
  }
  for (let i = attrs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [attrs[i], attrs[j]] = [attrs[j], attrs[i]];
  }
  // jittered 10×6 grid so the scatter is organic but stable
  const cols = 10;
  const rows = 6;
  const padX = 34;
  const padY = 30;
  const cellW = (VIEW_W - padX * 2) / cols;
  const cellH = (VIEW_H - padY * 2) / rows;
  return attrs.map((a, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...a,
      id: i,
      cx: padX + col * cellW + cellW / 2 + (rand() - 0.5) * cellW * 0.7,
      cy: padY + row * cellH + cellH / 2 + (rand() - 0.5) * cellH * 0.7,
    };
  });
})();

const TOTAL_LISTINGS = 1204;

type FilterKey = 'role' | 'sponsor' | 'start';
const FILTERS: Array<{ key: FilterKey; label: string; icon: typeof Briefcase }> = [
  { key: 'role', label: 'Role family', icon: Briefcase },
  { key: 'sponsor', label: 'Sponsorship', icon: ShieldCheck },
  { key: 'start', label: 'Start date', icon: CalendarClock },
];

function passes(dot: Dot, f: Record<FilterKey, boolean>) {
  return (!f.role || dot.role) && (!f.sponsor || dot.sponsor) && (!f.start || dot.start);
}

// ── Live-settling count ──────────────────────────────────────────────────────
function useCountTo(target: number, reduce: boolean) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (reduce) {
      prev.current = target;
      setVal(target);
      return;
    }
    const from = prev.current;
    const to = target;
    const start = performance.now();
    const dur = 420;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return val;
}

export function SignalResolve({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const gradId = `sr-${useId().replace(/:/g, '')}`;
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    role: true,
    sponsor: true,
    start: true,
  });

  const anyActive = filters.role || filters.sponsor || filters.start;
  const matched = useMemo(() => (anyActive ? DOTS.filter((d) => passes(d, filters)) : []), [filters, anyActive]);
  const matchedIds = useMemo(() => new Set(matched.map((d) => d.id)), [matched]);

  const displayCount = useCountTo(matched.length, !!reduce);

  // single routed line threading the matched dots left → right
  const routePath = useMemo(() => {
    if (matched.length < 2) return '';
    const pts = [...matched].sort((a, b) => a.cx - b.cx);
    return pts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.cx.toFixed(1)} ${d.cy.toFixed(1)}`).join(' ');
  }, [matched]);

  const toggle = (k: FilterKey) => setFilters((s) => ({ ...s, [k]: !s[k] }));

  const label = anyActive
    ? `Illustration: ${TOTAL_LISTINGS.toLocaleString()} job listings resolving to ${matched.length} sponsorship-verified matches`
    : `Illustration: ${TOTAL_LISTINGS.toLocaleString()} unfiltered job listings`;

  return (
    <figure className={cn('w-full', className)}>
      {/* Live count — the funnel headline. tabular-nums so digits don't jump. */}
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2 font-display tabular-nums">
            <span className="text-2xl font-bold text-muted-foreground sm:text-3xl">
              {TOTAL_LISTINGS.toLocaleString()}
            </span>
            {anyActive && (
              <>
                <span className="text-lg text-muted-foreground" aria-hidden>
                  &rarr;
                </span>
                <span className="text-2xl font-bold text-primary sm:text-3xl">{displayCount}</span>
              </>
            )}
          </div>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {anyActive ? 'matches worth your time' : 'listings, unfiltered'}
            <span aria-hidden> · </span>
            <span className="uppercase tracking-wider">illustrative</span>
          </p>
        </div>
      </div>

      {/* The field. Wrapper reserves aspect ratio up front → zero layout shift. */}
      <div className="relative rounded-container border border-border bg-card p-2 shadow-soft">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="aspect-[420/300] w-full"
          role="img"
          aria-label={label}
        >
          <defs>
            <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* routed line through the matched set */}
          {routePath && (
            <motion.path
              d={routePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.65}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.65 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              key={routePath}
            />
          )}

          {/* dots */}
          {DOTS.map((d) => {
            const isMatch = matchedIds.has(d.id);
            const dim = anyActive && !isMatch;
            return (
              <g key={d.id}>
                {isMatch && (
                  <motion.circle
                    cx={d.cx}
                    cy={d.cy}
                    r={11}
                    fill={`url(#${gradId})`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={
                      reduce
                        ? { opacity: 1 }
                        : { opacity: [0.7, 1, 0.7], scale: [1, 1.12, 1] }
                    }
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                    }
                    style={{ transformOrigin: `${d.cx}px ${d.cy}px` }}
                  />
                )}
                <motion.circle
                  cx={d.cx}
                  cy={d.cy}
                  className={isMatch ? 'fill-primary' : 'fill-muted-foreground'}
                  initial={false}
                  animate={{
                    r: isMatch ? 4.5 : 2.6,
                    opacity: isMatch ? 1 : dim ? 0.16 : 0.42,
                  }}
                  transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive filter chips — real buttons, keyboard-operable, aria-pressed */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="sr-only" aria-live="polite">
          {label}
        </span>
        {FILTERS.map(({ key, label: chip, icon: Icon }) => {
          const active = filters[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 place-items-center rounded-full border transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
                )}
                aria-hidden
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {chip}
            </button>
          );
        })}
      </div>
      <figcaption className="sr-only">
        Interactive illustration. Toggle the Role family, Sponsorship, and Start date filters to watch {TOTAL_LISTINGS.toLocaleString()} sample
        listings resolve to the few that fit.
      </figcaption>
    </figure>
  );
}

export default SignalResolve;
