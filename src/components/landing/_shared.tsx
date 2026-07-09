import { type ReactNode, type CSSProperties, useRef } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
