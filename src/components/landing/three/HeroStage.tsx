import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { afterLoadAndIdle, canUse3D } from './canUse3D';
import { readStagePalette } from './palette';
import { POSTER, POSTER_HEIGHT, POSTER_WIDTH, SWEEP } from './poster';

/**
 * The hero's 3D stage: a static poster first, a real-time scene second.
 *
 * The POSTER is the experience and the LCP candidate: a plain `<img>` with
 * explicit dimensions inside a fixed aspect-ratio box, so nothing shifts when
 * anything else arrives. It is a frame rendered from the same scene, one per
 * theme.
 *
 * The CANVAS is an enhancement. Its chunk (three, fiber, drei and the scene)
 * is requested only after `load` and an idle callback, only while the stage
 * is on screen, and only when `canUse3D()` says yes (WebGL2 without a major
 * performance caveat, no reduced-motion preference, no data saver, no
 * obviously low-power device). It fades in over the poster after its first
 * frame, posed exactly like the poster. If anything fails, the poster stays.
 *
 * Accessibility: the stage is one image to assistive tech. Before the canvas
 * is ready the poster carries the description as its alt text; once ready,
 * the poster goes silent and the canvas carries the same text as
 * `role="img"` + `aria-label`. Nothing essential exists only here: the
 * headline and actions beside it are the message. The motion loops for more
 * than five seconds, so a visible Pause control sits on the stage (WCAG
 * 2.2.2), and the loop stops whenever the stage is off screen or the tab is
 * hidden.
 */

const HeroScene = lazy(() => import('./HeroScene'));

export const STAGE_LABEL =
  'Illustration of a resume sheet splitting into three example job cards. Fictional, not real data.';

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroStage({ theme, className }: { theme: 'light' | 'dark'; className?: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [tone, setTone] = useState<string | undefined>(undefined);

  // Decide once, after load + idle, while on screen.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let cancelIdle: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || cancelIdle) return;
        cancelIdle = afterLoadAndIdle(() => {
          if (canUse3D()) setMount(true);
        });
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelIdle?.();
    };
  }, []);

  // Once mounted: pause rendering when scrolled away or the tab is hidden.
  useEffect(() => {
    const el = box.current;
    if (!mount || !el) return;
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting));
    io.observe(el);
    const sync = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [mount]);

  // Tokens are read from the stage's own subtree AFTER commit, when the
  // surface class for this theme is already on the page root; reading during
  // render would pick up the previous theme's values.
  const [palette, setPalette] = useState(() => readStagePalette(null, theme));
  useLayoutEffect(() => {
    if (mount) setPalette(readStagePalette(box.current, theme));
  }, [theme, mount]);

  const active = mount && ready && inView && visible && playing;

  return (
    <figure className={cn('relative', className)}>
      <div
        ref={box}
        data-hero-stage={ready ? 'live' : 'poster'}
        data-tone-mapping={tone}
        className="relative aspect-[5/4] w-full overflow-hidden rounded-container border border-border shadow-soft"
        // The studio sweep behind the objects, drawn from tokens so the poster
        // (which bakes the same sweep) and the live canvas sit on one backdrop.
        style={{ backgroundImage: SWEEP[theme] }}
      >
        <img
          src={POSTER[theme]}
          width={POSTER_WIDTH}
          height={POSTER_HEIGHT}
          alt={ready ? '' : STAGE_LABEL}
          aria-hidden={ready || undefined}
          decoding="async"
          {...({ fetchpriority: 'high' } as Record<string, string>)}
          className={cn(
            'absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-500 ease-out',
            ready ? 'opacity-0' : 'opacity-100',
          )}
          draggable={false}
        />
        {mount && (
          <SceneBoundary onError={() => setMount(false)}>
            <Suspense fallback={null}>
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-500 ease-out',
                  ready ? 'opacity-100' : 'opacity-0',
                )}
              >
                <HeroScene
                  palette={palette}
                  active={active}
                  label={STAGE_LABEL}
                  onReady={() => setReady(true)}
                  onToneMapping={setTone}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
        {mount && ready && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
            className="focus-ring-visible glass-pane absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors duration-200 hover:text-primary"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-center text-caption text-muted-foreground">
        Illustration only. The resume and job cards are fictional, not real results.
      </figcaption>
    </figure>
  );
}
