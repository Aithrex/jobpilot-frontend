import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASE, VIEWPORT_ONCE } from '../_shared';

/**
 * Data-lifecycle brand illustration (original, code-native SVG) for the
 * trust section: Upload -> secure AI processing -> privacy-protected quota
 * signals -> guest results -> branch (claimed account data OR automatic
 * deletion of unclaimed data after 30 days).
 *
 * Each data kind has a distinct shape AND color (never color alone):
 *   document / indigo   = resume content
 *   circle+key / violet = first-party device token
 *   hexagon / cyan      = HMAC-protected identity signals
 *   spark / gradient    = AI processing
 *   square+check / green = claimed account data
 *   dashed circle / muted = deleted unclaimed data
 *
 * Semantic tokens drive every fill/stroke except the two gradient defs,
 * which use harmonized literal indigo/violet stops (SVG gradients cannot be
 * expressed as single tokens). The SVG is aria-hidden: the consuming figure
 * supplies role="img" + a thorough aria-label, and captions live in DOM
 * text next to it.
 */

const INDIGO = 'hsl(var(--primary))';
const VIOLET = 'hsl(var(--chart-4-hsl))';
const CYAN = 'hsl(var(--chart-5-hsl))';
const GREEN = 'hsl(var(--success))';
const MUTED = 'hsl(var(--muted-foreground))';

/* ── 24x24 glyph shape fragments (shared by legend glyphs + the base SVG) ── */

