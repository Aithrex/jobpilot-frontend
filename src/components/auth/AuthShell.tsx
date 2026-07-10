import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Compass, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthShowcase } from '@/components/auth/AuthShowcase';
import { cn } from '@/lib/utils';

/**
 * Shared two-pane auth layout for /login, /register, /reset-password and the
 * AuthGate wall. Left: a calm Aspirely brand panel — one headline, three quiet
 * proof cards, the integrity promise. Right: the form, one focal point.
 * Fully token-driven so both themes stay coherent; all motion respects
 * prefers-reduced-motion (framer via useReducedMotion, CSS via the global net).
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-soft',
        className,
      )}
    >
      <Compass className="h-[18px] w-[18px] text-white" strokeWidth={2.2} aria-hidden />
    </span>
  );
}

function Wordmark() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* ── Brand panel ──────────────────────────────────────────────────── */}
      <div className="mesh-accent relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 xl:p-14 lg:flex">
        {/* Ambient depth: faint grid + slow aurora drift (frozen when reduced). */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-grid-faint" />
          <div className="aurora-blob aurora-blob-a" />
          <div className="aurora-blob aurora-blob-b" />
          <div className="aurora-blob aurora-blob-c" />
        </div>

        <div className="relative">
          <Wordmark />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative max-w-md"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl font-extrabold leading-tight text-balance"
          >
            Turn the visa clock into a plan.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The honest career workspace for international students — real sponsorship data,
            deadlines handled, claims that stay true.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <AuthShowcase />
          </motion.div>
        </motion.div>

        <div className="relative flex items-start gap-2.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p>We never invent experience. Every claim traces to your real work.</p>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:min-h-0">
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <Wordmark />
            <ThemeToggle />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            The honest career workspace for international students.
          </p>
        </div>

        <div className="absolute right-6 top-6 hidden lg:block">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="w-full max-w-sm py-10"
          >
            <motion.h1
              variants={fadeUp}
              className="font-display text-2xl font-extrabold tracking-tight text-balance"
            >
              {title}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground">
              {subtitle}
            </motion.p>
            {banner && <motion.div variants={fadeUp} className="mt-6">{banner}</motion.div>}
            <motion.div variants={fadeUp} className="mt-8">{children}</motion.div>
            <motion.div variants={fadeUp} className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Private by default — we never invent experience.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
