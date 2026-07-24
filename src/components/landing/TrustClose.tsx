import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AmbientGlow, Container, Grain, Reveal } from './_shared';

/**
 * The close: the page returns to the obsidian product world for its final
 * action, so the last thing a visitor sees is the surface they are about to
 * step into rather than more marketing paper.
 *
 * The closing CTA opens the page's ONE file dialog on this click via the
 * shared picker (`onUpload`) rather than scrolling back up to the hero and
 * making the visitor click a second control. Without a picker (guest
 * onboarding off) it is an honest link to account creation.
 *
 * Precise language by contract: never "verified sponsor", never a deletion
 * promise the backups do not satisfy, never a count of anything.
 */

export interface TrustCloseProps {
  /** Opens the shared resume picker. Absent = guest upload is unavailable. */
  onUpload?: () => void;
  /** Where the CTA goes when there is no picker to open. */
  fallbackHref?: string;
  /** CTA label used in the no-picker mode. */
  fallbackLabel?: string;
}

export function TrustClose({
  onUpload,
  fallbackHref = '/register',
  fallbackLabel = 'Create free account',
}: TrustCloseProps = {}) {
  return (
    <section
      id="trust"
      aria-label="Get started"
      className="surface-obsidian relative scroll-mt-24 overflow-hidden py-20 sm:py-24 lg:py-28"
    >
      <AmbientGlow />
      <Grain />
      <Container className="relative max-w-3xl text-center">
        <Reveal>
          <h2 className="text-balance font-display text-[2.25rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
            See the jobs that fit you.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
            One resume, up to 5 best-fit openings, and one tailored rewrite. No account required to
            start.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {onUpload ? (
              <Button
                size="lg"
                onClick={onUpload}
                className="h-12 w-full rounded-full px-8 text-base font-semibold shadow-pop sm:w-auto"
              >
                Upload your resume
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-full px-8 text-base font-semibold shadow-pop sm:w-auto"
              >
                <Link to={fallbackHref}>{fallbackLabel}</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full bg-card/50 px-8 text-base sm:w-auto"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>

          <p className="mt-6 text-[13px] font-medium text-muted-foreground">
            PDF or DOCX · up to 5 MB · private and time-limited
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
