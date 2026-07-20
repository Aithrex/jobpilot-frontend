import { useId } from 'react';

/**
 * HeroNetworkIllustration - the static "career signal network" tableau for
 * the landing hero stage. Tells the product story left to right: a glass
 * resume card emits three signal paths that flow into a fan of five mini job
 * cards; the strongest match carries an indigo highlight and a score ring,
 * and continues into a tailored resume that holds a green integrity check.
 *
 * This is the ONLY hero visual for mobile, tablet, reduced-motion, save-data
 * and no-WebGL users (and the loading/error state for everyone else), so it
 * is finished art, not a placeholder: light glass surfaces, indigo/sky
 * gradient strokes, soft blurred shadows, and a whisper of grain.
 *
 * Decorative by contract: aria-hidden, no meaningful text inside the SVG
 * (glyph bars only). The host (HeroSceneStage) renders the screen-reader
 * sentence and the "Illustrative" chip in the DOM. Raw color values are
 * allowed here (inline SVG gradients), harmonized with the indigo
 * 238 70% 57% primary and the sky brand-to accent.
 */

const INDIGO = '#4f46e5';
const INDIGO_SOFT = '#6366f1';
const SKY = '#0ea5e9';
const INK = '#3b3f8f';
const GLASS_STROKE = '#cdd1f4';
const GREEN = '#10b981';
const SHADOW = '#1e2452';

/** One mini job card of the fan. Bars are illustrative glyphs, never text. */
function MiniCard({
  cx,
  cy,
  highlighted,
  glowId,
}: {
  cx: number;
  cy: number;
  highlighted?: boolean;
  glowId?: string;
}) {
  const left = cx - 41;
  const top = cy - 27;
  return (
    <g>
      {highlighted && glowId && (
        <rect x={left - 4} y={top - 4} width={90} height={62} rx={12} fill={INDIGO_SOFT} opacity={0.3} filter={`url(#${glowId})`} />
      )}
      <rect
        x={left}
        y={top}
        width={82}
        height={54}
        rx={10}
        fill="#ffffff"
        fillOpacity={0.94}
        stroke={highlighted ? INDIGO : GLASS_STROKE}
        strokeWidth={highlighted ? 1.5 : 1}
      />
      <circle cx={left + 15} cy={top + 16} r={6} fill={INDIGO_SOFT} opacity={0.4} />
      <rect x={left + 27} y={top + 11} width={highlighted ? 24 : 34} height={4} rx={2} fill={INK} opacity={0.5} />
      <rect x={left + 27} y={top + 20} width={highlighted ? 18 : 25} height={3.5} rx={1.75} fill={INK} opacity={0.28} />
      <rect x={left + 11} y={top + 38} width={highlighted ? 20 : 28} height={4} rx={2} fill={SKY} opacity={0.35} />
      {highlighted && (
        <g>
          {/* Score ring: track plus an 86% fill arc, starting at 12 o'clock. */}
          <circle cx={left + 62} cy={cy + 2} r={13} fill="none" stroke={INDIGO} strokeWidth={3.5} opacity={0.16} />
          <circle
            cx={left + 62}
            cy={cy + 2}
            r={13}
            fill="none"
            stroke={INDIGO}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray="70.2 81.7"
            transform={`rotate(-90 ${left + 62} ${cy + 2})`}
          />
        </g>
      )}
    </g>
  );
}

