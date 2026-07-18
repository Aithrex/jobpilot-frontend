import { type ComponentType, type ReactNode } from 'react';
import {
  AMBER,
  AMBER_RGB,
  EMERALD,
  EMERALD_RGB,
  INDIGO,
  INDIGO_LIGHT,
  INDIGO_LIGHT_RGB,
  INK,
  INK_RGB,
  RED,
  RED_RGB,
  SLATE_RGB,
  STAGE_CARD,
  type Rgb,
  easeOut,
  lerp,
  pulse,
  rgba,
  seededRand,
  seg,
} from './_pitchKit';

/**
 * The seven scenes of "Aspirely in 60 seconds" - stylized PRODUCT vignettes,
 * not abstract motion graphics. Each beat is told through crafted UI: a bulk
 * bot getting FLAGGED, the five-job morning digest, an approve tap + a form
 * filling in the user's browser, the four-tile loop, a recruiter's inbox, the
 * campus pricing split, and the live status strip. Companies are fictional
 * (letter monograms only), inbox vignettes carry a DEMO tag, and in-frame
 * words stay to 1-3 word mono micro-labels - the state changes do the talking.
 *
 * Every scene is a pure function of its local progress `p` (0..1): all layout
 * "randomness" is precomputed at module scope from seeded PRNGs and there are
 * no fire-and-forget animations - so seeking the timeline in either direction
 * (or parking the reduced-motion stepper on `p = 1`) renders the exact same
 * frame every time, and each scene's `p = 1` frame composes as a poster.
 * This file is code-split: only the lightweight poster ships above the fold.
 */

interface ScProps {
  p: number;
}

// -- Shared stagecraft -------------------------------------------------------
const ink = (a: number) => rgba(INK_RGB, a);
const il = (a: number) => rgba(INDIGO_LIGHT_RGB, a);
const em = (a: number) => rgba(EMERALD_RGB, a);
const rd = (a: number) => rgba(RED_RGB, a);
const sl = (a: number) => rgba(SLATE_RGB, a);
const am = (a: number) => rgba(AMBER_RGB, a);

const BACK_INDIGO =
  'radial-gradient(80% 65% at 50% 40%, rgba(79,99,231,0.13), transparent 65%)';
const BACK_EMBER =
  'radial-gradient(70% 60% at 50% 44%, rgba(251,191,36,0.06), transparent 60%), radial-gradient(90% 70% at 50% 55%, rgba(248,113,113,0.05), transparent 70%)';
const BACK_EXHALE =
  'radial-gradient(80% 65% at 50% 45%, rgba(79,99,231,0.13), transparent 65%), radial-gradient(40% 35% at 79% 24%, rgba(52,211,153,0.09), transparent 70%)';

/**
 * The film frame: a mood-glow backdrop plus one 400x280 SVG stage, letterboxed
 * with `meet` so the same center-weighted composition holds on the portrait
 * mobile frame and the wide desktop frame.
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
        </defs>
        {children}
      </svg>
    </div>
  );
}

/** In-frame mono micro-label (1-3 words, the house style). */
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

