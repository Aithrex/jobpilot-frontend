import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, CheckCircle2, Compass, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * Shared two-pane auth layout for /login, /register, /reset-password and the
 * AuthGate wall. Left: a calm Aspirely brand panel — one headline, three quiet
 * proof cards, the integrity promise. Right: the form, one focal point.
 * Fully token-driven so both themes stay coherent; all motion respects
 * prefers-reduced-motion (framer via useReducedMotion, CSS via the global net).
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* OPT-clock proof ring geometry (decorative, values are illustrative). */
const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;
const OPT_LEFT = 78;
const OPT_TOTAL = 90;
const RING_OFFSET = RING_C * (1 - OPT_LEFT / OPT_TOTAL);

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

          <div className="mt-8 space-y-3">
            {/* Proof 1 — sponsorship-honest matching */}
            <motion.div variants={fadeUp} className="surface p-4 shadow-soft">
              <p className="overline">Sponsorship-honest matching</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Software Engineer II</p>
                  <p className="truncate text-xs text-muted-foreground">Vantage Cloud · Austin, TX</p>
                </div>
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sponsors H-1B · public filings
              </p>
            </motion.div>

            {/* Proof 2 — OPT clock */}
            <motion.div variants={fadeUp} className="surface flex items-center gap-4 p-4 shadow-soft">
              <div
                className="relative h-14 w-14 shrink-0"
                role="img"
                aria-label={`OPT clock: ${OPT_LEFT} of ${OPT_TOTAL} days remaining`}
              >
                <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                  <circle
                    cx="20" cy="20" r={RING_R} fill="none" strokeWidth="3.5"
                    className="stroke-warning/20"
                  />
                  <motion.circle
                    cx="20" cy="20" r={RING_R} fill="none" strokeWidth="3.5"
                    strokeLinecap="round"
                    className="stroke-warning"
                    strokeDasharray={RING_C}
                    initial={{ strokeDashoffset: reduce ? RING_OFFSET : RING_C }}
                    animate={{ strokeDashoffset: RING_OFFSET }}
                    transition={{ duration: 1.1, ease: EASE, delay: reduce ? 0 : 0.55 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {OPT_LEFT}
                </span>
              </div>
              <div className="min-w-0">
                <p className="overline">OPT clock</p>
                <p className="mt-1 text-sm font-medium">{OPT_LEFT} days left of {OPT_TOTAL}</p>
                <p className="text-xs text-muted-foreground">
                  Counted for you, turned into this week&rsquo;s plan.
                </p>
              </div>
            </motion.div>

            {/* Proof 3 — authored, never fabricated */}
            <motion.div variants={fadeUp} className="surface p-4 shadow-soft">
              <p className="overline">Authored, never fabricated</p>
              <p className="mt-2 text-sm font-medium">
                &ldquo;Cut pipeline build times 38% at my internship.&rdquo;
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                  your work
                </span>
                <span aria-hidden>→</span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                  your résumé
                </span>
                <span aria-hidden>→</span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                  this claim
                </span>
              </p>
            </motion.div>
          </div>
        </motion.div>

        <div className="relative flex items-start gap-2.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p>We never invent experience. Every claim traces to your real work.</p>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:min-h-0">
        <div className="flex items-center justify-between lg:hidden">
          <Wordmark />
          <ThemeToggle />
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
