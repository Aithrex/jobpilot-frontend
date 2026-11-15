import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Container, EASE, SampleTag, Section } from './_shared';
import { SAMPLE_ROLES } from './sample';
import { FitRing, Monogram } from './scenes/parts';

/**
 * The problem, shown in one move: a wall of listings, most of them not worth
 * an evening, cleared away until the few that are worth it are left.
 *
 * The page used to open straight on the solution. This is the beat before
 * it, and it is a picture rather than a paragraph: the listings leave in
 * four waves, each wave named for the reason (a repost, too old, the wrong
 * level, no sponsorship), and the five that remain step forward with their
 * fit showing.
 *
 * Every reason is something the product really does to a board:
 *  - reposts fold into the employer's own listing;
 *  - older listings are marked and age out of the home board;
 *  - the level is read from the posting;
 *  - a posting that rules sponsorship out is flagged, and leaves the home
 *    board for people who need it.
 *
 * It plays once when it scrolls into view. The button under it is a real
 * control that runs it again or brings the wall back. With reduced motion it
 * opens already cleared.
 */

const WAVES = [
  { id: 'repost', label: 'Reposts', tag: 'Repost' },
  { id: 'old', label: 'Over a month old', tag: '6 weeks old' },
  { id: 'level', label: 'Wrong level', tag: 'Senior only' },
  { id: 'visa', label: 'No sponsorship', tag: 'No sponsorship' },
] as const;

type Reason = (typeof WAVES)[number]['id'] | 'keep';

/** 24 listings: 5 worth keeping, 19 that are not, in a fixed shuffled order. */
const ORDER: Reason[] = [
  'repost', 'old', 'keep', 'level', 'repost', 'visa', 'old', 'repost',
  'visa', 'keep', 'repost', 'old', 'level', 'keep', 'visa', 'repost',
  'old', 'level', 'repost', 'keep', 'visa', 'old', 'level', 'keep',
];

const TILT = [-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5];

function useWide(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return wide;
}

