import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared atoms + progress math for the "Aspirely in 60 seconds" cinema.
 *
 * The stage is a self-contained film frame: dark in BOTH themes, so unlike the
 * rest of the landing it cannot use the flipping semantic tokens. Its palette
 * is deliberately literal (the #0A0D1E family + white/indigo/emerald/amber/red
 * alpha inks) and centralized here so no scene hand-rolls its own hex.
 *
 * Motion model: every scene is a pure function of its local progress `p`
 * (0..1). Helpers below turn segments of `p` into eased opacity/transforms, so
 * scrubbing the timeline in either direction is fully deterministic — there
 * are no fire-and-forget animations anywhere inside the stage.
 */

// ── Stage palette (the one place raw color lives) ────────────────────────────
export const STAGE_BG = 'bg-[#0A0D1E]';
export const STAGE_BG_HEX = '#0A0D1E';
/** Visible focus treatment for controls sitting on the dark stage. */
export const FOCUS_DARK =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D1E]';

// ── Progress math ────────────────────────────────────────────────────────────
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Remap `p` so the segment [a, b] becomes 0..1 (clamped outside). */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Calm cubic ease-out — the stage's one easing, echoing the house EASE. */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Eased fade + rise for a 0..1 segment value. */
export function rise(t: number, dist = 12): CSSProperties {
  const e = easeOut(t);
  return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` };
}

// ── Atoms ────────────────────────────────────────────────────────────────────
/** The house mono micro-label (VERIFIED, LOGGED, DEMO ...). */
export function MonoTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[9px] font-semibold uppercase tracking-[0.15em]', className)}>
      {children}
    </span>
  );
}

/** Corner-tag for any mocked message/reply — integrity is the product. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-white/50',
        className,
      )}
    >
      Demo
    </span>
  );
}

/** The stage's resting card surface — dark-on-dark, echoing the app's UI shapes. */
export function SceneCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div style={style} className={cn('rounded-xl border border-white/10 bg-white/[0.04]', className)}>
      {children}
    </div>
  );
}

/** The scene-1 countdown chip — also reused by the poster still. */
export function CountdownChip({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1.5',
        className,
      )}
    >
      <MonoTag className="text-amber-300/80">OPT clock</MonoTag>
      <span className="font-display text-sm font-bold tabular-nums text-amber-300">{days} days</span>
    </span>
  );
}
