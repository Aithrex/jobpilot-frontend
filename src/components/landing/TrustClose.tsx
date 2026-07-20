import { Link } from 'react-router-dom';
import { Building2, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isGuestOnboardingEnabled } from '@/lib/guest';
import { AmbientGlow, Container, Grain, Reveal, startHref } from './_shared';

/**
 * The compact close: exactly three icon-level trust statements (details live
 * in the Privacy Policy — no retention paragraphs here) and one final action
 * pair. Precise language by contract: never "verified sponsor", never a
 * deletion promise the backups don't satisfy.
 */

const POINTS = [
  { Icon: Building2, text: 'Real job sources' },
  { Icon: ShieldCheck, text: 'No invented resume facts' },
  { Icon: Clock, text: 'Private, time-limited guest data' },
] as const;

export function TrustClose() {
  const guestEnabled = isGuestOnboardingEnabled();
  return (
    <section
      id="trust"
      aria-label="Trust and get started"
      className="relative scroll-mt-24 overflow-hidden border-t border-border/60 py-16 sm:py-20"
    >
      <AmbientGlow />
      <Grain />
      <Container className="relative max-w-3xl text-center">
        <Reveal>
          <ul className="flex flex-col items-center justify-center gap-x-8 gap-y-3 sm:flex-row">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link
              to="/privacy"
              className="focus-ring-visible rounded font-medium text-primary underline-offset-2 hover:underline"
            >
              Read the full Privacy Policy
            </Link>
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-12 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            See the jobs that fit you
          </h2>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {guestEnabled ? (
              <Button asChild size="lg" className="h-12 w-full rounded-full px-7 text-base font-semibold shadow-panel sm:w-auto">
                <a href="#try">Upload your resume</a>
              </Button>
            ) : (
              <Button asChild size="lg" className="h-12 w-full rounded-full px-7 text-base font-semibold shadow-panel sm:w-auto">
                <Link to={startHref()}>Create free account</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full bg-card/40 px-7 text-base sm:w-auto">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
