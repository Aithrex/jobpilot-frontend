import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container, EASE } from './_shared';

/**
 * Vision & Mission — the emotional centre. Two short statements set as a
 * designed typographic moment, each assembling from fragments as it scrolls
 * into view. Under prefers-reduced-motion the whole statement simply fades
 * (≤150ms), never word-by-word.
 */

function Statement({
  eyebrow,
  fragments,
}: {
  eyebrow: string;
  /** Ordered phrase fragments; a `node` may carry an accent span. */
  fragments: ReactNode[];
}) {
  const reduce = useReducedMotion();

  return (
    <div className="max-w-3xl">
      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <motion.p
        className="mt-4 font-display text-2xl font-bold leading-[1.28] tracking-tight text-foreground sm:text-3xl sm:leading-[1.3]"
        initial={reduce ? { opacity: 0 } : undefined}
        whileInView={reduce ? { opacity: 1 } : undefined}
        transition={reduce ? { duration: 0.15 } : undefined}
        viewport={{ once: true, margin: '-80px' }}
      >
        {fragments.map((frag, i) =>
          reduce ? (
            <span key={i}>{frag} </span>
          ) : (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.24, ease: EASE, delay: i * 0.048 }}
            >
              {frag}
              {' '}
            </motion.span>
          ),
        )}
      </motion.p>
    </div>
  );
}

export function VisionMission() {
  return (
    <section className="border-y border-border bg-card/40 py-20 sm:py-28">
      <Container className="flex flex-col gap-14 sm:gap-16">
        <Statement
          eyebrow="Vision"
          fragments={['A job hunt', 'you can trust:', 'every match real,', 'every claim your own.']}
        />
        <Statement
          eyebrow="Mission"
          fragments={[
            'Thousands of listings',
            'become the few that',
            <span key="fit" className="text-primary">
              fit
            </span>,
            'so that your last months',
            'on a visa count.',
          ]}
        />
      </Container>
    </section>
  );
}
