import { type ComponentType, type ReactNode } from 'react';
import {
  AMBER,
  EMERALD,
  INDIGO,
  INDIGO_LIGHT,
  INDIGO_LIGHT_RGB,
  INK,
  INK_RGB,
  RED,
  RED_RGB,
  easeOut,
  lerp,
  mixRgb,
  pulse,
  rgba,
  seededRand,
  seg,
  wrap01,
} from './_pitchKit';

/**
 * The seven scenes of "Aspirely in 60 seconds" - an abstract motion-graphics
 * film in the brand's night-signal language (rings, particles, constellations,
 * kinetic numerals, hairline circuits). Nothing imitates a real employer or
 * user artifact; abstraction is the integrity guarantee.
 *
 * Every scene is a pure function of its local progress `p` (0..1): all layout
 * "randomness" is precomputed at module scope from seeded PRNGs, ripples use
 * wrap01(p * k) phases, and there are no fire-and-forget animations - so
 * seeking the timeline in either direction (or parking the reduced-motion
 * stepper on `p = 1`) renders the exact same frame every time, and each
 * scene's `p = 1` frame composes as a poster. This file is code-split: only
 * the lightweight poster ships above the fold.
 */

interface ScProps {
  p: number;
}

// -- Shared stagecraft -------------------------------------------------------
const ink = (a: number) => rgba(INK_RGB, a);
const ilight = (a: number) => rgba(INDIGO_LIGHT_RGB, a);

const BACK_INDIGO =
  'radial-gradient(80% 65% at 50% 40%, rgba(79,99,231,0.13), transparent 65%)';
const BACK_EMBER =
  'radial-gradient(70% 60% at 50% 44%, rgba(251,191,36,0.06), transparent 60%), radial-gradient(90% 70% at 50% 55%, rgba(248,113,113,0.05), transparent 70%)';
const BACK_EXHALE =
  'radial-gradient(80% 65% at 50% 45%, rgba(79,99,231,0.13), transparent 65%), radial-gradient(40% 35% at 79% 24%, rgba(52,211,153,0.09), transparent 70%)';

/**
 * The film frame: a mood-glow backdrop plus one 400x280 SVG stage, letterboxed
 * with `meet` so the same composition holds on the portrait mobile frame and
 * the wide desktop frame (the surrounding stage is the same night color).
 */
function Frame({ back, children }: { back: string; children: ReactNode }) {
  return (
    <div className="relative h-full w-full">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: back }} />
      <svg
        viewBox="0 0 400 280"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full select-none"
      >
        <defs>
          <radialGradient id="pg-ind">
            <stop offset="0%" stopColor={INDIGO_LIGHT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={INDIGO_LIGHT} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pg-grn">
            <stop offset="0%" stopColor={EMERALD} stopOpacity={0.5} />
            <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pg-amb">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.55} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        {children}
      </svg>
    </div>
  );
}

/** In-frame mono micro-label (the house caption-within-the-frame style). */
function Mono({
  x,
  y,
  size = 7,
  fill = ink(0.5),
  opacity = 1,
  anchor = 'middle',
  ls = 1.6,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  opacity?: number;
  anchor?: 'start' | 'middle' | 'end';
  ls?: number;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="font-mono font-semibold"
      fontSize={size}
      fill={fill}
      opacity={opacity}
      letterSpacing={ls}
    >
      {children}
    </text>
  );
}

// -- 1 . The clock and the trap (t = 0-10) -----------------------------------
// A great 90-day ring burns down while a storm of application-particles sprays
// outward and dies to red embers. "39%" lands as stark type.
const S1_STORM = (() => {
  const r = seededRand(7);
  return Array.from({ length: 96 }, () => {
    const a = r() * Math.PI * 2;
    return {
      cx: Math.cos(a),
      sy: Math.sin(a),
      r0: 86 + r() * 12,
      travel: 30 + r() * 92,
      delay: r() * 0.5,
      size: 1 + r() * 1.2,
    };
  });
})();

