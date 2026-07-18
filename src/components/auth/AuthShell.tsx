import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared single-focus auth stage for /login, /register, /reset-password and
 * the AuthGate wall. One full-viewport quiet dark stage (deliberately dark in
 * BOTH themes, matching the landing SignalField band), a CSS/SVG constellation
 * backdrop, and one centered focus pane (max-w-sm) that holds exactly one
 * thing at a time. Fully token-driven; the forced `dark` class re-points the
 * semantic tokens so every child (including AuthGate content) stays coherent.
 * All motion respects prefers-reduced-motion (framer via useReducedMotion,
 * CSS via the global net).
 */

/** House ease for the auth stage; shared with the page-level beat reveals. */
export const AUTH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Deep-link return path, preserved across auth. Router `state.from` covers the
 * in-app password flow; sessionStorage covers the social-OAuth full-page
 * round-trip (the provider redirect drops router state). Same-origin paths
 * only — protocol-relative and absolute URLs are rejected.
 */
export const AUTH_RETURN_TO_KEY = 'auth.return_to';

export function sanitizeReturnTo(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  return path.startsWith('/') && !path.startsWith('//') ? path : null;
}

export function stashAuthReturnTo(path: string | null): void {
  if (typeof window === 'undefined' || !path) return;
  try {
    window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, path);
  } catch {
    /* storage disabled — deep link just won't survive the OAuth round-trip */
  }
}

/** Read + clear the stashed return path (sanitized). */
export function consumeAuthReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY);
    window.sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    return sanitizeReturnTo(raw);
  } catch {
    return null;
  }
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-soft',
        className,
      )}
    >
      <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.2} aria-hidden />
    </span>
  );
}

function Wordmark() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <BrandMark />
      <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
        Aspirely
      </span>
    </Link>
  );
}

/** Nodes of the rising signal path — kept toward the edges so the backdrop
 *  never competes with the focus pane. Coordinates live in a 1440x900 box
 *  sliced to the viewport. */
const SIGNAL_NODES: Array<[number, number]> = [
  [140, 760],
  [340, 660],
  [520, 560],
  [1000, 380],
  [1200, 250],
];

const FAINT_STARS: Array<[number, number]> = [
  [110, 210],
  [300, 120],
  [620, 90],
  [1330, 130],
  [1250, 560],
  [1360, 740],
  [880, 790],
  [420, 830],
];

/**
 * Pure-SVG constellation: a faint rising path with softly glowing nodes and a
 * scatter of dim stars. Static by design (loads instantly, no three.js); one
 * terminal node breathes gently unless reduced motion is on.
 */
function Constellation({ animate }: { animate: boolean }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path
        d="M-60 860 L140 760 L340 660 L520 560 L1000 380 L1200 250 L1440 130"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.16"
        strokeWidth="1"
      />
      {SIGNAL_NODES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={10} fill="hsl(var(--primary))" opacity={0.12} />
          <circle cx={x} cy={y} r={2.5} fill="hsl(var(--primary))" opacity={0.65} />
        </g>
      ))}
      {FAINT_STARS.map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={1.5}
          fill="hsl(var(--muted-foreground))"
          opacity={0.3}
        />
      ))}
      {/* Terminal node — a slow, quiet breath (opacity only, GPU-cheap). */}
      <circle cx={1200} cy={250} r={16} fill="hsl(var(--primary))" opacity={0.1} />
      {animate ? (
        <motion.circle
          cx={1200}
          cy={250}
          r={4.5}
          fill="hsl(var(--primary))"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <circle cx={1200} cy={250} r={4.5} fill="hsl(var(--primary))" opacity={0.6} />
      )}
    </svg>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  banner,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** Optional notice rendered above the form (e.g. session-expired). */
  banner?: ReactNode;
}) {
  const reduce = useReducedMotion();

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.1 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: AUTH_EASE } },
  };

  return (
    // The `dark` class deliberately forces the dark token set in both themes —
    // the auth stage is one consistent night scene, like the landing hero band.
    <div
      className="dark relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground"
      style={{ colorScheme: 'dark' }}
    >
      {/* ── Backdrop: faint grid + constellation + soft glow behind the pane ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-grid-faint" />
        <Constellation animate={!reduce} />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="relative z-10 px-5 py-4 sm:px-8">
        <Wordmark />
      </header>

      {/* Top-anchored (not vertically centered) so beat reveals grow downward
          with zero shift of the title and fields above. */}
      <main className="relative z-10 flex flex-1 justify-center px-5 pb-12 pt-4 sm:pt-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          <motion.div variants={fadeUp} className="flex justify-center">
            <BrandMark className="h-11 w-11 rounded-2xl" />
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="mt-5 text-center font-display text-2xl font-extrabold tracking-tight text-balance"
          >
            {title}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-2 text-center text-sm text-muted-foreground">
            {subtitle}
          </motion.p>
          {banner && <motion.div variants={fadeUp} className="mt-6">{banner}</motion.div>}
          <motion.div variants={fadeUp} className="mt-8">{children}</motion.div>
          <motion.div variants={fadeUp} className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </motion.div>
          {/* House motif — the mono integrity micro-chip. */}
          <motion.p
            variants={fadeUp}
            className="mt-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/90"
          >
            Integrity-first. No fabricated claims.
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
