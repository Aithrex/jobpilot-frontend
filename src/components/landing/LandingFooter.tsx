import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const LINK_CLASS =
  'focus-ring-visible rounded-control px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground';

/**
 * Compact footer: the Aspirely mark, Privacy, Terms. Nothing else.
 *
 * Brand and links share one aligned row; the copyright sits centered on its
 * own quiet line below a hairline, so nothing is stranded in wide, uneven gaps
 * the way the old justify-between row left it.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <Link
            to="/"
            aria-label="Aspirely home"
            className="focus-ring-visible flex items-center gap-2.5 rounded-control"
          >
            <span className="grid h-7 w-7 place-items-center rounded-control bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold text-foreground">
              Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6" aria-label="Footer">
            <Link to="/privacy" className={LINK_CLASS}>
              Privacy
            </Link>
            <Link to="/terms" className={LINK_CLASS}>
              Terms
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            <span className="tabular-nums">&copy; {new Date().getFullYear()} Aithrex.</span> Guest
            uploads are private and time-limited.
          </p>
        </div>
      </div>
    </footer>
  );
}
