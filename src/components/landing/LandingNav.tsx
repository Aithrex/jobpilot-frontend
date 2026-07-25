import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/**
 * The one floating liquid-glass surface on the page: the Aspirely wordmark on
 * the left, and in-page section links on the right. It does NOT repeat the
 * hero's actions (upload, sign in) - those live in the hero and the closing
 * CTA, so the bar never shows Sign in / Upload twice in the first viewport.
 * The section links are what give the header real balance instead of a lone
 * wordmark floating in an empty bar.
 *
 * It stays intentionally dark. The whole landing is the obsidian product world;
 * a header that flipped light would break the one continuous surface the design
 * is built on. Composes the canonical index.css recipe - `.glass-nav` (token
 * fill + blur, solid @supports fallback), `.glass-nav-strong` (the fill it
 * needs to stay AA as it crosses from the obsidian hero onto the pearl
 * editorial band), and `.glass-specular` (the bright top hairline that makes it
 * read as a physical pane) - so no second blur recipe is hand-rolled here.
 */

const SECTION_LINKS: { href: string; label: string }[] = [
  { href: '#how', label: 'How it works' },
  { href: '#proof', label: 'Why trust it' },
  { href: '#coming-next', label: 'Coming next' },
];

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="glass-nav glass-nav-strong glass-nav-card glass-specular mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-2xl border border-foreground/[0.12] px-3 sm:px-5">
        <Link
          to="/"
          aria-label="Aspirely home"
          className="focus-ring-visible flex h-11 items-center gap-2 rounded-control font-semibold text-foreground"
        >
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-control text-white">
            <Sparkles className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </span>
          <span className="hidden font-display text-lg tracking-tight min-[380px]:inline">
            Aspirely
          </span>
        </Link>

        <nav aria-label="Sections" className="flex items-center gap-1">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring-visible hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
