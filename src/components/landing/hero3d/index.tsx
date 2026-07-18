import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * HeroField — drop-in background layer for the landing hero (SignalField).
 * Fills its parent absolutely, aria-hidden, pointer-events-none.
 *
 * The WebGL scene is code-split and only mounted once the browser is idle
 * (requestIdleCallback, ~200ms setTimeout fallback) AND the band is near the
 * viewport — so the three.js chunk never competes with first paint. Until
 * then — and permanently under prefers-reduced-motion, without WebGL, or if
 * the canvas throws — a static SVG constellation stands in: the same rising
 * path of softly-glowing milestones, zero motion, zero layout shift (the
 * parent band owns the height).
 */

const SignalField = lazy(() => import('./SignalField'));

let webglSupport: boolean | null = null;
/** Cheap, cached probe — avoids downloading the 3D chunk on no-WebGL agents. */
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

/** If the live canvas fails (context creation/runtime), fall back silently —
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

/**
 * Static fallback — the ordered constellation the live field resolves into:
 * five glowing milestones climbing left → right, plus faint stars and a
 * vignette. Pure SVG/CSS, no motion at all.
 */
function StaticField() {
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
          <radialGradient id="hero-field-glow">
            <stop offset="0%" stopColor="#8B9BF4" stopOpacity="0.5" />
            <stop offset="45%" stopColor="#4F63E7" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4F63E7" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map(([x, y], i) => (
          <circle key={`s-${i}`} cx={x} cy={y} r={1.4} fill="#8B9BF4" opacity={0.28} />
        ))}
        {stops.map((s, i) => (
          <g key={`m-${i}`}>
            <circle cx={s.x} cy={s.y} r={88} fill="url(#hero-field-glow)" />
            <circle cx={s.x} cy={s.y} r={3.5} fill="#C7D0FA" />
            {SATELLITES.map(([dx, dy], j) => (
              <circle key={j} cx={s.x + dx} cy={s.y + dy} r={1.7} fill="#8B9BF4" opacity={0.65} />
            ))}
          </g>
        ))}
      </svg>
      {/* Vignette: settle the edges so copy stays the brightest thing. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(4, 6, 16, 0.55) 100%)' }}
      />
    </>
  );
}

interface HeroFieldProps {
  className?: string;
}

export function HeroField({ className }: HeroFieldProps) {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [idle, setIdle] = useState(false);

  // Mount the canvas only when the band is near the viewport…
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

  // …and only after the main thread has gone idle post-hydration.
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
          the additive canvas fades in over — so there is never a blank band. */}
      <StaticField />
      {showCanvas && (
        <FieldBoundary>
          <Suspense fallback={null}>
            <SignalField className="absolute inset-0" />
          </Suspense>
        </FieldBoundary>
      )}
    </div>
  );
}
