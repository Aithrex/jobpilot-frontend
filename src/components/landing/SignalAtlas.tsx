import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASE } from './_shared';

/**
 * The Career Signal Atlas — the landing's living hero visual. A resume sheet
 * (the REAL upload control, slotted in by the host) emits a scanning beam,
 * abstract knowledge nodes organize into a constellation, signal paths reach
 * an opportunity field where up to five beacons light, and one signal
 * continues into a tailored document.
 *
 * Everything here is SVG + DOM + framer-motion — no WebGL, so the "fallback"
 * IS the primary rendering path and the scene works in every browser, in
 * jsdom, and under reduced motion (each stage renders as a static resolved
 * composition). Only abstract labels appear (Skills, Experience, Impact,
 * Education, Match, Tailor) — never fake companies, titles, or scores.
 *
 * The stage machine lives in the HOST (useAtlasStages) so the accessible
 * Read/Match/Tailor controls can sit outside the drawing; this component is
 * purely presentational and fully decorative (`aria-hidden` on the svg — the
 * host provides the text alternative).
 */

export type AtlasStage = 'read' | 'match' | 'tailor';

export const ATLAS_STAGES: readonly { key: AtlasStage; label: string; caption: string }[] = [
  { key: 'read', label: 'Read', caption: 'Your resume becomes a structured career signal.' },
  { key: 'match', label: 'Match', caption: 'That signal is compared with live openings.' },
  { key: 'tailor', label: 'Tailor', caption: 'One role chosen. Your real facts kept.' },
];

const STAGE_INDEX: Record<AtlasStage, number> = { read: 0, match: 1, tailor: 2 };

/** Autopilot dwell per stage (ms) before advancing; parks on 'tailor'. */
const DWELL: Record<AtlasStage, number> = { read: 3200, match: 3600, tailor: 0 };

/**
 * The host-side stage machine: autoplays read → match → tailor once, then
 * settles. Manual stage selection pauses the autopilot; replay() restarts the
 * full sequence; setPlaying(false) freezes it. Under reduced motion the scene
 * parks on the fully-resolved 'tailor' composition and never self-advances
 * (stage controls still swap static compositions).
 */
export function useAtlasStages(active: boolean) {
  const reduce = !!useReducedMotion();
  const [stage, setStage] = useState<AtlasStage>(reduce ? 'tailor' : 'read');
  const [playing, setPlaying] = useState(!reduce);

  // Reduced motion: park on the fully-resolved composition, no self-advance.
  useEffect(() => {
    if (reduce) {
      setStage('tailor');
      setPlaying(false);
    }
  }, [reduce]);

  // Self-advance: one pass read → match → tailor, then rest (dwell 0 parks).
  useEffect(() => {
    if (reduce || !playing || !active) return;
    const dwell = DWELL[stage];
    if (!dwell) return;
    const id = window.setTimeout(
      () => setStage(stage === 'read' ? 'match' : 'tailor'),
      dwell,
    );
    return () => window.clearTimeout(id);
  }, [stage, playing, active, reduce]);

  /** Manual stage selection pauses the autopilot. */
  const select = useCallback((next: AtlasStage) => {
    setPlaying(false);
    setStage(next);
  }, []);

  /** "Watch it work" — replay the full sequence from the top. */
  const replay = useCallback(() => {
    setStage('read');
    setPlaying(true);
  }, []);

  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);

  return { stage, select, replay, playing, togglePlaying, reduce };
}

// ── Scene geometry (viewBox 1000 × 620) ─────────────────────────────
// The DOM sheet (upload control) overlays x 40..330 / y 110..505 on sm+.

interface GraphNode {
  id: string;
  x: number;
  y: number;
  r: number;
  label?: string;
  /** y of the point on the sheet edge this node's extraction path leaves from. */
  fromY: number;
}

