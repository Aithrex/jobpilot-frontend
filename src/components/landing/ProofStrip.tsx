import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  CalendarClock,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE, Reveal } from './_shared';

/**
 * ProofStrip - three claims that are true, shown as a three-up coverflow.
 *
 * Every line here was checked against the backend before it was written. This
 * section carries no testimonial, no customer count, no employer logo and no
 * metric, because none of those exist to cite. What it has instead is three
 * specific, falsifiable statements about how the product behaves - the only
 * kind of proof an honest pre-launch page owns. If any of the three stops being
 * enforced server-side, its slide must come out of this file the same day.
 *
 * WHY COVERFLOW AND NOT ONE SLIDE. The previous carousel showed exactly one
 * claim and hid the other two behind a 4-second wait, so the section read as a
 * single sentence in a very large empty box and a visitor who scrolled past in
 * three seconds saw one third of the proof. All three cards are on screen at
 * once now: the active one is front and centre, the other two sit behind its
 * shoulders, scaled back and turned slightly away. Nothing is withheld - the
 * rotation only changes which one is emphasised.
 *
 * MOTION BUDGET. Transform and opacity only (x / scale / rotateY / z-index),
 * three elements, driven by one interval that runs solely while the section is
 * on screen and unpaused. It pauses on hover, on keyboard focus, and while a
 * card is being dragged. Under prefers-reduced-motion the rotation never
 * attaches and the three become a plain, fully-legible grid.
 */

interface Proof {
  Icon: LucideIcon;
  label: string;
  body: string;
}

const PROOF: readonly Proof[] = [
  {
    Icon: CalendarClock,
    label: 'Posted within 7 days',
    body: 'Guest matches only include roles posted in the last week. A stale listing never reaches you.',
  },
  {
    Icon: Building2,
    label: 'Direct sources',
    body: 'Roles come from real job sources. Paid aggregator reposts, which duplicate and mislead, are excluded.',
  },
  {
    Icon: ShieldCheck,
    label: 'No invented experience',
    body: 'Tailoring moves emphasis, never facts. Your dates, employers, titles and claims stay exactly as written.',
  },
] as const;

/** 4.2s was long enough that the carousel read as stalled - you finish a
 *  two-line claim well before the card moves, and a control that appears
 *  stuck invites a click it did not need. */
const ROTATE_MS = 3100;
const N = PROOF.length;

/** One proof, as a card. Shared by the coverflow and the reduced-motion grid. */
function ProofCard({ Icon, label, body, active }: Proof & { active?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-2xl border p-4 text-left transition-colors duration-500 sm:p-6',
        active
          ? 'border-primary/30 bg-card shadow-pop'
          : 'border-border bg-muted/60 shadow-soft',
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-500 sm:h-12 sm:w-12',
          active ? 'bg-primary/12 text-primary' : 'bg-background text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-balance font-display text-lg font-bold tracking-[-0.01em] text-foreground sm:text-xl">
        {label}
      </h3>
      <p className="mt-2 text-pretty text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
        {body}
      </p>
    </div>
  );
}

/** Where a card sits relative to the active one: -1 behind left, 0 front,
 *  +1 behind right. With three cards every card always has a position. */
function relativePosition(i: number, index: number): number {
  const raw = (((i - index) % N) + N) % N;
  return raw > N / 2 ? raw - N : raw;
}

