import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePublicSurface } from './_shared';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

/**
 * The shared chrome for every PUBLIC page: the theme root, the skip link, the
 * one `banner` / `main` / `contentinfo` landmark set, and the nav and footer.
 *
 * It exists so `/pricing` and `/trust` are not two copy-pasted shells that
 * drift from `/`. `LandingExperience` keeps its own root because it also owns
 * the guest flow's single file input and has to collapse its sections
 * mid-upload, but it declares the SAME surface classes - and the surface
 * language test asserts exactly one surface owns the page, so a second
 * declaration nested inside would be a real bug.
 *
 * Focus moves to the page heading on mount. A router navigation leaves focus
 * on the link that was clicked, which on a new page means a keyboard user
 * continues tabbing from wherever the old page's nav happened to be; sending
 * focus to the `h1` makes the heading its own announcement without an aria-live
 * region.
 */
export function PublicPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const surface = usePublicSurface();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const heading = mainRef.current?.querySelector('h1');
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1');
      // `outline-none` matters here. This focus is an ANNOUNCEMENT, not a
      // keyboard affordance the user asked for, and browsers paint the default
      // focus ring on a programmatically focused tabindex="-1" element - which
      // renders as a stray box drawn around the page heading on every visit.
      // The visible-focus contract is unaffected: real keyboard focus is
      // styled through `.focus-ring-visible` / `focus-visible:` everywhere.
      heading.classList.add('outline-none');
      heading.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div
      className={cn('min-h-screen overflow-x-clip', surface.className, className)}
      style={{ colorScheme: surface.colorScheme }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-panel"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main" ref={mainRef} className="pt-14">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
