import { Link } from 'react-router-dom';
import { Building2, Clock, ShieldCheck } from 'lucide-react';
import { Container, Reveal, RevealGroup, RevealItem } from './_shared';

/**
 * Trust band (v8) — exactly three trust points and a link to the full
 * Privacy Policy. Precise language by contract: sponsorship wording is
 * "signals from public filings" elsewhere, never "verified sponsor"; the
 * guest-data retention sentence is the EXACT S3-versioning truth from the
 * v8 brief (30 days + a further 90 days of residual encrypted backups) —
 * never a claim of immediate physical erasure. No fabricated metrics,
 * logos, or testimonials.
 */

const POINTS = [
  {
    Icon: Building2,
    title: 'Real job sources',
    body: 'Openings come straight from company career sites such as Workday, Greenhouse, Lever, and Ashby. Never a resold or recycled feed.',
  },
  {
    Icon: ShieldCheck,
    title: 'Tailoring without invented facts',
    body: 'IntegrityGuard locks your real employers, titles, dates, and skills. Every tailored line is rephrased from your own experience, never fabricated.',
  },
  {
    Icon: Clock,
    title: 'Private, time-limited guest data',
    body: 'Unclaimed guest uploads are deleted from our systems within 30 days; residual encrypted backups expire within a further 90 days. Claim your work with a free account to keep it.',
  },
] as const;

export function TrustBand() {
  return (
    <section id="trust" aria-label="Trust and privacy" className="scroll-mt-24 border-t border-border py-14 sm:py-16">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built to be trusted with your resume
          </h2>
          <Link
            to="/privacy"
            className="focus-ring-visible rounded-control text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Read the full Privacy Policy
          </Link>
        </Reveal>

        <RevealGroup as="ul" className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }) => (
            <RevealItem as="li" key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