export function ProofStrip() {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { margin: '-20% 0px' });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // How far a neighbour sits from centre, as a percentage of a card's own
  // width. It has to change with the card width, and CSS classes cannot reach
  // a framer transform, so the breakpoint is read directly.
  //
  // The constraint: a card is centred, then pushed out by `offset` and scaled
  // to 0.86. Its outer edge lands at 50 + offset*W - ... in stage units, and
  // that has to stay under 100 or the card is sliced off by the panel. At the
  // phone card width (72%) an offset of 40% puts the outer edge past 109%,
  // which is why this is not one constant.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  const offset = narrow ? 26 : 40;

  const go = useCallback((next: number) => {
    setIndex(((next % N) + N) % N);
  }, []);

  // Rotate on its own while visible and not paused. Off under reduced motion.
  useEffect(() => {
    if (reduce || paused || !inView) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % N), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, inView]);

  return (
    <section
      id="proof"
      ref={sectionRef}
      aria-labelledby="proof-heading"
      className="relative scroll-mt-4 pb-16 sm:pb-20 lg:pb-24"
    >
      <Container>
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 p-6 shadow-soft sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Why trust it
                </p>
                <h2
                  id="proof-heading"
                  className="mt-3 max-w-xl text-balance font-display text-2xl font-extrabold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.75rem]"
                >
                  Real openings. No invented experience.
                </h2>
              </div>

              {/* Arrows sit with the heading, not under the cards, so they
                  never compete with the card that is being read. */}
              {!reduce && (
                <div className="flex shrink-0 items-center gap-2">
                  {[
                    { dir: -1, Icon: ChevronLeft, label: 'Previous proof point' },
                    { dir: 1, Icon: ChevronRight, label: 'Next proof point' },
                  ].map(({ dir, Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      onClick={() => go(index + dir)}
                      onFocus={() => setPaused(true)}
                      onBlur={() => setPaused(false)}
                      // Solid fill, no outline. A hairline ring around a
                      // hairline chevron gave these two controls almost no
                      // presence on a pale surface - they read as disabled.
                      className="grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reduce ? (
              // Static, fully legible grid - nothing withheld from a
              // reduced-motion visitor.
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {PROOF.map((p) => (
                  <ProofCard key={p.label} {...p} active />
                ))}
              </div>
            ) : (
              <div
                className="mt-8"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {/* The coverflow stage. Fixed height because the cards are
                    absolutely positioned - the box must not resize as the
                    emphasis moves between claims of different lengths. */}
                <div
                  // Tall enough for the longest claim at the narrowest card
                  // width: the cards are absolutely positioned, so this box is
                  // the only thing holding the section open, and a card that
                  // outgrows it would spill over the dots below.
                  className="relative h-[300px] sm:h-[232px]"
                  style={{ perspective: 1400 }}
                  role="group"
                  aria-roledescription="carousel"
                  aria-label="Why trust it"
                >
                  {PROOF.map((p, i) => {
                    const rel = relativePosition(i, index);
                    const active = rel === 0;
                    return (
                      <motion.div
                        key={p.label}
                        // Behind-cards are still readable to assistive tech and
                        // still on screen: this is emphasis, not concealment.
                        // THE -50% IS PART OF THE ANIMATED VALUE, not a class.
                        // The card is pinned at `left-1/2` and used to be
                        // centred with Tailwind's `-translate-x-1/2` - but
                        // framer writes the whole `transform` property, so its
                        // `x` silently replaced that class and every card sat
                        // half a card-width right of where it belonged. The
                        // entire carousel was pushed off centre, leaving the
                        // dead band down the left of the section. Translate
                        // percentages resolve against the element's own width,
                        // so the two offsets are just added here.
                        //
                        // The rest is the tuck: the offset is less than half a
                        // card, so a neighbour always overlaps the middle one
                        // rather than sitting beside it.
                        animate={{
                          x: `${-50 + rel * offset}%`,
                          scale: active ? 1 : 0.86,
                          opacity: active ? 1 : 0.5,
                          rotateY: rel * -18,
                          zIndex: active ? 2 : 1,
                        }}
                        transition={{ duration: 0.55, ease: EASE }}
                        // A neighbour lifts toward the front when you point at
                        // it, so it reads as "click me to bring this forward"
                        // rather than as decoration parked behind the card.
                        whileHover={active ? undefined : { scale: 0.92, opacity: 0.8 }}
                        drag={active ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.16}
                        onDragStart={() => setPaused(true)}
                        onDragEnd={(_, info) => {
                          setPaused(false);
                          if (info.offset.x < -60) go(index + 1);
                          else if (info.offset.x > 60) go(index - 1);
                        }}
                        onClick={active ? undefined : () => go(i)}
                        style={{ transformStyle: 'preserve-3d' }}
                        className={cn(
                          'absolute inset-y-0 left-1/2 w-[72%] sm:w-[56%]',
                          active ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        )}
                      >
                        <ProofCard {...p} active={active} />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Dots: real controls, never colour-only (aria-selected +
                    size), and arrow-operable like any tablist. The active one
                    DRAINS as its turn runs out, which is the only honest way
                    to explain why the cards move on their own - and it empties
                    the moment the rotation is paused, so the control always
                    tells the truth about whether anything is about to happen. */}
                <div
                  className="mt-6 flex items-center justify-center gap-2"
                  role="tablist"
                  aria-label="Proof points"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(index + 1);
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(index - 1);
                    else return;
                    e.preventDefault();
                  }}
                >
                  {PROOF.map((p, i) => {
                    const active = i === index;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={p.label}
                        tabIndex={active ? 0 : -1}
                        onClick={() => go(i)}
                        onFocus={(e) => {
                          if (e.target.matches(':focus-visible')) setPaused(true);
                        }}
                        onBlur={() => setPaused(false)}
                        className={cn(
                          'relative h-2 overflow-hidden rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          active ? 'w-8 bg-primary/25' : 'w-2 bg-border hover:bg-muted-foreground/40',
                        )}
                      >
                        {active && (
                          <span
                            // Keyed on the index so each turn starts empty.
                            // Paused really means paused - the fill holds
                            // where it stopped instead of racing to full and
                            // implying an advance that is not coming.
                            key={`fill-${index}`}
                            aria-hidden
                            className="absolute inset-0 origin-left rounded-full bg-primary"
                            style={{
                              animation: `carousel-tick ${ROTATE_MS}ms linear forwards`,
                              animationPlayState: paused ? 'paused' : 'running',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-8 border-t border-border pt-5 text-[13px] text-muted-foreground">
              Guest uploads are private and time-limited.{' '}
              <Link
                to="/privacy"
                className="focus-ring-visible rounded font-semibold text-primary underline-offset-2 hover:underline"
              >
                Read the full Privacy Policy
              </Link>
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default ProofStrip;
