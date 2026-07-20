import { useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthAtlas, type AuthPhase, type AuthZone } from './AuthAtlas';

/**
 * Shared auth stage for /login, /register, /reset-password and the AuthGate
 * wall — the same deep-ink Signal Atlas world as the landing. Desktop is an
 * asymmetric 5/7 split: the compact form pane on the left, a large reactive
 * atlas on the right. Mobile keeps the form primary with a shallow animated
 * horizon above it (no viewport-height traps, no keyboard obstruction).
 *
 * The visual REACTS to the real form without any per-page wiring: focus and
 * hover are read via event delegation (email → origin node, password →
 * shield ring, provider buttons → social path, submit → convergence).
 * Pages additionally report REAL submission phases through the optional
 * `phase` prop (pending/error/success) — omitted, the scene is purely
 * focus-driven, so every existing consumer keeps working unchanged.
 *
 * Fully token-driven; the forced `dark` class re-points the semantic tokens
 * so every child stays coherent. All motion respects prefers-reduced-motion.
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

// ── Scene wiring ─────────────────────────────────────────────────────

export type { AuthPhase } from './AuthAtlas';

/** Map a focused/hovered element to the scene zone it belongs to. */
function zoneFor(target: EventTarget | null): AuthZone | null {
  if (!(target instanceof Element)) return null;
  const input = target.closest('input');
  if (input instanceof HTMLInputElement) {
    const ac = (input.getAttribute('autocomplete') || '').toLowerCase();
    if (input.type === 'password' || ac.includes('password')) return 'secure';
    if (input.type === 'email' || ac.includes('email') || ac.includes('username')) return 'origin';
    return null;
  }
  const button = target.closest('button, a');
  if (button) {
    const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.toLowerCase();
    if (/google|github|linkedin|microsoft|apple/.test(label)) return 'social';
    if (/password/.test(label)) return 'secure';
    if ((button as HTMLButtonElement).type === 'submit') return 'submit';
  }
  return null;
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

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  banner,
  phase = 'idle',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** Optional notice rendered above the form (e.g. session-expired). */
  banner?: ReactNode;
  /** REAL submission phase from the page (never inferred, never faked). */
  phase?: AuthPhase;
}) {
  const reduce = !!useReducedMotion();

  const [focusZone, setFocusZone] = useState<AuthZone>('idle');
  const [hoverZone, setHoverZone] = useState<AuthZone | null>(null);

  const onFocusCapture = (e: FocusEvent) => {
    const z = zoneFor(e.target);
    if (z) setFocusZone(z);
  };
  const onBlurCapture = (e: FocusEvent) => {
    // Only reset when focus truly left the pane (not moving between fields).
    if (!e.relatedTarget) setFocusZone('idle');
  };
  const onPointerOverCapture = (e: PointerEvent) => {
    setHoverZone(zoneFor(e.target));
  };

  const zone = hoverZone && hoverZone !== 'idle' ? hoverZone : focusZone;

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
    // auth and landing share one deep-ink night world.
    <div
      className="dark relative min-h-screen overflow-hidden bg-background text-foreground"
      style={{ colorScheme: 'dark' }}
      data-auth-scene={phase !== 'idle' ? phase : zone}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-faint" />

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-12">
          {/* ── Form pane (5/12) ── */}
          <div
            className="relative flex min-h-screen flex-col px-5 py-4 sm:px-8 lg:col-span-5"
            onFocusCapture={onFocusCapture}
            onBlurCapture={onBlurCapture}
            onPointerOverCapture={onPointerOverCapture}
            onPointerLeave={() => setHoverZone(null)}
          >
            <header>
              <Wordmark />
            </header>

            {/* Mobile: a shallow animated horizon — never a viewport trap. */}
            <div className="relative -mx-5 mt-2 h-24 sm:-mx-8 lg:hidden" aria-hidden>
              <AuthAtlas variant="horizon" zone={zone} phase={phase} reduce={reduce} />
            </div>

            {/* Top-anchored (not vertically centered) so reveals grow downward
                with zero shift of the title and fields above. */}
            <main className="flex flex-1 justify-center pb-12 pt-4 sm:pt-8">
              <motion.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-sm">
                <motion.h1
                  variants={fadeUp}
                  className="mt-4 font-display text-2xl font-extrabold tracking-tight text-balance"
                >
                  {title}
                </motion.h1>
                <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground">
                  {subtitle}
                </motion.p>
                {banner && (
                  <motion.div variants={fadeUp} className="mt-6">
                    {banner}
                  </motion.div>
                )}
                <motion.div variants={fadeUp} className="mt-8">
                  {children}
                </motion.div>
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

        {/* ── Atlas pane (7/12, desktop only) ── */}
        <div className="relative hidden lg:col-span-7 lg:block" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-px bg-border/60" />
          <AuthAtlas variant="panel" zone={zone} phase={phase} reduce={reduce} />
        </div>
      </div>
    </div>
  );
}
