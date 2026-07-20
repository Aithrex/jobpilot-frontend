import { Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  EyeOff,
  FileSearch,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Container, Reveal, RevealGroup, RevealItem } from './_shared';

/**
 * Compact trust band — six short, honest facts and a link to the full
 * Privacy Policy. Precise language by contract: the device token is a
 * pseudonymous first-party signal (never described as anonymous), and
 * sponsorship wording is "signals from public filings", never "verified
 * sponsor".
 */

const FACTS = [
  {
    Icon: Building2,
    title: 'Direct employer sources',
    body: 'Straight from company career sites, never a resold feed.',
  },
  {
    Icon: FileSearch,
    title: 'Sponsorship from public filings',
    body: 'Public filing data, shown as signals, never guarantees.',
  },
  {
    Icon: ShieldCheck,
    title: 'IntegrityGuard',
    body: 'Never invents employers, titles, dates, or skills.',
  },
  {
    Icon: Clock,
    title: 'Guest data has a clock',
    body: 'Claim it with a free account, or it is deleted after 30 days.',
  },
  {
    Icon: KeyRound,
    title: 'Fair-use protection',
    body: 'A first-party device token and HMAC-protected signals keep the free trial fair.',
  },
  {
    Icon: EyeOff,
    title: 'Never sold, never ads',
    body: 'We do not sell your personal information or use it for advertising.',
  },
] as const;

export function TrustBand() {
  return (
    <section id="trust" aria-label="Trust and privacy" className="scroll-mt-24 border-t border-border py-14 sm:py-16">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Built to be trusted with your resume
            </h2>
          </div>
          <Link
            to="/privacy"
            className="focus-ring-visible rounded-control text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Read the full Privacy Policy
          </Link>
        </Reveal>

        <RevealGroup as="ul" className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map(({ Icon, title, body }) => (
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
