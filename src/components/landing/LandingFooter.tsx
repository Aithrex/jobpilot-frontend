import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const LINK_CLASS =
  'focus-ring-visible rounded-control px-1 py-0.5 transition-colors hover:text-foreground';

/** Compact footer: the Aspirely mark, Privacy, Terms. Nothing else. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-control bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
        </div>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <Link to="/privacy" className={LINK_CLASS}>
            Privacy
          </Link>
          <Link to="/terms" className={LINK_CLASS}>
            Terms
          </Link>
        </nav>
        <p className="tabular-nums">© {new Date().getFullYear()} Aithrex</p>
      </div>
    </footer>
  );
}
