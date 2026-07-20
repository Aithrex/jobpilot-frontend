import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { isGuestOnboardingEnabled } from '@/lib/guest';
import { HeroSceneStage } from '@/components/landing/hero-scene';
import { AmbientGlow, Container, Reveal, startHref } from './_shared';

/**
 * Hero: the real product action, above the fold. When guest onboarding is
 * enabled the actual GuestDropzone is embedded (compact variant, privacy and
 * file-type microcopy visible); a dropped or selected file is handed straight
 * to /start via router state, so the guest never re-picks it (Start.tsx
 * auto-starts the upload from location.state.file). When the flag is off the
 * same hero renders a "Create free account" CTA through startHref(), which
 * resolves to /register in that case.
 *
 * Layout: a balanced split at lg+. Left column owns the copy and the upload
 * control; the right column is a fixed aspect-ratio visual stage
 * (HeroSceneStage) telling the product story as a career signal network -
 * static SVG first, upgraded to an interactive 3D scene only on capable
 * desktop devices (the entire three/r3f bundle stays behind React.lazy).
 * Below lg the page is a single column and the stage renders its static
 * illustration under the upload control - mobile never loads the 3D chunk.
 * The stage box has fixed dimensions before anything loads (zero CLS) and
 * never blocks or overlaps the headline or dropzone.
 *
 * The headline is the page's single h1 and its LCP element (pure text).
 */
export function LandingHero() {
  const navigate = useNavigate();
  const guestEnabled = isGuestOnboardingEnabled();

  return (
    <section
      id="upload"
      aria-label="Upload your resume"
      className="relative scroll-mt-24 pb-16 pt-28 sm:pb-20 sm:pt-36"
    >
      <AmbientGlow />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-10 xl:gap-16">
          <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
            <Reveal immediate>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="relative shrink-0 overflow-hidden rounded-full" aria-hidden>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="pointer-events-none absolute inset-0 animate-[chip-shimmer_7s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-card/80 to-transparent motion-reduce:hidden" />
                </span>
                Direct employer openings, with sponsorship signals from public filings
              </p>
            </Reveal>

            <Reveal immediate delay={0.05}>
              <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
                Upload your resume. <span className="text-primary">See the jobs that fit.</span>
              </h1>
            </Reveal>

            <Reveal immediate delay={0.1}>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                Get five matched roles and one tailored resume free. No account or card.
              </p>
            </Reveal>

            <Reveal immediate delay={0.15} className="mx-auto mt-8 max-w-xl lg:mx-0">
              {guestEnabled ? (
                <GuestDropzone
                  variant="compact"
                  onStarted={(file) => navigate('/start', { state: { file } })}
                  className="text-left"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 lg:items-start">
                  <Button asChild size="lg" className="h-12 w-full rounded-control px-7 text-base font-semibold sm:w-auto">
                    <Link to={startHref()}>Create free account</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">Free to start. No card needed.</p>
                </div>
              )}
            </Reveal>
          </div>

          {/* Desktop visual stage: gated 3D over the static illustration. */}
          <Reveal immediate delay={0.12} className="hidden lg:block">
            <HeroSceneStage />
          </Reveal>

          {/* Below lg the stage is the static illustration, after the upload
              control - the mobile instance never mounts the 3D gate. */}
          <Reveal className="lg:hidden">
            <HeroSceneStage interactive={false} className="mx-auto max-w-[440px]" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
