import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, MapPin, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Aurora, Container, EASE, Reveal, TiltCard } from './_shared';

/** A product-shaped preview of a sponsorship-honest job match — carries the
 *  core promise (honest matching + one-tap tailored apply) as real UI, not art. */
function MatchPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(rootRef);
  // Ambient chip float runs only while on-screen and motion is allowed.
  const floating = inView && !reduce;

  return (
    <div ref={rootRef} className="relative">
      {/* soft indigo wash behind the card — the only saturated accent */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10">
        <div className="mx-auto h-full w-full rounded-[2rem] bg-primary/10 blur-3xl" />
      </div>

      <TiltCard max={5}>
        <div className="mesh-accent rounded-2xl border border-border p-3 shadow-xl shadow-primary/5">
          <div className="rounded-xl border border-border bg-card p-5">
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                  St
                </span>
                <div>
                  <p className="font-semibold leading-tight text-foreground">Senior Frontend Engineer</p>
                  <p className="text-sm text-muted-foreground">Stripe · Remote (US)</p>
                </div>
              </div>
              <MatchRing value={92} />
            </div>

            {/* honesty badges — icon carries meaning, never colour alone */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
                Sponsors H-1B
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                No relocation
              </span>
            </div>

            {/* why-you-match */}
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {['React + TypeScript, 3 yrs — matches 4 of 5 must-haves', 'Design-system work maps to their frontend platform'].map(
                (line) => (
                  <p key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    {line}
                  </p>
                ),
              )}
            </div>

            <Button asChild className="mt-5 w-full">
              <Link to="/register">
                Tailor &amp; apply <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </TiltCard>

      {/* floating proof chips — slow ambient drift on offset phases so they
          breathe independently; static under reduced motion / off-screen */}
      <motion.div
        className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg sm:flex"
        animate={floating ? { y: [0, -5, 0] } : { y: 0 }}
        transition={{ duration: 5, repeat: floating ? Infinity : 0, ease: 'easeInOut' }}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-success/10">
          <Clock className="h-3.5 w-3.5 text-success" aria-hidden />
        </span>
        <span className="text-foreground">Applied in 84s</span>
      </motion.div>
      <motion.div
        className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg sm:flex"
        animate={floating ? { y: [0, -5, 0] } : { y: 0 }}
        transition={{ duration: 6.5, repeat: floating ? Infinity : 0, ease: 'easeInOut', delay: 0.9 }}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
        </span>
        <span className="text-foreground">Checked against H-1B filings</span>
      </motion.div>
    </div>
  );
}

function MatchRing({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" pathLength={100} className="fill-none stroke-border" strokeWidth={3} />
        <motion.circle
          cx="18"
          cy="18"
          r="15.5"
          pathLength={100}
          className="fill-none stroke-primary"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ strokeDasharray: reduce ? `${value} 100` : '0 100' }}
          animate={{ strokeDasharray: `${value} 100` }}
          transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : 0.4 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

/** One sentence of the headline, entering on its own beat. `inline-block` so the
 *  translate applies (transforms are ignored on plain inline boxes) while text
 *  inside each sentence still wraps naturally at narrow widths. */
function HeadlineBeat({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={cn('inline-block', className)}>{children}</span>;
  return (
    <motion.span
      className={cn('inline-block', className)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.06 + index * 0.08 }}
    >
      {children}
    </motion.span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* living backdrop — faint masked blueprint grid + slow ambient aurora,
          both token-driven and self-gating (static under reduced motion) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint" />
      <Aurora />

      <Container className="grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24">
        {/* copy */}
        <div className="max-w-xl text-center lg:text-left">
          <Reveal immediate>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Built for international students racing the visa clock
            </span>
          </Reveal>

          <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
            <HeadlineBeat index={0}>Four months on your visa.</HeadlineBeat>{' '}
            <HeadlineBeat index={1}>300 applications.</HeadlineBeat>{' '}
            <HeadlineBeat index={2} className="gradient-text">
              Zero callbacks.
            </HeadlineBeat>
          </h1>

          <Reveal immediate delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Take a breath. Aspirely turns the panic into a plan — find roles that actually sponsor, apply in 90
              seconds, and close the 2–4 gaps that get you callbacks. Every claim grounded in your real work.
            </p>
          </Reveal>

          <Reveal immediate delay={0.18}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button
                asChild
                size="lg"
                className="w-full transition-[background-color,box-shadow] hover:shadow-pop hover:shadow-primary/25 sm:w-auto"
              >
                <Link to="/register">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <a href="#how-it-works">
                  <Play className="h-4 w-4" /> See how it works
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal immediate delay={0.24}>
            <p className="mt-4 text-sm text-muted-foreground">Free to start · no credit card · cancel anytime</p>
          </Reveal>
        </div>

        {/* visual */}
        <Reveal immediate delay={0.15} className="mx-auto w-full max-w-md lg:max-w-none">
          <MatchPreview />
        </Reveal>
      </Container>
    </section>
  );
}
