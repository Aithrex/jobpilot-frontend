import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  FileText,
  Globe,
  GraduationCap,
  ListFilter,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IllustrativeTag, MOTION, Monogram, useDemoInView, useDemoLoop } from './demos/_kit';

/**
 * HeroShortlist — the hero's literal, instantly-legible signature.
 *
 * A single framed job-feed panel runs one gentle 3-beat story, on loop:
 *   1. NOISE   — a fast upward stream of faint, generic, greyed job rows
 *                ("Software Engineer · 500+ applicants", "no sponsorship"…) —
 *                overwhelming, for a beat.
 *   2. FILTER  — a crisp indigo scan line sweeps down once; the applied-filter
 *                chips (Your résumé · Sponsors H-1B · New-grad · Remote-ok)
 *                light up indigo as it passes: "Aspirely applies YOUR filters".
 *   3. THE FIT — the noise falls away and 3 clean, real-looking matched cards
 *                rise and settle into a tidy shortlist — company monogram,
 *                role, match ring %, a green "H-1B sponsor ✓" badge and a
 *                one-line "why it fits" reason. The header settles to
 *                "1,240 listings → 3 that fit you".
 *
 * The message projects to the end user with zero reading: thousands of
 * listings, filtered by MY résumé, down to the few that fit — with sponsors.
 *
 * Honest: company names / percentages are illustrative examples and the funnel
 * counter is labelled "Illustrative" — never a fabricated measured stat.
 *
 * Reduced motion: renders the resolved 3-card shortlist + settled counter
 * statically (no stream, no sweep). Zero layout shift — the panel height is
 * reserved up front. The scene is one role="img" element; each result card is
 * a real focusable element that lifts on hover/focus.
 */

// ── Illustrative data (labelled as such) ─────────────────────────────────────
const TOTAL = '1,240';

type Match = { name: string; role: string; match: number; reason: string };
const MATCHES: Match[] = [
  { name: 'Stripe', role: 'Backend Engineer', match: 94, reason: 'your Go + Kafka' },
  { name: 'Ramp', role: 'Platform Engineer', match: 90, reason: 'your AWS + Terraform' },
  { name: 'Plaid', role: 'Infrastructure Engineer', match: 87, reason: 'your Go + Postgres' },
];

type Chip = { label: string; icon: LucideIcon };
const CHIPS: Chip[] = [
  { label: 'Your résumé', icon: FileText },
  { label: 'Sponsors H-1B', icon: ShieldCheck },
  { label: 'New-grad', icon: GraduationCap },
  { label: 'Remote-ok', icon: Globe },
];

const NOISE: Array<[string, string]> = [
  ['Software Engineer', '500+ applicants'],
  ['Backend Developer', 'no sponsorship'],
  ['Frontend Engineer', '800+ applicants'],
  ['Data Analyst', 'no sponsorship'],
  ['Full-Stack Developer', '1,200+ applicants'],
  ['DevOps Engineer', 'relocation only'],
  ['QA Engineer', 'no sponsorship'],
  ['Product Manager', '640+ applicants'],
  ['Java Developer', 'no visa support'],
  ['Site Reliability Eng', '430+ applicants'],
  ['Mobile Developer', 'no sponsorship'],
  ['Systems Engineer', '900+ applicants'],
  ['Cloud Engineer', 'no visa support'],
  ['Security Analyst', '350+ applicants'],
];

const RESERVE = 420;

// ── Compact match ring ───────────────────────────────────────────────────────
function MatchRing({ value, run, reduce }: { value: number; run: boolean; reduce: boolean }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center">
      <svg viewBox="0 0 34 34" className="h-10 w-10 -rotate-90" aria-hidden>
        <circle cx="17" cy="17" r={r} fill="none" strokeWidth={3} className="stroke-muted" />
        <motion.circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: run ? c - (value / 100) * c : c }}
          transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
        />
      </svg>
      <span className="absolute font-display text-[11px] font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

// ── One faint noise row ──────────────────────────────────────────────────────
function NoiseRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="h-6 w-6 shrink-0 rounded-md bg-muted" />
      <span className="truncate text-[12px] text-muted-foreground/70">{title}</span>
      <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/50">{meta}</span>
    </div>
  );
}

