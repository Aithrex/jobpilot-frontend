import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AmbientGlow, Container, Grain, Reveal, SECTION_Y } from './_shared';

/**
 * The close: the final action, on the page's own surface. It gets its presence
 * from the ambient glow and the grain rather than from flipping to a different
 * colour world, so a light-theme page stays light all the way to the footer.
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
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;
  const href = authed ? '/app/home' : fallbackHref;
  const label = authed ? 'Open my workspace' : fallbackLabel;
  const showUpload = Boolean(onUpload) && !authed;
  const showSignIn = !authed && !onUpload;

  return (
    <section
      id="get-started"
      aria-label="Get started"
      // `id` moved off `trust`, which now belongs to the real trust answers
      // section. No surface of its own: the close inherits the page's theme
      // like every other section.
      className={cn('relative scroll-mt-4 overflow-hidden', SECTION_Y)}
    >
      <AmbientGlow />
      <Grain />
      <Container className="relative max-w-3xl text-center">
        <Reveal>
          <h2 className="text-balance font-display text-[2rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[2.75rem]">
            {authed ? 'Your workspace is waiting.' : 'Start the search that keeps going.'}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {authed
              ? "Continue in your workspace. Matches, tailoring, and today's work are already there."
              : 'Create a free account and set your direction. Aspirely takes it from there, and you stay in charge of every step that leaves your hands.'}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-full px-8 text-base font-semibold shadow-pop sm:w-auto"
            >
              <Link to={href}>{label}</Link>
            </Button>
            {/* Keeps the exact accessible name `Upload your resume`: it is one
                of the three triggers that share the page's single file input,
                and the count is asserted. Never shown to a signed-in reader —
                they already have a workspace, and pairing it with Sign in was
                the conflict that made the close look like a signup page. */}
            {showUpload ? (
              <button
                type="button"
                onClick={onUpload}
                className="focus-ring-visible glass-pane inline-flex h-12 w-full items-center justify-center rounded-full px-8 text-base font-semibold text-foreground transition-[color,border-color,background-color] duration-200 ease-out hover:border-primary/40 hover:text-primary hover:[--glass-alpha:1] sm:w-auto"
              >
                Upload your resume
              </button>
            ) : showSignIn ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full bg-card/50 px-8 text-base sm:w-auto"
              >
                <Link to="/login">Sign in</Link>
              </Button>
            ) : null}
          </div>

          <p className="mt-5 text-[13px] font-medium text-muted-foreground">
            {authed ? 'Continue where you left off.' : 'Free to start · No card · Private upload'}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
