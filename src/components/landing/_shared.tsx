import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * Shared primitives + motion kit for the marketing landing ("career signal
 * network"). One duration scale, one easing, viewport-once reveals, and
 * reduced-motion helpers so every section moves with the same accent and is
 * equally good with motion fully off.
 *
 * NOTE: `EASE` is also consumed by demos/_kit.tsx, which the auth surfaces
 * (AuthShowcase) depend on. Keep it exported.
 */

// Editorial easing: a confident settle, never springy.
export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The landing duration scale (seconds). Interactions live in 150-500ms;
 * section reveals may stretch to ~800ms. Nothing on the page animates
 * anything but transform/opacity (plus SVG pathLength/dashoffset).
 */
export const DUR = {
  /** hover/focus feedback */
  micro: 0.18,
  /** small state changes, crossfades */
  fast: 0.25,
  /** panel and step transitions */
  base: 0.35,
  /** scene choreography beats */
  slow: 0.5,
  /** section reveals */
  reveal: 0.65,
} as const;

/** One shared viewport config for scroll reveals. */
export const VIEWPORT_ONCE = { once: true, margin: '-70px' } as const;

/** Staggered reveal variants: put `revealGroup` on the parent, `revealItem` on children. */
export const revealGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
} as const;

export const revealItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.reveal, ease: EASE } },
} as const;

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

type RevealTag = 'div' | 'ol' | 'ul' | 'li' | 'article';

const MOTION_TAGS = {
  div: motion.div,
  ol: motion.ol,
  ul: motion.ul,
  li: motion.li,
  article: motion.article,
} as const;

/**
 * Staggered viewport-once reveal parent. Plain element under reduced motion
 * (children render fully, nothing moves).
 */
export function RevealGroup({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  const MTag = MOTION_TAGS[as];
  return (
    <MTag className={className} variants={revealGroup} initial="hidden" whileInView="show" viewport={VIEWPORT_ONCE}>
      {children}
    </MTag>
  );
}

/** A staggered child of `RevealGroup`. */
export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  const MTag = MOTION_TAGS[as];
  return (
    <MTag className={className} variants={revealItem}>
      {children}
    </MTag>
  );
}

/**
 * In-view + reduced-motion state for animated stages. Loops gate on
 * `active` so nothing animates off screen or against user preference.
 */
export function useSceneState<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { margin: '-12% 0px' } as Parameters<typeof useInView>[1]);
  const reduce = !!useReducedMotion();
  return { ref, inView, reduce, active: inView && !reduce };
}

/**
 * Deterministic looping phase machine for the capability infographics.
 * Steps 0..n-1 with per-phase dwell times (ms), only while `active` and not
 * paused; under reduced motion it parks on the resolved final phase
 * (`restAt`, default last) and never ticks.
 */
export function useSceneLoop(
  durations: readonly number[],
  { active, reduce, restAt }: { active: boolean; reduce: boolean; restAt?: number },
) {
  const count = durations.length;
  const rest = restAt ?? count - 1;
  const [phase, setPhase] = useState(reduce ? rest : 0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce) setPhase(rest);
  }, [reduce, rest]);

  useEffect(() => {
    if (reduce || !active || paused) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % count), durations[phase]);
    return () => window.clearTimeout(id);
  }, [phase, active, paused, reduce, count, durations]);

  return { phase, setPhase, paused, setPaused };
}

/** Hover/focus handlers that pause a scene loop while the user inspects it. */
export function scenePauseHandlers(setPaused: (paused: boolean) => void) {
  return {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  };
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
 * Primary-CTA destination: the live guest workspace in the hero (the flow now
 * runs ON `/`) when the feature is enabled, otherwise account creation. One
 * helper so the nav and close CTAs can never drift onto different doors.
 */
export function startHref(): string {
  return isGuestOnboardingEnabled() ? '/#try' : '/register';
}
