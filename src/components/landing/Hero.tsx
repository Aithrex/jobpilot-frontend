import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, CreditCard, Lock, Play, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Aurora, Container, EASE, startHref } from './_shared';
import { HeroShortlist } from './HeroShortlist';

/**
 * Hero — above the fold. Conversion principles (benefit headline, urgency
 * subtext, outcome CTA, trust signals, proof-of-product panel) applied under
 * the brand's integrity rule (no fabricated stats, press logos, or ratings):
 *
 *   verified-sponsorship badge → big benefit headline (key phrase in primary)
 *   → urgency subtext → "Find my matches" + "See how it works" (smooth-scrolls
 *   to the first demo) → an honest trust row → the realistic job panel.
 *
 * Background is a premium, clean layer stack: faint masked grid + slow aurora
 * wash — both token-driven, both static under prefers-reduced-motion.
 */

const TRUST: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'Sponsorship signals from public H-1B filings' },
  { icon: CreditCard, label: 'Free to start — no card' },
  { icon: Lock, label: 'Your data stays yours' },
];

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, ease: EASE, delay },
        };

  return (
    <section className="relative overflow-hidden">
      {/* Layered premium background — grid dissolves under a radial mask,
          aurora drifts behind it (paused off-screen / reduced motion). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint" />
      <Aurora />

      <Container className="grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pb-24">
        {/* copy */}
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <motion.p
            {...enter(0)}
            className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success"
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            H-1B sponsorship, checked against public filings
          </motion.p>

          <motion.h1
            {...enter(0.05)}
            className="mt-5 text-balance font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl"
          >
            Find jobs that <span className="text-primary">actually sponsor</span> you.
          </motion.h1>

          <motion.p
            {...enter(0.11)}
            className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0"
          >
            Real companies with real H-1B filing records, matched to your résumé — so your OPT clock
            stops burning on roles that were never going to sponsor.
          </motion.p>

          <motion.div
            {...enter(0.18)}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button asChild size="lg" className="w-full rounded-control shadow-panel sm:w-auto">
              <Link to={startHref()}>
                Find my matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full rounded-control sm:w-auto">
              <a href="#sponsorship">
                <Play className="h-4 w-4" /> See how it works
              </a>
            </Button>
          </motion.div>

          {/* Honest trust row — real product facts, never invented social proof */}
          <motion.ul
            {...enter(0.26)}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start"
            aria-label="Why you can trust Aspirely"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* signature — the realistic job panel */}
        <motion.div {...enter(0.15)} className="mx-auto w-full max-w-xl">
          <HeroShortlist />
        </motion.div>
      </Container>
    </section>
  );
}
