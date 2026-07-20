import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * The auth stage's Signal Atlas: the same night-sky visual world as the
 * landing, reduced to one story — a signal travelling from the person's
 * document (origin) into their secured workspace (destination ring). It
 * REACTS to the real form:
 *
 *   zone 'origin'  (email focus)     → the origin node illuminates
 *   zone 'secure'  (password focus)  → the destination shield ring activates
 *   zone 'social'  (Google hover)    → the secondary provider path lights
 *   zone 'submit'  (submit hover)    → nodes lean toward the destination
 *   phase 'pending'                  → a signal pulse travels the path
 *   phase 'success'                  → the path completes, the ring flashes
 *   phase 'error'                    → the path dims; a marker blinks once
 *
 * Decorative by contract (`aria-hidden` on the svg; hosts also hide the
 * containers) — every state is equally conveyed by the form's own text.
 * Static resolved compositions under reduced motion. Pure SVG — no WebGL.
 */

export type AuthZone = 'idle' | 'origin' | 'secure' | 'social' | 'submit';
export type AuthPhase = 'idle' | 'pending' | 'error' | 'success';

export interface AuthAtlasProps {
  zone: AuthZone;
  phase: AuthPhase;
  reduce: boolean;
  /** 'panel' = the tall desktop pane; 'horizon' = the shallow mobile band. */
  variant?: 'panel' | 'horizon';
  className?: string;
}

// ── Panel geometry (viewBox 700 × 900) ─────────────────────────────
const ORIGIN = { x: 150, y: 700 };
const DEST = { x: 520, y: 190 };
const SOCIAL = { x: 210, y: 400 };
const MID = { x: 380, y: 470 };

const MAIN_PATH = `M ${ORIGIN.x} ${ORIGIN.y} C 300 640, 300 560, ${MID.x} ${MID.y} S 470 300, ${DEST.x} ${DEST.y}`;
const SOCIAL_PATH = `M ${SOCIAL.x} ${SOCIAL.y} C 280 420, 320 440, ${MID.x} ${MID.y}`;

/** Sampled points along MAIN_PATH for the travelling pending pulse. */
const PULSE_X = [ORIGIN.x, 290, MID.x, 460, DEST.x];
const PULSE_Y = [ORIGIN.y, 610, MID.y, 330, DEST.y];

const STARS: Array<[number, number]> = [
  [80, 120], [240, 80], [520, 60], [640, 150], [620, 420], [660, 700],
  [420, 820], [120, 860], [60, 480], [320, 200], [580, 560], [200, 560],
];

