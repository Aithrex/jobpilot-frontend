import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isGuestOnboardingEnabled } from '@/lib/guest';
import { AmbientGlow, Container, Grain, Reveal, startHref } from './_shared';

/**
 * Final CTA: repeats the upload action (scrolls back to the hero dropzone
 * when guest onboarding is on, otherwise the same startHref() door) plus
 * Sign in, and one truthful line about the free plan. No pricing table.
 * Sits on the brand mesh + grain so the close carries the same "signal"
 * light as the stages above it.
 */
export function FinalCta() {
  const guestEnabled = isGuestOnboardingEnabled();
  return (
    <section aria-label="Get started" className="relative overflow-hidden border-t border-border bg-card py-16 sm:py-20">
      <div aria-hidden className="mesh-accent absolute inset-0" />
      <AmbientGlow />
      <Grain />
      <Container className="relative max-w-2xl text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            See the jobs that fit you
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Up to five matched roles and one tailored resume, free, before you decide anything.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {guestEnabled ? (
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-control px-7 text-base font-semibold shadow-panel transition-shadow duration-200 hover:shadow-pop motion-reduce:transition-none sm:w-auto"
              >
                <a href="#try">Upload your resume</a>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-control px-7 text-base font-semibold shadow-panel transition-shadow duration-200 hover:shadow-pop motion-reduce:transition-none sm:w-auto"
              >
                <Link to={startHref()}>Create free account</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-control bg-background px-7 text-base sm:w-auto">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The free plan includes five tailored resumes a day after you sign up.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
