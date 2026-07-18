import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container, EASE, MonoChip } from './_shared';

/**
 * Vision & Mission — the emotional centre, set on the landing's night surface.
 * Two short statements as a designed typographic moment, each assembling from
 * fragments as it scrolls into view, over a quiet ambient layer: a faint
 * masked blueprint grid plus a sparse static constellation (CSS only — echoes
 * of the hero's SignalField, nothing animated). Under prefers-reduced-motion
 * the whole statement simply fades (<=150ms), never word-by-word.
 */

/** Static constellation dots, hand-placed and CSS-only (no motion). */
const DOTS =
  'radial-gradient(2px 2px at 12% 18%, hsl(var(--primary) / 0.45), transparent 70%), ' +
  'radial-gradient(1.5px 1.5px at 28% 72%, hsl(var(--primary) / 0.35), transparent 70%), ' +
  'radial-gradient(2px 2px at 46% 30%, hsl(var(--primary) / 0.30), transparent 70%), ' +
  'radial-gradient(1.5px 1.5px at 64% 82%, hsl(var(--primary) / 0.40), transparent 70%), ' +
  'radial-gradient(2px 2px at 78% 24%, hsl(var(--primary) / 0.35), transparent 70%), ' +
  'radial-gradient(1.5px 1.5px at 90% 60%, hsl(var(--primary) / 0.45), transparent 70%)';

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
      <MonoChip>{eyebrow}</MonoChip>
      <motion.p
        className="mt-5 font-display text-2xl font-bold leading-[1.28] tracking-tight text-foreground sm:text-3xl sm:leading-[1.3]"
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
              {' '}
            </motion.span>
          ),
        )}
      </motion.p>
    </div>
  );
}

export function VisionMission() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/30 py-20 sm:py-28">
      {/* Faint masked grid — token-driven (safe: this surface is always night) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.05) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, black 25%, transparent 78%)',
          maskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, black 25%, transparent 78%)',
        }}
      />
      {/* Sparse static constellation — the hero's field, at rest */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: DOTS }} />

      <Container className="relative flex flex-col gap-14 sm:gap-16">
        <Statement
          eyebrow="Vision"
          fragments={[
            'The search is drowning',
            'in fabricated resumes,',
            'ghost jobs, and scams.',
            'Aspirely is the one',
            'instrument that stays',
            <span key="honest">
              <span className="text-primary">honest</span>.
            </span>,
          ]}
        />
        <Statement
          eyebrow="Mission"
          fragments={[
            'Five vetted matches',
            'each morning,',
            'every apply',
            'approved by you,',
            'proof employers can',
            <span key="verify">
              <span className="text-primary">verify</span>,
            </span>,
            'and a plan for',
            'the 90-day clock.',
          ]}
        />
      </Container>
    </section>
  );
}
