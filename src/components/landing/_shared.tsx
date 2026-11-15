import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
import './landing.css';

/**
 * The page's in-document destinations, declared ONCE. Used by the scroll-spy
 * so the header can say which section you are actually in.
 */
export const SECTION_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#sponsorship', label: 'Sponsorship' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#before-you-begin', label: 'FAQ' },
] as const;

/**
 * The public information architecture, for the header and the footer.
 *
 * `route` is what the nav links to and always works - from `/`, from `/login`,
 * from `/pricing` itself. `href` is the same destination as an in-page anchor,
 * used only by the scroll-spy on `/`.
 *
 * Pricing and the FAQ are REAL ROUTES as well as on-page sections, and the nav
 * always links to the route rather than to the anchor. The reason is not
 * tidiness: `LandingExperience` unmounts every marketing section the moment a
 * guest upload starts, so `#pricing` physically stops existing at the exact
 * moment a guest who just uploaded a resume wants to know what this costs -
 * the highest-intent pricing moment in the funnel. A route survives that; an
 * anchor silently does nothing.
 *
 * "Features" and "Sponsorship" keep the anchor on `/` because they have no
 * standalone route to fall back to, and scrolling to a section the reader is
 * already on beats a navigation.
 *
 * The FAQ used to be labelled "Before you begin". That is the section's own
 * heading and it stays there; a header link is something people scan for, and
 * the word they scan for is FAQ. The route is still `/trust`, so every inbound
 * link, support reply and footer entry lands where it always did.
 */
export const PUBLIC_NAV: ReadonlyArray<{
  label: string;
  route: string;
  href: string;
  /**
   * Render as an in-page anchor while on `/`. Only true where there is no
   * standalone route to fall back to - see the note above about anchors
   * disappearing mid-upload.
   */
  anchorOnHome: boolean;
}> = [
  { label: 'Sponsorship', route: '/#sponsorship', href: '#sponsorship', anchorOnHome: true },
  { label: 'Features', route: '/#features', href: '#features', anchorOnHome: true },
  { label: 'Pricing', route: '/pricing', href: '#pricing', anchorOnHome: false },
  { label: 'FAQ', route: '/trust', href: '#before-you-begin', anchorOnHome: false },
] as const;

/**
 * THE public site's surface, decided in one place for `/`, `/pricing`,
 * `/trust`, the legal pages and the auth shell.
 *
 * IT FOLLOWS THE VISITOR (owner decision, 2026-11-11). The resolved theme is
 * the visitor's explicit choice from the theme control, or, while that is
 * still "system", their operating-system preference.
 *
 * `dark` rides along on the root so shared primitives that ship their own
 * `dark:` variants keep behaving.
 */
export function usePublicSurface(): { className: string; colorScheme: 'light' | 'dark' } {
  const dark = useResolvedTheme() === 'dark';
  return {
    className: dark ? 'dark surface-nocturne' : 'surface-lumen',
    colorScheme: dark ? 'dark' : 'light',
  };
}

/** Bar height (64) plus a breath of space. */
const NAV_CLEARANCE = 88;

/**
 * Scroll so a section's CONTENT starts just under the fixed bar.
 *
 * A bare anchor cannot get this right: the sections carry their own top
 * padding, and CSS adds `scroll-padding-top` to any `scroll-margin`, so a
 * plain jump lands with a tall empty band above the heading. Reading each
 * section's own computed padding removes the guesswork.
 *
 * Modified clicks are left alone (they mean "open elsewhere"), a missing
 * target falls through to default anchor behaviour, and the hash is still
 * pushed so Back returns the reader to where they were.
 */
export function useSectionJump() {
  const reduce = useReducedMotion();

  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const el = document.getElementById(href.slice(1));
      if (!el) return;

      e.preventDefault();
      const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
      const top =
        window.scrollY + el.getBoundingClientRect().top + Math.max(0, padTop - 40) - NAV_CLEARANCE;

      window.history.pushState(null, '', href);
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    },
    [reduce],
  );
}

/** One easing for the whole public site: a confident settle, never springy. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * THE public grid. The header and every marketing section align to this one
 * measure, so nothing on the page is optically off from anything else.
 *
 * Widening the CONTAINER does not widen the TEXT: headings and body copy carry
 * their own caps, because a 1240px line is unreadable however much room the
 * page has.
 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-[77.5rem] px-5 sm:px-8 lg:px-10', className)}>
      {children}
    </div>
  );
}

/**
 * THE page's one vertical scale. Sections cannot own the space BETWEEN them,
 * only the space they need INSIDE them, so the band is declared once here and
 * every section spends the same.
 */
export const SECTION_Y = 'py-20 sm:py-24 lg:py-32';
export const HEAD_GAP = 'mt-12 lg:mt-16';
export const BLOCK_GAP = 'mt-12 lg:mt-14';

/**
 * One marketing movement. Owns the page's vertical rhythm so no section has to
 * re-decide it - pass `className` only for things that are genuinely local (a
 * band, overflow clipping), never for padding.
 */
export function Section({
  id,
  labelledBy,
  label,
  pad = 'both',
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  label?: string;
  pad?: 'both' | 'top' | 'bottom' | 'none';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      className={cn(
        'relative scroll-mt-4',
        pad === 'both' && SECTION_Y,
        pad === 'top' && 'pt-20 sm:pt-24 lg:pt-32',
        pad === 'bottom' && 'pb-20 sm:pb-24 lg:pb-32',
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * The one section header: a display heading and an optional lede, and nothing
 * above it. Section labels in small capitals were removed across the site;
 * the heading already says what the section is.
 */
export function SectionHead({
  title,
  titleId,
  lede,
  as: Heading = 'h2',
  className,
}: {
  title: ReactNode;
  titleId?: string;
  lede?: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <div className={className}>
      <Heading id={titleId} className="pub-h2 max-w-[24ch]">
        {title}
      </Heading>
      {lede && <p className="pub-lede mt-5 max-w-[58ch]">{lede}</p>}
    </div>
  );
}

/**
 * The tag every scene built on sample data carries. The hero says it once as
 * a full sentence; everywhere else this is enough, and it is still words.
 */
export const SAMPLE_TAG = 'Sample data';

export function SampleTag({ className }: { className?: string }) {
  return <span className={cn('pub-chip', className)}>{SAMPLE_TAG}</span>;
}

/**
 * The highlighter. `on` arms the stroke so a scene can mark its evidence in
 * sequence; leave it undefined and the phrase is simply marked.
 */
export function Mark({
  children,
  on,
  delay = 0,
}: {
  children: ReactNode;
  on?: boolean;
  delay?: number;
}) {
  return (
    <span
      className="pub-mark"
      data-on={on === undefined ? undefined : String(on)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </span>
  );
}
