import { motion } from 'framer-motion';
import {
  BadgeCheck,
  FileText,
  Globe,
  GraduationCap,
  ListFilter,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IllustrativeTag, MOTION, useDemoInView, useDemoLoop } from './demos/_kit';

/**
 * HeroShortlist — the hero's signature: Aspirely's own feed, drawn as proof of
 * product (not a generic job board). Four stacked truths in one panel:
 *
 *   · the funnel      — "1,248 checked · 5 fit you" (thousands → the few)
 *   · YOUR filters    — résumé, sponsors H-1B, new-grad, remote-ok
 *   · honest matches  — believable sponsor companies, match ring, green
 *                       "H-1B sponsor" badge, location + salary band
 *   · the pipeline    — footer: approve on WhatsApp, Aspirely applies for you
 *
 * Motion: rows stagger in once on view; then a quiet ambient "re-verify" pass
 * washes one row at a time while the header refresh icon turns one rotation —
 * the visual for "sponsorship signals, re-checked daily". Static (fully
 * resolved) under prefers-reduced-motion; the loop pauses off-screen.
 *
 * Honest: companies are real, well-known H-1B sponsors, but counts, match
 * percentages and salary bands are examples — the panel carries the
 * "Illustrative" tag (integrity is the product). Logomarks are inline
 * monogram tiles tinted from the categorical chart tokens — no trademarked
 * logo assets. The scene is one role="img" element; rows are decorative.
 */

// ── Illustrative data (labelled as such) ─────────────────────────────────────
type Job = {
  company: string;
  role: string;
  location: string;
  salary: string;
  match: number;
  /** chart-token text class for the monogram tile */
  markClass: string;
};

const JOBS: Job[] = [
  { company: 'Stripe', role: 'Backend Engineer', location: 'San Francisco, CA', salary: '$130K–$170K', match: 94, markClass: 'text-chart-4' },
  { company: 'Nvidia', role: 'ML Engineer', location: 'Santa Clara, CA', salary: '$140K–$185K', match: 91, markClass: 'text-chart-2' },
  { company: 'Databricks', role: 'Data Engineer', location: 'Seattle, WA', salary: '$125K–$165K', match: 89, markClass: 'text-chart-6' },
  { company: 'Ramp', role: 'Platform Engineer', location: 'New York, NY', salary: '$120K–$160K', match: 87, markClass: 'text-chart-3' },
  { company: 'Atlassian', role: 'Software Engineer', location: 'Remote (US)', salary: '$115K–$150K', match: 85, markClass: 'text-chart-1' },
];

const CHIPS: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Your résumé', icon: FileText },
  { label: 'Sponsors H-1B', icon: ShieldCheck },
  { label: 'New-grad', icon: GraduationCap },
  { label: 'Remote-ok', icon: Globe },
];

// ── Inline brand logomark (monogram tile, token colours — no logo assets) ────
function BrandMark({ job }: { job: Job }) {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-border bg-background"
    >
      <span className={cn('font-display text-base font-bold leading-none', job.markClass)}>
        {job.company.slice(0, 1)}
      </span>
    </span>
  );
}

// ── Compact match ring — Aspirely's "why this row exists" ────────────────────
function MatchRing({ value, reduce }: { value: number; reduce: boolean }) {
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
          whileInView={{ strokeDashoffset: c - (value / 100) * c }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reduce ? 0 : 0.9, ease: MOTION.ease, delay: reduce ? 0 : 0.4 }}
        />
      </svg>
      <span className="absolute font-display text-[11px] font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

// ── One job row ──────────────────────────────────────────────────────────────
function JobRow({ job, verifying, reduce }: { job: Job; verifying: boolean; reduce: boolean }) {
  return (
    <div className="group relative flex items-center gap-3 px-3.5 py-3 transition-colors duration-200 hover:bg-muted/40">
      {/* ambient re-verify wash — opacity only, never layout */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary/[0.05]"
        initial={false}
        animate={{ opacity: verifying ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: MOTION.ease }}
      />
      <BrandMark job={job} />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-display text-sm font-bold text-foreground">{job.role}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success transition-colors duration-300',
              verifying && 'border-success/60',
            )}
          >
            <BadgeCheck className="h-3 w-3" aria-hidden />
            H-1B sponsor
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium">{job.company}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {job.location}
          </span>
          <span className="font-medium tabular-nums text-foreground/80">{job.salary}</span>
        </div>
      </div>
      <MatchRing value={job.match} reduce={reduce} />
    </div>
  );
}

export function HeroShortlist({ className }: { className?: string }) {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  // Ambient loop: one quiet "re-verify" pass per row, then repeat. No wash
  // under reduced motion or off-screen (active=false).
  const { step } = useDemoLoop(JOBS.length, { active, reduce, durations: 3200 });

  const label =
    'Illustration of the Aspirely job feed: 1,248 listings checked, 5 fit you, re-verified this morning, filtered by your résumé, H-1B sponsors, new-grad and remote-friendly roles — ' +
    JOBS.map((j) => `${j.role} at ${j.company}, ${j.match} percent match, verified H-1B sponsor, ${j.location}, ${j.salary}`).join('; ') +
    '. Footer: approve on WhatsApp and Aspirely applies for you. Illustrative example.';

  const row = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-40px' },
          transition: { duration: MOTION.entrance, ease: MOTION.ease, delay: 0.1 + i * 0.07 },
        };

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <div
        role="img"
        aria-label={label}
        className="relative w-full overflow-hidden rounded-container border border-border bg-card shadow-pop"
      >
        {/* Header — the funnel, in one line: thousands checked → the few that fit */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border px-3.5 py-3">
          <span className="inline-flex items-center gap-2">
            <span className="font-display text-sm font-bold tabular-nums text-foreground">
              1,248 <span className="font-medium text-muted-foreground">checked</span>{' '}
              <span aria-hidden className="font-medium text-muted-foreground">·</span>{' '}
              <span className="text-primary">5</span> <span className="font-medium text-muted-foreground">fit you</span>
            </span>
            <IllustrativeTag />
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {/* keyed on step: one clean forward rotation per re-verify pass
                (never unwinds when the loop wraps) */}
            <motion.span
              key={step}
              className="grid place-items-center"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: reduce ? 0 : 0.9, ease: MOTION.ease }}
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
            </motion.span>
            Re-verified this morning
          </span>
        </div>

        {/* Applied-filter bar — YOUR filters, sponsorship always on */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3.5 py-2.5">
          <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {CHIPS.map(({ label: chip, icon: Icon }) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              <Icon className="h-3 w-3 text-primary" aria-hidden />
              {chip}
            </span>
          ))}
        </div>

        {/* The feed — five believable rows, staggered in, re-verified quietly */}
        <div className="divide-y divide-border">
          {JOBS.map((job, i) => (
            <motion.div key={job.company} {...row(i)}>
              <JobRow job={job} verifying={active && step === i} reduce={reduce} />
            </motion.div>
          ))}
        </div>

        {/* Footer — the one-tap pipeline, closing the loop */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border bg-muted/30 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            Approve on WhatsApp — Aspirely applies for you
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            2 submitted today
          </span>
        </div>
      </div>
    </div>
  );
}

export default HeroShortlist;
