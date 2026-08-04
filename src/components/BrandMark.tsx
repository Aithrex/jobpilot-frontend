import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * THE Aspirely mark. One definition, every surface.
 *
 * There were five hand-rolled copies of this - the landing nav, the landing
 * footer, the workspace window title bar, the auth shell and the app shell -
 * each re-typing `brand-gradient` + a Sparkles glyph, and each free to drift.
 * They did: one used a chevron instead of the glyph, one used a flat
 * `bg-primary` fill that stopped matching the gradient the moment the brand
 * colour changed, and the rest hardcoded `text-white`.
 *
 * ONE MARK, BOTH THEMES. The tile used to ride `--brand-from`/`--brand-to`,
 * which also drive gradient TEXT (the landing headline). Text on a dark page
 * has to go pale to stay legible, so the mark went pale with it - a lavender
 * chip carrying its glyph at 1.68:1, i.e. an invisible logo in dark mode. A
 * fill and a piece of text want opposite lightness on the same background, so
 * one pair of tokens could not serve both.
 *
 * The tile now has its own `--brand-mark-*` gradient, identical in light and
 * dark, and the glyph rides `--brand-mark-fg-hsl` against it (4.31:1 -> 7.02:1
 * across the ramp). That is also what makes it literally the same logo
 * everywhere rather than a logo plus a dark-mode variant to keep in sync.
 *
 * ONE SHAPE, EVERY SIZE. Sharing a gradient was not enough, because the call
 * sites still hand-picked geometry: the glyph filled anywhere from 50% to 67%
 * of the tile, and the corner radius was variously 8px, `--radius`, 12px and
 * 5px. Same colour, different proportions - which is exactly what "the header
 * one and the footer one look different" meant. So `size` is now the ONLY
 * dial, and the glyph and the radius are derived from it. A logo scales as one
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
      <Sparkles style={{ width: glyph, height: glyph }} strokeWidth={strokeWidth} aria-hidden />
    </span>
  );
}

export default BrandMark;
