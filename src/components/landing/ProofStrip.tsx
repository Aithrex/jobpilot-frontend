import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { CalendarClock, Building2, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE, Reveal } from './_shared';

/**
 * ProofStrip - three claims that are true, shown as one animated carousel.
 *
 * Every line here was checked against the backend before it was written. This
 * section carries no testimonial, no customer count, no employer logo and no
 * metric, because none of those exist to cite. What it has instead is three
 * specific, falsifiable statements about how the product behaves - the only
 * kind of proof an honest pre-launch page owns. If any of the three stops being
 * enforced server-side, its slide must come out of this file the same day.
 *
 * It rotates on its own while on screen (pausing on hover and under reduced
 * motion), and is dot- and swipe-navigable. Reduced-motion visitors get the
 * three as a static, fully-legible stack instead of a rotation.
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

const ROTATE_MS = 4200;

/** One proof, as a large, legible card. Shared by the carousel and the
 *  reduced-motion static stack. */
function ProofCard({ Icon, label, body }: Proof) {
  return (
    <div className="flex flex-col items-center gap-4 px-2 text-center sm:flex-row sm:gap-6 sm:text-left">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-foreground sm:text-2xl">
          {label}
        </h3>
        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {body}
        </p>
      </div>
    </div>
  );
}

export function ProofStrip() {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { margin: '-20% 0px' });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => {
    setIndex(((next % PROOF.length) + PROOF.length) % PROOF.length);
  }, []);

  // Rotate on its own while visible and not paused. Off under reduced motion.
  useEffect(() => {
    if (reduce || paused || !inView) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % PROOF.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, inView]);

  return (
    <section
      id="proof"
      ref={sectionRef}
      aria-labelledby="proof-heading"
      className="relative scroll-mt-24 pb-16 sm:pb-20 lg:pb-24"
    >
      <Container>
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Why trust it
            </p>
            <h2
              id="proof-heading"
              className="mt-3 max-w-xl text-balance font-display text-2xl font-extrabold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.75rem]"
            >
              Real openings. No invented experience.
            </h2>

            {reduce ? (
              // Static, fully legible stack - nothing withheld from a
              // reduced-motion visitor.
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                {PROOF.map((p) => (
                  <ProofCard key={p.label} {...p} />
                ))}
              </div>
            ) : (
              <div
                className="mt-8"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {/* The rotating stage. Fixed-ish height so dots never jump. */}
                <div className="relative min-h-[132px] sm:min-h-[104px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={PROOF[index].label}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.18}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -60) go(index + 1);
                        else if (info.offset.x > 60) go(index - 1);
                      }}
                      className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    >
                      <ProofCard {...PROOF[index]} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Dots: real controls, never colour-only (aria-current + size). */}
                <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Proof points">
                  {PROOF.map((p, i) => {
                    const active = i === index;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={p.label}
                        onClick={() => go(i)}
                        className={cn(
                          'h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          active ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground/40',
                        )}
                      />
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