/** A hairline glass panel - the stage's standard UI surface. */
function Panel({ x, y, w, h, r = 9, opacity = 1 }: { x: number; y: number; w: number; h: number; r?: number; opacity?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={ink(0.035)} stroke={ink(0.13)} strokeWidth={1} opacity={opacity} />;
}

/** Skeleton text line. */
function Skel({ x, y, w, h = 3.5, o = 0.16 }: { x: number; y: number; w: number; h?: number; o?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={ink(o)} />;
}

function Check({ x, y, color = EMERALD, s = 1, opacity = 1 }: { x: number; y: number; color?: string; s?: number; opacity?: number }) {
  return (
    <path
      d={`M ${x - 3.4 * s} ${y} l ${2.5 * s} ${2.7 * s} l ${4.6 * s} ${-5.6 * s}`}
      fill="none"
      stroke={color}
      strokeWidth={1.4 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

/** Rubber stamp (FLAGGED, DEBUNKED, BANNED, LOGGED) - pops in with scale. */
function Stamp({
  x,
  y,
  w = 58,
  rgb,
  t,
  rot = -8,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  rgb: Rgb;
  t: number;
  rot?: number;
  children: ReactNode;
}) {
  if (t <= 0) return null;
  const e = easeOut(t);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${1.6 - 0.6 * e})`} opacity={e}>
      <rect x={-w / 2} y={-8} width={w} height={16} rx={3} fill={rgba(rgb, 0.12)} stroke={rgba(rgb, 0.85)} strokeWidth={1.4} />
      <text x={0} y={2.6} textAnchor="middle" className="font-mono font-bold" fontSize={7} fill={rgba(rgb, 1)} letterSpacing={1.6}>
        {children}
      </text>
    </g>
  );
}

/** Fictional-company letter monogram (the integrity-safe "logo"). */
function Monogram({ x, y, letter, size = 20, dim = 0 }: { x: number; y: number; letter: string; size?: number; dim?: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={5}
        fill={dim > 0.5 ? sl(0.08) : il(0.14)}
        stroke={dim > 0.5 ? sl(0.25) : il(0.3)}
        strokeWidth={1}
      />
      <Mono x={x + size / 2} y={y + size / 2 + size * 0.16} size={size * 0.42} fill={ink(0.9 - 0.4 * dim)} ls={0}>
        {letter}
      </Mono>
    </g>
  );
}

/** DEMO corner tag - required on anything that could read as a real message. */
function DemoCorner({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={34} height={12} rx={3} fill={ink(0.05)} stroke={ink(0.16)} strokeWidth={1} />
      <Mono x={x + 17} y={y + 8.4} size={5.2} fill={ink(0.5)} ls={1.6}>
        DEMO
      </Mono>
    </g>
  );
}

/** The human's pointer: a ring that swells on click. `click` is a pulse 0..1. */
function Cursor({ x, y, click = 0, opacity = 1 }: { x: number; y: number; click?: number; opacity?: number }) {
  if (opacity <= 0) return null;
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={6.5 + 7 * click} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.85 - 0.6 * click} />
      <circle cx={x} cy={y} r={2.4} fill={INK} />
    </g>
  );
}

/** Piecewise waypoint interpolation for pointer travel - pure in `p`. */
function moveXY(p: number, k: Array<[number, number, number]>): [number, number] {
  if (p <= k[0][0]) return [k[0][1], k[0][2]];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, x0, y0] = k[i];
    const [t1, x1, y1] = k[i + 1];
    if (p <= t1) {
      const e = easeOut(seg(p, t0, t1));
      return [lerp(x0, x1, e), lerp(y0, y1, e)];
    }
  }
  const last = k[k.length - 1];
  return [last[1], last[2]];
}

/** The OPT countdown chip - amber ring burning down + days left. */
function OptChip({ x, y, w, days, opacity = 1 }: { x: number; y: number; w: number; days: number; opacity?: number }) {
  const c = 2 * Math.PI * 6;
  const f = Math.min(1, days / 90);
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={22} rx={11} fill={am(0.06)} stroke={am(0.3)} strokeWidth={1} />
      <circle cx={x + 14} cy={y + 11} r={6} fill="none" stroke={ink(0.15)} strokeWidth={1.5} />
      <circle
        cx={x + 14}
        cy={y + 11}
        r={6}
        fill="none"
        stroke={AMBER}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
        transform={`rotate(-90 ${x + 14} ${y + 11})`}
      />
      <text x={x + w - 10} y={y + 14.5} textAnchor="end" className="font-display font-bold" fontSize={9.5} fill={AMBER}>
        {days} DAYS
      </text>
      <Mono x={x + 24} y={y + 14} size={5.2} fill={am(0.75)} anchor="start" ls={1}>
        OPT
      </Mono>
    </g>
  );
}

// -- 1 . The clock and the trap (t = 0-10) -----------------------------------
// A bulk-apply bot races a counter up while identical applications fly onto a
// pile and get stamped FLAGGED. The OPT chip burns down. 39% lands, falling.
const S1_PILE = (() => {
  const r = seededRand(11);
  return Array.from({ length: 5 }, () => ({
    dx: (r() - 0.5) * 24,
    dy: (r() - 0.5) * 26,
    rot: (r() - 0.5) * 18,
  }));
})();

function AppCard({ opacity = 1 }: { opacity?: number }) {
  return (
    <g opacity={opacity}>
      <rect x={-44} y={-19} width={88} height={38} rx={5} fill={STAGE_CARD} stroke={ink(0.16)} strokeWidth={1} />
      <Skel x={-36} y={-11} w={40} />
      <Skel x={-36} y={-3} w={56} h={3} o={0.12} />
      <Skel x={-36} y={4} w={48} h={3} o={0.12} />
      <rect x={16} y={2} width={22} height={11} rx={3} fill={il(0.1)} stroke={il(0.3)} strokeWidth={1} />
      <Mono x={27} y={9.8} size={4.8} fill={il(0.9)} ls={0.6}>
        PDF
      </Mono>
    </g>
  );
}

function SceneTrap({ p }: ScProps) {
  const days = Math.round(lerp(74, 68, seg(p, 0.08, 0.9)));
  const botOn = easeOut(seg(p, 0.02, 0.1));
  const apps = Math.round(lerp(0, 112, seg(p, 0.08, 0.72)));
  const statOn = easeOut(seg(p, 0.72, 0.84));
  const arrow = easeOut(seg(p, 0.78, 0.9));
  return (
    <Frame back={BACK_EMBER}>
      {/* the OPT countdown chip, ticking down */}
      <OptChip x={244} y={26} w={124} days={days} opacity={easeOut(seg(p, 0, 0.08))} />

      {/* the generic mass-apply tool, blasting */}
      <g opacity={botOn}>
        <Panel x={32} y={64} w={136} h={104} r={9} />
        <line x1={32.5} y1={80} x2={167.5} y2={80} stroke={ink(0.12)} strokeWidth={1} />
        <circle cx={42} cy={72} r={2} fill={ink(0.2)} />
        <circle cx={50} cy={72} r={2} fill={ink(0.2)} />
        <circle cx={58} cy={72} r={2} fill={ink(0.2)} />
        <Mono x={162} y={74.5} size={5.2} fill={rd(0.75)} anchor="end" ls={1.2}>
          BULK BOT
        </Mono>
        <text x={100} y={126} textAnchor="middle" className="font-display font-extrabold" fontSize={28} fill={INK}>
          {apps}
        </text>
        <Mono x={100} y={142} size={5.8} fill={ink(0.45)} ls={1.6}>
          APPS / DAY
        </Mono>
        <Mono x={100} y={158} size={5.2} fill={rd(0.7)} ls={1} opacity={easeOut(seg(p, 0.3, 0.4))}>
          SAME RESUME
        </Mono>
      </g>

      {/* identical applications spray out onto a messy pile */}
      {S1_PILE.map((c, i) => {
        const t = seg(p, 0.14 + i * 0.075, 0.34 + i * 0.075);
        if (t === 0) return null;
        const e = easeOut(t);
        const x = lerp(150, 268 + c.dx, e);
        const y = lerp(116, 118 + c.dy, e) - 20 * pulse(e);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${lerp(0, c.rot, e)}) scale(${lerp(0.7, 1, e)})`}>
            <AppCard opacity={Math.min(1, t * 4)} />
          </g>
        );
      })}
      <Stamp x={252} y={104} rgb={RED_RGB} t={seg(p, 0.52, 0.6)} rot={-10}>
        FLAGGED
      </Stamp>
      <Stamp x={288} y={128} rgb={RED_RGB} t={seg(p, 0.6, 0.68)} rot={-5}>
        FLAGGED
      </Stamp>
      <Stamp x={258} y={148} rgb={RED_RGB} t={seg(p, 0.68, 0.76)} rot={-13}>
        FLAGGED
      </Stamp>

      {/* the sourced stat lands - falling, in red */}
      <g transform={`translate(188 246) scale(${1.4 - 0.4 * statOn})`} opacity={statOn}>
        <text textAnchor="middle" className="font-display font-extrabold" fontSize={26} fill={RED}>
          39%
        </text>
      </g>
      <path
        d={`M222 232 L222 ${lerp(232, 248, arrow)} M217 ${lerp(232, 243, arrow)} L222 ${lerp(232, 248, arrow)} L227 ${lerp(
          232,
          243,
          arrow,
        )}`}
        fill="none"
        stroke={RED}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={arrow}
      />
      <Mono x={200} y={264} size={6.2} fill={ink(0.55)} ls={1.8} opacity={easeOut(seg(p, 0.78, 0.88))}>
        FEWER RESPONSES
      </Mono>
    </Frame>
  );
}

