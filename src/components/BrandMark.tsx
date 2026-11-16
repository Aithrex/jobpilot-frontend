import { cn } from '@/lib/utils';

/**
 * THE Aspirely mark. One definition, every surface.
 *
 * There were five hand-rolled copies of this - the landing nav, the landing
 * footer, the workspace window title bar, the auth shell and the app shell -
 * each re-typing `brand-gradient` + a glyph, and each free to drift. They did:
 * one used a chevron, one used a flat `bg-primary` fill that stopped matching
 * the gradient the moment the brand colour changed, and the rest hardcoded
 * `text-white`.
 *
 * WHAT THE MARK IS
 * ----------------
 * Two clock hands on a centre pin that together read as a tick: time saved,
 * and the right role, in one shape. The short hand and the pin take the tile's
 * foreground colour; the long hand is mint, the product's "worth applying to"
 * signal. It replaced the A-shaped ascent on 2026-11-16; the owner chose a
 * mark that does not depend on the initial. (Before that it was lucide's
 * `Sparkles`, which says "there is AI in here" and nothing else.)
 *
 * It is built from stroked geometry rather than a filled silhouette, because
 * a stroked mark keeps its identity at 16px favicon size where a filled one
 * turns into a blob.
 *
 * ONE MARK, BOTH THEMES. The tile used to ride `--brand-from`/`--brand-to`,
 * which also drive gradient TEXT (the landing headline). Text on a dark page
 * has to go pale to stay legible, so the mark went pale with it - a chip
 * carrying its glyph at 1.68:1, i.e. an invisible logo in dark mode. A fill
 * and a piece of text want opposite lightness on the same background, so one
 * pair of tokens could not serve both.
 *
 * The tile has its own `--brand-mark-*` gradient, identical in light and dark,
 * and the glyph rides `--brand-mark-fg-hsl` against it (6.71:1 -> 11.2:1
 * across the ramp), with the long hand on `--brand-mark-accent-hsl`. That is also what makes it literally the same logo
 * everywhere rather than a logo plus a dark-mode variant to keep in sync.
 *
 * ONE SHAPE, EVERY SIZE. Sharing a gradient was not enough, because the call
 * sites still hand-picked geometry: the glyph filled anywhere from 50% to 67%
 * of the tile, and the corner radius was variously 8px, `--radius`, 12px and
 * 5px. Same colour, different proportions - which is exactly what "the header
 * one and the footer one look different" meant. So `size` is the ONLY dial,
 * and the glyph and the radius are derived from it. A logo scales as one
 * object or it is not one logo.
 *
 * Decorative by default: the tile is `aria-hidden`, and the surfaces that use
 * it supply the accessible name on the link or heading beside it.
 */

/** Glyph edge as a fraction of the tile. 0.76 is the small cut of the logo
 * (see docs/brand/logo): every placement in the app is 32px or smaller, where
 * the larger 0.70 cut with an open pin hole stops reading. */
const GLYPH_RATIO = 0.76;
/** Corner radius as a fraction of the tile. At the default 32px this is
 * exactly `rounded-control` (8px). */
const RADIUS_RATIO = 0.25;

/**
 * The mark itself, without the tile. Exported for the rare surface that needs
 * the glyph on its own rather than the filled chip.
 *
 * Geometry notes, so the next editor does not "tidy" it into something that
 * breaks at small sizes:
 *  - The pin sits at (9.9, 16.7), low and left of centre, so the ink of the
 *    whole glyph balances in the tile. Centring the pin pushes the long hand
 *    out of the top-right corner.
 *  - The short hand is 45 degrees and 0.47 of the long one. Longer, and the
 *    pair stops reading as a tick; shorter, and it stops reading as a clock.
 *  - The pin is solid and slightly wider than the stroke (1.06x). Without it
 *    the mark is only a tick; it is what makes the two strokes clock hands.
 *  - Round caps throughout. Butt caps at this weight alias badly at 16px.
 */
export function BrandGlyph({
  className,
  strokeWidth = 3.6,
  style,
}: {
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      {/* The long hand: mint, the signal colour. Drawn first so the pin
          covers its root. */}
      <path
        d="M9.9 16.7 19.9 3.9"
        stroke="hsl(var(--brand-mark-accent-hsl))"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* The short hand. */}
      <path
        d="M4.5 11.3 9.9 16.7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* The centre pin. */}
      <circle cx="9.9" cy="16.7" r={strokeWidth * 1.06} fill="currentColor" />
    </svg>
  );
}

export function BrandMark({
  size = 32,
  className,
  strokeWidth,
}: {
  /** Tile edge in px. Everything else follows from it. */
  size?: number;
  /** Layout/elevation only - geometry comes from `size`. */
  className?: string;
  strokeWidth?: number;
}) {
  // Deliberately NOT rounded to whole pixels. Rounding buys nothing here - the
  // browser rasterises at device pixel ratio regardless - and it distorts the
  // shape at small sizes: at 18px a rounded radius snaps 4.5 up to 5, i.e. 28%
  // instead of 25%, so the miniature mark is measurably rounder than the real
  // one. Exact ratios are the whole point of deriving from `size`.
  const glyph = size * GLYPH_RATIO;
  return (
    <span
      aria-hidden
      // `.brand-mark-gradient` carries the glyph colour too, via a token - no
      // literal `text-white` here, which the landing suite rightly rejects
      // inside the product illustrations.
      className={cn('brand-mark-gradient grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * RADIUS_RATIO,
      }}
    >
      <BrandGlyph style={{ width: glyph, height: glyph }} strokeWidth={strokeWidth} />
    </span>
  );
}

export default BrandMark;