function SceneTrap({ p }: ScProps) {
  const fc = lerp(1, 68 / 90, seg(p, 0.05, 0.9)); // remaining fraction of the window
  const days = Math.round(90 * fc);
  const C = 2 * Math.PI * 78;
  const th = 2 * Math.PI * fc - Math.PI / 2; // burn head angle (clockwise from top)
  const on = easeOut(seg(p, 0.02, 0.12));
  const land = easeOut(seg(p, 0.72, 0.86));
  return (
    <Frame back={BACK_EMBER}>
      {/* the storm: hundreds of dim applications spray out and die as embers */}
      {S1_STORM.map((s, i) => {
        const t = seg(p, 0.1 + s.delay * 0.5, 0.44 + s.delay * 0.5);
        if (t === 0) return null;
        const d = s.r0 + s.travel * easeOut(t);
        const die = easeOut(t);
        return (
          <circle
            key={i}
            cx={200 + s.cx * d * 1.14}
            cy={120 + s.sy * d * 0.82}
            r={s.size * (1 - 0.4 * t)}
            fill={mixRgb(INK_RGB, RED_RGB, die)}
            opacity={Math.min(1, t * 5) * (1 - 0.86 * die)}
          />
        );
      })}

      {/* the great ring - the 90-day countdown, visibly burning down */}
      <g opacity={on}>
        <circle cx={200} cy={120} r={78} fill="none" stroke={ink(0.1)} strokeWidth={1} />
        <circle
          cx={200}
          cy={120}
          r={78}
          fill="none"
          stroke={AMBER}
          strokeWidth={5.5}
          opacity={0.16}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fc)}
          transform="rotate(-90 200 120)"
        />
        <circle
          cx={200}
          cy={120}
          r={78}
          fill="none"
          stroke={AMBER}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fc)}
          transform="rotate(-90 200 120)"
        />
        {/* burn head + fresh embers just past it */}
        <circle cx={200 + Math.cos(th) * 78} cy={120 + Math.sin(th) * 78} r={10} fill="url(#pg-amb)" opacity={0.9} />
        <circle cx={200 + Math.cos(th) * 78} cy={120 + Math.sin(th) * 78} r={2.4} fill={AMBER} />
        {[1, 2, 3].map((k) => {
          const a = 2 * Math.PI * (fc + 0.02 * k) - Math.PI / 2;
          return (
            <circle
              key={k}
              cx={200 + Math.cos(a) * 78}
              cy={120 + Math.sin(a) * 78}
              r={1.2}
              fill={RED}
              opacity={(0.28 + 0.2 * Math.sin(p * 50 + k * 2)) * seg(p, 0.08, 0.16)}
            />
          );
        })}
        {/* the number of days, counting down inside the ring */}
        <text
          x={200}
          y={132}
          textAnchor="middle"
          className="font-display font-extrabold"
          fontSize={42}
          fill={INK}
          letterSpacing={-1}
        >
          {days}
        </text>
        <Mono x={200} y={152} size={7} fill={ink(0.45)} ls={2.4}>
          DAYS LEFT
        </Mono>
      </g>

      {/* the stat lands, stark */}
      <g transform={`translate(200 242) scale(${1.5 - 0.5 * land})`} opacity={land}>
        <text textAnchor="middle" className="font-display font-extrabold" fontSize={28} fill={RED}>
          39%
        </text>
      </g>
      <Mono x={200} y={261} size={6.5} fill={ink(0.5)} ls={2} opacity={easeOut(seg(p, 0.82, 0.92))}>
        FEWER POSITIVE RESPONSES
      </Mono>
    </Frame>
  );
}

// -- 2 . Five, max (t = 10-16) -----------------------------------------------
// From the noise, exactly five luminous points condense into a vertical rhythm.
// One dims honestly and a verified replacement glides in.
const S2 = (() => {
  const r = seededRand(21);
  const ys = [48, 94, 140, 186, 232];
  const noise = Array.from({ length: 26 }, () => {
    const x = 50 + r() * 300;
    const y = 26 + r() * 228;
    let ty = ys[0];
    for (const yy of ys) if (Math.abs(yy - y) < Math.abs(ty - y)) ty = yy;
    return { x, y, ty, d: r() };
  });
  return { ys, noise };
})();
const S2_RING_C = 2 * Math.PI * 9;

