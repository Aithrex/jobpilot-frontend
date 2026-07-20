import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FileText, Play } from 'lucide-react';
import { Reveal } from './_shared';
import { IllustrativeChip } from './fixtures';

/**
 * ProductFilm - the "Aspirely in 40 seconds" player that closes the
 * How-it-works section. A 16:9 video-player bezel (chrome top bar with
 * window dots and a title, play/pause, a real seek range input, timestamps)
 * around a deterministic code-native motion-graphics film: no <video> file,
 * no audio, just SVG/DOM scenes driven by one requestAnimationFrame clock
 * inside the lazy body.
 *
 * This shell is the only eager code: a fixed-geometry bezel + a static
 * poster. The film body mounts through React.lazy once the player scrolls
 * near the viewport, so the film costs ~0 eager JS. The poster and the live
 * body share the exact same box model (aspect-video stage + fixed-height
 * control bar), so the swap causes zero layout shift.
 */

const ProductFilmBody = lazy(() => import('./ProductFilmBody'));

export const FILM_TITLE = 'Aspirely in 40 seconds';

export const FILM_ARIA_LABEL =
  'Product film, illustrative: a resume is uploaded and parsed, five scored job matches appear with one sponsorship signal, one match is selected and a bullet is rewritten and passes IntegrityGuard, ending on the product promise.';

/** Static poster frame: shown before the lazy body mounts (and as Suspense fallback). */
function FilmPoster() {
  return (
    <>
      {/* aspect-[16/9], not aspect-video: the legacy @tailwindcss/aspect-ratio
          plugin suppresses the named core aspect utilities (arbitrary values
          still compile). aspect-video silently collapses to height 0. */}
      <div role="img" aria-label={FILM_ARIA_LABEL} className="mesh-accent relative aspect-[16/9] w-full overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex w-full max-w-[240px] items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-pop">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
              <FileText className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">resume.pdf</p>
              <p className="text-xs text-muted-foreground">184 KB, ready</p>
            </div>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop">
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
          </span>
          <p className="text-[11px] font-medium text-muted-foreground">Upload, match, tailor, verified</p>
        </div>
      </div>
      {/* Control bar placeholder: same height as the live bar, zero CLS. */}
      <div aria-hidden className="flex h-11 items-center gap-3 px-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center text-background/60">
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
        </span>
        <span className="h-1.5 flex-1 rounded-full bg-background/20" />
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-background/60">0:00 / 0:40</span>
      </div>
    </>
  );
}

export function ProductFilm() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  // Mount the lazy film body shortly before the player scrolls into view.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '280px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Reveal delay={0.05} className="mx-auto mt-12 max-w-4xl">
      <div
        ref={hostRef}
        className="overflow-hidden rounded-container border border-border bg-foreground shadow-float"
      >
        {/* Chrome top bar: window dots + title + honesty chip. */}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <span aria-hidden className="flex shrink-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-xs font-medium text-background/80">{FILM_TITLE}</p>
          <IllustrativeChip className="shrink-0 border-background/20 bg-background/10 text-background/70" />
        </div>
        {near ? (
          <Suspense fallback={<FilmPoster />}>
            <ProductFilmBody />
          </Suspense>
        ) : (
          <FilmPoster />
        )}
      </div>
    </Reveal>
  );
}
