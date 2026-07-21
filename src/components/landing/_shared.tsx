import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  );
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
 * A single gentle entrance. Renders a plain div when the user prefers reduced
 * motion, so nothing ever moves against their wishes.
 *
 * DELIBERATELY TRANSFORM-ONLY (no opacity fade). A scroll-reveal that starts
 * at `opacity: 0` leaves every un-scrolled section invisible - to a static
 * full-page capture, to a printed page, and to anything that reads the DOM
 * without simulating scroll. The page then looks like a hero above a void.
 * Rising 14px from full opacity keeps the entrance legible while guaranteeing
 * the final, meaningful state is always painted.
 */
export function Reveal({ children, className, delay = 0, y = 14, immediate = false }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const transition = { duration: 0.36, ease: EASE, delay };
  const from = { y };
  const to = { y: 0 };

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
 * The one section header used by every marketing movement, so the editorial
 * rhythm (eyebrow, display heading, optional lede) is declared once instead of
 * being re-typed with slightly different sizes in each section.
 */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  lede,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  titleId?: string;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn('max-w-2xl', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className="mt-3 text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[2.6rem]"
      >
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
          {lede}
        </p>
      )}
    </Reveal>
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
 * Ambient brand motion: two blurred radial glows (indigo + the cyan signal
 * accent) drifting on very slow transform-only loops behind the final CTA.
 * Reuses the existing `aurora-drift` keyframes (a symmetric breathe); under
 * reduced motion the glows stay visible but stop moving.
 *
 * It PAUSES rather than burns: a blurred, composited layer is one of the more
 * expensive things a page can leave running, and this one lives at the bottom
 * of a long page where it is off-screen almost all of the time. The whole
 * layer's `animation-play-state` is driven by "on screen AND tab visible", so
 * it costs nothing in a background tab or above the fold.
 *
 * Decorative by contract: aria-hidden, pointer-transparent, and clipped by its
 * own overflow so the negative offsets can never cause horizontal scroll.
 */
export function AmbientGlow({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') return;

    let onScreen = false;
    const sync = () => setPlaying(onScreen && document.visibilityState !== 'hidden');

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(host);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const playState = { animationPlayState: playing ? 'running' : ('paused' as const) };

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="absolute -left-[12%] -top-[18%] h-[58%] w-[52%] rounded-full blur-3xl will-change-transform animate-[aurora-drift_75s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{
          ...playState,
          background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.15), transparent 72%)',
        }}
      />
      <div
        className="absolute -right-[14%] top-[10%] h-[64%] w-[56%] rounded-full blur-3xl will-change-transform animate-[aurora-drift_90s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
        style={{
          ...playState,
          background: 'radial-gradient(closest-side, hsl(var(--brand-to) / 0.13), transparent 72%)',
        }}
      />
    </div>
  );
}

/*
 * NOTE: `startHref()` used to live here and returned '/#try' so the nav and
 * closing CTAs scrolled to the hero. That made those CTAs two-click uploads.
 * They now receive the shared picker's `open` from LandingExperience, which is
 * the only place that knows the true runtime guest state (flag AND the 503/404
 * fallback), so there is no href to derive.
 */