function SceneFive({ p }: ScProps) {
  const bracket = seg(p, 0.26, 0.44);
  const fiveLand = easeOut(seg(p, 0.34, 0.48));
  return (
    <Frame back={BACK_INDIGO}>
      {/* residual noise condenses toward the column and fades */}
      {S2.noise.map((n, i) => {
        const q = easeOut(seg(p, 0.02 + n.d * 0.1, 0.34 + n.d * 0.1));
        if (q >= 1) return null;
        return (
          <circle
            key={i}
            cx={lerp(n.x, 190, q * 0.85)}
            cy={lerp(n.y, n.ty, q * 0.85)}
            r={1.1}
            fill={ink(0.9)}
            opacity={0.3 * (1 - q)}
          />
        );
      })}

      {/* the five points */}
      {S2.ys.map((y, i) => {
        const e = easeOut(seg(p, 0.06 + i * 0.075, 0.2 + i * 0.075));
        if (e === 0) return null;
        const num = `0${i + 1}`;
        if (i !== 2) {
          return (
            <g key={i} opacity={e}>
              <circle cx={190} cy={y} r={13} fill="url(#pg-ind)" opacity={0.55} />
              <circle
                cx={190}
                cy={y}
                r={9}
                fill="none"
                stroke={ink(0.35)}
                strokeWidth={1}
                strokeDasharray={S2_RING_C}
                strokeDashoffset={S2_RING_C * (1 - e)}
                transform={`rotate(-90 190 ${y})`}
              />
              <circle cx={190} cy={y} r={4.2} fill={INDIGO_LIGHT} />
              <Mono x={170} y={y + 2.5} size={6.5} fill={ink(0.4)} anchor="end" ls={1.2}>
                {num}
              </Mono>
            </g>
          );
        }
        // slot 3: the honest removal + the verified replacement gliding in
        const dim = easeOut(seg(p, 0.5, 0.6));
        const out = easeOut(seg(p, 0.62, 0.76));
        const g2 = easeOut(seg(p, 0.66, 0.86));
        const fl = pulse(seg(p, 0.86, 0.98));
        const rx = lerp(316, 190, g2);
        const ry = y - 14 * Math.sin(Math.PI * g2);
        return (
          <g key={i}>
            <g opacity={e * (1 - out)} transform={`translate(${-16 * out} 0)`}>
              <circle cx={190} cy={y} r={13} fill="url(#pg-ind)" opacity={0.55 * (1 - dim)} />
              <circle
                cx={190}
                cy={y}
                r={9}
                fill="none"
                stroke={ink(0.35)}
                strokeWidth={1}
                opacity={1 - 0.55 * dim}
                strokeDasharray={S2_RING_C}
                strokeDashoffset={S2_RING_C * (1 - e)}
                transform={`rotate(-90 190 ${y})`}
              />
              <circle cx={190} cy={y} r={4.2} fill={INDIGO_LIGHT} opacity={1 - dim} />
              <circle cx={190} cy={y} r={4.2} fill={ink(0.28)} opacity={dim} />
              <line
                x1={177}
                y1={y}
                x2={203}
                y2={y}
                stroke={ink(0.45)}
                strokeWidth={1}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - dim}
              />
              <Mono x={170} y={y + 2.5} size={6.5} fill={ink(0.4)} anchor="end" ls={1.2}>
                {num}
              </Mono>
              <Mono x={190} y={y + 18} size={6} fill={ink(0.35)} opacity={dim}>
                UNVERIFIED
              </Mono>
            </g>
            {g2 > 0 && (
              <g>
                {[1, 2, 3].map((k) => {
                  const gk = Math.max(0, g2 - 0.09 * k);
                  return (
                    <circle
                      key={k}
                      cx={lerp(316, 190, gk)}
                      cy={y - 14 * Math.sin(Math.PI * gk)}
                      r={2 - k * 0.4}
                      fill={INDIGO_LIGHT}
                      opacity={(0.35 - k * 0.1) * (1 - seg(g2, 0.9, 1))}
                    />
                  );
                })}
                <circle cx={rx} cy={ry} r={13 + 6 * fl} fill="url(#pg-ind)" opacity={0.55 + 0.45 * fl} />
                <circle cx={rx} cy={ry} r={4.2} fill={INDIGO_LIGHT} />
                <circle
                  cx={190}
                  cy={y}
                  r={9}
                  fill="none"
                  stroke={rgba([110, 231, 183], 0.55)}
                  strokeWidth={1}
                  strokeDasharray={S2_RING_C}
                  strokeDashoffset={S2_RING_C * (1 - easeOut(seg(p, 0.84, 0.94)))}
                  transform={`rotate(-90 190 ${y})`}
                />
                <Mono x={170} y={y + 2.5} size={6.5} fill={ink(0.4)} anchor="end" ls={1.2} opacity={g2}>
                  {num}
                </Mono>
                <Mono x={190} y={y + 18} size={6} fill={EMERALD} opacity={seg(p, 0.9, 0.98)}>
                  VERIFIED
                </Mono>
              </g>
            )}
          </g>
        );
      })}

      {/* the scarcity bracket: five, max */}
      <path
        d="M242 48 L248 48 L248 232 L242 232"
        fill="none"
        stroke={ink(0.25)}
        strokeWidth={1}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - bracket}
      />
      <g transform={`translate(288 132) scale(${1.35 - 0.35 * fiveLand})`} opacity={fiveLand}>
        <text textAnchor="middle" className="font-display font-extrabold" fontSize={26} fill={INK}>
          5
        </text>
      </g>
      <Mono x={288} y={150} size={7} fill={ink(0.5)} ls={3} opacity={easeOut(seg(p, 0.42, 0.54))}>
        MAX
      </Mono>
    </Frame>
  );
}