export function AuthAtlas({ zone, phase, reduce, variant = 'panel', className }: AuthAtlasProps) {
  const busy = phase === 'pending';
  const failed = phase === 'error';
  const won = phase === 'success';

  // How much of the main path is "lit": resting glow, more when the user is
  // working the form, full on success.
  const litLength = won ? 1 : busy ? 1 : zone === 'origin' ? 0.4 : zone === 'submit' ? 0.85 : 0.6;
  const litOpacity = failed ? 0.15 : won ? 1 : busy ? 0.9 : zone === 'idle' ? 0.45 : 0.75;

  const t = (duration: number, delay = 0) => (reduce ? { duration: 0 } : { duration, delay });

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none relative h-full w-full overflow-hidden',
        variant === 'horizon' && 'max-h-40',
        className,
      )}
    >
      {/* Deep-field luminance behind the constellation. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(45% 40% at 72% 24%, hsl(var(--primary) / 0.16), transparent 70%), radial-gradient(50% 45% at 20% 80%, hsl(var(--brand-to) / 0.10), transparent 70%)',
        }}
      />
      <svg
        viewBox={variant === 'horizon' ? '0 260 700 380' : '0 0 700 900'}
        preserveAspectRatio={variant === 'horizon' ? 'xMidYMid slice' : 'xMidYMid meet'}
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        <defs>
          <linearGradient id="auth-signal" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--brand-to))" />
          </linearGradient>
        </defs>

        {STARS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} fill="hsl(var(--muted-foreground))" opacity={0.3} />
        ))}

        {/* Base track (always faintly present). */}
        <path d={MAIN_PATH} fill="none" stroke="hsl(var(--primary))" strokeOpacity={0.28} strokeWidth={1.2} />

        {/* Lit portion of the journey. */}
        <motion.path
          d={MAIN_PATH}
          fill="none"
          stroke="url(#auth-signal)"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: litLength, opacity: litOpacity }}
          transition={t(0.6)}
        />

        {/* Secondary provider branch. */}
        <motion.path
          d={SOCIAL_PATH}
          fill="none"
          stroke="hsl(var(--brand-to))"
          strokeWidth={1.4}
          strokeDasharray="5 6"
          initial={false}
          animate={{ opacity: zone === 'social' ? 0.9 : 0.2, pathLength: 1 }}
          transition={t(0.4)}
        />
        <motion.circle
          cx={SOCIAL.x}
          cy={SOCIAL.y}
          r={6}
          fill="hsl(var(--card))"
          stroke="hsl(var(--brand-to))"
          strokeWidth={1.5}
          initial={false}
          animate={{ scale: zone === 'social' ? 1.4 : 1, opacity: zone === 'social' ? 1 : 0.5 }}
          transition={t(0.3)}
          style={{ transformOrigin: `${SOCIAL.x}px ${SOCIAL.y}px` }}
        />

        {/* Origin: the person's document. */}
        <motion.g
          initial={false}
          animate={{
            scale: zone === 'origin' ? 1.18 : 1,
            x: zone === 'submit' && !reduce ? 10 : 0,
            y: zone === 'submit' && !reduce ? -12 : 0,
          }}
          transition={t(0.35)}
          style={{ transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}
        >
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={26} fill="hsl(var(--primary))" opacity={zone === 'origin' ? 0.22 : 0.1} />
          <rect
            x={ORIGIN.x - 13}
            y={ORIGIN.y - 17}
            width={26}
            height={34}
            rx={4}
            fill="hsl(var(--card))"
            stroke="url(#auth-signal)"
            strokeWidth={1.5}
          />
          {[0, 1, 2].map((row) => (
            <rect
              key={row}
              x={ORIGIN.x - 7}
              y={ORIGIN.y - 9 + row * 8}
              width={row === 0 ? 10 : 14}
              height={2.5}
              rx={1.25}
              fill="hsl(var(--primary) / 0.6)"
            />
          ))}
        </motion.g>

        {/* Destination: the secured workspace ring. */}
        <motion.g
          initial={false}
          animate={{ scale: won ? 1.15 : zone === 'secure' ? 1.18 : 1 }}
          transition={t(0.35)}
          style={{ transformOrigin: `${DEST.x}px ${DEST.y}px` }}
        >
          <circle cx={DEST.x} cy={DEST.y} r={42} fill="hsl(var(--primary))" opacity={won ? 0.25 : 0.09} />
          <motion.circle
            cx={DEST.x}
            cy={DEST.y}
            r={30}
            fill="none"
            stroke="url(#auth-signal)"
            strokeWidth={1.6}
            strokeDasharray={zone === 'secure' && !won ? '6 8' : undefined}
            initial={false}
            animate={
              zone === 'secure' && !reduce && !won
                ? { rotate: 360, opacity: 0.95 }
                : { rotate: 0, opacity: won ? 1 : 0.55 }
            }
            transition={
              zone === 'secure' && !reduce && !won
                ? { rotate: { duration: 8, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.3 } }
                : t(0.4)
            }
            style={{ transformOrigin: `${DEST.x}px ${DEST.y}px` }}
          />
          {/* Shield mark. */}
          <path
            d={`M ${DEST.x} ${DEST.y - 12} l 10 4.5 v 7.5 c 0 6.5 -4.5 10.5 -10 13 c -5.5 -2.5 -10 -6.5 -10 -13 v -7.5 z`}
            fill={won ? 'hsl(var(--brand-to))' : 'hsl(var(--card))'}
            stroke="url(#auth-signal)"
            strokeWidth={1.5}
          />
          <path
            d={`M ${DEST.x - 4.5} ${DEST.y + 1} l 3.5 3.5 l 6.5 -7`}
            stroke={won ? 'hsl(var(--background))' : 'hsl(var(--brand-to))'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>

        {/* Travelling pulse while the real submission is pending. */}
        {busy && !reduce && (
          <motion.circle
            r={5}
            fill="hsl(var(--brand-to))"
            initial={{ cx: PULSE_X[0], cy: PULSE_Y[0], opacity: 0 }}
            animate={{ cx: PULSE_X, cy: PULSE_Y, opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Error marker: the signal stops mid-path — no shaking anywhere. */}
        {failed && (
          <motion.g initial={false} animate={{ opacity: 1 }}>
            <circle cx={MID.x} cy={MID.y} r={12} fill="hsl(var(--destructive) / 0.18)" />
            <circle cx={MID.x} cy={MID.y} r={5} fill="hsl(var(--destructive))" />
          </motion.g>
        )}
      </svg>
    </div>
  );
}