// -- 2 . Five, max (t = 10-16) -----------------------------------------------
// The morning digest as a phone card: exactly five rows, sponsor-verified.
// Row 3 flips gray (won't sponsor), slides out, and a vetted one slides in.
interface JobSpec {
  m: string;
  role: string;
  co: string;
  pay: string;
  badge: string;
}
const S2_JOBS: JobSpec[] = [
  { m: 'N', role: 'Data Engineer', co: 'Nortavia', pay: '$128K', badge: 'H1B · 214 FILINGS' },
  { m: 'B', role: 'Backend Engineer', co: 'Bluepeak', pay: '$122K', badge: 'H1B · 89 FILINGS' },
  { m: 'C', role: 'ML Engineer', co: 'Cindral', pay: '$135K', badge: 'H1B · 12 FILINGS' },
  { m: 'V', role: 'Product Analyst', co: 'Veyra', pay: '$98K', badge: 'H1B · 61 FILINGS' },
  { m: 'O', role: 'Data Scientist', co: 'Osmund', pay: '$131K', badge: 'H1B · 176 FILINGS' },
];
const S2_REPL: JobSpec = { m: 'T', role: 'ML Engineer', co: 'Talvex', pay: '$133K', badge: 'H1B · 148 FILINGS' };

function DigestRow({
  x,
  y,
  w,
  job,
  sub,
  badge,
  tone = 'em',
  dim = 0,
}: {
  x: number;
  y: number;
  w: number;
  job: JobSpec;
  sub?: string;
  badge?: string;
  tone?: 'em' | 'gray';
  dim?: number;
}) {
  const bt = tone === 'em' ? EMERALD : sl(0.9);
  const bf = tone === 'em' ? em(0.08) : sl(0.08);
  const bs = tone === 'em' ? em(0.35) : sl(0.3);
  return (
    <g opacity={1 - 0.3 * dim}>
      <rect x={x} y={y} width={w} height={32} rx={7} fill={ink(0.03)} stroke={ink(0.11)} strokeWidth={1} />
      <Monogram x={x + 6} y={y + 6} letter={job.m} size={20} dim={dim} />
      <text x={x + 32} y={y + 13.5} fontSize={7} className="font-semibold" fill={ink(0.92 - 0.45 * dim)}>
        {job.role}
      </text>
      <text x={x + 32} y={y + 24.5} fontSize={5.8} fill={dim > 0.5 ? sl(0.9) : ink(0.45)}>
        {sub ?? job.co}
      </text>
      <Mono x={x + w - 7} y={y + 13.5} size={5.8} fill={ink(0.6 - 0.25 * dim)} anchor="end" ls={0.4}>
        {job.pay}
      </Mono>
      {badge !== undefined && (
        <g>
          <rect x={x + w - 71} y={y + 17} width={64} height={10.5} rx={5.25} fill={bf} stroke={bs} strokeWidth={1} />
          <Mono x={x + w - 39} y={y + 24.4} size={4.9} fill={bt} ls={0.4}>
            {badge}
          </Mono>
        </g>
      )}
      {dim > 0 && (
        <line x1={x + 30} y1={y + 11.5} x2={x + 30 + 62 * dim} y2={y + 11.5} stroke={rd(0.8)} strokeWidth={1} />
      )}
    </g>
  );
}

function SceneFive({ p }: ScProps) {
  const ys = [60, 96, 132, 168, 204];
  const rowX = 134;
  const rowW = 132;
  const dim = easeOut(seg(p, 0.44, 0.54));
  const out = easeOut(seg(p, 0.6, 0.72));
  const rin = easeOut(seg(p, 0.66, 0.8));
  const ping = pulse(seg(p, 0.8, 0.94));
  return (
    <Frame back={BACK_INDIGO}>
      {/* the phone */}
      <rect
        x={126}
        y={14}
        width={148}
        height={252}
        rx={16}
        fill={ink(0.035)}
        stroke={ink(0.16)}
        strokeWidth={1}
        opacity={easeOut(seg(p, 0, 0.08))}
      />
      <g opacity={easeOut(seg(p, 0.02, 0.1))}>
        <rect x={188} y={20} width={24} height={3} rx={1.5} fill={ink(0.15)} />
        <Mono x={136} y={38} size={5.5} fill={il(0.9)} anchor="start" ls={1.6}>
          ASPIRELY
        </Mono>
        <Mono x={264} y={38} size={5.5} fill={ink(0.45)} anchor="end" ls={0.8}>
          8:00 AM
        </Mono>
        <text x={136} y={52} className="font-display font-bold" fontSize={9.5} fill={INK}>
          Today's 5
        </text>
      </g>

      {S2_JOBS.map((job, i) => {
        const t = easeOut(seg(p, 0.06 + i * 0.07, 0.16 + i * 0.07));
        if (t === 0) return null;
        const y = ys[i] + (1 - t) * 10;
        if (i !== 2) {
          return (
            <g key={i} opacity={t}>
              <DigestRow x={rowX} y={y} w={rowW} job={job} badge={job.badge} />
            </g>
          );
        }
        // row 3: flips gray (won't sponsor), slides out; a vetted one slides in
        return (
          <g key={i}>
            {out < 1 && (
              <g opacity={t * (1 - out)} transform={`translate(${-80 * out} 0)`}>
                <DigestRow
                  x={rowX}
                  y={y}
                  w={rowW}
                  job={job}
                  dim={dim}
                  sub={dim > 0.5 ? "Won't sponsor" : job.co}
                  badge={dim > 0.5 ? 'REMOVED' : job.badge}
                  tone={dim > 0.5 ? 'gray' : 'em'}
                />
              </g>
            )}
            {rin > 0 && (
              <g opacity={rin} transform={`translate(${(1 - rin) * 90} 0)`}>
                <DigestRow x={rowX} y={ys[i]} w={rowW} job={S2_REPL} badge={S2_REPL.badge} />
              </g>
            )}
            <rect
              x={rowX - 2}
              y={ys[i] - 2}
              width={rowW + 4}
              height={36}
              rx={8}
              fill="none"
              stroke={em(0.6)}
              strokeWidth={1.2}
              opacity={0.85 * ping}
            />
          </g>
        );
      })}

      {/* the cap, spelled once */}
      <Mono x={200} y={252} size={5.8} fill={ink(0.5)} ls={1.4} opacity={easeOut(seg(p, 0.86, 0.96))}>
        FIVE, MAX
      </Mono>
    </Frame>
  );
}

