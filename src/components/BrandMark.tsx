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
 * THE GLYPH COLOUR IS THE POINT. `--brand-from`/`--brand-to` invert with the
 * theme - deep teal on a light page, LIFTED teal on a dark one, because a mark
 * that stays dark on a dark page disappears. A hardcoded white glyph is
 * therefore correct in light and wrong in dark, where it sits on the light end
 * of the gradient at about 2:1. `text-primary-foreground` tracks the fill's
 * own lightness in both directions, so one mark stays legible everywhere and
 * no second "dark mode logo" has to be drawn or kept in sync.
 *
 * Decorative by default: the tile is `aria-hidden`, and the surfaces that use
 * it supply the accessible name on the link or heading beside it.
 */
export function BrandMark({
  className,
  iconClassName,
  strokeWidth,
}: {
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'brand-gradient grid shrink-0 place-items-center rounded-control text-primary-foreground',
        className ?? 'h-8 w-8',
      )}
    >
      <Sparkles
        className={cn(iconClassName ?? 'h-[1.15rem] w-[1.15rem]')}
        strokeWidth={strokeWidth}
        aria-hidden
      />
    </span>
  );
}

export default BrandMark;
