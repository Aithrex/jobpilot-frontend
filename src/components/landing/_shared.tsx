import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * Shared primitives for the marketing landing ("Signal, not noise").
 * Calm, decisive settle. No bounce, no loops. Gated by prefers-reduced-motion
 * so the page is equally good with motion fully off.
 *
 * NOTE: `EASE` is also consumed by demos/_kit.tsx, which the auth surfaces
 * (AuthShowcase) depend on. Keep it exported.
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
 * A single gentle entrance (opacity + translate only, under 320ms). Renders a
 * plain div when the user prefers reduced motion, so nothing ever moves
 * against their wishes.
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
 * Primary-CTA destination: the zero-friction guest funnel (/start) when the
 * feature is enabled, otherwise account creation. One helper so the nav,
 * hero, and close CTAs can never drift onto different doors.
 */
export function startHref(): string {
  return isGuestOnboardingEnabled() ? '/start' : '/register';
}