// -- 3 . You approve. You submit. (t = 16-27) --------------------------------
// Two digest rows get an Approve tap; a browser window autofills line by line,
// STOPS at Submit, the human's cursor clicks; a ledger row stamps LOGGED.
function ApproveRow({
  x,
  y,
  w,
  m,
  role,
  co,
  ap,
}: {
  x: number;
  y: number;
  w: number;
  m: string;
  role: string;
  co: string;
  ap: number;
}) {
  const bx = x + w - 66;
  const by = y + 6;
  return (
    <g>
      <rect x={x} y={y} width={w} height={30} rx={7} fill={ink(0.03)} stroke={ink(0.11)} strokeWidth={1} />
      <Monogram x={x + 5} y={y + 5} letter={m} size={20} />
      <text x={x + 31} y={y + 13} fontSize={6.8} className="font-semibold" fill={ink(0.92)}>
        {role}
      </text>
      <text x={x + 31} y={y + 24} fontSize={5.6} fill={ink(0.45)}>
        {co}
      </text>
      <rect
        x={bx}
        y={by}
        width={60}
        height={18}
        rx={9}
        fill={ap > 0 ? em(0.12) : il(0.12)}
        stroke={ap > 0 ? em(0.5) : il(0.45)}
        strokeWidth={1}
      />
      {ap > 0 ? (
        <g opacity={ap}>
          <Check x={bx + 13} y={by + 9} />
          <Mono x={bx + 36} y={by + 11.6} size={4.9} fill={EMERALD} ls={0.5}>
            APPROVED
          </Mono>
        </g>
      ) : (
        <Mono x={bx + 30} y={by + 11.6} size={5.2} fill={il(1)} ls={1}>
          APPROVE
        </Mono>
      )}
    </g>
  );
}

