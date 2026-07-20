import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startHref } from './_shared';

/** In-page anchors to real sections only. Hidden on mobile, where the bar
 *  stays compact: logo + Sign in + the primary CTA (no hamburger needed). */
const SECTION_LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Workspace', href: '#workspace' },
  { label: 'Trust', href: '#trust' },
];

/**
 * Floating glass navigation, the ONLY surface on the landing allowed
 * backdrop blur. Composes the canonical `.glass-nav` recipe from index.css
 * (token fill + 16px blur, with a built-in solid fallback via @supports when
 * backdrop-filter is unsupported) with the card tint, so nothing here
 * hand-rolls a blur. Fixed with a stable height; content floats underneath.
 */
export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="glass-nav glass-nav-card mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-2xl border border-border px-3 shadow-soft sm:px-4">
        <Link
          to="/"
          aria-label="Aspirely home"
          className="focus-ring-visible flex h-11 items-center gap-2 rounded-control font-semibold text-foreground"
        >
          <span className="grid h-8 w-8 place-items-center rounded-control bg-primary text-primary-foreground">
            <Sparkles className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </span>
          <span className="hidden font-display text-lg tracking-tight min-[430px]:inline">Aspirely</span>
        </Link>

        <nav aria-label="Landing sections" className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="focus-ring-visible rounded-control px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="h-11 px-3 text-muted-foreground hover:text-foreground">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="h-11 rounded-full px-4 sm:px-5">
            {startHref().startsWith('/#') ? (
              <a href="#try">Try it free</a>
            ) : (
              <Link to={startHref()}>Try it free</Link>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
