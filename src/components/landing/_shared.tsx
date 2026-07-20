import { useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * Shared primitives + motion kit for the marketing landing (the Career
 * Signal Atlas). One easing, viewport-once reveals, and reduced-motion
 * helpers so every section moves with the same accent and is equally good
 * with motion fully off. Nothing on the page animates anything but
 * transform/opacity (plus SVG pathLength).
 */

// Editorial easing: a confident settle, never springy.
export const EASE = [0.16, 1, 0.3, 1] as const;

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds of stagger delay. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  /** Animate on mount (above the fold) instead of on scroll into view. */
  immediate?: boolean;
}

/**
 * A single gentle entrance (opacity + translate only). Renders a plain div
 * when the user prefers reduced motion, so nothing ever moves against their
 * wishes.
 */
export function Reveal({ children, className, delay = 0, y = 16, immediate = false }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const transition = { duration: 0.28, ease: EASE, delay };
  const from = { opacity: 0, y };
  const to = { opacity: 1, y: 0 };

  if (immediate) {
    return (
      <motion.div className={className} initial={from} animate={to} transition={transition}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={from}
      whileInView={to}
      viewport={{ once: true, margin: '-60px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/**
 * Subtle film grain overlay for stage surfaces (static, aria-hidden,
 * pointer-transparent). Rendered once per stage at ~4% opacity so surfaces
 * feel physical without any visible noise pattern.
 */
export function Grain({ className }: { className?: string }) {
  const raw = useId();
  const filterId = `grain-${raw.replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]', className)}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

/**
 * Ambient brand motion: two blurred radial glows (indigo + the sky brand
 * accent) drifting on very slow transform-only loops behind the hero and the
 * final CTA. Reuses the existing `aurora-drift` keyframes (a symmetric
 * breathe); under reduced motion the glows stay visible but stop moving.
 * Decorative by contract: aria-hidden, pointer-transparent, clipped by its
 * own overflow so the negative offsets can never cause horizontal scroll.
 */
export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute -left-[12%] -top-[18%] h-[58%] w-[52%] rounded-full blur-3xl will-change-transform animate-[aurora-drift_75s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.13), transparent 72%)' }}
      />
      <div
        className="absolute -right-[14%] top-[10%] h-[64%] w-[56%] rounded-full blur-3xl will-change-transform animate-[aurora-drift_90s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--brand-to) / 0.11), transparent 72%)' }}
      />
    </div>
  );
}

/**
 * Primary-CTA destination: the live guest workspace in the hero (the flow
 * runs ON `/`) when the feature is enabled, otherwise account creation. One
 * helper so the nav and close CTAs can never drift onto different doors.
 */
export function startHref(): string {
  return isGuestOnboardingEnabled() ? '/#try' : '/register';
}