function SceneApprove({ p }: ScProps) {
  const aIn = easeOut(seg(p, 0, 0.06));
  const aOut = easeOut(seg(p, 0.26, 0.32));
  const ap1 = easeOut(seg(p, 0.11, 0.15));
  const ap2 = easeOut(seg(p, 0.21, 0.25));
  const bIn = easeOut(seg(p, 0.28, 0.36));
  const tn = seg(p, 0.4, 0.48); // name typing
  const at = easeOut(seg(p, 0.48, 0.54)); // attach chip pop
  const a1 = easeOut(seg(p, 0.54, 0.6)); // answer line 1
  const a2 = easeOut(seg(p, 0.57, 0.63)); // answer line 2
  const wb = easeOut(seg(p, 0.6, 0.66)); // "your words" tag
  const hl = easeOut(seg(p, 0.6, 0.66)); // submit highlight (the fill STOPS)
  const cl = pulse(seg(p, 0.7, 0.76)); // the human click
  const sub = easeOut(seg(p, 0.76, 0.82));
  const lg = easeOut(seg(p, 0.84, 0.92)); // ledger row
  const [cAx, cAy] = moveXY(p, [
    [0.03, 296, 158],
    [0.08, 260, 71],
    [0.16, 260, 71],
    [0.2, 260, 111],
  ]);
  const cAop = easeOut(seg(p, 0.03, 0.07)) * (1 - seg(p, 0.26, 0.31));
  const [cBx, cBy] = moveXY(p, [
    [0.63, 308, 218],
    [0.69, 281, 191],
  ]);
  const cBop = easeOut(seg(p, 0.63, 0.67)) * (1 - seg(p, 0.86, 0.9));
  return (
    <Frame back={BACK_INDIGO}>
      {/* phase A: the approve taps */}
      {aOut < 1 && (
        <g opacity={aIn * (1 - aOut)} transform={`translate(0 ${-12 * aOut})`}>
          <ApproveRow x={104} y={52} w={192} m="N" role="Data Engineer" co="Nortavia" ap={ap1} />
          <ApproveRow x={104} y={92} w={192} m="O" role="Data Scientist" co="Osmund" ap={ap2} />
          <Cursor x={cAx} y={cAy} click={pulse(seg(p, 0.08, 0.13)) + pulse(seg(p, 0.2, 0.25))} opacity={cAop} />
        </g>
      )}

      {/* phase B: the form fills in YOUR browser, then stops at Submit */}
      <g opacity={bIn} transform={`translate(0 ${(1 - bIn) * 14})`}>
        <Panel x={64} y={40} w={272} h={172} r={10} />
        <line x1={64.5} y1={58} x2={335.5} y2={58} stroke={ink(0.12)} strokeWidth={1} />
        <circle cx={76} cy={49} r={2} fill={ink(0.2)} />
        <circle cx={84} cy={49} r={2} fill={ink(0.2)} />
        <circle cx={92} cy={49} r={2} fill={ink(0.2)} />
        <rect x={104} y={44} width={192} height={10} rx={5} fill={ink(0.05)} stroke={ink(0.1)} strokeWidth={1} />
        <Mono x={200} y={51.2} size={5} fill={ink(0.5)} ls={0.6}>
          careers.nortavia.com/apply
        </Mono>

        {/* full name, typing itself */}
        <Mono x={80} y={74} size={5} fill={ink(0.4)} anchor="start" ls={1.2}>
          FULL NAME
        </Mono>
        <rect x={80} y={78} width={150} height={15} rx={4} fill={ink(0.04)} stroke={ink(0.14)} strokeWidth={1} />
        <clipPath id="s3name">
          <rect x={80} y={78} width={150 * tn} height={15} />
        </clipPath>
        <text x={87} y={88.5} fontSize={6.5} fill={ink(0.9)} clipPath="url(#s3name)">
          Jordan Rivera
        </text>
        <rect x={87 + 46 * tn} y={81} width={1.2} height={9} fill={il(0.9)} opacity={tn > 0 && tn < 1 ? 1 : 0} />

        {/* the resume attaches */}
        <Mono x={80} y={106} size={5} fill={ink(0.4)} anchor="start" ls={1.2}>
          RESUME
        </Mono>
        <g transform={`translate(140 117.5) scale(${0.7 + 0.3 * at}) translate(-140 -117.5)`} opacity={at}>
          <rect x={80} y={110} width={120} height={15} rx={7.5} fill={il(0.08)} stroke={il(0.35)} strokeWidth={1} />
          <path d="M89 114.5 v5 a3 3 0 0 0 6 0 v-4" fill="none" stroke={il(0.9)} strokeWidth={1} strokeLinecap="round" />
          <Mono x={100} y={120} size={5.2} fill={ink(0.75)} anchor="start" ls={0.3}>
            jordan_rivera_resume.pdf
          </Mono>
        </g>

        {/* the authored answer */}
        <Mono x={80} y={138} size={5} fill={ink(0.4)} anchor="start" ls={1.2}>
          WHY THIS ROLE?
        </Mono>
        <g opacity={wb}>
          <rect x={162} y={130.5} width={54} height={9.5} rx={4.75} fill={em(0.08)} stroke={em(0.35)} strokeWidth={1} />
          <Mono x={189} y={137.2} size={4.8} fill={EMERALD} ls={0.6}>
            YOUR WORDS
          </Mono>
        </g>
        <rect x={80} y={142} width={240} height={26} rx={4} fill={ink(0.04)} stroke={ink(0.14)} strokeWidth={1} />
        <rect x={87} y={149} width={200 * a1} height={3.5} rx={1.75} fill={ink(0.3)} />
        <rect x={87} y={158} width={150 * a2} height={3.5} rx={1.75} fill={ink(0.3)} />

        {/* the fill STOPS: submit lights up, only the human's cursor clicks */}
        <circle cx={281} cy={191} r={16 + 8 * pulse(hl)} fill="url(#pg-ind)" opacity={0.5 * hl + 0.5 * cl} />
        <rect x={240} y={180} width={82} height={22} rx={11} fill={INDIGO} opacity={0.25 + 0.75 * hl} stroke={il(0.6)} strokeWidth={1} />
        <Mono x={281} y={194} size={6.5} fill={INK} ls={2}>
          SUBMIT
        </Mono>
        <Mono x={281} y={174} size={5} fill={AMBER} ls={0.8} opacity={hl * (1 - sub)}>
          YOUR CLICK
        </Mono>
        <Mono x={281} y={209} size={5.2} fill={EMERALD} ls={1} opacity={sub}>
          SUBMITTED
        </Mono>
      </g>

      {/* phase C: the ledger row, stamped */}
      <g opacity={lg} transform={`translate(0 ${(1 - lg) * 10})`}>
        <Panel x={92} y={228} w={216} h={28} r={9} />
        <rect x={98} y={234} width={2.5} height={16} rx={1.25} fill={EMERALD} />
        <text x={107} y={242} fontSize={6.5} className="font-semibold" fill={ink(0.92)}>
          App 3 of 5
        </text>
        <Mono x={107} y={251} size={5} fill={ink(0.45)} anchor="start" ls={0.8}>
          TODAY
        </Mono>
        <Mono x={250} y={245} size={5.2} fill={ink(0.5)} anchor="end" ls={0.6}>
          8:41 AM
        </Mono>
        <Stamp x={281} y={242} w={48} rgb={EMERALD_RGB} t={seg(p, 0.9, 0.97)} rot={-6}>
          LOGGED
        </Stamp>
      </g>

      <Cursor x={cBx} y={cBy} click={cl} opacity={cBop} />
    </Frame>
  );
}

// -- 4 . The loop nobody has (t = 27-31) -------------------------------------
// Four mini product tiles - digest, approve, your browser, ledger - connect
// left to right with a flow line; gray free-data chips feed the first tile.
const S4_TILES = [
  { cx: 70, label: 'DIGEST' },
  { cx: 158, label: 'YOU APPROVE' },
  { cx: 246, label: 'YOUR BROWSER' },
  { cx: 334, label: 'LEDGER' },
];

