import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';

const LINK_CLASS =
  'focus-ring-visible rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground';

/**
 * The footer: the mark, Privacy, Terms, the line. Nothing else.
 *
 * The mark opens the line and the legal links close it, with the copyright
 * centred beneath a hairline. An earlier pass added a column of section links
 * to fill the width, which was furniture built to occupy space; the width is
 * better left open than padded with things nobody came for.
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
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between sm:gap-10">
          <Link
            to="/"
            aria-label="Aspirely home"
            className="focus-ring-visible inline-flex items-center gap-2.5 rounded-control"
          >
            <BrandMark />
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