// -- 3 . You approve. You submit. (t = 16-27) --------------------------------
// The light crosses the frame only through the human node's gate: it waits,
// the gate flares emerald APPROVED, then it travels on. The ledger etches
// tally notches along the bottom.
function SceneApprove({ p }: ScProps) {
  const ringOn = easeOut(seg(p, 0.02, 0.1));
  const a = easeOut(seg(p, 0.1, 0.42)); // approach: 52 -> 200
  const b = easeOut(seg(p, 0.6, 0.8)); // onward: 200 -> 348
  const cometX = b > 0 ? lerp(200, 348, b) : lerp(52, 200, a);
  const cometOp = seg(p, 0.08, 0.14) * (1 - seg(p, 0.82, 0.9));
  const ap = easeOut(seg(p, 0.46, 0.56)); // the approval
  const gateFlare = pulse(seg(p, 0.44, 0.62));
  const td = seg(p, 0.76, 0.86); // terminus ring draw
  const tb = pulse(seg(p, 0.78, 0.9)); // terminus burst
  const lb = seg(p, 0.84, 0.9); // ledger baseline
  const notchXs = [155, 177.5, 200, 222.5, 245];
  return (
    <Frame back={BACK_INDIGO}>
      {/* the path, and the light's traced trail behind it */}
      <line x1={52} y1={128} x2={348} y2={128} stroke={ink(0.1)} strokeWidth={1} />
      <line x1={52} y1={128} x2={cometX} y2={128} stroke={INDIGO} strokeWidth={1.2} opacity={0.4 * ringOn} />
      <circle cx={52} cy={128} r={2.2} fill={ink(0.5)} opacity={ringOn} />

      {/* the human node: pulse rings, core, gate */}
      <g opacity={ringOn}>
        {[0, 1].map((k) => {
          const w = wrap01(p * 1.4 + k * 0.5);
          return (
            <circle
              key={k}
              cx={200}
              cy={128}
              r={16 + 24 * w}
              fill="none"
              stroke={ink(0.6)}
              strokeWidth={1}
              opacity={(1 - w) * 0.28}
            />
          );
        })}
        <circle cx={200} cy={128} r={30} fill="url(#pg-grn)" opacity={0.35 * ap + 0.45 * gateFlare} />
        <circle cx={200} cy={128} r={16} fill="none" stroke={ink(0.4)} strokeWidth={1} />
        <circle cx={200} cy={128} r={5} fill={INK} />
        {/* gate slits: hairline, then emerald once approved */}
        <g stroke={ink(0.35)} strokeWidth={1.2} opacity={1 - ap}>
          <line x1={200} y1={100} x2={200} y2={110} />
          <line x1={200} y1={146} x2={200} y2={156} />
        </g>
        <g stroke={EMERALD} strokeWidth={1.2} opacity={ap}>
          <line x1={200} y1={100} x2={200} y2={110} />
          <line x1={200} y1={146} x2={200} y2={156} />
        </g>
        <Mono x={200} y={174} size={6.5} fill={ink(0.45)} ls={2}>
          YOU
        </Mono>
      </g>
      <g transform={`translate(0 ${(1 - ap) * 6})`} opacity={ap}>
        <Mono x={200} y={86} size={7.5} fill={EMERALD} ls={2.2}>
          APPROVED
        </Mono>
      </g>

      {/* the light itself - it waits at the gate, then crosses */}
      <g opacity={cometOp}>
        {[1, 2, 3, 4, 5].map((k) => (
          <circle
            key={k}
            cx={cometX - k * 7}
            cy={128}
            r={2.6 - k * 0.35}
            fill={INDIGO_LIGHT}
            opacity={cometX - k * 7 > 54 ? 0.5 - k * 0.08 : 0}
          />
        ))}
        <circle cx={cometX} cy={128} r={9} fill="url(#pg-ind)" />
        <circle cx={cometX} cy={128} r={3.2} fill={INDIGO_LIGHT} />
      </g>

      {/* the terminus: submission, from the user's side of the glass */}
      <circle cx={348} cy={128} r={12 + 6 * tb} fill="url(#pg-ind)" opacity={0.5 * tb + 0.3 * easeOut(seg(p, 0.8, 0.9))} />
      <circle
        cx={348}
        cy={128}
        r={8}
        fill="none"
        stroke={ink(0.5)}
        strokeWidth={1}
        strokeDasharray={2 * Math.PI * 8}
        strokeDashoffset={2 * Math.PI * 8 * (1 - easeOut(td))}
        transform="rotate(-90 348 128)"
      />
      <circle cx={348} cy={128} r={3} fill={INK} opacity={easeOut(td)} />
      <Mono x={348} y={156} size={6.5} fill={ink(0.55)} opacity={seg(p, 0.84, 0.92)}>
        SUBMITTED
      </Mono>

      {/* the ledger: tally notches etch themselves along the bottom */}
      <line
        x1={140}
        y1={224}
        x2={260}
        y2={224}
        stroke={ink(0.15)}
        strokeWidth={1}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - lb}
      />
      {notchXs.map((x, i) => {
        const etched = i < 3;
        const nd = seg(p, 0.88 + i * 0.025, 0.92 + i * 0.025);
        return (
          <line
            key={i}
            x1={x}
            y1={214}
            x2={x}
            y2={224}
            stroke={etched ? ink(0.75) : ink(0.15)}
            strokeWidth={etched ? 1.4 : 1}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={etched ? 1 - nd : 0}
            opacity={etched ? 1 : lb}
          />
        );
      })}
      <Mono x={200} y={242} size={6.2} fill={EMERALD} opacity={easeOut(seg(p, 0.94, 1))}>
        LOGGED 3/5
      </Mono>
    </Frame>
  );
}

