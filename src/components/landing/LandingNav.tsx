import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_NAV, SECTION_LINKS, useSectionJump } from './_shared';

/**
 * The public header: the Aspirely wordmark, the public IA, and the account
 * actions, on one bar that spans the page.
 *
 * At the top of a page it is transparent and sits on the hero. Once the page
 * has scrolled it picks up the canonical frosted recipe from index.css
 * (`.glass-nav`, `.glass-nav-strong`) and a hairline, so the bar is only ever
 * a surface when there is content passing under it.
 *
 * ON `/` THE IA LINKS ARE REAL ANCHORS and stay that way: right-click,
 * middle-click, open-in-new-tab and no-JS all keep working. On every other
 * public route they are router links to the standalone page. What this
 * component adds beyond a bare anchor is `useSectionSpy` below.
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
function useSectionSpy(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

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

/**
 * The public header.
 *
 * It used to carry NO sign-in and no account CTA, on the reasoning that both
 * already sat in the hero six inches below and repeating them was noise. That
 * was right for the page it was written against: a single-purpose guest-upload
 * page whose only meaningful action was upload.
 *
 * It is wrong now. The public site has five destinations and two sub-routes, a
 * visitor can land mid-page or arrive directly on `/pricing`, and under the old
 * rule such a visitor had no path to sign in at all. "Pricing must be
 * discoverable before account creation" also cannot be satisfied by a header
 * that carries no navigation to pricing.
 *
 * What survives, and is re-asserted in the test, is the rule that was actually
 * load-bearing: the bar carries NO upload control. Exactly three triggers open
 * the page's single file input, and a fourth hiding in the header would break
 * that contract from a distance.
 *
 * The mobile disclosure is hand-rolled rather than `ui/sheet`, because Radix
 * Dialog is in no eager path today and the landing is the one eager route -
 * importing it here would grow the entry chunk for every visitor.
 */
export function LandingNav() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const active = useSectionSpy(onHome);
  const onJump = useSectionJump();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  // Close on route change, on Escape (returning focus to the toggle), and on
  // an outside press. Not a modal: it is a non-modal disclosure rendered
  // immediately after its trigger, so tab order is already correct and a focus
  // trap would be wrong.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        document.getElementById('public-nav-toggle')?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('#public-nav-menu') || t?.closest('#public-nav-toggle')) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // The bar becomes a surface only once something scrolls under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The current link carries a short accent rule under its label; on hover
  // the same rule draws in from the left, so the two states are one gesture.
  const linkClass = (isActive: boolean) =>
    cn(
      'focus-ring-visible relative rounded-control px-3 py-2 text-[15px] transition-colors duration-200',
      'after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-expo motion-reduce:after:transition-none',
      isActive
        ? 'font-semibold text-foreground after:scale-x-100'
        : 'font-medium text-ink-muted after:scale-x-0 hover:text-foreground hover:after:scale-x-100',
    );

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled || open
          ? 'glass-nav glass-nav-strong glass-nav-card border-border shadow-soft'
          : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[77.5rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            aria-label="Aspirely home"
            className="focus-ring-visible flex h-11 items-center gap-2.5 rounded-control text-foreground"
          >
            <BrandMark size={30} />
            <span
              className="hidden font-display text-[1.1875rem] font-bold tracking-[-0.03em] min-[360px]:inline"
              style={{ fontStretch: '108%' }}
            >
              Aspirely
            </span>
          </Link>

          {/* `lg`, not `md`: at tablet widths four links plus Sign in plus
              the CTA wrap, so a tablet takes the disclosure. */}
          <nav aria-label="Primary" className="hidden items-center lg:flex">
            {PUBLIC_NAV.map((link) => {
              const asAnchor = onHome && link.anchorOnHome;
              // On `/`, highlight from the scroll-spy for every IA link. Pricing
              // and the FAQ are real routes (so the click still navigates) but
              // they are also on-page sections. Off `/`, the route is the
              // source of truth.
              const isActive = onHome ? active === link.href.slice(1) : pathname === link.route;
              // Anchor only where there is no standalone route to fall back to.
              // A nav link that quietly does nothing once the guest flow has
              // unmounted its target is worse than a navigation.
              return asAnchor ? (
                <a
                  key={link.route}
                  href={link.href}
                  onClick={(e) => onJump(e, link.href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={linkClass(isActive)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.route}
                  to={link.route}
                  aria-current={isActive ? 'page' : undefined}
                  className={linkClass(isActive)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <Link to="/app/home" className="focus-ring-visible pub-btn pub-btn-primary pub-btn-sm">
              Open my workspace
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="focus-ring-visible hidden items-center rounded-control px-3 py-2 text-[15px] font-medium text-ink-muted transition-colors duration-200 hover:text-foreground sm:inline-flex"
              >
                Sign in
              </Link>
              {/* The label shortens rather than wrapping. Hiding the CTA on a
                  phone was the other option and the wrong one, since this is
                  the page's conversion. */}
              <Link
                to="/register"
                aria-label="Create free account"
                className="focus-ring-visible pub-btn pub-btn-primary pub-btn-sm"
              >
                <span className="sm:hidden">Sign up</span>
                <span className="hidden sm:inline">Create free account</span>
              </Link>
            </>
          )}

          {/* Same control as the workspace top bar and the auth stage - one
              setting should not look like three different affordances. */}
          <ThemeToggle className="ml-0.5 h-10 w-10" />

          <button
            id="public-nav-toggle"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="public-nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="focus-ring-visible grid h-11 w-11 place-items-center rounded-control text-ink-muted transition-colors hover:text-foreground lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="public-nav-menu"
          className="mx-auto w-full max-w-[77.5rem] border-t border-border px-3 pb-4 pt-2 sm:px-6 lg:hidden"
        >
          {PUBLIC_NAV.map((link) => {
            const isActive = onHome ? active === link.href.slice(1) : pathname === link.route;
            return (
              <Link
                key={link.route}
                to={link.route}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-ring-visible block rounded-control px-3 py-3.5 text-[1.0625rem] transition-colors duration-200',
                  isActive
                    ? 'font-semibold text-primary'
                    : 'font-medium text-foreground hover:text-primary',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {!isAuthenticated && (
            <Link
              to="/login"
              className="focus-ring-visible block rounded-control px-3 py-3.5 text-[1.0625rem] font-medium text-foreground transition-colors duration-200 hover:text-primary sm:hidden"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