function LoopTile({ cx, i, on, label }: { cx: number; i: number; on: number; label: string }) {
  if (on === 0) return null;
  const x = cx - 36;
  const y = 104;
  return (
    <g opacity={on} transform={`translate(${cx} ${y + 29}) scale(${0.92 + 0.08 * on}) translate(${-cx} ${-(y + 29)})`}>
      <rect x={x} y={y} width={72} height={58} rx={8} fill={STAGE_CARD} stroke={ink(0.16)} strokeWidth={1} />
      {i === 0 && (
        <g>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={x + 10} y={y + 11 + k * 13} width={52} height={8} rx={2.5} fill={ink(0.05)} stroke={ink(0.12)} strokeWidth={0.8} />
              <rect x={x + 14} y={y + 14 + k * 13} width={18} height={2.5} rx={1.25} fill={ink(0.25)} />
              <rect x={x + 46} y={y + 13.5 + k * 13} width={12} height={3.5} rx={1.75} fill={em(0.5)} />
            </g>
          ))}
        </g>
      )}
      {i === 1 && (
        <g>
          <circle cx={cx} cy={y + 22} r={11} fill={em(0.08)} stroke={em(0.55)} strokeWidth={1.2} />
          <Check x={cx} y={y + 22} />
          <rect x={cx - 18} y={y + 41} width={36} height={3.5} rx={1.75} fill={ink(0.18)} />
        </g>
      )}
      {i === 2 && (
        <g>
          <rect x={cx - 26} y={y + 9} width={52} height={38} rx={4} fill={ink(0.04)} stroke={ink(0.16)} strokeWidth={1} />
          <line x1={cx - 26} y1={y + 17} x2={cx + 26} y2={y + 17} stroke={ink(0.14)} strokeWidth={0.8} />
          <circle cx={cx - 21} cy={y + 13} r={1.3} fill={ink(0.25)} />
          <circle cx={cx - 16} cy={y + 13} r={1.3} fill={ink(0.25)} />
          <rect x={cx - 20} y={y + 22} width={32} height={4} rx={2} fill={ink(0.18)} />
          <rect x={cx + 2} y={y + 32} width={22} height={9} rx={4.5} fill={INDIGO} opacity={0.9} />
        </g>
      )}
      {i === 3 && (
        <g>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <Check x={x + 15} y={y + 15 + k * 13} color={em(0.8)} s={0.8} />
              <rect x={x + 25} y={y + 12.5 + k * 13} width={34} height={3.5} rx={1.75} fill={ink(0.2)} />
            </g>
          ))}
        </g>
      )}
      <Mono x={cx} y={y + 72} size={5.2} fill={ink(0.6)} ls={0.9}>
        {label}
      </Mono>
    </g>
  );
}

function SceneLoop({ p }: ScProps) {
  const chips = easeOut(seg(p, 0.03, 0.14));
  const draw = seg(p, 0.1, 0.66);
  const headX = lerp(38, 362, draw);
  return (
    <Frame back={BACK_INDIGO}>
      {/* gray free-data chips feed the digest */}
      <g opacity={chips} transform={`translate(0 ${(1 - chips) * -8})`}>
        <rect x={30} y={52} width={80} height={13} rx={6.5} fill={sl(0.07)} stroke={sl(0.25)} strokeWidth={1} />
        <Mono x={70} y={61} size={4.9} fill={sl(0.9)} ls={0.4}>
          H1B DATA · FREE
        </Mono>
        <rect x={30} y={70} width={80} height={13} rx={6.5} fill={sl(0.07)} stroke={sl(0.25)} strokeWidth={1} />
        <Mono x={70} y={79} size={4.9} fill={sl(0.9)} ls={0.4}>
          JOB FEEDS · FREE
        </Mono>
        <line x1={70} y1={85} x2={70} y2={102} stroke={sl(0.4)} strokeWidth={1} strokeDasharray="2 3" />
      </g>

      {/* the flow line, drawing left to right */}
      <line x1={38} y1={133} x2={362} y2={133} stroke={ink(0.08)} strokeWidth={1} />
      <line x1={38} y1={133} x2={headX} y2={133} stroke={INDIGO_LIGHT} strokeWidth={1.5} opacity={0.7} strokeLinecap="round" />
      {draw > 0 && draw < 1 && <circle cx={headX} cy={133} r={7} fill="url(#pg-ind)" />}
      {[114, 202, 290].map((ax) => (
        <path
          key={ax}
          d={`M${ax - 3} 129 L${ax + 2} 133 L${ax - 3} 137`}
          fill="none"
          stroke={il(0.7)}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={headX > ax ? 1 : 0}
        />
      ))}

      {S4_TILES.map((t, i) => (
        <LoopTile key={t.label} cx={t.cx} i={i} on={easeOut(seg(p, 0.12 + i * 0.14, 0.22 + i * 0.14))} label={t.label} />
      ))}
    </Frame>
  );
}

