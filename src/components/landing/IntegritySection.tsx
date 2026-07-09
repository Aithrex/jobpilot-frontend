import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ShieldCheck, FileText, GitPullRequest } from 'lucide-react';
import { Container, EASE, Eyebrow, Parallax, Reveal } from './_shared';

/** The differentiation angle: honesty is a feature, not a disclaimer. */

/* Trace-card choreography (absolute delays from view entry, one-shot):
   frame fades → claim lands → connector draws down → sources slide in,
   staggered → the verified banner lands last with a single soft glow.
   Under prefers-reduced-motion the card renders fully static. */
const frameV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: EASE } },
};
const claimV: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.4, ease: EASE } },
};
const lineV: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { delay: 0.3, duration: 0.45, ease: EASE, opacity: { delay: 0.3, duration: 0.1 } },
  },
};
const arrowheadV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delay: 0.7, duration: 0.2, ease: EASE } },
};
const labelV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delay: 0.45, duration: 0.3, ease: EASE } },
};
const sourceAV: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { delay: 0.75, duration: 0.35, ease: EASE } },
};
const sourceBV: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { delay: 0.87, duration: 0.35, ease: EASE } },
};
const bannerV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { delay: 1.1, duration: 0.35, ease: EASE } },
};
/** One soft, one-time ring pulse as the banner settles — never repeats. */
const glowV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: [0, 1, 0], transition: { delay: 1.5, duration: 0.85, times: [0, 0.4, 1], ease: 'easeOut' } },
};

export function IntegritySection() {
  const reduce = useReducedMotion();
  const animate = !reduce;

  return (
    <section className="border-y border-border bg-muted/30 py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow icon={ShieldCheck}>Integrity by design</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            We never fabricate. Every line traces to your real work.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Other tools invent impressive-sounding experience you can&apos;t defend in an interview. Aspirely only ever
            reshapes what you&apos;ve actually done — so every claim on your résumé links back to a source you can stand
            behind when it counts.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'No invented titles, metrics, or employers',
              'Each bullet is traceable to your input',
              'You approve every change before it ships',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* claim → source trace */}
        <Parallax from={16} to={-16}>
          <motion.div
            initial={animate ? 'hidden' : undefined}
            whileInView={animate ? 'show' : undefined}
            viewport={{ once: true, margin: '-80px' }}
            variants={frameV}
            className="card-hover mesh-accent rounded-2xl border border-border p-5 shadow-lg shadow-primary/5 sm:p-6"
          >
            <motion.div variants={claimV} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">On your résumé</p>
              <p className="mt-2 font-medium leading-snug text-foreground">
                “Cut checkout latency 40% by re-architecting the payments flow.”
              </p>
            </motion.div>

            <div className="my-2 flex items-center gap-2 pl-4 text-xs font-medium text-primary">
              <svg width="16" height="28" viewBox="0 0 16 28" fill="none" aria-hidden className="shrink-0">
                <motion.path
                  d="M8 2v22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  variants={lineV}
                />
                <motion.path
                  d="M3.5 20.5 8 25l4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={arrowheadV}
                />
              </svg>
              <motion.span variants={labelV}>traces to</motion.span>
            </div>

            <div className="space-y-2">
              <motion.div variants={sourceAV}>
                <TraceRow icon={GitPullRequest} title="GitHub · PR #482" sub="Payments latency refactor" />
              </motion.div>
              <motion.div variants={sourceBV}>
                <TraceRow icon={FileText} title="Your intake notes" sub="“led the checkout perf project”" />
              </motion.div>
            </div>

            <motion.p
              variants={bannerV}
              className="relative mt-4 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs font-medium text-foreground"
            >
              {animate && (
                <motion.span
                  aria-hidden
                  variants={glowV}
                  className="pointer-events-none absolute inset-0 rounded-lg ring-4 ring-success/25"
                />
              )}
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
              Verified against your own sources — nothing invented.
            </motion.p>
          </motion.div>
        </Parallax>
      </Container>
    </section>
  );
}

function TraceRow({ icon: Icon, title, sub }: { icon: typeof FileText; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
