import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/app-shell/nav.config';
import type { AuthPhase, AuthZone } from './AuthAtlas';

/**
 * The auth stage's right pane: one continuous journey line with four icon
 * nodes, lit by a travelling pulse. NO TEXT - the whole panel is a graphic.
 *
 * Two earlier attempts are worth not repeating. A `MacWindow` product preview
 * duplicated the landing hero, which is the same frame with the same title.
 * Kinetic typography then put a second wall of words beside a form that is
 * already all words. The panel wants to be the quiet, moving thing on a page
 * whose left half is dense and static.
 *
 * The line is the product's shape: four areas, one pass, in order. The icons
 * come from {@link NAV_ITEMS}, the app's real navigation source of truth, so
 * they cannot drift from the destinations they stand for - and icons alone
 * carry it without asking anyone to read anything.
 *
 * The pulse is genuinely bound to the drawing, not merely timed alongside it:
 * ONE motion value drives the stroke's `pathLength`, the comet head's position
 * (sampled off the real path with `getPointAtLength`), and which nodes have
 * been reached. They cannot drift out of sync because they are the same number.
 *
 * Reduced motion renders the finished state - full line, all nodes lit - and
 * never animates.
 */

const STAGES = NAV_ITEMS.filter((item) => item.to !== 'home');

/** SVG user-space box the path is authored in. */
const VB_W = 520;
const VB_H = 620;

/**
 * An ascending serpentine. A straight diagonal was the first attempt and it
 * left two large empty triangles in a tall box; weaving left-right climbs the
 * same distance while actually occupying the pane.
 */
const PATH_D =
  'M 108 556 C 108 464, 412 480, 412 392 C 412 304, 108 320, 108 228 C 108 142, 382 152, 414 72';

/**
 * Where along the line (0..1) each node sits. The first and last are pinned to
 * the exact ends: anything inside them left a stub of line poking out past the
 * node, which read as the path being cut off rather than arriving.
 */
const NODE_AT = [0, 0.34, 0.67, 1];

/**
 * Node positions for environments without SVG geometry.
 *
 * `getTotalLength` / `getPointAtLength` are NOT implemented in jsdom, and are
 * absent or throwing in some prerender and older-browser contexts. Calling them
 * unguarded threw inside an effect and unmounted the entire auth page - a
 * decorative panel taking the sign-in FORM down with it, which is the worst
 * possible failure for this component. These are the curve's own anchors, so
 * they sit within a pixel or two of the measured result.
 */
const FALLBACK_POINTS = [
  { x: 108, y: 556 },
  { x: 412, y: 392 },
  { x: 108, y: 228 },
  { x: 414, y: 72 },
];

/** Path length, or null when the platform cannot measure geometry. */
function safeLength(path: SVGPathElement | null): number | null {
  if (!path) return null;
  if (typeof path.getTotalLength !== 'function') return null;
  if (typeof path.getPointAtLength !== 'function') return null;
  try {
    const len = path.getTotalLength();
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    return null;
  }
}

/**
 * One full traversal. Brisk enough that a node lights roughly every 1.4s so
 * the line is visibly moving while you read the form, but still a glide - it
 * is background, not a progress bar demanding attention.
 */
const TRAVEL_S = 5.4;

/** Beat between loops - long enough to read as "arrived", not as a stall. */
const LOOP_GAP_S = 0.6;