const GRAPH_NODES: readonly GraphNode[] = [
  { id: 'skills', x: 432, y: 196, r: 7, label: 'Skills', fromY: 180 },
  { id: 'impact', x: 545, y: 252, r: 7, label: 'Impact', fromY: 250 },
  { id: 'experience', x: 478, y: 338, r: 7, label: 'Experience', fromY: 330 },
  { id: 'education', x: 448, y: 442, r: 6, label: 'Education', fromY: 420 },
  { id: 'n1', x: 508, y: 162, r: 3, fromY: 150 },
  { id: 'n2', x: 596, y: 212, r: 3, fromY: 205 },
  { id: 'n3', x: 568, y: 356, r: 3, fromY: 360 },
  { id: 'n4', x: 548, y: 432, r: 3, fromY: 452 },
];

/** The hub every graph node feeds — where the career signal concentrates
 * before fanning out into the opportunity field. */
const HUB = { x: 652, y: 298 };

const BEACONS: readonly { x: number; y: number }[] = [
  { x: 828, y: 128 },
  { x: 880, y: 226 },
  { x: 852, y: 322 },
  { x: 884, y: 418 },
  { x: 818, y: 498 },
];

/** The beacon whose signal continues into the tailored document. */
const CHOSEN = 2;
const DOC = { x: 918, y: 548 };

const SHEET_EDGE_X = 332;

function extractionPath(n: GraphNode): string {
  const midX = (SHEET_EDGE_X + n.x) / 2;
  return `M ${SHEET_EDGE_X} ${n.fromY} C ${midX} ${n.fromY}, ${midX} ${n.y}, ${n.x} ${n.y}`;
}

function hubPath(n: GraphNode): string {
  const midX = (n.x + HUB.x) / 2;
  return `M ${n.x} ${n.y} C ${midX} ${n.y}, ${midX} ${HUB.y}, ${HUB.x} ${HUB.y}`;
}