export function Noise() {
  const reduce = useReducedMotion() ?? false;
  const wide = useWide();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.55 });
  /** How many waves have left: 0 is the full wall, WAVES.length is cleared. */
  const [gone, setGone] = useState(reduce ? WAVES.length : 0);
  const [run, setRun] = useState(0);
  const [touched, setTouched] = useState(false);

  // Each wave leaves a beat after the last one.
  useEffect(() => {
    if (reduce) return;
    if (!touched && !inView) return;
    if (run === 0 && touched) return;
    setGone(0);
    const timers = WAVES.map((_, i) =>
      window.setTimeout(() => setGone(i + 1), 700 + i * 620),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce, run, touched]);

  const cleared = gone >= WAVES.length;
  const cols = wide ? 8 : 4;
  const rows = ORDER.length / cols;
  const keepers = ORDER.map((r, i) => (r === 'keep' ? i : -1)).filter((i) => i >= 0);
  const counts = WAVES.map((w) => ORDER.filter((r) => r === w.id).length);
  const left = ORDER.length - counts.slice(0, gone).reduce((a, b) => a + b, 0);

  const press = () => {
    setTouched(true);
    if (reduce) {
      // Nothing animates: the button simply swaps the two states.
      setGone(cleared ? 0 : WAVES.length);
      return;
    }
    if (cleared) {
      setGone(0);
      setRun(0);
    } else {
      setRun((n) => n + 1);
    }
  };

  return (
    <Section id="noise" labelledBy="noise-heading">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="noise-heading" className="pub-h2 max-w-[18ch]">
            Most listings are not worth your evening.
          </h2>
          <p className="pub-h3 tabular-nums" aria-live="polite">
            <span className={cn(cleared ? 'text-primary' : 'text-foreground')}>{left}</span>{' '}
            <span className="text-[hsl(var(--ink-subtle))]">
              {cleared ? 'worth applying to' : 'listings'}
            </span>
          </p>
        </div>

        {/* The reasons, in the order they are applied. */}
        <ul className="mt-8 flex flex-wrap gap-2">
          {WAVES.map((w, i) => {
            const done = gone > i;
            return (
              <li
                key={w.id}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.875rem] font-semibold transition-colors duration-300',
                  done
                    ? 'border-transparent bg-[hsl(var(--tint))] text-[hsl(var(--tint-ink))]'
                    : 'border-border text-ink-muted',
                )}
              >
                <span className={cn(done && 'line-through decoration-2')}>{w.label}</span>
                <span className="tabular-nums opacity-70">{counts[i]}</span>
              </li>
            );
          })}
        </ul>

        {/* THE WALL. A picture: its meaning is carried by the heading, the
            count and the reasons above, so it is hidden from assistive tech. */}
        <div
          ref={ref}
          aria-hidden
          className="relative mt-8"
          style={{ aspectRatio: wide ? '8 / 2.7' : '4 / 6.4' }}
        >
          {ORDER.map((reason, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const keep = reason === 'keep';
            const k = keepers.indexOf(i);
            const role = keep ? SAMPLE_ROLES[k % SAMPLE_ROLES.length] : null;
            const wave = WAVES.findIndex((w) => w.id === reason);
            const leaving = !keep && gone > wave;
            // Where a keeper stands once the wall is gone.
            const fx = wide ? 6 + k * 18 : 4 + (k % 2) * 48;
            const fy = wide ? 30 : 6 + Math.floor(k / 2) * 30;
            const w = wide ? 11.2 : 23;
            return (
              <motion.div
                key={i}
                className={cn(
                  'absolute rounded-xl border bg-card p-2.5 sm:p-3',
                  keep ? 'border-[hsl(var(--input)/0.5)]' : 'border-border',
                )}
                style={{ width: `${w}%`, zIndex: keep ? 2 : 1 }}
                initial={false}
                animate={{
                  left: `${keep && cleared ? fx : (col * 100) / cols + 0.6}%`,
                  top: `${keep && cleared ? fy : (row * 100) / rows + 2}%`,
                  scale: keep && cleared ? (wide ? 1.42 : 1.9) : 1,
                  rotate: keep && cleared ? 0 : TILT[i % TILT.length],
                  opacity: leaving ? 0 : 1,
                  y: leaving ? 46 : 0,
                }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: keep ? 0.8 : 0.5,
                        ease: EASE,
                        delay: keep ? 0 : (i % cols) * 0.035,
                      }
                }
              >
                {role ? (
                  <div className="relative flex items-center gap-2">
                    <Monogram role={role} size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.625rem] font-semibold leading-tight text-foreground">
                        {role.title}
                      </p>
                      <p className="truncate text-[0.5625rem] leading-tight text-muted-foreground">
                        {role.company}
                      </p>
                    </div>
                    <motion.span
                      className="absolute -right-5 -top-6 rounded-full bg-card"
                      initial={false}
                      animate={{ opacity: cleared ? 1 : 0, scale: cleared ? 0.6 : 0.3 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.4, delay: cleared ? 0.5 : 0 }}
                    >
                      <FitRing score={role.score} size={30} draw={cleared} />
                    </motion.span>
                  </div>
                ) : (
                  <>
                    <span className="block h-1.5 w-4/5 rounded-full bg-[hsl(var(--band-strong))]" />
                    <span className="mt-1.5 block h-1.5 w-3/5 rounded-full bg-[hsl(var(--band-strong))]" />
                    <span className="mt-2 inline-block max-w-full truncate rounded bg-[hsl(var(--band))] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-ink-muted">
                      {WAVES[wave].tag}
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <SampleTag />
          <button type="button" onClick={press} className="focus-ring-visible pub-mini-btn">
            {cleared ? 'Bring the wall back' : 'Clear the noise'}
          </button>
        </div>
      </Container>
    </Section>
  );
}
