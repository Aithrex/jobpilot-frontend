import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startHref } from './_shared';

/**
 * The one floating liquid-glass surface on the page: wordmark, Sign in, and
 * the primary upload action. Composes the canonical `.glass-nav` recipe from
 * index.css (token fill + 16px blur, solid @supports fallback) plus a fine
 * inner edge-light so the glass reads as a physical pane on the deep-ink
 * canvas. No section links — the page is three movements, not a site map.
 */
export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div
        className="glass-nav glass-nav-card mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 rounded-2xl border border-border/80 px-3 shadow-panel sm:px-4"
        style={{
          boxShadow:
            'inset 0 1px 0 hsl(var(--foreground) / 0.07), inset 0 -1px 0 hsl(var(--background) / 0.4), var(--shadow-panel)',
        }}
      >
        <Link
          to="/"
          aria-label="Aspirely home"
          className="focus-ring-visible flex h-11 items-center gap-2 rounded-control font-semibold text-foreground"
        >
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-control text-white">
            <Sparkles className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </span>
          <span className="hidden font-display text-lg tracking-tight min-[430px]:inline">Aspirely</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="h-11 px-3 text-muted-foreground hover:text-foreground">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="h-11 rounded-full px-4 sm:px-5">
            {startHref().startsWith('/#') ? (
              <a href="#try">Upload resume</a>
            ) : (
              <Link to={startHref()}>Upload resume</Link>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
