import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import './heroStory.css';

/**
 * The hero's product story: what Aspirely does, shown instead of told.
 *
 *   READ    a resume lands, a scan line reads it, real skills lift off it
 *   MATCH   three job cards arrive on arcs, their match rings fill in mint
 *   TAILOR  the best match steps forward, its resume lines are rewritten
 *   TRACK   the job drops into the tracker's Applied column
 *
 * It replaced a still 3D render (a grey document and cards) that looked good
 * but showed nothing happening. The Blender lessons stay, applied as light
 * rather than as WebGL: a key light on every object, a cobalt rim on the
 * shadow edge, soft contact shadows. All of it is DOM, SVG and CSS keyframes,
 * so it costs no extra chunk and paints with the page.
 *
 * Every moving part shares one 10s loop, so jumping to a chapter is a single
 * negative delay on the stage (`--hs-offset`) plus a remount of the design
 * box (never the root, which the observers hold). Motion pauses
 * when the stage leaves the screen or the tab is hidden, and a visible Pause
 * control is always there (WCAG 2.2.2, the loop runs longer than 5s). With a
 * reduced-motion preference, and in `still` mode (the auth pages), the stage
 * renders its composed final frame and never moves.
 *
 * All data is fictional and the caption says so.
 */

const LOOP_S = 10;

export const STORY_CHAPTERS = [
  { id: 'read', label: 'Read', at: 0 },
  { id: 'match', label: 'Match', at: 3 },
  { id: 'tailor', label: 'Tailor', at: 5.4 },
  { id: 'track', label: 'Track', at: 7.3 },
] as const;

export type StoryChapter = (typeof STORY_CHAPTERS)[number]['id'];

export const STORY_LABEL =
  'Illustration of how Aspirely works: a resume is read, three example jobs arrive with match scores, the best match is tailored, then it is tracked as applied. Fictional, not real data.';

const JOBS = [
  { id: 1, initial: 'H', company: 'Harbor Analytics', role: 'Data Analyst · Remote', score: 86 },
  { id: 2, initial: 'L', company: 'Lumen Labs', role: 'Frontend Engineer · Austin, TX', score: 74 },
  { id: 3, initial: 'C', company: 'Corvid Systems', role: 'Software Engineer I · NYC', score: 61 },
];

function chapterAt(seconds: number): StoryChapter {
  const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
  let current: StoryChapter = 'read';
  for (const c of STORY_CHAPTERS) if (t >= c.at) current = c.id;
  return current;
}

export interface HeroStoryProps {
  /** `live` plays with controls; `still` is the composed end frame, decorative. */
  mode?: 'live' | 'still';
  className?: string;
}

