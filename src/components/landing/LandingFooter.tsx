import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const LINK_CLASS =
  'focus-ring-visible rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground';

/**
 * The footer: the mark, Privacy, Terms, the line. Nothing else.
 *
 * CENTRED, and that is the whole trick. Three short items pushed to opposite
 * ends of a 1152px bar read as an unfinished page - it was tried as a spread
 * row, then as a spread row with a column of section links added to fill the
 * hole, and the links were just furniture built to occupy space. A footer with
 * three things in it should look like a footer with three things in it: one
 * centred cluster, then the legal line centred beneath a hairline. Nothing is
 * stranded, because nothing is reaching for an edge.
 *
 * NOTHING HERE RESTATES THE PITCH. A one-line description of the product sat
 * under the mark for a while, and every clause of it was already on the page
 * three times over - in the hero, in the proof section and in the closing CTA.
 * A footer is the one place a reader has stopped being sold to.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-10">
          <Link
            to="/"
            aria-label="Aspirely home"
            className="focus-ring-visible inline-flex items-center gap-2.5 rounded-control"
          >
            <span className="grid h-7 w-7 place-items-center rounded-control bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold text-foreground">
              Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
            </span>
          </Link>

          <nav className="flex items-center gap-8" aria-label="Footer">
            <Link to="/privacy" className={LINK_CLASS}>
              Privacy
            </Link>
            <Link to="/terms" className={LINK_CLASS}>
              Terms
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-center text-xs tabular-nums text-muted-foreground">
            &copy; {new Date().getFullYear()} Aithrex. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
