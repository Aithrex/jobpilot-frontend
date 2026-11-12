import { useCallback, useId, type MouseEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';

/**
 * The page's in-document destinations, declared ONCE. Used by the scroll-spy
 * so the header can say which section you are actually in.
 */
export const SECTION_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#before-you-begin', label: 'Before you begin' },
] as const;

/**
 * The public information architecture, for the header and the footer.
 *
 * `route` is what the nav links to and always works - from `/`, from `/login`,
 * from `/pricing` itself. `href` is the same destination as an in-page anchor,
 * used only by the scroll-spy on `/`.
 *
 * Pricing and Trust are REAL ROUTES as well as on-page sections, and the nav
 * always links to the route rather than to the anchor. The reason is not
 * tidiness: `LandingExperience` unmounts every marketing section the moment a
 * guest upload starts, so `#pricing` physically stops existing at the exact
 * moment a guest who just uploaded a resume wants to know what this costs -
 * the highest-intent pricing moment in the funnel. A route survives that; an
 * anchor silently does nothing.
 *
 * "How it works" keeps the anchor on `/` because it has no standalone route to
 * fall back to, and scrolling to a section the reader is already on beats a
 * navigation. It is the one entry where the trade-off runs the other way.
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
  { label: 'How it works', route: '/#how-it-works', href: '#how-it-works', anchorOnHome: true },
  { label: 'Pricing', route: '/pricing', href: '#pricing', anchorOnHome: false },
  /* Was "Trust and FAQ" pointing at `#trust`. Trust and the FAQ were two
     sections answering the same six questions in two shapes, and the label
     named our internal split rather than the reader's job. One section, one
     label, one anchor - `/trust` stays the route so every existing inbound
     link, support reply and footer entry still lands on it. */
  { label: 'Before you begin', route: '/trust', href: '#before-you-begin', anchorOnHome: false },
] as const;

/**
 * THE public site's surface, decided in one place for `/`, `/pricing`,
 * `/trust`, the legal pages and the auth shell.
 *
 * IT FOLLOWS THE VISITOR (owner decision, 2026-11-11). The resolved theme is
 * the visitor's explicit choice from the theme control, or, while that is
 * still "system", their operating-system preference. The earlier rule (light
 * unless the toggle was pressed) existed because the old dark landing was a
 * near-black plum slab with a film wash painted over it; the redesigned page
 * is one neutral token system with a 3D stage lit for both themes, so a dark
 * preference now gets a page designed to be dark rather than a light page it
 * did not ask for.
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

/** Bar height (60 on desktop) + its top inset (12) + a breath of space. */
const NAV_CLEARANCE = 92;

/**
 * Scroll so a section's CONTENT starts just under the fixed bar.
 *
 * A bare anchor cannot get this right. The landing sections carry up to 96px
 * of their own top padding, the page sets `scroll-padding-top: 64px`, and CSS
 * ADDS those to any `scroll-margin` - so "How it works" was landing with about
 * 160px of empty band above its eyebrow and its heading pushed toward the
 * middle of the screen. Reading each section's own computed padding removes
 * the guesswork, so every section lands identically however much padding it
 * happens to carry.
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
      const top = window.scrollY + el.getBoundingClientRect().top + padTop - NAV_CLEARANCE;

      window.history.pushState(null, '', href);
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    },
    [reduce],
  );
}

/**
 * Shared primitives + motion kit for the marketing landing (the Career
 * Signal Atlas). One easing, viewport-once reveals, and reduced-motion
 * helpers so every section moves with the same accent and is equally good
 * with motion fully off. Nothing on the page animates anything but
 * transform/opacity (plus SVG pathLength).
 */

// Editorial easing: a confident settle, never springy.
export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * THE public grid. The header and every marketing section align to this one
 * measure, so nothing on the page is optically off from anything else.
 *
 * It was `max-w-6xl` (1152px) with 32px gutters, which on a 1440px display
 * left roughly 150px of dead margin down each side and made the hero's two
 * columns fight over a narrow middle - the headline broke into four lines
 * while the page had space going spare. 84rem (1344px) sits in the middle of
 * the 1280-1440 band and keeps comfortable margins on a wide monitor without
 * the page reading as a column floating in a void.
 *
 * The gutters scale rather than staying fixed, so the narrowing happens at the
 * edges where there is room to lose, not in the content.
 *
 * Widening the CONTAINER does not widen the TEXT: `SectionHead` caps its own
 * measure at `max-w-2xl` and body copy carries its own caps, because a 1344px
 * line length is unreadable no matter how much room the page has.
 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-10 xl:px-14', className)}>
      {children}
    </div>
  );
}