// -- 4 . The loop nobody has (t = 27-31) -------------------------------------
// A four-node circuit draws itself in one continuous glowing stroke while
// generic gray data motes get pulled in as fuel. Fast, confident.
const S4_MOTES = (() => {
  const r = seededRand(41);
  return Array.from({ length: 12 }, () => {
    const a = r() * Math.PI * 2;
    return { cx: Math.cos(a), sy: Math.sin(a), r0: 118 + r() * 48, d: r() * 0.35, s: 1.1 + r() };
  });
})();
const S4_NODES = [
  { x: 200, y: 54, lx: 200, ly: 40, anchor: 'middle' as const, label: 'DIGEST' },
  { x: 284, y: 138, lx: 296, ly: 141, anchor: 'start' as const, label: 'APPROVE' },
  { x: 200, y: 222, lx: 200, ly: 242, anchor: 'middle' as const, label: 'SUBMIT' },
  { x: 116, y: 138, lx: 104, ly: 141, anchor: 'end' as const, label: 'LEDGER' },
];
const S4_C = 2 * Math.PI * 84;

function SceneLoop({ p }: ScProps) {
  const draw = seg(p, 0.05, 0.6);
  const orbit = draw >= 1 ? 1 + (p - 0.6) * 0.6 : draw;
  const th = -Math.PI / 2 + orbit * 2 * Math.PI;
  const cometOp = Math.min(1, draw * 6) * (1 - seg(p, 0.64, 0.78));
  const cOp = easeOut(seg(p, 0.78, 0.92));
  return (
    <Frame back={BACK_INDIGO}>
      {/* gray free-data motes, pulled in as fuel */}
      {S4_MOTES.map((m, i) => {
        const tm = seg(p, 0.4 + m.d, 0.72 + m.d);
        if (tm === 0) return null;
        const rr = lerp(m.r0, 88, easeOut(tm));
        return (
          <circle
            key={i}
            cx={200 + m.cx * rr}
            cy={138 + m.sy * rr * 0.72}
            r={m.s}
            fill="rgba(156,163,175,0.8)"
            opacity={0.45 * Math.min(1, tm * 4) * (1 - easeOut(seg(tm, 0.7, 1)))}
          />
        );
      })}
      <Mono
        x={48}
        y={264}
        size={6.5}
        fill={ink(0.35)}
        anchor="start"
        opacity={easeOut(seg(p, 0.38, 0.5)) * (1 - 0.55 * seg(p, 0.82, 1))}
      >
        FREE DATA
      </Mono>

      {/* the circuit draws itself, one continuous stroke */}
      <circle cx={200} cy={138} r={84} fill="none" stroke={ink(0.08)} strokeWidth={1} />
      <circle
        cx={200}
        cy={138}
        r={84}
        fill="none"
        stroke={INDIGO}
        strokeWidth={7}
        opacity={0.16}
        strokeDasharray={S4_C}
        strokeDashoffset={S4_C * (1 - Math.min(1, draw))}
        transform="rotate(-90 200 138)"
      />
      <circle
        cx={200}
        cy={138}
        r={84}
        fill="none"
        stroke={INDIGO_LIGHT}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={S4_C}
        strokeDashoffset={S4_C * (1 - Math.min(1, draw))}
        transform="rotate(-90 200 138)"
      />

      {/* the four nodes flare as the stroke passes */}
      {S4_NODES.map((n, i) => {
        const on = easeOut(seg(draw, i * 0.25 + 0.02, i * 0.25 + 0.12));
        const flare = pulse(seg(draw, i * 0.25 + 0.02, i * 0.25 + 0.3));
        if (on === 0) return null;
        return (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r={11 + 4 * flare} fill="url(#pg-ind)" opacity={0.4 * on + 0.4 * flare} />
            <circle cx={n.x} cy={n.y} r={3.4} fill={INDIGO_LIGHT} opacity={on} />
            <Mono x={n.lx} y={n.ly} size={6.5} fill={ink(0.65)} anchor={n.anchor} opacity={0.9 * on}>
              {n.label}
            </Mono>
          </g>
        );
      })}

      {/* the running light */}
      <g opacity={cometOp}>
        <circle cx={200 + Math.cos(th) * 84} cy={138 + Math.sin(th) * 84} r={9} fill="url(#pg-ind)" />
        <circle cx={200 + Math.cos(th) * 84} cy={138 + Math.sin(th) * 84} r={2.8} fill={INK} />
      </g>

      {/* the point of it */}
      <g transform={`translate(200 141) scale(${1.15 - 0.15 * cOp})`} opacity={cOp}>
        <text textAnchor="middle" className="font-mono font-semibold" fontSize={9} fill={INDIGO_LIGHT} letterSpacing={3}>
          COMPOUNDS
        </text>
      </g>
    </Frame>
  );
}

