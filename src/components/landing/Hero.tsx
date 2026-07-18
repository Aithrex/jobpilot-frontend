import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CreditCard, Lock, Play, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE, startHref, TiltCard } from './_shared';
import { HeroShortlist } from './HeroShortlist';
import { HeroField } from './hero3d';

/**
 * Hero - a light, professional, product-first opening. Minimal copy (badge,
 * headline, one subtext, CTAs, trust row), then the product itself: the live
 * "matching jobs" panel (HeroShortlist) that shows Aspirely working instead of
 * describing it. Backdrop: soft indigo washes + a faint grid + the light
 * variant of the WebGL SignalField, all behind the content and pointer-inert.
 *
 * Integrity: the badge and headline claim only what the product does (checked
 * against public filings - never "verified"); the trust row is the three real
 * product facts. No invented users, ratings, or press logos.
 */

const TRUST: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'Sponsorship signals from public H-1B filings' },
  { icon: CreditCard, label: 'Free to start, no card' },
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
    <section className="relative isolate overflow-hidden bg-background pb-16 pt-28 sm:pt-32 md:pb-24">
      {/* Soft radial indigo washes - a premium light backdrop, never a wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 22% 12%, hsl(238 70% 57% / 0.08), transparent 70%), radial-gradient(ellipse 50% 42% at 82% 38%, hsl(238 70% 57% / 0.06), transparent 70%)',
        }}
      />

      {/* Faint grid, masked so it fades before the page body */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(215 20% 65% / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(215 20% 65% / 0.12) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 25%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 25%, transparent 75%)',
        }}
      />

      {/* The WebGL SignalField, light variant (or its static fallback) */}
      <HeroField variant="light" />

      <Container className="relative z-10">
        <div className="mx-auto max-w-3xl">
          {/* Green sponsorship badge - the honest claim, worn up front */}
          <motion.p
            {...enter(0)}
            className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-[13px] font-medium text-success"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            H1B and visa sponsored jobs, checked against public filings
          </motion.p>

          <motion.h1
            {...enter(0.05)}
            className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl"
          >
            Find <span className="text-primary">H1B-sponsored</span> jobs faster.
          </motion.h1>

          <motion.p {...enter(0.11)} className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            We match you with real companies that sponsor visas. Stop wasting time on jobs that
            don&apos;t.
          </motion.p>

          <motion.div {...enter(0.18)} className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 w-full rounded-control px-7 text-base font-semibold sm:w-auto">
              <Link to={startHref()}>
                Find my matches now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-control bg-card px-7 text-base sm:w-auto"
            >
              <a href="#pitch">
                <Play className="h-4 w-4" /> See how it works
              </a>
            </Button>
          </motion.div>

          {/* Honest trust row - real product facts, never invented social proof */}
          <motion.ul
            {...enter(0.26)}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5"
            aria-label="Why you can trust Aspirely"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </motion.ul>

          {/* THE CENTERPIECE: the product, live. Subtle pointer tilt only. */}
          <motion.div {...enter(0.34)} className="mt-12">
            <TiltCard max={3}>
              <HeroShortlist />
            </TiltCard>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
