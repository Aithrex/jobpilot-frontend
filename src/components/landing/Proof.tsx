import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Container, EASE } from './_shared';

/**
 * Proof — one honest infographic. A beam resolves "listings scanned" down to
 * "roles worth applying to", animating once on scroll into view. Integrity is a
 * hard invariant: the funnel numbers are labelled *illustrative*, and the only
 * unqualified claim is a true capability (scans across major ATS boards). No
 * fabricated measured stat, no testimonial.
 */

function useInViewCount(target: number, inView: boolean, reduce: boolean) {
  const [val, setVal] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(target);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, reduce]);
  return val;
}

const FAINT = [
  [24, 24],
  [24, 56],
  [24, 88],
  [24, 120],
  [56, 40],
  [56, 72],
  [56, 104],
  [88, 56],
  [88, 88],
  [120, 72],
] as const;

export function Proof() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const scanned = useInViewCount(1204, inView, !!reduce);
  const worth = useInViewCount(7, inView, !!reduce);

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div ref={ref} className="mx-auto max-w-4xl rounded-container border border-border bg-card p-6 shadow-soft sm:p-10">
          <h2 className="font-display text-title font-bold tracking-tight text-foreground">The funnel, honestly</h2>
          <p className="mt-2 text-body text-muted-foreground">
            Most listings aren&apos;t worth your time. We find the ones that are.
          </p>

          <div className="mt-8 grid items-center gap-6 sm:grid-cols-[auto_1fr_auto]">
            {/* scanned */}
            <div className="text-center sm:text-left">
              <div className="font-display text-4xl font-extrabold tabular-nums text-muted-foreground sm:text-5xl">
                {scanned.toLocaleString()}
              </div>
              <p className="mt-1 text-caption text-muted-foreground">listings scanned</p>
            </div>

            {/* resolving beam */}
            <svg viewBox="0 0 200 144" className="h-24 w-full sm:h-28" role="img" aria-label={`Illustration: ${scanned.toLocaleString()} listings scanned resolve to ${worth} worth applying to`}>
              <defs>
                <linearGradient id="proof-beam" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
                </linearGradient>
              </defs>

              {/* faint volume on the left */}
              {FAINT.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={2.6} className="fill-muted-foreground" opacity={0.35} />
              ))}

              {/* the beam: wide on the left, focusing to a bright node on the right */}
              <motion.path
                d="M 20 16 L 160 64 L 160 80 L 20 128 Z"
                fill="url(#proof-beam)"
                initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
                animate={inView ? { opacity: 1, scaleX: 1 } : undefined}
                transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                style={{ transformOrigin: '20px 72px' }}
              />
              <motion.line
                x1="20"
                y1="72"
                x2="160"
                y2="72"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={inView ? { pathLength: 1, opacity: 0.7 } : undefined}
                transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: 0.1 }}
              />
              {/* bright resolved node */}
              <motion.circle
                cx={166}
                cy={72}
                r={6}
                className="fill-primary"
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : undefined}
                transition={{ duration: reduce ? 0 : 0.24, ease: EASE, delay: 0.4 }}
                style={{ transformOrigin: '166px 72px' }}
              />
            </svg>

            {/* worth applying to */}
            <div className="text-center sm:text-right">
              <div className="font-display text-4xl font-extrabold tabular-nums text-primary sm:text-5xl">{worth}</div>
              <p className="mt-1 text-caption text-muted-foreground">worth applying to</p>
            </div>
          </div>

          <p className="mt-8 border-t border-border pt-5 text-caption text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-foreground">Illustrative funnel.</span> Aspirely
            scans across major ATS boards — Greenhouse, Lever, Workday, Ashby — and verifies sponsorship signals before a
            role ever reaches you.
          </p>
        </div>
      </Container>
    </section>
  );
}
