import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Shared kit for the landing "product video" demos (Compass §7). Every demo is
 * pure framer-motion + inline SVG/CSS — no GIFs, videos, or images. Animation is
 * gated so it never runs off-screen or against a reduced-motion preference.
 */

export const EASE = [0.16, 1, 0.3, 1] as const;

const inViewOpts = (margin: string) => ({ margin } as unknown as Parameters<typeof useInView>[1]);

/**
 * True only while the demo is on-screen AND the user allows motion. Loops and
 * timers gate on this; when false, demos render a meaningful static end-state.
 */
export function useDemoActive(ref: RefObject<Element>) {
  const inView = useInView(ref, inViewOpts('-12% 0px'));
  const reduce = useReducedMotion();
  return inView && !reduce;
}

/** One-shot "has this scrolled into view yet" — for entrances and count-ups. */
export function useEntered(ref: RefObject<Element>) {
  return useInView(ref, { once: true, margin: '-40px' } as unknown as Parameters<typeof useInView>[1]);
}

/** Animated number that eases to `target` once `active`; snaps instantly under
 *  reduced motion. */
export function useCountUp(target: number, active: boolean, { duration = 1300, decimals = 0 } = {}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduce]);
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

export function StatValue({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const entered = useEntered(ref);
  const value = useCountUp(to, entered, { decimals });
  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

/** Consistent surface for every demo — the mesh accent + a soft indigo halo. */
export function DemoFrame({
  className,
  innerClassName,
  children,
  style,
}: {
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('relative', className)} style={style}>
      <div aria-hidden className="pointer-events-none absolute -inset-4 -z-10">
        <div className="h-full w-full rounded-[2rem] bg-primary/5 blur-2xl" />
      </div>
      <div
        className={cn(
          'mesh-accent overflow-hidden rounded-2xl border border-border p-4 shadow-xl shadow-primary/5 sm:p-5',
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