export function HeroStory({ mode = 'live', className }: HeroStoryProps) {
  const reduce = useReducedMotion();
  const still = mode === 'still' || !!reduce;

  const root = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [offset, setOffset] = useState(0);
  const [run, setRun] = useState(0);
  const [chapter, setChapter] = useState<StoryChapter>(still ? 'track' : 'read');

  const paused = still || userPaused || !inView || !tabVisible;

  // Scale the 560x440 design box to the stage width.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 560 || 1);
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stop the loop when nobody can see it.
  useEffect(() => {
    if (still) return;
    const el = root.current;
    let io: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting));
      io.observe(el);
    }
    const sync = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [still]);

  // A clock that mirrors the CSS timeline, only to light the chapter label.
  const clock = useRef<{ base: number; since: number | null }>({ base: 0, since: null });
  useEffect(() => {
    if (still) return;
    const c = clock.current;
    if (paused) {
      if (c.since !== null) {
        c.base += (performance.now() - c.since) / 1000;
        c.since = null;
      }
      return;
    }
    c.since = performance.now();
    const id = window.setInterval(() => {
      const t = c.base + (performance.now() - (c.since ?? performance.now())) / 1000;
      setChapter(chapterAt(t));
    }, 150);
    return () => window.clearInterval(id);
  }, [paused, still, run]);

  const jump = useCallback(
    (at: number, id: StoryChapter) => {
      clock.current = { base: at, since: paused ? null : performance.now() };
      setOffset(-at);
      setRun((r) => r + 1);
      setChapter(id);
    },
    [paused],
  );

  // Depth parallax on fine pointers only. Writes two CSS variables; no React
  // render per mouse move.
  const onPointerMove = (e: React.PointerEvent) => {
    if (still || e.pointerType !== 'mouse') return;
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--hs-px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty('--hs-py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onPointerLeave = () => {
    root.current?.style.setProperty('--hs-px', '0');
    root.current?.style.setProperty('--hs-py', '0');
  };

  return (
    <figure className={cn('relative', className)} data-hero-story={still ? 'still' : 'live'}>
      <div
        ref={root}
        role={still && mode === 'still' ? undefined : 'img'}
        aria-label={mode === 'still' ? undefined : STORY_LABEL}
        aria-hidden={mode === 'still' || undefined}
        data-story-chapter={chapter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={cn('hs-root', still ? 'hs-still' : 'hs-play', paused && !still && 'hs-paused')}
        style={{ ['--hs-offset' as string]: `${offset}s` }}
      >
        <div key={run} className="hs-box" style={{ transform: `scale(${scale})` }}>
          <div className="hs-layer hs-l-back">
            <div className="hs-floor" />
            <div className="hs-contact" />
          </div>

          <div className="hs-layer hs-l-mid">
            <div className="hs-sheet-wrap">
              <div className="hs-sheet">
                <div className="hs-ln hs-ln-h" />
                <div className="hs-ln" style={{ width: '42%' }} />
                <div className="hs-ln" />
                <div className="hs-ln hs-ln-k" style={{ width: '86%' }} />
                <div className="hs-ln" style={{ width: '92%' }} />
                <div className="hs-ln hs-ln-h" style={{ width: '44%', marginTop: 8 }} />
                <div className="hs-ln hs-ln-k hs-ln-k2" />
                <div className="hs-ln" style={{ width: '70%' }} />
                <div className="hs-ln" style={{ width: '88%' }} />
                <div className="hs-ln" style={{ width: '64%' }} />
                <div className="hs-scan" />
              </div>
            </div>
            <span className="hs-chip hs-chip-1">SQL</span>
            <span className="hs-chip hs-chip-2">Python</span>
            <span className="hs-chip hs-chip-3">Tableau</span>
          </div>

          <div className="hs-layer hs-l-front">
            {JOBS.map((j) => (
              <div key={j.id} className={`hs-card hs-card-${j.id}`}>
                <span className="hs-logo">{j.initial}</span>
                <span className="hs-info">
                  <b>{j.company}</b>
                  <span>{j.role}</span>
                </span>
                <span className="hs-ring">
                  <svg width="38" height="38" viewBox="0 0 36 36" aria-hidden>
                    <circle className="hs-track" cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2" />
                    <circle
                      className="hs-val"
                      style={{ ['--hs-v' as string]: j.score }}
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      pathLength={100}
                    />
                  </svg>
                  <em>{j.score}</em>
                </span>
              </div>
            ))}
            <span className="hs-stamp">TAILORED</span>

            <div className="hs-tracker">
              <div className="hs-col">
                Saved<span className="hs-count">3</span>
              </div>
              <div className="hs-col hs-col-on">
                Applied
                <span className="hs-count">
                  <i className="hs-n0">0</i>
                  <i className="hs-n1">1</i>
                </span>
              </div>
              <div className="hs-col">
                Interview<span className="hs-count">0</span>
              </div>
            </div>
            <span className="hs-mini">
              <b>H</b>Harbor
            </span>
          </div>
        </div>
      </div>

      {mode === 'live' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {!still ? (
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Story steps">
              {STORY_CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => jump(c.at, c.id)}
                  aria-current={chapter === c.id ? 'step' : undefined}
                  className={cn(
                    'focus-ring-visible inline-flex h-10 min-w-10 items-center gap-1.5 rounded-full px-2.5 text-label-lg sm:px-3 transition-[background-color,color,transform] duration-150 ease-standard active:scale-[0.96]',
                    chapter === c.id
                      ? 'bg-nav-active text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="hidden tabular-nums opacity-70 sm:inline">{i + 1}</span>
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {!still && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'Play animation' : 'Pause animation'}
              className="focus-ring-visible grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-[color,transform] duration-150 ease-standard hover:text-primary active:scale-[0.94]"
            >
              {userPaused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
            </button>
          )}
        </div>
      )}
      {mode === 'live' && (
        <figcaption className="mt-2 text-center text-caption text-muted-foreground">
          Illustration only. The resume and jobs are fictional, not real results.
        </figcaption>
      )}
    </figure>
  );
}

export default HeroStory;