/**
 * THE page's one vertical scale. Every marketing section spaces itself from
 * these three constants and from nothing else.
 *
 * The landing had drifted into four competing rhythms - `py-20 sm:py-28`,
 * `py-16 sm:py-20 lg:py-24`, `pb-16 sm:pb-20 lg:pb-24` and
 * `py-14 sm:py-16 lg:py-20` - each chosen locally and reasonable on its own.
 * Stacked, they were not: two adjacent `sm:py-28` sections put 224px of empty
 * canvas between the last line of one argument and the eyebrow of the next,
 * and because the amount changed at every boundary the page read as a series
 * of unrelated slabs rather than one document. Sections cannot own the space
 * BETWEEN them - only the space they need INSIDE them - so the band is
 * declared once here and every section spends the same.
 *
 * SECTION_Y is the padding a section puts above and below its own content.
 * HEAD_GAP is the distance from a `SectionHead` to the content it introduces.
 * BLOCK_GAP is the distance between two blocks inside one section.
 *
 * They step with the viewport but never past the point where a boundary stops
 * reading as a boundary; the `SectionRule` hairline does that work now, so the
 * padding no longer has to shout to be heard.
 */
export const SECTION_Y = 'py-16 sm:py-20 lg:py-24';
export const HEAD_GAP = 'mt-10 lg:mt-12';
export const BLOCK_GAP = 'mt-12 lg:mt-14';

/**
 * One marketing movement. Owns the page's vertical rhythm so no section has to
 * re-decide it - pass `className` only for things that are genuinely local
 * (overflow clipping, a stage background), never for padding.
 *
 * `pad="top"` / `pad="bottom"` drop one side for the rare section that sits
 * directly against a neighbour it must not be spaced from.
 */
export function Section({
  id,
  labelledBy,
  pad = 'both',
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  pad?: 'both' | 'top' | 'bottom' | 'none';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'relative scroll-mt-4',
        pad === 'both' && SECTION_Y,
        pad === 'top' && 'pt-16 sm:pt-20 lg:pt-24',
        pad === 'bottom' && 'pb-16 sm:pb-20 lg:pb-24',
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * The boundary between two marketing movements.
 *
 * The landing used to separate its sections with padding alone, which on a
 * long page reads as one undifferentiated scroll - a reader has no way to tell
 * "this argument ended and another began" from "this paragraph is still
 * going". That gets worse, not better, once a section pins.
 *
 * Deliberately NOT a full-bleed `<hr>`. A hard edge-to-edge rule chops the
 * page into slabs and is the single most template-looking thing a marketing
 * site can do. This reuses the existing `.rule-fade` recipe - a hairline that
 * dissolves at both ends - and aligns it to the same `Container` measure as
 * everything else, so the boundary is legible without being architecture.
 *
 * Decorative: the sections are already `<section aria-labelledby>`, so the
 * structure is in the DOM for assistive tech whether or not a line is drawn.
 */
export function SectionRule() {
  return (
    <div aria-hidden>
      <Container>
        <div className="rule-fade" />
      </Container>
    </div>
  );
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds of stagger delay. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  /** Animate on mount (above the fold) instead of on scroll into view. */
  immediate?: boolean;
}

/**
 * A single gentle entrance. Renders a plain div when the user prefers reduced
 * motion, so nothing ever moves against their wishes.
 *
 * DELIBERATELY TRANSFORM-ONLY (no opacity fade). A scroll-reveal that starts
 * at `opacity: 0` leaves every un-scrolled section invisible - to a static
 * full-page capture, to a printed page, and to anything that reads the DOM
 * without simulating scroll. The page then looks like a hero above a void.
 * Rising 14px from full opacity keeps the entrance legible while guaranteeing
 * the final, meaningful state is always painted.
 */
export function Reveal({ children, className, delay = 0, y = 14, immediate = false }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const transition = { duration: 0.28, ease: EASE, delay };
  const from = { y };
  const to = { y: 0 };

  if (immediate) {
    return (
      <motion.div className={className} initial={from} animate={to} transition={transition}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={from}
      whileInView={to}
      viewport={{ once: true, margin: '-60px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/**
 * The one section header used by every marketing movement, so the editorial
 * rhythm (eyebrow, display heading, optional lede) is declared once instead of
 * being re-typed with slightly different sizes in each section.
 */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  lede,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  titleId?: string;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn('max-w-2xl', className)}>
      <p className="text-caption-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className="mt-3 text-balance font-display text-display-sm text-foreground"
      >
        {title}
      </h2>
      {lede && (
        <p className="mt-4 max-w-[60ch] text-pretty text-body-lg text-ink-muted">
          {lede}
        </p>
      )}
    </Reveal>
  );
}

/**
 * Subtle film grain overlay for stage surfaces (static, aria-hidden,
 * pointer-transparent). Rendered once per stage at ~4% opacity so surfaces
 * feel physical without any visible noise pattern.
 */
export function Grain({ className }: { className?: string }) {
  const raw = useId();
  const filterId = `grain-${raw.replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]', className)}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

/*
 * NOTE: `startHref()` used to live here and returned '/#try' so the nav and
 * closing CTAs scrolled to the hero. That made those CTAs two-click uploads.
 * They now receive the shared picker's `open` from LandingExperience, which is
 * the only place that knows the true runtime guest state (flag AND the 503/404
 * fallback), so there is no href to derive.
 */
