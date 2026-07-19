import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FieldVariant } from './SignalField';

/**
 * HeroField - drop-in background layer for the landing hero (SignalField).
 * Fills its parent absolutely, aria-hidden, pointer-events-none.
 *
 * Two variants share all the machinery:
 *   dark  - the original additive night field (near-white constellation).
 *   light - a quiet, low-alpha indigo drift for the light landing.
 *
 * The WebGL scene is code-split and only mounted once the browser is idle
 * (requestIdleCallback, ~200ms setTimeout fallback) AND the band is near the
 * viewport - so the three.js chunk never competes with first paint. Until
 * then - and permanently under prefers-reduced-motion, without WebGL, or if
 * the canvas throws - a static SVG constellation stands in: the same rising
 * path of softly-glowing milestones, zero motion, zero layout shift (the
 * parent band owns the height).
 */

const SignalField = lazy(() => import('./SignalField'));

let webglSupport: boolean | null = null;
/** Cheap, cached probe - avoids downloading the 3D chunk on no-WebGL agents. */
function probeWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** If the live canvas fails (context creation/runtime), fall back silently -
 *  the StaticField behind it keeps the band looking intentional. */
class FieldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Deterministic satellite offsets around each milestone glow (SVG units). */
const SATELLITES: Array<[number, number]> = [
  [22, -12],
  [-30, 16],
  [10, 30],
  [-14, -26],
  [34, 8],
];

/** Faint always-scattered "stars" so the fallback isn't sterile (SVG units). */
const STARS: Array<[number, number]> = [
  [90, 120], [240, 300], [330, 90], [470, 560], [520, 200], [640, 620],
  [700, 90], [780, 480], [880, 140], [960, 560], [1050, 420], [1120, 80],
  [1150, 300], [60, 480],
];

/** Per-variant inks for the static fallback. Light keeps everything a faint
 *  indigo wash so it reads as texture, never noise, on the near-white band. */
const STATIC_INK: Record<
  FieldVariant,
  {
    glowInner: string;
    glowInnerOpacity: number;
    glowOuterOpacity: number;
    star: string;
    starOpacity: number;
    dot: string;
    dotOpacity: number;
    satellite: string;
    satelliteOpacity: number;
    vignette: string;
  }
> = {
  dark: {
    glowInner: '#8B9BF4',
    glowInnerOpacity: 0.5,
    glowOuterOpacity: 0.16,
    star: '#8B9BF4',
    starOpacity: 0.28,
    dot: '#C7D0FA',
    dotOpacity: 1,
    satellite: '#8B9BF4',
    satelliteOpacity: 0.65,
    vignette: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(4, 6, 16, 0.55) 100%)',
  },
  light: {
    // Tuned up a touch so the field holds its own beside the hero loop
    // (still a wash - the copy and the loop stay the clearest things).
    glowInner: '#4F63E7',
    glowInnerOpacity: 0.22,
    glowOuterOpacity: 0.07,
    star: '#4F63E7',
    starOpacity: 0.2,
    dot: '#4F63E7',
    dotOpacity: 0.6,
    satellite: '#4F63E7',
    satelliteOpacity: 0.33,
    // Feather the edges into the near-white page so the field stays behind
    // the copy instead of competing with it.
    vignette: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, hsl(210 40% 98% / 0.9) 100%)',
  },
};

/**
 * Static fallback - the ordered constellation the live field resolves into:
 * five glowing milestones climbing left to right, plus faint stars and a
 * vignette. Pure SVG/CSS, no motion at all.
 */
function StaticField({ variant }: { variant: FieldVariant }) {
  const ink = STATIC_INK[variant];
  const glowId = `hero-field-glow-${variant}`;
  const stops = [
    { x: 180, y: 545 },
    { x: 390, y: 480 },
    { x: 605, y: 385 },
    { x: 815, y: 270 },
    { x: 1025, y: 155 },
  ];
  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 675"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor={ink.glowInner} stopOpacity={ink.glowInnerOpacity} />
            <stop offset="45%" stopColor="#4F63E7" stopOpacity={ink.glowOuterOpacity} />
            <stop offset="100%" stopColor="#4F63E7" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map(([x, y], i) => (
          <circle key={`s-${i}`} cx={x} cy={y} r={1.4} fill={ink.star} opacity={ink.starOpacity} />
        ))}
        {stops.map((s, i) => (
          <g key={`m-${i}`}>
            <circle cx={s.x} cy={s.y} r={88} fill={`url(#${glowId})`} />
            <circle cx={s.x} cy={s.y} r={3.5} fill={ink.dot} opacity={ink.dotOpacity} />
            {SATELLITES.map(([dx, dy], j) => (
              <circle key={j} cx={s.x + dx} cy={s.y + dy} r={1.7} fill={ink.satellite} opacity={ink.satelliteOpacity} />
            ))}
          </g>
        ))}
      </svg>
      {/* Vignette: settle the edges so copy stays the clearest thing. */}
      <div className="absolute inset-0" style={{ background: ink.vignette }} />
    </>
  );
}

interface HeroFieldProps {
  className?: string;
  variant?: FieldVariant;
}

export function HeroField({ className, variant = 'dark' }: HeroFieldProps) {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [idle, setIdle] = useState(false);

  // Mount the canvas only when the band is near the viewport...
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ...and only after the main thread has gone idle post-hydration.
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 600 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setIdle(true), 200);
    return () => window.clearTimeout(id);
  }, []);

  const showCanvas = !reduce && near && idle && probeWebGL();

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* The static constellation always renders underneath: it is the loading
          state, the reduced-motion/no-WebGL state, AND a destination "ghost"
          the canvas fades in over - so there is never a blank band. */}
      <StaticField variant={variant} />
      {showCanvas && (
        <FieldBoundary>
          <Suspense fallback={null}>
            <SignalField className="absolute inset-0" variant={variant} />
          </Suspense>
        </FieldBoundary>
      )}
    </div>
  );
}
