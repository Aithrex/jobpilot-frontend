import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE, startHref } from './_shared';

/**
 * Close — the hero's language, returning: the same radial indigo glow, a
 * small STATIC constellation echo of the SignalField (inline SVG, no motion),
 * and the hero's two CTAs so the page ends exactly where it began and
 * resolves to one decision. The CTA button styling deliberately mirrors
 * Hero.tsx verbatim (its literal indigo/#0A0D1E values are the hero band's
 * self-contained palette — see the note there); everything else is
 * token-driven on the shared night surface.
 */

/** Hand-placed constellation: node positions in the 600x320 viewBox. */
const NODES: Array<[number, number]> = [
  [64, 226], [148, 148], [232, 196], [300, 84], [368, 168],
  [452, 112], [532, 208], [186, 58], [416, 262], [514, 52],
];
/** Index pairs joined by hairline edges. */
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 4], [3, 4], [4, 5], [5, 6], [1, 7], [4, 8], [5, 9],
];

function ConstellationEcho() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 320"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-full max-h-[380px] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2"
    >
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          stroke="hsl(var(--primary))"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.8} fill="hsl(var(--primary))" fillOpacity="0.4" />
      ))}
    </svg>
  );
}

export function CloseCTA() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      {/* The hero's radial glow, returning */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 62% 58% at 50% 45%, hsl(var(--primary) / 0.14), transparent 70%)' }}
      />
      <ConstellationEcho />

      <Container>
        <motion.div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reduce ? 0.15 : 0.24, ease: EASE }}
        >
          <h2 className="max-w-md text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
            Make your last months count.
          </h2>
          <p className="mt-4 max-w-sm text-body text-slate-300">
            Free to start, no card. Begin with the roles that actually sponsor.
          </p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Mirrors the hero's primary CTA verbatim */}
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-control bg-[#4F63E7] px-7 text-base font-semibold text-white shadow-[0_10px_36px_rgba(79,99,231,0.38)] hover:bg-[#5D71EE] focus-visible:ring-[#8B9BF4] focus-visible:ring-offset-[#0A0D1E] sm:w-auto"
            >
              <Link to={startHref()}>
                Find my matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {/* Mirrors the hero's pitch CTA verbatim */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-control border-white/20 bg-white/[0.06] px-7 text-base text-slate-200 hover:bg-white/10 hover:text-white focus-visible:ring-[#8B9BF4] focus-visible:ring-offset-[#0A0D1E] sm:w-auto"
            >
              <a href="#pitch">
                <Play className="h-4 w-4" /> Watch the 60-second pitch
              </a>
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
