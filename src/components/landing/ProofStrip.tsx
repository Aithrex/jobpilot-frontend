import { Link } from 'react-router-dom';
import { CalendarClock, Building2, ShieldCheck } from 'lucide-react';
import { Container, Reveal } from './_shared';

/**
 * ProofStrip - three claims that are true, and nothing else.
 *
 * Every line here was checked against the backend before it was written. This
 * section carries no testimonial, no customer count, no employer logo, no
 * "trusted by" row and no metric, because none of those exist to cite. What it
 * has instead is three specific, falsifiable statements about how the product
 * behaves - which is the only kind of proof an honest pre-launch page owns.
 *
 *  - Freshness: the guest search enforces a hard 7-day posting window.
 *  - Sources: paid aggregator listings are excluded from that search.
 *  - Integrity: tailoring rewrites emphasis, never facts (IntegrityGuard).
 *
 * If any of those three stops being enforced server-side, the corresponding
 * line must come out of this file the same day.
 */

const PROOF = [
  {
    Icon: CalendarClock,
    label: 'Posted within 7 days',
    body: 'Guest matching only considers openings posted in the last week. A stale listing is a wasted application, so it never reaches you.',
  },
  {
    Icon: Building2,
    label: 'Direct sources',
    body: 'Matches come from real job sources. Paid aggregator reposts, which duplicate and mislead, are excluded.',
  },
  {
    Icon: ShieldCheck,
    label: 'No invented experience',
    body: 'Tailoring moves the emphasis in your resume. IntegrityGuard holds dates, employers, titles and claims exactly as you wrote them.',
  },
] as const;

export function ProofStrip() {
  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      className="relative scroll-mt-24 pb-16 sm:pb-20 lg:pb-24"
    >
      <Container>
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
            <h2
              id="proof-heading"
              className="max-w-xl text-balance font-display text-2xl font-extrabold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.75rem]"
            >
              Real openings. Posted within 7 days. No invented experience.
            </h2>

            <dl className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-3">
              {PROOF.map(({ Icon, label, body }) => (
                <div key={label} className="min-w-0">
                  <dt className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-[15px] font-bold text-foreground">{label}</span>
                  </dt>
                  <dd className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 border-t border-border pt-5 text-[13px] text-muted-foreground">
              Guest uploads are private and time-limited.{' '}
              <Link
                to="/privacy"
                className="focus-ring-visible rounded font-semibold text-primary underline-offset-2 hover:underline"
              >
                Read the full Privacy Policy
              </Link>
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default ProofStrip;