export function AuthShowcase({
  zone,
  phase,
  className,
}: {
  zone: AuthZone;
  phase: AuthPhase;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pathRef = useRef<SVGPathElement | null>(null);

  // ONE source of truth for the whole animation.
  const progress = useMotionValue(reduce ? 1 : 0);
  const dotX = useMotionValue(0);
  const dotY = useMotionValue(0);

  const [points, setPoints] = useState(FALLBACK_POINTS);
  const [measured, setMeasured] = useState(false);
  const [reached, setReached] = useState(reduce ? STAGES.length - 1 : -1);

  const failed = phase === 'error';
  const won = phase === 'success';
  const busy = phase === 'pending';

  // Node coordinates are READ OFF the real path rather than hand-placed, so a
  // node can never float beside the line it is supposed to sit on.
  useEffect(() => {
    const path = pathRef.current;
    const len = safeLength(path);
    if (len == null || !path) return; // keep the authored fallback positions
    setPoints(
      NODE_AT.map((t) => {
        const p = path.getPointAtLength(t * len);
        return { x: p.x, y: p.y };
      }),
    );
    setMeasured(true);
  }, []);

  // Drive the comet head + node states from the same value as the stroke.
  useEffect(() => {
    const path = pathRef.current;
    const len = safeLength(path);

    const sync = (v: number) => {
      // Node lighting works with or without geometry - it is pure arithmetic
      // on the same progress value, so the panel still reads correctly when
      // only the comet head has to be dropped.
      if (len != null && path) {
        const p = path.getPointAtLength(v * len);
        dotX.set(p.x);
        dotY.set(p.y);
      }
      let idx = -1;
      for (let i = 0; i < NODE_AT.length; i++) if (v >= NODE_AT[i]) idx = i;
      setReached((prev) => (prev === idx ? prev : idx));
    };

    sync(progress.get());
    const unsubscribe = progress.on('change', sync);
    return () => unsubscribe();
  }, [progress, dotX, dotY, measured]);

  // The traversal itself. Success holds the completed line instead of looping.
  useEffect(() => {
    if (reduce) return;
    if (won) {
      const controls = animate(progress, 1, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
      return () => controls.stop();
    }
    if (failed) return; // hold wherever it is; the form is talking now
    // Nothing moves beside a password field. Email focus deliberately does NOT
    // hold: Login autofocuses it on pointer devices, so treating any focus as a
    // hold would freeze the line before it ever moved.
    if (zone === 'secure' || zone === 'submit') return;

    const controls = animate(progress, 1, {
      duration: busy ? TRAVEL_S * 0.45 : TRAVEL_S,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
      repeatDelay: busy ? 0.15 : LOOP_GAP_S,
      onRepeat: () => progress.set(0),
    });
    return () => controls.stop();
  }, [progress, reduce, busy, won, failed, zone]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none relative flex h-full w-full items-center justify-center overflow-hidden px-10',
        className,
      )}
    >
      {/* Aurora: the pane's only background treatment. Transform/opacity only. */}
      {!reduce && (
        <>
          <motion.div
            className="absolute h-[540px] w-[540px] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.16), transparent 65%)',
            }}
            animate={{ x: [-60, 50, -60], y: [-40, 40, -40] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute h-[440px] w-[440px] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--brand-to) / 0.14), transparent 65%)',
            }}
            animate={{ x: [70, -50, 70], y: [50, -30, 50] }}
            transition={{ duration: 29, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Fixed aspect box so SVG user units map linearly onto the HTML nodes. */}
      <div
        className="relative w-full max-w-[520px]"
        style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          focusable="false"
        >
          <defs>
            <linearGradient id="auth-journey" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--brand-to))" />
            </linearGradient>
          </defs>

          {/* The unlit track. Always fully present so the shape reads at rest. */}
          <path
            ref={pathRef}
            d={PATH_D}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeOpacity={0.35}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* The lit portion, bound directly to `progress`. */}
          <motion.path
            d={PATH_D}
            fill="none"
            stroke="url(#auth-journey)"
            strokeWidth={3}
            strokeLinecap="round"
            style={{ pathLength: progress }}
            animate={{ opacity: failed ? 0.25 : 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Comet head, sampled off the real path. Hidden once it lands. */}
          {measured && !reduce && !won && !failed && (
            <motion.g style={{ x: dotX, y: dotY }}>
              <circle r={13} fill="hsl(var(--primary))" opacity={0.18} />
              <circle r={4.5} fill="hsl(var(--primary))" />
            </motion.g>
          )}
        </svg>

        {/* Icon nodes, positioned from the sampled path points. Icons only. */}
        {points.map((pt, i) => {
          const Icon = STAGES[i].icon;
          const lit = i <= reached && !failed;
          const justLit = i === reached && !won && !failed;

          return (
            <motion.span
              key={STAGES[i].to}
              className={cn(
                'absolute grid place-items-center rounded-full border backdrop-blur-sm transition-colors duration-500',
                lit
                  ? 'border-primary/45 bg-primary/15 text-primary shadow-soft'
                  : 'border-border bg-card/80 text-muted-foreground',
              )}
              style={{
                left: `${(pt.x / VB_W) * 100}%`,
                top: `${(pt.y / VB_H) * 100}%`,
                width: 56,
                height: 56,
                marginLeft: -28,
                marginTop: -28,
              }}
              animate={{ scale: justLit ? [1, 1.12, 1] : 1 }}
              transition={{ duration: justLit ? 0.7 : 0.3, ease: 'easeOut' }}
            >
              {/* Halo that blooms as the pulse arrives. */}
              {lit && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/20"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.85, opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                />
              )}
              <Icon className="relative h-[22px] w-[22px]" strokeWidth={2} />
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
