import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { MacWindow } from './workspace/MacWindow';
import { CinematicStage } from './workspace/CinematicStage';
import { useCinematic } from './workspace/useCinematic';
import { useIsWide } from './useIsWide';

/**
 * The idle hero's right column: a live DOM picture of the workspace.
 *
 * This is not a screenshot, not a film, and not fabricated results. The
 * window chrome is ours; the panels inside are redacted structure (bars and
 * empty slots) walking the real Read → Match → Tailor → Track loop. A caption
 * on the stage says so. The same MacWindow is what the guest flow occupies
 * once a resume is actually uploaded - so the first frame is a picture of
 * the product, not a different visual language that then disappears.
 *
 * Hidden below `lg`. On a phone the copy and the dropzone are the whole hero;
 * the "How it works" section already shows the same product surfaces in
 * reading order, so stacking a second window above the fold would just push
 * the actions down.
 */
export function HeroPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const wide = useIsWide();
  const inView = useInView(ref, { amount: 0.25 });
  const tour = useCinematic({ live: wide && inView, takeover: false });

  return (
    <div
      ref={ref}
      className="relative hidden min-w-0 lg:col-span-6 lg:block xl:col-span-7"
    >
      <MacWindow status="ready" statusLabel="Ready" animateArrival>
        <CinematicStage
          beat={tour.beat}
          onSelectBeat={tour.select}
          autoplay={tour.autoplay}
          holdMs={tour.holdMs}
          onHold={tour.hold}
        />
      </MacWindow>
      <p className="mt-3 text-center text-[12px] text-muted-foreground">
        An example of the Aspirely workspace. The layouts are ours; the values shown are
        placeholders, not real results.
      </p>
    </div>
  );
}
