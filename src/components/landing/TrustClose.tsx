import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Container, Section } from './_shared';

/**
 * The close: the offer once more, and the two ways to take it.
 *
 * It is the last thing on `/`, `/pricing` and `/trust`. On `/` it also carries
 * the third of the page's three upload triggers; on the other routes there is
 * no guest flow mounted, so it offers sign-in instead.
 *
 * A signed-in reader is never sold signup here: they get one way back to the
 * workspace they already have.
 */

export interface TrustCloseProps {
  /** Opens the page's ONE file picker. Absent wherever guest upload is not available. */
  onUpload?: () => void;
  fallbackHref?: string;
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
    <Section id="get-started" label="Get started" className="pub-band">
      <Container>
        <div className="pub-stage grid gap-x-12 gap-y-9 p-8 sm:p-12 lg:grid-cols-12 lg:items-end lg:p-16">
          <div className="lg:col-span-7">
            <h2 className="pub-h2 max-w-[16ch]">
              {authed ? 'Your workspace is waiting.' : 'Tomorrow can start with a short list.'}
            </h2>
            <p className="pub-lede mt-5 max-w-[48ch]">
              {authed
                ? "Continue in your workspace. Matches, tailoring, and today's work are already there."
                : 'Create a free account, or drop in a resume and see your matches first.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:flex-col xl:flex-row xl:justify-end">
            <Link to={href} className="focus-ring-visible pub-btn pub-btn-primary">
              {label}
            </Link>
            {/* One of the triggers that share the page's single file input,
                under the same name it has everywhere else. Never shown to a
                signed-in reader. */}
            {showUpload ? (
              <button
                type="button"
                onClick={onUpload}
                className="focus-ring-visible pub-btn pub-btn-secondary"
              >
                <Upload aria-hidden className="h-[1.125rem] w-[1.125rem]" />
                Find my matches
              </button>
            ) : showSignIn ? (
              <Link to="/login" className="focus-ring-visible pub-btn pub-btn-secondary">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
