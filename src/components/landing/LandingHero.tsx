import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { isGuestOnboardingEnabled } from '@/lib/guest';
import { Container, Reveal, startHref } from './_shared';

/**
 * Hero: the real product action, above the fold. When guest onboarding is
 * enabled the actual GuestDropzone is embedded (compact variant, privacy and
 * file-type microcopy visible); a dropped or selected file is handed straight
 * to /start via router state, so the guest never re-picks it (Start.tsx
 * auto-starts the upload from location.state.file). When the flag is off the
 * same hero renders a "Create free account" CTA through startHref(), which
 * resolves to /register in that case.
 *
 * The headline is the page's single h1 and its LCP element (pure text).
 */
export function LandingHero() {
  const navigate = useNavigate();
  const guestEnabled = isGuestOnboardingEnabled();

  return (
    <section id="upload" aria-label="Upload your resume" className="scroll-mt-24 pb-16 pt-28 sm:pb-20 sm:pt-36">
      <Container className="max-w-3xl text-center">
        <Reveal immediate>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Direct employer openings, with sponsorship signals from public filings
          </p>
        </Reveal>

        <Reveal immediate delay={0.05}>
          <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
            Upload your resume. <span className="text-primary">See the jobs that fit.</span>
          </h1>
        </Reveal>

        <Reveal immediate delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Get five matched roles and one tailored resume free. No account or card.
          </p>
        </Reveal>

        <Reveal immediate delay={0.15} className="mx-auto mt-8 max-w-xl">
          {guestEnabled ? (
            <GuestDropzone
              variant="compact"
              onStarted={(file) => navigate('/start', { state: { file } })}
              className="text-left"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button asChild size="lg" className="h-12 w-full rounded-control px-7 text-base font-semibold sm:w-auto">
                <Link to={startHref()}>Create free account</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Free to start. No card needed.</p>
            </div>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
