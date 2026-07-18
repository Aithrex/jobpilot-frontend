import { type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * Shared editorial primitives for the marketing landing (Compass §7).
 * Calm, decisive settle — no bounce — gated by prefers-reduced-motion so the
 * page is equally good with motion fully off.
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
 * A single gentle entrance. Renders a plain div (no motion) when the user
 * prefers reduced motion, so nothing ever moves against their wishes.
 */
export function Reveal({ children, className, delay = 0, y = 22, immediate = false }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const transition = { duration: 0.5, ease: EASE, delay };
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
      viewport={{ once: true, margin: '-80px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, icon: Icon, className }: { children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary',
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>}
    </div>
  );
}

/**
 * Scroll-linked drift for layered depth: the child translates gently from
 * `from` → `to` px as the element crosses the viewport. Pure transform (no
 * layout, GPU-composited); renders static under prefers-reduced-motion.
 */
export function Parallax({
  children,
  className,
  from = 26,
  to = -26,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/**
 * Pointer-tracked 3D tilt for showcase cards — a quiet, springy few degrees,
 * mouse-only (ignores touch) and fully inert under prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 130, damping: 18, mass: 0.5 });
  const springRy = useSpring(ry, { stiffness: 130, damping: 18, mass: 0.5 });

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max);
    rx.set(-py * max);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className={className}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: springRx, rotateY: springRy, transformPerspective: 900, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Ambient drifting light — soft brand-tinted blobs that breathe behind a
 * section. CSS-keyframe driven (transform-only), play-state gated so it is
 * paused off-screen and fully static under prefers-reduced-motion.
 */
export function Aurora({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '15% 0px' } as unknown as Parameters<typeof useInView>[1]);
  const reduce = useReducedMotion();
  const playState = inView && !reduce ? 'running' : 'paused';
  return (
    <div ref={ref} aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <span className="aurora-blob aurora-blob-a" style={{ animationPlayState: playState }} />
      <span className="aurora-blob aurora-blob-b" style={{ animationPlayState: playState }} />
      <span className="aurora-blob aurora-blob-c" style={{ animationPlayState: playState }} />
    </div>
  );
}

/**
 * One-line caption under a feature demo: names the feature, states the
 * promise — so the demo explains itself without the surrounding copy.
 */
export function DemoCaption({
  feature,
  children,
  className,
}: {
  feature: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('mx-auto mt-4 max-w-md text-center text-[13px] leading-relaxed text-muted-foreground', className)}>
      <span className="font-semibold text-foreground">{feature}</span>
      <span aria-hidden> · </span>
      {children}
    </p>
  );
}

/** Fixed-size placeholder shown while a lazy demo loads — reserves space so
 *  mounting the demo never shifts layout. */
export function DemoSkeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn('h-full w-full animate-pulse rounded-2xl border border-border bg-muted/40', className)}
    />
  );
}

/**
 * Defers rendering of a (usually code-split) demo until it is near the
 * viewport, so heavy animated mockups never run — or even load — off-screen.
 * The wrapper reserves `minHeight` up front to avoid cumulative layout shift.
 */
export function LazyMount({
  minHeight,
  className,
  rootMargin = '360px',
  children,
}: {
  minHeight: number;
  className?: string;
  rootMargin?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: rootMargin } as unknown as Parameters<typeof useInView>[1]);
  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {inView ? children : <DemoSkeleton style={{ minHeight }} />}
    </div>
  );
}

/**
 * Primary-CTA destination: the zero-friction guest funnel (/start) when the
 * feature is enabled, otherwise account creation. One helper so the nav,
 * hero, pricing, and close CTAs can never drift onto different doors.
 */
export function startHref(): string {
  return isGuestOnboardingEnabled() ? '/start' : '/register';
}
