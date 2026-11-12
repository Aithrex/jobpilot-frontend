import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Building2, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE, Reveal, SECTION_Y } from './_shared';

/**
 * ProofStrip - three claims that are true, side by side.
 *
 * Every line here was checked against the backend before it was written. This
 * section carries no testimonial, no customer count, no employer logo and no
 * metric, because none of those exist to cite. What it has instead is three
 * specific, falsifiable statements about how the product behaves - the only
 * kind of proof an honest pre-launch page owns. If any of the three stops being
 * enforced server-side, its card must come out of this file the same day.
 *
 * WHY A GRID AND NOT A CAROUSEL (2026-11-12). This used to be an auto-rotating
 * coverflow: one claim in front, two turned away behind it, advancing every
 * 3.1s. Three equal claims do not need a sequence. The rotation made a visitor
 * wait for content that could simply be shown, the two rear cards were dimmed
 * below comfortable reading contrast, and motion that the reader did not ask
 * for is exactly what a trust section should not spend. All three are now on
 * screen at once, equal weight, read in one glance; they arrive with one short
 * staggered rise (follow-through, 280ms, once) and never move again.
 */

interface Proof {
  Icon: LucideIcon;
  label: string;
  body: string;
}

const PROOF: readonly Proof[] = [
  {
    Icon: CalendarClock,
    label: 'Posted within 7 days',
    body: 'Guest matches only include roles posted in the last week. A stale listing never reaches you.',
  },
  {
    Icon: Building2,
    label: 'Direct sources',
    body: 'Roles come from real job sources. Paid aggregator reposts, which duplicate and mislead, are excluded.',
  },
  {
    Icon: ShieldCheck,
    label: 'No invented experience',
    body: 'Tailoring moves emphasis, never facts. Your dates, employers, titles and claims stay exactly as written.',
  },
] as const;

function ProofCard({ Icon, label, body }: Proof) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-[border-color,box-shadow,translate] duration-200 ease-standard hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop sm:p-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal-tint text-signal">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-balance font-display text-lg font-bold tracking-[-0.01em] text-foreground sm:text-xl">
        {label}
      </h3>
      <p className="mt-2 text-pretty text-body-md leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

export function ProofStrip() {
  const reduce = !!useReducedMotion();

  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      className={cn('relative scroll-mt-4', SECTION_Y)}
    >
      <Container>
        <Reveal>
          <p className="text-caption-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Why trust it
          </p>
          <h2
            id="proof-heading"
            className="mt-3 max-w-xl text-balance font-display text-display-sm text-foreground"
          >
            Real openings. No invented experience.
          </h2>
        </Reveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3 lg:gap-6">
          {PROOF.map((p, i) => (
            <motion.li
              key={p.label}
              initial={reduce ? false : { y: 16 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : i * 0.06 }}
            >
              <ProofCard {...p} />
            </motion.li>
          ))}
        </ul>

        <p className="mt-8 text-label-md text-muted-foreground">
          Guest uploads are private and time-limited.{' '}
          <Link
            to="/privacy"
            className="focus-ring-visible rounded font-semibold text-primary underline underline-offset-4 hover:decoration-2"
          >
            Read the full Privacy Policy
          </Link>
        </p>
      </Container>
    </section>
  );
}

export default ProofStrip;
