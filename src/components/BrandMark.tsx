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
 * WHY THE GLYPH IS NOT A SPARKLE ANY MORE
 * ---------------------------------------
 * It used to be lucide's `Sparkles`. A sparkle is the single most over-used
 * glyph in the category - it says "there is AI in here" and nothing else, it
 * is shared with several thousand other products, and it is decorative rather
 * than ownable. Aspirely is not selling the presence of a model; it is selling
 * a job search that keeps its direction.
 *
 * So the mark is now an ASCENT WITH A MARKED DESTINATION: two strokes rising
 * to a point, a crossbar, and a filled node at the apex. It reads as a route
 * climbing toward a waypoint, and it resolves as an "A" without being a letter
 * set in a typeface. Nothing here is a trademark-like borrowing, and it is
 * drawn from scratch as four primitives.
 *
 * It is deliberately built from stroked geometry rather than a filled
 * silhouette, because a stroked mark keeps its identity at 16px favicon size
 * where a filled one turns into a blob.
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
 * across the ramp). That is also what makes it literally the same logo
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

/** Glyph edge as a fraction of the tile. 9/16 - the mean of what the five
 * hand-rolled copies had converged on, and it centres well at every size. */
const GLYPH_RATIO = 0.5625;
/** Corner radius as a fraction of the tile. At the default 32px this is
 * exactly `rounded-control` (8px), so the common case is unchanged. */
const RADIUS_RATIO = 0.25;

/**
 * The mark itself, without the tile. Exported for the rare surface that needs
 * the glyph on its own (a large marketing lockup, an SVG favicon export)
 * rather than the filled chip.
 *
 * Geometry notes, so the next editor does not "tidy" it into something that
 * breaks at small sizes:
 *  - The apex node is r=2.15 on a 24 grid. Below about r=1.8 it stops reading
 *    as a deliberate waypoint at 16px and starts looking like a rendering
 *    artefact of the join.
 *  - The crossbar sits at y=13.4, below the optical centre. Placed at the true
 *    centre it reads as a letter A; lower, it reads as a stage marker on a
 *    route, which is the intent.
 *  - Round caps and joins throughout. Mitred joins at this stroke weight
 *    produce a needle at the apex that aliases badly.
 */
export function BrandGlyph({
  className,
  strokeWidth = 2.2,
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
      {/* The ascent: two strokes climbing to the apex. */}
      <path
        d="M4.7 19.6 12 5.4l7.3 14.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The stage marker across the route. */}
      <path
        d="M8.85 13.4h6.3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* The destination. Filled, so it reads as arrival rather than as
          another segment of the path. */}
      <circle cx="12" cy="5.4" r="2.15" fill="currentColor" />
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
