import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { HeroNetworkIllustration } from '@/components/landing/assets/hero-network';

/**
 * HeroSceneStage - the hero's fixed-aspect visual stage plus the mount gate
 * for the interactive 3D scene (pattern recovered from the v4 hero3d
 * harness).
 *
 * The static SVG illustration always renders first (zero CLS: the aspect box
 * owns the height before anything loads). The lazy 3D scene is layered on
 * top - crossfaded with opacity only - when EVERY gate condition holds:
 *
 *   1. `interactive` instance (the mobile flow renders fallback-only)
 *   2. viewport >= 1024px
 *   3. (pointer: fine)
 *   4. !prefers-reduced-motion
 *   5. WebGL2/WebGL probe passes (cached)
 *   6. navigator.deviceMemory undefined or >= 4
 *   7. !navigator.connection?.saveData
 *   8. requestIdleCallback fired (setTimeout fallback)
 *   9. the stage is near the viewport (IntersectionObserver, 240px margin)
 *
 * If the canvas throws at any point, the error boundary reverts to the
 * fallback silently. three/r3f live only inside the React.lazy chunk, so
 * this gate adds ~0 eager JS beyond the SVG itself.
 */

const SignalScene = lazy(() => import('./SignalScene'));

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

/** Environment half of the gate: viewport, pointer, device budget, WebGL. */
function deviceAllows3d(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(min-width: 1024px)').matches) return false;
  if (!window.matchMedia('(pointer: fine)').matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  if (nav.connection?.saveData) return false;
  return probeWebGL();
}

/** Any runtime failure in the canvas reverts to the fallback for good. */
class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Film grain over the live canvas, matching the grain baked into the SVG. */
function GrainOverlay() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const filterId = `hero-grain-${uid}`;
  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.028]">
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

export interface HeroSceneStageProps {
  className?: string;
  /** false = static illustration only, no gate machinery (the mobile flow). */
  interactive?: boolean;
}

export function HeroSceneStage({ className, interactive = true }: HeroSceneStageProps) {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [idle, setIdle] = useState(false);
  const [envOk, setEnvOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const [painted, setPainted] = useState(false);

  // Near-viewport: mount the chunk shortly before the stage scrolls in.
  useEffect(() => {
    if (!interactive) return;
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
  }, [interactive]);

  // Idle: never compete with first paint or hydration work.
  useEffect(() => {
    if (!interactive) return;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 800 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setIdle(true), 250);
    return () => window.clearTimeout(id);
  }, [interactive]);

  // Environment checks run once the cheap signals agree; matchMedia and
  // navigator reads stay out of render.
  useEffect(() => {
    if (!interactive || !near || !idle) return;
    setEnvOk(deviceAllows3d());
  }, [interactive, near, idle]);

  const show3d = interactive && !failed && !reduce && near && idle && envOk;

  return (
    <div ref={hostRef} className={cn('relative w-full', className)}>
      {/* Fixed-aspect stage: dimensions exist before anything loads (no CLS). */}
      <div className="relative aspect-[21/20] w-full overflow-hidden">
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            painted && !failed ? 'opacity-0' : 'opacity-100',
          )}
        >
          <HeroNetworkIllustration className="h-full w-full" />
        </div>
        {show3d && (
          <SceneBoundary
            onFail={() => {
              setFailed(true);
              setPainted(false);
            }}
          >
            <Suspense fallback={null}>
              <SignalScene
                className={cn(
                  'absolute inset-0 transition-opacity duration-700',
                  painted ? 'opacity-100' : 'opacity-0',
                )}
                onReady={() => setPainted(true)}
              />
            </Suspense>
          </SceneBoundary>
        )}
        {painted && !failed && <GrainOverlay />}
        <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-border bg-card/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Illustrative
        </span>
      </div>
      <p className="sr-only">
        Illustration: a resume is read into matching signals, compared against five open roles, and the strongest
        match becomes a tailored resume that passes an integrity check.
      </p>
    </div>
  );
}
