import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isGuestOnboardingEnabled } from '@/lib/guest';
import { Container, Reveal, startHref } from './_shared';

/**
 * Final CTA: repeats the upload action (scrolls back to the hero dropzone
 * when guest onboarding is on, otherwise the same startHref() door) plus
 * Sign in, and one truthful line about the free plan. No pricing table.
 */
export function FinalCta() {
  const guestEnabled = isGuestOnboardingEnabled();
  return (
    <section aria-label="Get started" className="border-t border-border bg-card py-16 sm:py-20">
      <Container className="max-w-2xl text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            See the jobs that fit you
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Five matched roles and one tailored resume, free, before you decide anything.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {guestEnabled ? (
              <Button asChild size="lg" className="h-12 w-full rounded-control px-7 text-base font-semibold sm:w-auto">
                <a href="#upload">Upload your resume</a>
              </Button>
            ) : (
              <Button asChild size="lg" className="h-12 w-full rounded-control px-7 text-base font-semibold sm:w-auto">
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
