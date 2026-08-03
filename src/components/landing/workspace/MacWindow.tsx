import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';

/**
 * MacWindow - the Aspirely Live Workspace frame.
 *
 * A high-fidelity application window rendered entirely in live DOM (never a
 * screenshot, never a video). It is *inspired by* premium desktop app design
 * without borrowing any Apple mark: three understated window dots, a
 * translucent title bar, the Aspirely glyph, the window title, and a status
 * indicator.
 *
 * Depth is built from four cheap, transform/opacity-only layers so it stays
 * smooth on mid-tier mobile:
 *   1 a cast shadow that reads as contact shadow + ambient occlusion,
 *   2 an optical edge reflection along the top rim (inset highlight),
 *   3 a very soft inner vignette so the body sits *inside* the frame,
 *   4 an optional perspective tilt that straightens on arrival.
 *
 * The tilt is decorative: under `prefers-reduced-motion` the window renders
 * already-straight with the same material, so nothing is lost.
 */

export type WindowStatus = 'ready' | 'working' | 'done' | 'attention';

const STATUS_LABEL: Record<WindowStatus, string> = {
  ready: 'Ready',
  working: 'Working',
  done: 'Done',
  attention: 'Needs you',
};

const STATUS_DOT: Record<WindowStatus, string> = {
  ready: 'bg-muted-foreground/60',
  working: 'bg-[hsl(var(--brand-to))]',
  done: 'bg-emerald-400',
  attention: 'bg-amber-400',
};

export interface MacWindowProps {
  title?: string;
  status: WindowStatus;
  /** Short status text override (e.g. a live phase label). */
  statusLabel?: string;
  children: ReactNode;
  /** Rendered flush at the bottom of the window (the capability dock). */
  dock?: ReactNode;
  /** Play the arrival tilt→straighten. Ignored under reduced motion. */
  animateArrival?: boolean;
  className?: string;
  bodyClassName?: string;
}

export const MacWindow = forwardRef<HTMLDivElement, MacWindowProps>(function MacWindow(
  {
    title = 'Career Workspace',
    status,
    statusLabel,
    children,
    dock,
    animateArrival = false,
    className,
    bodyClassName,
  },
  ref,
) {
  const reduce = useReducedMotion();
  const tilt = animateArrival && !reduce;

  return (
    <div className={cn('relative', className)} style={{ perspective: 1600 }}>
      {/* 1 - cast shadow. Separate element so it can expand as the window
          straightens without animating the frame's own box-shadow. */}
      <motion.div
        aria-hidden
        // Token-tinted rather than black: on a pearl page a 55% black bloom
        // reads as a smudge under the window, where the same shape in the
        // surface's own foreground colour reads as shade.
        className="pointer-events-none absolute inset-x-[6%] bottom-[-6%] top-[8%] rounded-[2rem] bg-foreground/25 blur-3xl"
        initial={tilt ? { opacity: 0, scaleY: 0.82 } : false}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        ref={ref}
        initial={tilt ? { opacity: 0, y: 26, rotateX: 9, scale: 0.975 } : false}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        // `bg-background`, not `bg-card`: the panels INSIDE this window are
        // card-coloured, and a card-on-card window has no depth in light mode
        // - the resume sheet vanished into the frame, leaving only its border.
        // The frame is the desk, the panels are the paper on it, and that
        // ordering holds in both themes (pearl-50 under white, obsidian-950
        // under obsidian-900).
        className={cn(
          'relative overflow-hidden rounded-[14px] border border-border',
          'bg-background shadow-float will-change-transform',
        )}
      >
        {/* 2 - optical edge reflection: a hairline highlight on the top rim
            plus a whisper down the left edge, the way light catches a real
            bezel. Pure gradient, no cost. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[14px]"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--foreground) / 0.12), hsl(var(--foreground) / 0.02) 1.5px, transparent 3px)',
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-px"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--foreground) / 0.10), transparent 40%)',
          }}
        />

        {/* ── Title bar ── */}
        <div className="relative z-10 flex items-center gap-3 border-b border-border bg-foreground/[0.035] px-3.5 py-2.5 backdrop-blur-xl">
          {/* Three understated window controls. Decorative - not buttons. */}
          <span aria-hidden className="flex shrink-0 items-center gap-[6px]">
            <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]/85 shadow-[inset_0_0.5px_0_hsl(0_0%_100%/0.35)]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]/85 shadow-[inset_0_0.5px_0_hsl(0_0%_100%/0.35)]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]/85 shadow-[inset_0_0.5px_0_hsl(0_0%_100%/0.35)]" />
          </span>

          <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {/* The page's ONE mark. This title bar used to draw its own - a
                chevron on a hand-rolled gradient - so the product window was
                branded differently from the header sitting above it.

                The ONLY instance that sets a size. Every real placement of the
                logo is 32px; this is not a placement, it is a picture OF the
                app's own top bar inside a mock window, so it scales down with
                the screenshot it lives in. Do not "fix" it to 32 - that would
                make the illustration's chrome bigger than the illustration. */}
            <BrandMark size={18} />
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground/90">
              {title}
            </span>
          </span>

          {/* Status indicator. Never colour-only: the dot is paired with text. */}
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-foreground/[0.06] px-2 py-[3px]">
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {statusLabel ?? STATUS_LABEL[status]}
            </span>
          </span>
        </div>

        {/* ── Body ── */}
        <div className={cn('relative', bodyClassName)}>
          {/* 3 - inner vignette so content reads as seated inside the frame. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 0%, transparent 55%, hsl(var(--foreground) / 0.10) 100%)',
            }}
          />
          {children}
        </div>

        {dock}
      </motion.div>
    </div>
  );
});