// -- 5 . Quality wins, measured (t = 31-41) ----------------------------------
// A wall of 100 faint dots. The 75% myth cracks and dissolves; ~90 dots warm
// to ink; one dot gets the measuring bracket: INSTRUMENTING.
const S5_FOCUS = 47; // col 7, row 4 -> (250, 116)
const S5_DOTS = (() => {
  const r = seededRand(51);
  const dim = new Set<number>();
  while (dim.size < 10) {
    const k = Math.floor(r() * 100);
    if (k !== S5_FOCUS) dim.add(k);
  }
  return Array.from({ length: 100 }, (_, i) => ({
    x: 110 + (i % 10) * 20,
    y: 52 + Math.floor(i / 10) * 16,
    d1: r(),
    d2: r(),
    dim: dim.has(i),
  }));
})();
const S5_BRACKET = [
  'M235 109 L235 104 L240 104',
  'M260 104 L265 104 L265 109',
  'M235 123 L235 128 L240 128',
  'M265 123 L265 128 L260 128',
];

function MythType() {
  return (
    <g>
      <Mono x={200} y={84} size={7} fill={RED} ls={2.4}>
        MYTH
      </Mono>
      <text x={200} y={134} textAnchor="middle" className="font-display font-extrabold" fontSize={40} fill={RED}>
        75%
      </text>
      <Mono x={200} y={154} size={7} fill={rgba(RED_RGB, 0.8)} ls={2}>
        AUTO-REJECTED
      </Mono>
    </g>
  );
}

function SceneQuality({ p }: ScProps) {
  const m = easeOut(seg(p, 0.2, 0.32));
  const sh = easeOut(seg(p, 0.36, 0.52));
  const ck = seg(p, 0.3, 0.4);
  const ins = easeOut(seg(p, 0.76, 0.86));
  return (
    <Frame back={BACK_INDIGO}>
      <defs>
        <clipPath id="s5l">
          <rect x={0} y={0} width={200} height={280} />
        </clipPath>
        <clipPath id="s5r">
          <rect x={200} y={0} width={200} height={280} />
        </clipPath>
      </defs>

      {/* the wall of one hundred */}
      {S5_DOTS.map((d, i) => {
        const aT = seg(p, 0.02 + d.d1 * 0.14, 0.1 + d.d1 * 0.14);
        if (aT === 0) return null;
        const w = d.dim ? 0 : easeOut(seg(p, 0.5 + d.d2 * 0.2, 0.62 + d.d2 * 0.2));
        return <circle key={i} cx={d.x} cy={d.y} r={2 + 0.5 * w} fill={INK} opacity={0.12 * aT + 0.72 * w} />;
      })}

      {/* the myth arrives, cracks, and shatters into halves */}
      <g transform={`translate(200 124) scale(${1.25 - 0.25 * m}) translate(-200 -124)`} opacity={m}>
        <g clipPath="url(#s5l)" opacity={1 - sh} transform={`translate(${-15 * sh} ${-6 * sh}) rotate(${-3 * sh} 160 124)`}>
          <MythType />
        </g>
        <g clipPath="url(#s5r)" opacity={1 - sh} transform={`translate(${15 * sh} ${6 * sh}) rotate(${3 * sh} 240 124)`}>
          <MythType />
        </g>
      </g>
      <path
        d="M200 86 L195 102 L204 120 L196 138 L202 158"
        fill="none"
        stroke={ink(0.7)}
        strokeWidth={1}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ck}
        opacity={Math.min(1, ck * 3) * (1 - seg(p, 0.46, 0.56))}
      />

      {/* the truth, in ink */}
      <Mono x={200} y={215} size={6.5} fill={EMERALD} opacity={0.9 * easeOut(seg(p, 0.66, 0.76))}>
        90 OF 100 READ BY HUMANS
      </Mono>

      {/* one application, instrumented */}
      <circle cx={250} cy={116} r={12} fill="url(#pg-ind)" opacity={0.7 * ins} />
      <circle cx={250} cy={116} r={3.2} fill={INDIGO_LIGHT} opacity={ins} />
      {S5_BRACKET.map((d, k) => (
        <path
          key={k}
          d={d}
          fill="none"
          stroke={AMBER}
          strokeWidth={1}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - seg(p, 0.8 + k * 0.02, 0.9 + k * 0.02)}
          opacity={0.9}
        />
      ))}
      <Mono x={250} y={96} size={5.8} fill={AMBER} ls={1.8} opacity={seg(p, 0.88, 0.96)}>
        INSTRUMENTING
      </Mono>
    </Frame>
  );
}

