import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared atoms + progress math for the "Aspirely in 60 seconds" cinema.
 *
 * The stage is a self-contained film frame: dark in BOTH themes, so unlike the
 * rest of the landing it cannot use the flipping semantic tokens. Its palette
 * is deliberately literal (the #0A0D1E night family + indigo/ink/emerald/amber
 * /red inks) and centralized here so no scene hand-rolls its own hex.
 *
 * Motion model: every scene is a pure function of its local progress `p`
 * (0..1). Helpers below turn segments of `p` into eased values, and any
 * "random" layout is a module-level constant built with the seeded PRNG here,
 * so scrubbing the timeline in either direction is fully deterministic - no
 * fire-and-forget animations, no time-based randomness anywhere on the stage.
 */

// -- Stage palette (the one place raw color lives) ---------------------------
export const STAGE_BG = 'bg-[#0A0D1E]';
export const STAGE_BG_HEX = '#0A0D1E';
/** The accent: brand indigo and its light signal tint. */
export const INDIGO = '#4F63E7';
export const INDIGO_LIGHT = '#8B9BF4';
/** Near-white ink for type and lit points. */
export const INK = '#E8ECFF';
/** Emerald: reserved for "verified" moments only. */
export const EMERALD = '#6EE7B7';
/** Amber/red: reserved for threat moments only. */
export const AMBER = '#FCD34D';
export const RED = '#F87171';

export type Rgb = [number, number, number];
export const INK_RGB: Rgb = [232, 236, 255];
export const INDIGO_LIGHT_RGB: Rgb = [139, 155, 244];
export const RED_RGB: Rgb = [248, 113, 113];

export const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
/** Linear color blend a -> b by t, as an rgba() string. */
export function mixRgb(a: Rgb, b: Rgb, t: number, alpha = 1): string {
  const m = clamp01(t);
  const r = Math.round(a[0] + (b[0] - a[0]) * m);
  const g = Math.round(a[1] + (b[1] - a[1]) * m);
  const bl = Math.round(a[2] + (b[2] - a[2]) * m);
  return `rgba(${r},${g},${bl},${alpha})`;
}

/** Visible focus treatment for controls sitting on the dark stage. */
export const FOCUS_DARK =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D1E]';

// -- Progress math -----------------------------------------------------------
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Remap `p` so the segment [a, b] becomes 0..1 (clamped outside). */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Calm cubic ease-out - the stage's one easing, echoing the house EASE. */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** One-shot swell: 0 -> 1 -> 0 across a 0..1 segment (flares, ripple crests). */
export const pulse = (t: number) => Math.sin(clamp01(t) * Math.PI);
/** Fractional part - deterministic looping phase for ripples (pure in p). */
export const wrap01 = (v: number) => v - Math.floor(v);

/**
 * Mulberry32 - tiny seeded PRNG. Scene layouts that need "randomness" are
 * built ONCE at module scope from a fixed seed, so every frame (and every
 * reload) sees the identical constellation.
 */
export function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Eased fade + rise for a 0..1 segment value (HTML-side entrances). */
export function rise(t: number, dist = 12): CSSProperties {
  const e = easeOut(t);
  return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` };
}

// -- Atoms -------------------------------------------------------------------
/** The house mono micro-label (VERIFIED, LOGGED, DEMO ...). */
export function MonoTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[9px] font-semibold uppercase tracking-[0.15em]', className)}>
      {children}
    </span>
  );
}

/** Corner-tag for anything that could read as a real artifact - integrity is the product. */
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

/** The stage's resting glass plate - hairline stroke over the night field. */
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
    <div
      style={style}
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_50px_-18px_rgba(79,99,231,0.35)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The OPT countdown chip - reused by the pre-play poster. Carries a miniature
 * burning ring, the same motif scene 1 opens on at full scale.
 */
export function CountdownChip({ days, className }: { days: number; className?: string }) {
  const f = clamp01(days / 90);
  const c = 2 * Math.PI * 5;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/[0.06] px-3 py-1.5',
        className,
      )}
    >
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 -rotate-90" aria-hidden>
        <circle cx="7" cy="7" r="5" fill="none" stroke={rgba(INK_RGB, 0.15)} strokeWidth="1.5" />
        <circle
          cx="7"
          cy="7"
          r="5"
          fill="none"
          stroke={AMBER}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
        />
      </svg>
      <MonoTag className="text-amber-300/80">OPT clock</MonoTag>
      <span className="font-display text-sm font-bold tabular-nums text-amber-300">{days} days</span>
    </span>
  );
}
