import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTION_LINKS, useSectionJump } from './_shared';

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
 *
 * THE LINKS ARE REAL ANCHORS and stay that way: right-click, middle-click,
 * open-in-new-tab and no-JS all keep working, and `html { scroll-behavior }`
 * in index.css does the smooth scrolling. What this component adds is the two
 * things a bare anchor cannot do - see `useSectionSpy` below.
 */

/**
 * Tracks which linked section the reader is actually in, and keeps the URL
 * honest about it.
 *
 * Two problems this fixes:
 *
 *  1 The bar never showed where you were. Three links, no state, so after a
 *    jump the header looked identical to before it - the one piece of chrome
 *    that could orient you was the one piece saying nothing.
 *  2 The hash was permanent. Clicking "Coming next" wrote `#coming-next` and
 *    left it there forever: scroll back to the hero and the address bar still
 *    claimed you were at the bottom of the page, so reloading or sharing that
 *    URL dropped you somewhere you were not. The hash now follows the reader
 *    and is REMOVED entirely once no linked section is on screen (the hero,
 *    the closing CTA).
 *
 * `replaceState` throughout - the hash tracking a scroll must never grow the
 * back stack, or Back becomes a scroll-position undo. Clicking a link still
 * pushes its own entry, because that was a real navigation the reader chose.
 */
function useSectionSpy(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const targets = SECTION_LINKS.map(({ href }) => document.getElementById(href.slice(1))).filter(
      (el): el is HTMLElement => !!el,
    );
    if (!targets.length) return;

    // How much of each section is in the reading band. The band starts below
    // the bar and stops short of the fold, so "the section I am in" means the
    // one I am actually reading, not one clipping the very bottom edge.
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        setActive(bestRatio > 0 ? best : null);
      },
      { rootMargin: '-80px 0px -45% 0px', threshold: [0, 0.15, 0.35, 0.6, 1] },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const next = active ? `#${active}` : '';
    if (hash === next) return;
    window.history.replaceState(null, '', `${pathname}${search}${next}`);
  }, [active]);

  // Back at the very top, the URL is just the page. This is deliberately not
  // left to the observer: the sections unmount once a real upload takes over
  // the page, and an observer with no targets can never clear anything.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 8 || !window.location.hash) return;
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', `${pathname}${search}`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return active;
}

export function LandingNav() {
  const active = useSectionSpy();
  const onJump = useSectionJump();

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
          {SECTION_LINKS.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => onJump(e, link.href)}
                // `page` is the correct token for "the section of this document
                // you are looking at"; it is also never colour-only, since the
                // active link carries a filled pill as well.
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-ring-visible hidden rounded-full px-3 py-2 text-sm font-medium transition-colors sm:inline-flex',
                  isActive
                    ? 'bg-foreground/[0.08] text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