export function HeroNetworkIllustration({ className }: { className?: string }) {
  // Unique ids per instance: the illustration mounts twice on the landing
  // (desktop stage + mobile flow), and duplicate SVG ids break gradients.
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const id = (name: string) => `hn-${uid}-${name}`;

  return (
    <svg
      viewBox="0 0 560 533"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={id('wash')} cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor={INDIGO} stopOpacity={0.07} />
          <stop offset="70%" stopColor={INDIGO} stopOpacity={0.025} />
          <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('flow')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={INDIGO} stopOpacity={0.5} />
          <stop offset="100%" stopColor={SKY} stopOpacity={0.7} />
        </linearGradient>
        <linearGradient id={id('flow-soft')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={INDIGO_SOFT} stopOpacity={0.4} />
          <stop offset="100%" stopColor={INDIGO} stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.98} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.88} />
        </linearGradient>
        <filter id={id('blur-shadow')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={id('blur-glow')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id('grain')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      {/* Ambient brand wash behind the whole tableau. */}
      <ellipse cx={295} cy={258} rx={268} ry={210} fill={`url(#${id('wash')})`} />

      {/* Soft grounded shadows under each column. */}
      <g filter={`url(#${id('blur-shadow')})`}>
        <ellipse cx={95} cy={356} rx={62} ry={13} fill={SHADOW} opacity={0.14} />
        <ellipse cx={318} cy={442} rx={88} ry={15} fill={SHADOW} opacity={0.12} />
        <ellipse cx={496} cy={354} rx={54} ry={12} fill={SHADOW} opacity={0.14} />
      </g>

      {/* Resume card (glass, glyph lines only). */}
      <g>
        <rect x={35} y={168} width={120} height={170} rx={14} fill={`url(#${id('glass')})`} stroke={GLASS_STROKE} strokeWidth={1} />
        <circle cx={57} cy={192} r={8} fill={INDIGO} opacity={0.5} />
        <rect x={72} y={186} width={42} height={5} rx={2.5} fill={INK} opacity={0.5} />
        <rect x={72} y={196} width={30} height={4} rx={2} fill={INK} opacity={0.28} />
        <rect x={49} y={212} width={92} height={1.5} fill={INK} opacity={0.12} />
        <rect x={49} y={222} width={92} height={4} rx={2} fill={INDIGO} opacity={0.26} />
        <rect x={49} y={234} width={80} height={4} rx={2} fill={INDIGO} opacity={0.22} />
        <rect x={49} y={246} width={88} height={4} rx={2} fill={INDIGO} opacity={0.26} />
        <rect x={49} y={260} width={66} height={4} rx={2} fill={SKY} opacity={0.42} />
        <rect x={49} y={274} width={86} height={4} rx={2} fill={INDIGO} opacity={0.22} />
        <rect x={49} y={286} width={60} height={4} rx={2} fill={INDIGO} opacity={0.18} />
        <rect x={49} y={302} width={72} height={4} rx={2} fill={INDIGO} opacity={0.24} />
        <rect x={49} y={314} width={50} height={4} rx={2} fill={INDIGO} opacity={0.16} />
      </g>

      {/* Three signal paths from the resume into the match fan. */}
      <g fill="none" strokeWidth={2} strokeLinecap="round">
        <path d="M155 210 Q 220 190 277 196" stroke={`url(#${id('flow-soft')})`} />
        <path d="M155 253 Q 220 262 283 266" stroke={`url(#${id('flow')})`} />
        <path d="M155 296 Q 218 322 277 336" stroke={`url(#${id('flow-soft')})`} />
      </g>
      {/* Signal particles mid-flight (halo + dot). */}
      <g>
        <circle cx={205} cy={198} r={5.5} fill={INDIGO} opacity={0.16} />
        <circle cx={205} cy={198} r={2.6} fill={INDIGO} opacity={0.85} />
        <circle cx={248} cy={195} r={2.4} fill={INDIGO_SOFT} opacity={0.7} />
        <circle cx={212} cy={258} r={5.5} fill={SKY} opacity={0.16} />
        <circle cx={212} cy={258} r={2.6} fill={SKY} opacity={0.85} />
        <circle cx={252} cy={263} r={2.4} fill={INDIGO} opacity={0.7} />
        <circle cx={202} cy={310} r={2.6} fill={INDIGO} opacity={0.8} />
        <circle cx={247} cy={327} r={2.2} fill={INDIGO_SOFT} opacity={0.6} />
      </g>

      {/* Fan of five mini job cards; the middle match is highlighted. */}
      <MiniCard cx={306} cy={126} />
      <MiniCard cx={318} cy={196} />
      <MiniCard cx={324} cy={266} highlighted glowId={id('blur-glow')} />
      <MiniCard cx={318} cy={336} />
      <MiniCard cx={306} cy={406} />

      {/* The highlighted match continues into the tailored resume. */}
      <path d="M365 266 Q 406 256 448 268" fill="none" stroke={`url(#${id('flow')})`} strokeWidth={2} strokeLinecap="round" />
      <circle cx={398} cy={260} r={5.5} fill={INDIGO} opacity={0.16} />
      <circle cx={398} cy={260} r={2.6} fill={INDIGO} opacity={0.85} />
      <circle cx={426} cy={261} r={2.4} fill={SKY} opacity={0.75} />

      {/* Tailored resume card with the integrity check. */}
      <g>
        <rect x={448} y={206} width={96} height={132} rx={12} fill={`url(#${id('glass')})`} stroke={GLASS_STROKE} strokeWidth={1} />
        <rect x={462} y={224} width={56} height={4} rx={2} fill={INK} opacity={0.45} />
        <rect x={462} y={236} width={44} height={4} rx={2} fill={INDIGO} opacity={0.24} />
        <rect x={462} y={248} width={60} height={4} rx={2} fill={INDIGO} opacity={0.26} />
        <rect x={462} y={264} width={48} height={4} rx={2} fill={GREEN} opacity={0.42} />
        <rect x={462} y={280} width={58} height={4} rx={2} fill={INDIGO} opacity={0.22} />
        <rect x={462} y={292} width={40} height={4} rx={2} fill={INDIGO} opacity={0.18} />
        <rect x={462} y={308} width={52} height={4} rx={2} fill={INDIGO} opacity={0.24} />
        {/* Soft green integrity check, riding the top right corner. */}
        <circle cx={532} cy={212} r={18} fill={GREEN} opacity={0.14} />
        <circle cx={532} cy={212} r={12} fill={GREEN} opacity={0.92} />
        <path d="M526.5 212 l4 4 l7.5 -8" fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* A whisper of grain so the glass reads as material, not vector. */}
      <rect width="560" height="533" filter={`url(#${id('grain')})`} opacity={0.028} />
    </svg>
  );
}
