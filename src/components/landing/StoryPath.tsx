import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Container, EASE } from './_shared';

/**
 * READ → MATCH → TAILOR as one continuous signal path: three oversized
 * editorial verbs joined by a single drawn line. No card grid, no columns of
 * copy — one idea, one phrase per verb. Static (fully drawn) under reduced
 * motion.
 */

const BEATS = [
  { verb: 'Read', phrase: 'Your experience becomes a structured career signal.' },
  { verb: 'Match', phrase: 'That signal is compared with live openings.' },
  { verb: 'Tailor', phrase: 'Choose one role and adapt, without inventing facts.' },
] as const;

export function StoryPath() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const reduce = !!useReducedMotion();
  const drawn = reduce || inView;

  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-24 py-16 sm:py-24">
      <h2 id="how-heading" className="sr-only">
        How Aspirely works
      </h2>
      <Container>
        <div ref={ref} className="relative">
          {/* The connecting signal line — horizontal on desktop, vertical on
              mobile — drawn once as the section scrolls into view. */}
          <svg
            aria-hidden
            className="absolute inset-0 hidden h-full w-full md:block"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 20 140 C 200 140, 240 60, 420 60 S 640 140, 760 140 S 940 60, 985 60"
              fill="none"
              stroke="hsl(var(--primary) / 0.45)"
              strokeWidth={1.5}
              initial={false}
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 1.6, ease: EASE }}
            />
          </svg>
          <svg
            aria-hidden
            className="absolute left-6 top-0 h-full w-px md:hidden"
            viewBox="0 0 2 100"
            preserveAspectRatio="none"
          >
            <motion.line
              x1="1"
              y1="0"
              x2="1"
              y2="100"
              stroke="hsl(var(--primary) / 0.45)"
              strokeWidth={2}
              initial={false}
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 1.2, ease: EASE }}
            />
          </svg>

          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {BEATS.map(({ verb, phrase }, i) => (
              <motion.li
                key={verb}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={drawn ? { opacity: 1, y: 0 } : undefined}
                transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.3 + i * 0.35, ease: EASE }}
                className={cn('pl-14 md:pl-0', i === 1 && 'md:-translate-y-6')}
              >
                <span
                  aria-hidden
                  className="absolute left-4 -translate-x-1/2 md:hidden"
                  style={{ marginTop: 6 }}
                >
                  <span className="block h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
                </span>
                <p className="font-display text-5xl font-extrabold uppercase tracking-tight text-foreground sm:text-6xl">
                  {verb}
                </p>
                <p className="mt-2 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
                  {phrase}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