function beaconPath(b: { x: number; y: number }): string {
  const midX = (HUB.x + b.x) / 2;
  return `M ${HUB.x} ${HUB.y} C ${midX} ${HUB.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

const TAILOR_PATH = `M ${BEACONS[CHOSEN].x} ${BEACONS[CHOSEN].y} C ${BEACONS[CHOSEN].x + 40} ${
  BEACONS[CHOSEN].y + 60
}, ${DOC.x - 10} ${DOC.y - 90}, ${DOC.x} ${DOC.y - 52}`;

export interface SignalAtlasProps {
  stage: AtlasStage;
  /** Scene is on screen, tab visible, motion allowed — loops may run. */
  active: boolean;
  /** Reduced motion — render each stage as a static resolved composition. */
  reduce: boolean;
  /** A file is being dragged over the upload zone — the field leans in. */
  excited?: boolean;
  /** The real upload control, rendered inside the sheet frame on sm+. */
  sheetSlot?: ReactNode;
  className?: string;
}

export function SignalAtlas({
  stage,
  active,
  reduce,
  excited = false,
  sheetSlot,
  className,
}: SignalAtlasProps) {
  const idx = STAGE_INDEX[stage];
  const [hovered, setHovered] = useState<string | null>(null);

  // Pointer parallax: two soft-sprung layers (graph ±6px, beacons ±10px).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const graphX = useTransform(sx, (v) => v * 6);
  const graphY = useTransform(sy, (v) => v * 6);
  const fieldX = useTransform(sx, (v) => v * 10);
  const fieldY = useTransform(sy, (v) => v * 10);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  const t = (duration: number, delay = 0) =>
    reduce ? { duration: 0 } : { duration, delay, ease: EASE };

  const graphOn = idx >= 0;
  const matchOn = idx >= 1;
  const tailorOn = idx >= 2;

  return (
    <div
      data-atlas-stage={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className={cn('relative w-full select-none', className)}
    >
      {/* Deep-field backdrop: soft radial luminance, no card chrome. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 62% 42%, hsl(var(--primary) / 0.14), transparent 70%), radial-gradient(40% 45% at 88% 55%, hsl(var(--brand-to) / 0.10), transparent 70%)',
        }}
      />

      <div className="relative aspect-[10/8] w-full sm:aspect-[1000/620]">
        <svg
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          focusable="false"
        >
          <defs>
            <linearGradient id="atlas-signal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--brand-to))" />
            </linearGradient>
          </defs>

          {/* Sheet frame — the luminous outline the DOM upload panel sits on. */}
          <motion.rect
            x={40}
            y={110}
            width={292}
            height={395}
            rx={18}
            fill="hsl(var(--card) / 0.25)"
            stroke="url(#atlas-signal)"
            initial={false}
            animate={{ strokeOpacity: excited ? 0.9 : 0.4 }}
            transition={t(0.3)}
            strokeWidth={1.5}
          />

          {/* ── Extraction: sheet → knowledge nodes ── */}
          <motion.g style={reduce ? undefined : { x: graphX, y: graphY }}>
            {GRAPH_NODES.map((n, i) => (
              <g key={n.id}>
                <motion.path
                  d={extractionPath(n)}
                  fill="none"
                  stroke="url(#atlas-signal)"
                  strokeWidth={1.2}
                  initial={false}
                  animate={{
                    pathLength: graphOn ? 1 : 0,
                    opacity: graphOn ? (hovered && hovered !== n.id ? 0.18 : 0.5) : 0,
                  }}
                  transition={t(0.9, i * 0.08)}
                />
                {/* Node ↔ hub connection (the graph organizing itself). */}
                <motion.path
                  d={hubPath(n)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1}
                  initial={false}
                  animate={{
                    pathLength: matchOn ? 1 : 0,
                    opacity: matchOn ? (hovered && hovered !== n.id ? 0.12 : 0.3) : 0,
                  }}
                  transition={t(0.7, i * 0.05)}
                />
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill="hsl(var(--background))"
                  stroke="url(#atlas-signal)"
                  strokeWidth={1.5}
                  initial={false}
                  animate={{
                    scale: graphOn ? (hovered === n.id ? 1.35 : 1) : 0,
                    opacity: graphOn ? 1 : 0,
                  }}
                  transition={t(0.5, 0.3 + i * 0.08)}
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
                {n.label && (
                  <motion.text
                    x={n.x}
                    y={n.y - n.r - 8}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="hsl(var(--muted-foreground))"
                    initial={false}
                    animate={{ opacity: graphOn ? (hovered === n.id ? 1 : 0.85) : 0 }}
                    transition={t(0.4, 0.4 + i * 0.08)}
                  >
                    {n.label}
                  </motion.text>
                )}
                {/* Generous invisible hit area so hovering illuminates routes. */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={Math.max(n.r + 12, 18)}
                  fill="transparent"
                  className="pointer-events-auto"
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            ))}

            {/* The hub node. */}
            <motion.circle
              cx={HUB.x}
              cy={HUB.y}
              r={9}
              fill="hsl(var(--primary))"
              initial={false}
              animate={{ scale: matchOn ? 1 : 0, opacity: matchOn ? 0.9 : 0 }}
              transition={t(0.5, 0.2)}
              style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }}
            />
          </motion.g>

          {/* ── Opportunity field: hub → beacons ── */}
          <motion.g style={reduce ? undefined : { x: fieldX, y: fieldY }}>
            {BEACONS.map((b, i) => {
              const chosen = i === CHOSEN;
              return (
                <g key={`${b.x}-${b.y}`}>
                  <motion.path
                    d={beaconPath(b)}
                    fill="none"
                    stroke="url(#atlas-signal)"
                    strokeWidth={chosen && tailorOn ? 2 : 1.2}
                    initial={false}
                    animate={{
                      pathLength: matchOn ? 1 : 0,
                      opacity: matchOn ? (excited ? 0.85 : chosen && tailorOn ? 0.9 : 0.45) : 0,
                    }}
                    transition={t(0.8, 0.3 + i * 0.1)}
                  />
                  {/* Pulse ring — loops only while the scene is truly active. */}
                  {matchOn && active && !reduce && (
                    <motion.circle
                      cx={b.x}
                      cy={b.y}
                      r={8}
                      fill="none"
                      stroke="hsl(var(--brand-to))"
                      strokeWidth={1.5}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        delay: i * 0.45,
                        ease: 'easeOut',
                      }}
                      style={{ transformOrigin: `${b.x}px ${b.y}px` }}
                    />
                  )}
                  <motion.circle
                    cx={b.x}
                    cy={b.y}
                    r={6}
                    fill="hsl(var(--brand-to))"
                    initial={false}
                    animate={{
                      scale: matchOn ? (excited ? 1.5 : chosen && tailorOn ? 1.3 : 1) : 0,
                      opacity: matchOn ? 1 : 0,
                    }}
                    transition={t(0.5, 0.5 + i * 0.1)}
                    style={{ transformOrigin: `${b.x}px ${b.y}px` }}
                  />
                </g>
              );
            })}
            <motion.text
              x={BEACONS[0].x + 26}
              y={BEACONS[0].y + 4}
              fontSize={13}
              fontWeight={600}
              fill="hsl(var(--muted-foreground))"
              initial={false}
              animate={{ opacity: matchOn ? 0.85 : 0 }}
              transition={t(0.4, 0.7)}
            >
              Match
            </motion.text>

            {/* ── One signal continues into the tailored document ── */}
            <motion.path
              d={TAILOR_PATH}
              fill="none"
              stroke="url(#atlas-signal)"
              strokeWidth={2}
              initial={false}
              animate={{ pathLength: tailorOn ? 1 : 0, opacity: tailorOn ? 0.9 : 0 }}
              transition={t(0.9, 0.2)}
            />
            <motion.g
              initial={false}
              animate={{ opacity: tailorOn ? 1 : 0, scale: tailorOn ? 1 : 0.6 }}
              transition={t(0.6, 0.7)}
              style={{ transformOrigin: `${DOC.x}px ${DOC.y}px` }}
            >
              <rect
                x={DOC.x - 34}
                y={DOC.y - 46}
                width={68}
                height={88}
                rx={8}
                fill="hsl(var(--card))"
                stroke="url(#atlas-signal)"
                strokeWidth={1.5}
              />
              {[0, 1, 2, 3].map((row) => (
                <rect
                  key={row}
                  x={DOC.x - 22}
                  y={DOC.y - 32 + row * 14}
                  width={row === 0 ? 30 : 44}
                  height={4}
                  rx={2}
                  fill="hsl(var(--primary) / 0.55)"
                />
              ))}
              {/* Integrity mark — a small check seal on the tailored sheet. */}
              <circle cx={DOC.x + 22} cy={DOC.y + 30} r={10} fill="hsl(var(--brand-to))" />
              <path
                d={`M ${DOC.x + 17} ${DOC.y + 30} l 3.5 3.5 l 6.5 -7`}
                stroke="hsl(var(--background))"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <text
                x={DOC.x}
                y={DOC.y + 58}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="hsl(var(--muted-foreground))"
              >
                Tailor
              </text>
            </motion.g>
          </motion.g>

          {/* Reading beam — sweeps the sheet during the read stage. */}
          {stage === 'read' && active && !reduce && (
            <motion.rect
              x={48}
              width={276}
              height={3}
              rx={1.5}
              fill="url(#atlas-signal)"
              initial={{ y: 122, opacity: 0 }}
              animate={{ y: [122, 488, 122], opacity: [0, 0.9, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </svg>

      </div>

      {/* The REAL upload control: seated inside the sheet frame on sm+, and
          flowing directly below the scene on mobile — one control, one DOM
          node, repositioned purely with CSS. */}
      {sheetSlot && (
        <div className="relative z-10 mt-3 sm:absolute sm:left-[5.2%] sm:top-[19%] sm:mt-0 sm:h-[62%] sm:w-[27.6%]">
          {sheetSlot}
        </div>
      )}
    </div>
  );
}