function DocShape() {
  return (
    <>
      <path
        d="M6 2.75h7.5L19 8.25v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16.5a1 1 0 0 1 1-1Z"
        fill="hsl(var(--primary) / 0.12)"
        stroke={INDIGO}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.5 2.75v5.5H19" fill="none" stroke={INDIGO} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 13h8M8 16h6" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function TokenShape() {
  return (
    <>
      <circle cx="12" cy="12" r="8.25" fill="hsl(var(--chart-4-hsl) / 0.12)" stroke={VIOLET} strokeWidth="1.5" />
      <circle cx="12" cy="9.75" r="2.3" fill={VIOLET} />
      <path d="M12 12.4v4.4" stroke={VIOLET} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 15.2h2" stroke={VIOLET} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

function SignalShape() {
  return (
    <>
      <path
        d="M12 2.9 19.8 7.4v9.2L12 21.1 4.2 16.6V7.4L12 2.9Z"
        fill="hsl(var(--chart-5-hsl) / 0.10)"
        stroke={CYAN}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 10.2h6.4M8.8 13.8h6.4M11.3 7.8l-1.1 8.4M13.8 7.8l-1.1 8.4"
        stroke="hsl(var(--chart-5-hsl) / 0.85)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>
  );
}

function ProcessShape({ gradientId }: { gradientId: string }) {
  return (
    <path
      d="M12 2.6c.95 4.6 2.5 6.7 7.4 7.4-4.9 1.5-6.45 3.6-7.4 7.4-.95-3.8-2.5-5.9-7.4-7.4 4.9-.7 6.45-2.8 7.4-7.4Z"
      fill={`url(#${gradientId})`}
      transform="translate(0 2.3)"
    />
  );
}

function ClaimedShape() {
  return (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="hsl(var(--success) / 0.12)" stroke={GREEN} strokeWidth="1.5" />
      <path d="m8.5 12.1 2.4 2.4 4.6-4.9" fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function DeletedShape() {
  return (
    <>
      <circle cx="12" cy="12" r="8.25" fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="3 3.4" />
      <path d="M8.8 12h6.4" stroke={MUTED} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

function ResultsShape() {
  return (
    <>
      <rect x="4" y="5" width="16" height="6" rx="2" fill="hsl(var(--primary) / 0.12)" stroke={INDIGO} strokeWidth="1.4" />
      <rect x="4" y="13.6" width="16" height="6" rx="2" fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.4" />
      <path d="M7 8h6" stroke={INDIGO} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 16.6h4.5" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

/* ── Small standalone glyphs (legend + captions) ─────────────────────────── */

function glyphClass(className?: string) {
  return cn('h-5 w-5 shrink-0', className);
}

export function GlyphDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <DocShape />
    </svg>
  );
}

export function GlyphToken({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <TokenShape />
    </svg>
  );
}

export function GlyphSignal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <SignalShape />
    </svg>
  );
}

export function GlyphProcess({ className }: { className?: string }) {
  const raw = useId();
  const gid = `dlc-spark-${raw.replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <ProcessShape gradientId={gid} />
    </svg>
  );
}

export function GlyphResults({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <ResultsShape />
    </svg>
  );
}

export function GlyphClaimed({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <ClaimedShape />
    </svg>
  );
}

export function GlyphDeleted({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={glyphClass(className)}>
      <DeletedShape />
    </svg>
  );
}

/* ── The full base illustration ──────────────────────────────────────────── */

const NODE_Y = { upload: 62, process: 174, signals: 286, results: 398 } as const;
const BRANCH_Y = 512;
const CX = 180;

interface StationProps {
  y: number;
  color: string;
  tint: string;
  badge: string;
  children: React.ReactNode;
}

function Station({ y, color, tint, badge, children }: StationProps) {
  return (
    <>
      <circle cx={CX} cy={y} r="40" fill={tint} />
      <circle cx={CX} cy={y} r="27" fill="hsl(var(--card))" stroke={color} strokeWidth="1.5" />
      {/* glyph, 24-box scaled 1.25 and centered */}
      <g transform={`translate(${CX - 15} ${y - 15}) scale(1.25)`}>{children}</g>
      {/* numbered badge, top-right of the ring */}
      <circle cx={CX + 32} cy={y - 22} r="9" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text
        x={CX + 32}
        y={y - 18.6}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="hsl(var(--muted-foreground))"
      >
        {badge}
      </text>
    </>
  );
}

const buildItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
} as const;

const buildLine = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.55, ease: EASE } },
} as const;

/**
 * The complete lifecycle diagram spine: four numbered stations down the
 * center, then the fork to the two ends of the story. Builds progressively
 * on scroll (staggered, viewport-once); renders fully static under reduced
 * motion. aria-hidden by design, see the module doc.
 */
export function DataLifecycleBase({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9-]/g, '');
  const spineId = `dlc-spine-${uid}`;
  const sparkId = `dlc-process-${uid}`;

  const motionProps = reduce
    ? {}
    : {
        initial: 'hidden' as const,
        whileInView: 'show' as const,
        viewport: VIEWPORT_ONCE,
        variants: { hidden: {}, show: { transition: { staggerChildren: 0.12 } } },
      };

  const seg = (from: number, to: number) => `M ${CX} ${from + 34} L ${CX} ${to - 34}`;

  return (
    <motion.svg viewBox="0 0 360 560" aria-hidden className={cn('h-auto w-full', className)} {...motionProps}>
      <defs>
        <linearGradient id={spineId} gradientUnits="userSpaceOnUse" x1="180" y1="60" x2="180" y2="430">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={sparkId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* 1 · upload (resume content) */}
      <motion.g variants={buildItem}>
        <Station y={NODE_Y.upload} color="hsl(var(--primary) / 0.35)" tint="hsl(var(--primary) / 0.07)" badge="1">
          <DocShape />
        </Station>
      </motion.g>

      <motion.path variants={buildLine} d={seg(NODE_Y.upload, NODE_Y.process)} stroke={`url(#${spineId})`} strokeWidth="2" fill="none" />

      {/* 2 · secure AI processing */}
      <motion.g variants={buildItem}>
        <Station y={NODE_Y.process} color="hsl(var(--chart-4-hsl) / 0.35)" tint="hsl(var(--chart-4-hsl) / 0.07)" badge="2">
          <ProcessShape gradientId={sparkId} />
        </Station>
      </motion.g>

      <motion.path variants={buildLine} d={seg(NODE_Y.process, NODE_Y.signals)} stroke={`url(#${spineId})`} strokeWidth="2" fill="none" />

      {/* 3 · privacy-protected quota signals (HMAC hexagon + device-token satellite) */}
      <motion.g variants={buildItem}>
        <Station y={NODE_Y.signals} color="hsl(var(--chart-5-hsl) / 0.35)" tint="hsl(var(--chart-5-hsl) / 0.07)" badge="3">
          <SignalShape />
        </Station>
        <path d={`M ${CX - 27} ${NODE_Y.signals} H ${CX - 62}`} stroke="hsl(var(--chart-4-hsl) / 0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx={CX - 80} cy={NODE_Y.signals} r="18" fill="hsl(var(--card))" stroke="hsl(var(--chart-4-hsl) / 0.4)" strokeWidth="1.4" />
        <g transform={`translate(${CX - 80 - 10.8} ${NODE_Y.signals - 10.8}) scale(0.9)`}>
          <TokenShape />
        </g>
      </motion.g>

      <motion.path variants={buildLine} d={seg(NODE_Y.signals, NODE_Y.results)} stroke={`url(#${spineId})`} strokeWidth="2" fill="none" />

      {/* 4 · guest results */}
      <motion.g variants={buildItem}>
        <Station y={NODE_Y.results} color="hsl(var(--primary) / 0.35)" tint="hsl(var(--primary) / 0.07)" badge="4">
          <ResultsShape />
        </Station>
      </motion.g>

      {/* fork */}
      <motion.path
        variants={buildLine}
        d={`M ${CX} ${NODE_Y.results + 34} C ${CX} 468, 96 462, 96 ${BRANCH_Y - 30}`}
        stroke="hsl(var(--success) / 0.55)"
        strokeWidth="2"
        fill="none"
      />
      <motion.path
        variants={buildLine}
        d={`M ${CX} ${NODE_Y.results + 34} C ${CX} 468, 264 462, 264 ${BRANCH_Y - 30}`}
        stroke="hsl(var(--muted-foreground) / 0.45)"
        strokeWidth="2"
        strokeDasharray="4 4"
        fill="none"
      />

      {/* A · claimed account data */}
      <motion.g variants={buildItem}>
        <circle cx="96" cy={BRANCH_Y} r="34" fill="hsl(var(--success) / 0.08)" />
        <circle cx="96" cy={BRANCH_Y} r="24" fill="hsl(var(--card))" stroke="hsl(var(--success) / 0.45)" strokeWidth="1.5" />
        <g transform={`translate(${96 - 13.2} ${BRANCH_Y - 13.2}) scale(1.1)`}>
          <ClaimedShape />
        </g>
        <circle cx="124" cy={BRANCH_Y - 20} r="9" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <text x="124" y={BRANCH_Y - 16.6} textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(var(--muted-foreground))">
          A
        </text>
      </motion.g>

      {/* B · deleted unclaimed data */}
      <motion.g variants={buildItem}>
        <circle cx="264" cy={BRANCH_Y} r="24" fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="1.4" strokeDasharray="4 4" />
        <g transform={`translate(${264 - 13.2} ${BRANCH_Y - 13.2}) scale(1.1)`}>
          <DeletedShape />
        </g>
        <circle cx="292" cy={BRANCH_Y - 20} r="9" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <text x="292" y={BRANCH_Y - 16.6} textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(var(--muted-foreground))">
          B
        </text>
      </motion.g>
    </motion.svg>
  );
}
