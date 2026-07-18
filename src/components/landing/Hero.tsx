import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CreditCard, Lock, Play, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE, startHref } from './_shared';
import { HeroField } from './hero3d';

/**
 * Hero — "SignalField". A full-bleed dark band (dark in BOTH themes — the
 * layer stack is self-contained, which is why hex values are deliberate here
 * and only here) where a WebGL particle field resolves from scattered noise
 * into an ordered, rising constellation behind the copy: signal from noise,
 * order restored with integrity — the brand promise made literal.
 *
 * Copy keeps the conversion spine under the integrity rule (no fabricated
 * stats, press logos, or ratings): mono integrity chip → benefit headline →
 * urgency subtext → outcome CTA + pitch CTA → honest trust row. The canvas
 * layer is code-split, idle-mounted, paused off-screen, and swapped for a
 * static SVG constellation under prefers-reduced-motion or without WebGL
 * (see ./hero3d). The band's bottom edge fades into `--background` so both
 * themes blend seamlessly into the next section.
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
    <section className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-[#0A0D1E] py-20 md:min-h-[92svh]">
      {/* Radial indigo glow anchoring the copy against the dark field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 72% 58% at 50% 40%, rgba(79, 99, 231, 0.20), transparent 70%)' }}
      />

      {/* Faint local blueprint grid — deliberately NOT the global bg-grid-faint,
          whose token-driven lines would flip bright in light theme on this
          always-dark band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139, 155, 244, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 155, 244, 0.055) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%)',
        }}
      />

      {/* The WebGL SignalField (or its static fallback) */}
      <HeroField />

      {/* Seam: fade the band's bottom edge into the page background so the
          hand-off works in both light and dark themes. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />

      <Container className="relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Mono integrity chip — the brand rule, worn on the sleeve */}
          <motion.p
            {...enter(0)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Integrity-first · No fabricated claims
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              aria-hidden
            />
          </motion.p>

          <motion.h1
            {...enter(0.05)}
            className="mt-6 text-balance font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl"
          >
            Land the job. <span className="text-[#8B9BF4]">Keep your integrity.</span>
          </motion.h1>

          <motion.p {...enter(0.11)} className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-300">
            AI that never fabricates, applications a human approves, and sponsorship facts from public
            H-1B filings. Built for students racing a visa clock.
          </motion.p>

          <motion.div {...enter(0.18)} className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-control bg-[#4F63E7] px-7 text-base font-semibold text-white shadow-[0_10px_36px_rgba(79,99,231,0.38)] hover:bg-[#5D71EE] focus-visible:ring-[#8B9BF4] focus-visible:ring-offset-[#0A0D1E] sm:w-auto"
            >
              <Link to={startHref()}>
                Find my matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
          </motion.div>

          {/* Honest trust row — real product facts, never invented social proof */}
          <motion.ul
            {...enter(0.26)}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5"
            aria-label="Why you can trust Aspirely"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
                <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>
      </Container>
    </section>
  );
}