// -- 5 . Quality wins, measured (t = 31-41) ----------------------------------
// A recruiter's inbox: one strong application slides in and gets read. The
// "ATS auto-rejects 75%" myth card is stamped DEBUNKED and falls away; a
// small analytics tile starts INSTRUMENTING.
function SceneQuality({ p }: ScProps) {
  const panel = easeOut(seg(p, 0.02, 0.1));
  const cardIn = easeOut(seg(p, 0.18, 0.3));
  const rr = easeOut(seg(p, 0.42, 0.52)); // read receipt
  const mythIn = easeOut(seg(p, 0.1, 0.2));
  const st = seg(p, 0.5, 0.58); // DEBUNKED stamp
  const fall = easeOut(seg(p, 0.64, 0.8));
  const meter = easeOut(seg(p, 0.55, 0.68)); // 90/100 read meter
  const tileIn = easeOut(seg(p, 0.68, 0.78));
  const sp = seg(p, 0.78, 0.9); // sparkline draw
  return (
    <Frame back={BACK_INDIGO}>
      {/* the recruiter's inbox */}
      <g opacity={panel}>
        <Panel x={32} y={44} w={176} h={174} r={10} />
        <Mono x={44} y={60} size={5.8} fill={ink(0.55)} anchor="start" ls={1.4}>
          RECRUITER INBOX
        </Mono>
        <DemoCorner x={162} y={50} />
      </g>
      {[106, 142, 178].map((y, k) => {
        const t = easeOut(seg(p, 0.06 + k * 0.04, 0.14 + k * 0.04));
        if (t === 0) return null;
        return (
          <g key={y} opacity={0.5 * t}>
            <rect x={40} y={y} width={160} height={30} rx={6} fill={ink(0.025)} stroke={ink(0.09)} strokeWidth={1} />
            <circle cx={54} cy={y + 15} r={8} fill={ink(0.06)} stroke={ink(0.12)} strokeWidth={1} />
            <Skel x={68} y={y + 9} w={56} />
            <Skel x={68} y={y + 18} w={84} h={3} o={0.1} />
          </g>
        );
      })}
      {/* the strong application arrives and gets READ */}
      <g opacity={cardIn} transform={`translate(0 ${(1 - cardIn) * -18})`}>
        <rect x={40} y={70} width={160} height={30} rx={6} fill={STAGE_CARD} stroke={il(0.4)} strokeWidth={1} />
        <rect x={40} y={70} width={160} height={30} rx={6} fill={em(0.06)} opacity={pulse(rr)} />
        <Monogram x={46} y={75} letter="J" size={20} />
        <text x={72} y={82.5} fontSize={6.5} className="font-semibold" fill={ink(0.92)}>
          Jordan Rivera
        </text>
        <text x={72} y={93} fontSize={5.4} fill={ink(0.5)}>
          Data Engineer · tailored
        </text>
        <circle cx={188} cy={79} r={2.2} fill={EMERALD} opacity={rr} />
        <Mono x={194} y={95.5} size={4.9} fill={EMERALD} anchor="end" ls={0.4} opacity={rr}>
          READ 9:12 AM
        </Mono>
      </g>
      {/* 90 of 100 read - shown as a meter, not a sentence */}
      <g opacity={meter}>
        <rect x={44} y={228} width={120} height={5} rx={2.5} fill={ink(0.08)} />
        <rect x={44} y={228} width={120 * 0.9 * meter} height={5} rx={2.5} fill={em(0.7)} />
        <Mono x={196} y={233.5} size={5.5} fill={em(0.9)} anchor="end" ls={0.8}>
          90/100 READ
        </Mono>
      </g>

      {/* the myth card: stamped DEBUNKED, then it falls away */}
      {fall < 1 && (
        <g opacity={mythIn * (1 - fall)} transform={`translate(0 ${70 * fall}) rotate(${8 * fall} 298 82)`}>
          <rect x={228} y={48} width={140} height={68} rx={8} fill={rd(0.04)} stroke={rd(0.3)} strokeWidth={1} />
          <Mono x={298} y={62} size={5.5} fill={rd(0.85)} ls={2.4}>
            MYTH
          </Mono>
          <text x={298} y={88} textAnchor="middle" className="font-display font-extrabold" fontSize={19} fill={RED}>
            75%
          </text>
          <Mono x={298} y={104} size={5.5} fill={rd(0.7)} ls={1}>
            ATS AUTO-REJECT
          </Mono>
          <Stamp x={298} y={84} w={78} rgb={EMERALD_RGB} t={st} rot={-10}>
            DEBUNKED
          </Stamp>
        </g>
      )}

      {/* the analytics tile: measurement begins */}
      <g opacity={tileIn} transform={`translate(0 ${(1 - tileIn) * 12})`}>
        <Panel x={228} y={138} w={140} h={76} r={8} />
        <Mono x={298} y={152} size={5.2} fill={ink(0.5)} ls={1}>
          RESPONSE RATE
        </Mono>
        <polyline
          points="240,196 258,192 276,194 294,188 312,190 330,184 348,186"
          fill="none"
          stroke={il(0.8)}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - easeOut(sp)}
        />
        <circle cx={348} cy={186} r={2.4} fill={AMBER} opacity={seg(p, 0.88, 0.94)} />
        <circle cx={348} cy={186} r={2.4 + 5 * pulse(seg(p, 0.9, 1))} fill="none" stroke={am(0.5)} strokeWidth={1} opacity={1 - seg(p, 0.9, 1)} />
        <rect x={264} y={200} width={68} height={11} rx={5.5} fill={am(0.08)} stroke={am(0.4)} strokeWidth={1} />
        <Mono x={298} y={207.6} size={4.9} fill={AMBER} ls={1}>
          INSTRUMENTING
        </Mono>
      </g>
    </Frame>
  );
}

// -- 6 . Free wedge, campus business (t = 41-52) -----------------------------
// Two pricing cards (students free / per-campus license), a career-center
// notice stamping copilots BANNED beside the Aspirely checklist, and the
// expanding market rings.
function SceneWedge({ p }: ScProps) {
  const a = easeOut(seg(p, 0.04, 0.14));
  const b = easeOut(seg(p, 0.1, 0.2));
  const nIn = easeOut(seg(p, 0.28, 0.4));
  const ban = seg(p, 0.42, 0.5);
  const cks = [seg(p, 0.52, 0.58), seg(p, 0.58, 0.64), seg(p, 0.64, 0.7)];
  const rings = [seg(p, 0.72, 0.8), seg(p, 0.76, 0.84), seg(p, 0.8, 0.88)];
  const lab = easeOut(seg(p, 0.84, 0.94));
  return (
    <Frame back={BACK_INDIGO}>
      {/* the pricing split */}
      <g opacity={a} transform={`translate(0 ${(1 - a) * 10})`}>
        <Panel x={48} y={38} w={146} h={80} r={10} />
        <rect x={54} y={46} width={2.5} height={64} rx={1.25} fill={em(0.8)} />
        <Mono x={65} y={58} size={5.5} fill={ink(0.5)} anchor="start" ls={2}>
          STUDENTS
        </Mono>
        <text x={65} y={87} className="font-display font-extrabold" fontSize={21} fill={EMERALD}>
          Free
        </text>
        <Mono x={65} y={105} size={5.2} fill={ink(0.5)} anchor="start" ls={1}>
          NO CARD
        </Mono>
      </g>
      <g opacity={b} transform={`translate(0 ${(1 - b) * 10})`}>
        <Panel x={206} y={38} w={146} h={80} r={10} />
        <rect x={212} y={46} width={2.5} height={64} rx={1.25} fill={il(0.8)} />
        <Mono x={223} y={58} size={5.5} fill={ink(0.5)} anchor="start" ls={2}>
          UNIVERSITIES
        </Mono>
        <text x={223} y={85} className="font-display font-bold" fontSize={11.5} fill={INDIGO_LIGHT}>
          Campus license
        </text>
        <Mono x={223} y={105} size={5.2} fill={il(0.75)} anchor="start" ls={1}>
          PER CAMPUS
        </Mono>
      </g>

      {/* the career center's desk: copilots BANNED, Aspirely's checklist holds */}
      <g opacity={nIn} transform={`translate(0 ${(1 - nIn) * 10})`}>
        <Panel x={76} y={132} w={248} h={64} r={9} />
        <line x1={200} y1={140} x2={200} y2={188} stroke={ink(0.1)} strokeWidth={1} />
        <Mono x={88} y={148} size={5} fill={ink(0.5)} anchor="start" ls={1.1}>
          CAREER CENTER
        </Mono>
        <text x={88} y={166} fontSize={6.8} className="font-semibold" fill={ink(0.85)}>
          AI cheating copilots
        </text>
        <Stamp x={134} y={177} w={52} rgb={RED_RGB} t={ban} rot={-6}>
          BANNED
        </Stamp>
        <Mono x={212} y={148} size={5} fill={em(0.9)} anchor="start" ls={1.1}>
          ASPIRELY
        </Mono>
        {['HUMAN APPROVAL', 'OWN BROWSER', 'AUDIT TRAIL'].map((txt, k) => (
          <g key={txt} opacity={easeOut(cks[k])}>
            <Check x={216} y={159 + k * 11} s={0.8} />
            <Mono x={225} y={161.5 + k * 11} size={5.2} fill={ink(0.7)} anchor="start" ls={0.8}>
              {txt}
            </Mono>
          </g>
        ))}
      </g>

      {/* the market, expanding ring by ring */}
      {[8, 15, 22].map((r, k) => {
        const C = 2 * Math.PI * r;
        return (
          <circle
            key={r}
            cx={104}
            cy={240}
            r={r}
            fill="none"
            stroke={il(0.55 - k * 0.15)}
            strokeWidth={1}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - easeOut(rings[k]))}
            transform="rotate(-90 104 240)"
          />
        );
      })}
      <circle cx={104} cy={240} r={2.2} fill={INDIGO_LIGHT} opacity={easeOut(rings[0])} />
      <Mono x={136} y={243} size={5.8} fill={ink(0.6)} anchor="start" ls={0.8} opacity={lab}>
        250K OPT/YR -&gt; 1M+ INTL -&gt; 4M+ US
      </Mono>
    </Frame>
  );
}