// -- 6 . Free wedge, campus business (t = 41-52) -----------------------------
// Concentric TAM rings breathe outward; a campus constellation lights up
// inside; two glyphs split the model: the student (free) and the campus (the
// business).
const S6 = (() => {
  const r = seededRand(66);
  const pts = Array.from({ length: 11 }, () => {
    const a = r() * Math.PI * 2;
    const rad = 18 + r() * 72;
    return { x: 200 + Math.cos(a) * rad, y: 128 + Math.sin(a) * rad * 0.92, s: 1.6 + r() * 1.2, d: r() };
  });
  const links: Array<[number, number]> = [];
  for (let i = 0; i < pts.length && links.length < 6; i++)
    for (let j = i + 1; j < pts.length && links.length < 6; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      if (dx * dx + dy * dy < 52 * 52) links.push([i, j]);
    }
  return { pts, links };
})();
const S6_RINGS = [
  { r: 36, op: 0.55, label: '250K OPT / YR' },
  { r: 68, op: 0.4, label: '1M+ INTL STUDENTS' },
  { r: 100, op: 0.28, label: '4M+ US STUDENTS' },
];

function SceneWedge({ p }: ScProps) {
  const g1 = easeOut(seg(p, 0.72, 0.86));
  const g2 = easeOut(seg(p, 0.78, 0.92));
  return (
    <Frame back={BACK_INDIGO}>
      {/* the TAM rings, breathing outward */}
      {S6_RINGS.map((ring, i) => {
        const d = easeOut(seg(p, 0.05 + i * 0.13, 0.28 + i * 0.13));
        if (d === 0) return null;
        const C = 2 * Math.PI * ring.r;
        const breathe = 1 + 0.014 * Math.sin(Math.PI * 2 * (p * 1.2) + i * 2.1);
        const lOp = easeOut(seg(p, 0.2 + i * 0.13, 0.34 + i * 0.13));
        return (
          <g key={i}>
            <g transform={`translate(200 128) scale(${breathe}) translate(-200 -128)`}>
              <circle
                cx={200}
                cy={128}
                r={ring.r}
                fill="none"
                stroke={ilight(ring.op)}
                strokeWidth={1}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - d)}
                transform={`rotate(-90 200 128)`}
              />
            </g>
            <line x1={200} y1={128 - ring.r} x2={200} y2={128 - ring.r - 4} stroke={ilight(0.5)} strokeWidth={1} opacity={lOp} />
            <Mono x={200} y={128 - ring.r - 8} size={6.2} fill={ink(0.65)} ls={1.4} opacity={lOp}>
              {ring.label}
            </Mono>
          </g>
        );
      })}

      {/* the campus constellation inside the rings */}
      {S6.links.map(([i, j], k) => (
        <line
          key={k}
          x1={S6.pts[i].x}
          y1={S6.pts[i].y}
          x2={S6.pts[j].x}
          y2={S6.pts[j].y}
          stroke={ink(0.15)}
          strokeWidth={1}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - seg(p, 0.56 + k * 0.02, 0.68 + k * 0.02)}
        />
      ))}
      {S6.pts.map((pt, i) => {
        const st = easeOut(seg(p, 0.42 + pt.d * 0.24, 0.52 + pt.d * 0.24));
        if (st === 0) return null;
        return (
          <g key={i} opacity={st}>
            {pt.s > 2.2 && <circle cx={pt.x} cy={pt.y} r={7} fill="url(#pg-ind)" opacity={0.5} />}
            <circle cx={pt.x} cy={pt.y} r={pt.s} fill={pt.s > 2.2 ? INDIGO_LIGHT : ink(0.8)} />
          </g>
        );
      })}

      {/* the split: student mark (free) and campus mark (the business) */}
      <line x1={200} y1={240} x2={200} y2={266} stroke={ink(0.1)} strokeWidth={1} opacity={g1} />
      <g opacity={g1} transform={`translate(0 ${(1 - g1) * 8})`}>
        <circle cx={118} cy={251} r={8} fill="none" stroke={rgba([110, 231, 183], 0.6)} strokeWidth={1} />
        <circle cx={118} cy={251} r={3.4} fill={INK} />
        <Mono x={118} y={271} size={6.5} fill={ink(0.55)} ls={1.4}>
          STUDENTS <tspan fill={EMERALD}>FREE</tspan>
        </Mono>
      </g>
      <g opacity={g2} transform={`translate(0 ${(1 - g2) * 8})`}>
        <path d="M282 244 L273 257 L291 257 Z" fill="none" stroke={ink(0.2)} strokeWidth={1} />
        <circle cx={282} cy={244} r={2.2} fill={INDIGO_LIGHT} />
        <circle cx={273} cy={257} r={2.2} fill={INDIGO_LIGHT} />
        <circle cx={291} cy={257} r={2.2} fill={INDIGO_LIGHT} />
        <Mono x={282} y={271} size={6.5} fill={ink(0.55)} ls={1.4}>
          CAMPUS <tspan fill={INDIGO_LIGHT}>THE BUSINESS</tspan>
        </Mono>
      </g>
    </Frame>
  );
}