export function HeroShortlist({ className }: { className?: string }) {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  // 3 beats: noise → filter sweep → the fit (hold). Rest on the fit (step 2)
  // under reduced motion — the shortlist is the whole point.
  const { step } = useDemoLoop(3, {
    active,
    reduce,
    durations: [2200, 1700, 4400],
    restAt: 2,
  });

  const noiseVisible = !reduce && step < 2;
  const chipsLit = step >= 1; // step 2 keeps them lit; reduce pins step = 2
  const resolved = step === 2;

  const label =
    `Illustration: Aspirely filters ${TOTAL} job listings down to 3 that fit you — ` +
    `${MATCHES.map((m) => `${m.name} ${m.role} ${m.match} percent match`).join(', ')}, ` +
    `all verified H-1B sponsors. Illustrative example.`;

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <div
        role="img"
        aria-label={label}
        style={{ height: RESERVE }}
        className="relative flex w-full flex-col overflow-hidden rounded-container border border-border bg-card shadow-panel"
      >
        {/* Header — the funnel headline. "→ 3 that fit you" stays in the DOM
            (opacity/transform only) so the reveal never shifts layout. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border px-4 py-3">
          <span className="font-display text-sm font-bold tabular-nums text-foreground">
            {TOTAL} <span className="font-medium text-muted-foreground">listings</span>
          </span>
          <motion.span
            className="inline-flex items-center gap-1.5 text-sm"
            initial={false}
            animate={{ opacity: resolved ? 1 : 0, x: resolved ? 0 : reduce ? 0 : -6 }}
            transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="font-display font-bold tabular-nums text-primary">3</span>
            <span className="font-medium text-muted-foreground">that fit you</span>
          </motion.span>
          <IllustrativeTag />
        </div>

        {/* Sweep region — wraps the filter bar + feed so the scan line visibly
            crosses the chips first, then the noise. */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Applied-filter chips — light up indigo as the sweep passes */}
          <div className="relative z-10 flex flex-wrap items-center gap-1.5 border-b border-border bg-card px-3 py-2.5">
            <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {CHIPS.map(({ label: chip, icon: Icon }, i) => (
              <span
                key={chip}
                style={{ transitionDelay: step === 1 ? `${i * 150}ms` : '0ms' }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-300',
                  chipsLit
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-border bg-muted/30 text-muted-foreground',
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {chip}
              </span>
            ))}
          </div>

          {/* Feed area — noise stream behind, the shortlist in front */}
          <div className="relative flex flex-1 items-center overflow-hidden px-3">
            {/* NOISE — faint rows streaming upward, edge-faded, falls away at the fit */}
            <motion.div
              aria-hidden
              className="absolute inset-0 z-0 overflow-hidden px-3"
              initial={false}
              animate={{ opacity: noiseVisible ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.4, ease: MOTION.ease }}
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
              }}
            >
              <motion.div
                className="flex flex-col"
                animate={active && step < 2 ? { y: ['0%', '-50%'] } : { y: '0%' }}
                transition={
                  active && step < 2
                    ? { duration: 9, ease: 'linear', repeat: Infinity }
                    : { duration: 0 }
                }
              >
                {[...NOISE, ...NOISE].map(([title, meta], i) => (
                  <NoiseRow key={i} title={title} meta={meta} />
                ))}
              </motion.div>
            </motion.div>

            {/* THE FIT — 3 real-looking cards rise and settle; each is focusable */}
            <div className="relative z-10 flex w-full flex-col gap-2.5">
              {MATCHES.map((m, i) => (
                <motion.div
                  key={m.name}
                  tabIndex={0}
                  initial={false}
                  animate={{ opacity: resolved ? 1 : 0, y: resolved ? 0 : reduce ? 0 : 18 }}
                  transition={{
                    duration: reduce ? 0 : MOTION.entrance,
                    ease: MOTION.ease,
                    delay: reduce ? 0 : 0.08 + i * 0.1,
                  }}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileFocus={reduce ? undefined : { y: -3 }}
                  className="group flex items-center gap-3 rounded-control border border-border bg-background p-3 shadow-soft outline-none transition-shadow hover:border-primary/40 hover:shadow-panel focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Monogram name={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate font-display text-sm font-bold text-foreground">{m.name}</span>
                      <span className="truncate text-xs text-muted-foreground">· {m.role}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        H-1B sponsor
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        why it fits: <span className="font-medium text-foreground">{m.reason}</span>
                      </span>
                    </div>
                  </div>
                  <MatchRing value={m.match} run={resolved} reduce={reduce} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* FILTER SWEEP — one crisp indigo scan line, top → bottom, each cycle */}
          {step === 1 && !reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-20 h-10"
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-primary/[0.12] via-primary/[0.05] to-transparent" />
              <div
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-primary"
                style={{ boxShadow: '0 0 14px 1px hsl(var(--primary) / 0.6)' }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroShortlist;