// -- 7 . Live, and the exhale (t = 52-60) ------------------------------------
// The status strip goes all green; a DEMO-tagged interview request slides in
// with days still on the clock; the wordmark and the integrity chip settle.
function SceneLive({ p }: ScProps) {
  const panel = easeOut(seg(p, 0.02, 0.1));
  const dots = [seg(p, 0.1, 0.16), seg(p, 0.18, 0.24), seg(p, 0.26, 0.32)];
  const all = easeOut(seg(p, 0.34, 0.42));
  const note = easeOut(seg(p, 0.44, 0.56));
  const chipOn = easeOut(seg(p, 0.58, 0.66));
  const wm = easeOut(seg(p, 0.7, 0.86));
  const rows = [
    { label: 'API', y: 66 },
    { label: 'APPLY LOOP', y: 82 },
    { label: 'LEDGER', y: 98 },
  ];
  return (
    <Frame back={BACK_EXHALE}>
      {/* the status strip */}
      <g opacity={panel}>
        <Panel x={100} y={34} w={200} h={78} r={10} />
        <Mono x={112} y={50} size={5.5} fill={ink(0.5)} anchor="start" ls={1.6}>
          STATUS
        </Mono>
        <g opacity={all}>
          <rect x={252} y={41} width={36} height={11} rx={5.5} fill={em(0.1)} stroke={em(0.45)} strokeWidth={1} />
          <Mono x={270} y={48.6} size={4.9} fill={EMERALD} ls={1.4}>
            LIVE
          </Mono>
        </g>
        {rows.map((rw, k) => {
          const on = easeOut(dots[k]);
          return (
            <g key={rw.label}>
              <circle cx={116} cy={rw.y} r={2.6} fill={ink(0.2)} opacity={1 - on} />
              <circle cx={116} cy={rw.y} r={2.6} fill={EMERALD} opacity={on} />
              <circle
                cx={116}
                cy={rw.y}
                r={2.6 + 6 * pulse(dots[k])}
                fill="none"
                stroke={em(0.5)}
                strokeWidth={1}
                opacity={1 - dots[k]}
              />
              <Mono x={126} y={rw.y + 2.4} size={5.5} fill={ink(0.75)} anchor="start" ls={1}>
                {rw.label}
              </Mono>
              <Mono x={288} y={rw.y + 2.4} size={5} fill={em(0.9)} anchor="end" ls={1} opacity={on}>
                OPERATIONAL
              </Mono>
            </g>
          );
        })}
      </g>

      {/* the reply arrives - clearly a DEMO artifact */}
      <g opacity={note} transform={`translate(${(1 - note) * 40} 0)`}>
        <rect x={84} y={126} width={232} height={48} rx={10} fill={STAGE_CARD} stroke={ink(0.16)} strokeWidth={1} />
        <Monogram x={94} y={137} letter="N" size={26} />
        <text x={128} y={145} fontSize={6.8} className="font-semibold" fill={ink(0.92)}>
          Nortavia Recruiting
        </text>
        <text x={128} y={158} fontSize={6.5} fill={ink(0.7)}>
          Can you interview Thursday?
        </text>
        <Mono x={268} y={140.5} size={4.9} fill={ink(0.4)} anchor="end" ls={0.6}>
          9:12 AM
        </Mono>
        <DemoCorner x={274} y={132} />
      </g>

      {/* still time on the clock */}
      <OptChip x={84} y={182} w={110} days={61} opacity={chipOn} />

      {/* the exhale */}
      <g opacity={wm} transform={`translate(0 ${(1 - wm) * 10})`}>
        <text
          x={200}
          y={238}
          textAnchor="middle"
          className="font-display font-extrabold"
          fontSize={24}
          fill={INK}
          letterSpacing={-0.5}
        >
          Aspirely
        </text>
        <rect x={112} y={248} width={176} height={16} rx={8} fill={ink(0.04)} stroke={ink(0.15)} strokeWidth={1} />
        <Mono x={200} y={258.5} size={5.5} fill={ink(0.65)} ls={0.9}>
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
