import { Suspense, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DURATION, EASE_ACCELERATE, EASE_DECELERATE } from '@/lib/motion';

/**
 * Soft placeholder while a lazy route chunk loads. A centered spinner made tab
 * switches feel stuck; a quiet pulse keeps the layout calm until content lands.
 */
export function SoftRouteFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn('min-h-[36vh] w-full', className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-full min-h-[36vh] animate-pulse rounded-2xl bg-muted/25" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Primary destination only (`/app/jobs`), so nested tab swaps do not remount chrome. */
export function destinationPathKey(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'app' || parts[0] === 'next') {
    return `/${parts.slice(0, 2).join('/')}`;
  }
  return pathname;
}

interface AnimatedOutletProps {
  /** Passed through to nested route elements via React Router context. */
  context?: unknown;
  className?: string;
  /**
   * `destination` - key on /app/<area> (shell-level; keeps Jobs chrome mounted).
   * `section` - key on the full path (SubNav / nested tabs inside a destination).
   */
  scope?: 'destination' | 'section';
}

/**
 * Smooth route swaps for the app shell and destination sub-navs.
 *
 * Uses `useOutlet()` so exiting pages can finish their fade under
 * AnimatePresence (plain `<Outlet />` unmounts too early for exits).
 * Crossfades with a short rise - never a hard cut or a blocking spinner.
 */
export function AnimatedOutlet({
  context,
  className,
  scope = 'section',
}: AnimatedOutletProps) {
  const location = useLocation();
  const outlet = useOutlet(context);
  const reduceMotion = useReducedMotion();
  // Keep the last non-null outlet so Suspense fallbacks don't blank the stage
  // mid-crossfade when a lazy chunk is still fetching.
  const lastOutlet = useRef(outlet);
  if (outlet) lastOutlet.current = outlet;

  const nested = scope === 'section';
  const transitionKey =
    scope === 'destination' ? destinationPathKey(location.pathname) : location.pathname;

  const yIn = nested ? 6 : 10;
  const yOut = nested ? -4 : -6;
  const duration = reduceMotion ? 0 : nested ? DURATION.fast : DURATION.base;

  return (
    // Relative host so exiting pages can leave as `position: absolute` without
    // stacking two full layouts and bumping scroll height mid-crossfade.
    <div className={cn('relative w-full', className)}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={transitionKey}
          className="w-full"
          initial={reduceMotion ? false : { opacity: 0, y: yIn }}
          animate={{ opacity: 1, y: 0, position: 'relative' }}
          exit={
            reduceMotion
              ? undefined
              : { opacity: 0, y: yOut, position: 'absolute', left: 0, right: 0, top: 0 }
          }
          transition={{
            duration,
            ease: EASE_DECELERATE,
            opacity: { duration, ease: EASE_ACCELERATE },
          }}
        >
          <Suspense fallback={<SoftRouteFallback />}>
            {outlet ?? lastOutlet.current}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