// -- 7 . Live, and the exhale (t = 52-60) ------------------------------------
// The film's particles collapse inward into the hero's rising five-cluster
// constellation; one point flares emerald LIVE; the wordmark settles.
const S7 = (() => {
  const r = seededRand(77);
  const clusters: Array<[number, number]> = [
    [95, 225],
    [152, 188],
    [208, 150],
    [262, 112],
    [315, 74],
  ];
  const pts = Array.from({ length: 66 }, (_, i) => {
    const c = clusters[i % 5];
    return {
      sx: 30 + r() * 340,
      sy: 18 + r() * 244,
      tx: c[0] + (r() + r() - 1) * 17,
      ty: c[1] + (r() + r() - 1) * 13,
      d: r() * 0.45,
      s: 1.1 + r() * 1.5,
      bright: r() < 0.45,
    };
  });
  const stars = Array.from({ length: 22 }, () => ({
    x: 12 + r() * 376,
    y: 12 + r() * 256,
    s: 0.7 + r() * 0.9,
    o: 0.06 + r() * 0.1,
  }));
  return { clusters, pts, stars };
})();

function SceneLive({ p }: ScProps) {
  const path = seg(p, 0.44, 0.62);
  const fl = pulse(seg(p, 0.6, 0.78));
  const sOn = easeOut(seg(p, 0.66, 0.78));
  const rp = seg(p, 0.64, 0.92);
  const wm = easeOut(seg(p, 0.76, 0.94));
  return (
    <Frame back={BACK_EXHALE}>
      {/* faint background stars - the hero field's residue */}
      {S7.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={INK} opacity={s.o} />
      ))}

      {/* everything collapses inward into the rising constellation */}
      {S7.pts.map((pt, i) => {
        const t = easeOut(seg(p, 0.03 + pt.d * 0.5, 0.38 + pt.d * 0.5));
        return (
          <circle
            key={i}
            cx={lerp(pt.sx, pt.tx, t)}
            cy={lerp(pt.sy, pt.ty, t)}
            r={pt.s}
            fill={pt.bright ? INDIGO_LIGHT : ink(0.85)}
            opacity={0.2 + 0.7 * t}
          />
        );
      })}

      {/* the rising path - the visual rhyme with the hero */}
      <path
        d="M95 225 L152 188 L208 150 L262 112 L315 74"
        fill="none"
        stroke={ilight(0.35)}
        strokeWidth={1}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - path}
      />

      {/* the final point flares emerald: live */}
      <circle cx={315} cy={74} r={16} fill="url(#pg-grn)" opacity={0.4 * sOn + 0.5 * fl} />
      <circle cx={315} cy={74} r={8 + 34 * easeOut(rp)} fill="none" stroke={EMERALD} strokeWidth={1} opacity={(1 - rp) * 0.5} />
      <circle cx={315} cy={74} r={3.6} fill={EMERALD} opacity={sOn} />
      <Mono x={315} y={52} size={7} fill={EMERALD} ls={2.4} opacity={seg(p, 0.7, 0.8)}>
        LIVE
      </Mono>

      {/* the wordmark and the promise settle */}
      <g opacity={wm} transform={`translate(0 ${(1 - wm) * 10})`}>
        <text
          x={200}
          y={234}
          textAnchor="middle"
          className="font-display font-extrabold"
          fontSize={24}
          fill={INK}
          letterSpacing={-0.5}
        >
          Aspirely
        </text>
        <rect x={112} y={246} width={176} height={16} rx={8} fill={ink(0.04)} stroke={ink(0.15)} strokeWidth={1} />
        <Mono x={200} y={256.5} size={5.5} fill={ink(0.65)} ls={0.9}>
          INTEGRITY-FIRST. NO FABRICATED CLAIMS.
        </Mono>
      </g>
    </Frame>
  );
}

// -- The switch --------------------------------------------------------------
const SCENES: ReadonlyArray<ComponentType<ScProps>> = [
  SceneTrap,
  SceneFive,
  SceneApprove,
  SceneLoop,
  SceneQuality,
  SceneWedge,
  SceneLive,
];

export interface PitchScenesProps {
  /** 0-based scene index */
  scene: number;
  /** local scene progress 0..1 */
  progress: number;
  /** scene duration in seconds (scales the cut-in fade) */
  duration?: number;
}

export default function PitchScenes({ scene, progress, duration = 8 }: PitchScenesProps) {
  const Scene = SCENES[Math.min(Math.max(scene, 0), SCENES.length - 1)];
  // A short cut-in fade (~0.35s of the chapter), still purely progress-derived.
  const fade = easeOut(seg(progress, 0, Math.min(0.5, 0.35 / duration)));
  return (
    <div className="absolute inset-0 p-3 sm:p-6" style={{ opacity: fade }}>
      <Scene p={progress} />
    </div>
  );
}
