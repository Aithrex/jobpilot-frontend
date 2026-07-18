import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clapperboard, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, Reveal, SectionHeading } from '../_shared';
import { BEATS, PITCH_TOTAL, beatDuration, formatTime, sceneAt } from './pitchScript';
import { usePitchClock } from './usePitchClock';
import { CountdownChip, FOCUS_DARK, MonoTag, SceneCard } from './_pitchKit';

/**
 * "Aspirely in 60 seconds" — a cinematic, code-built, auto-advancing AND
 * scrubbable product tour. The hero's pitch CTA anchors here (#pitch).
 *
 * Architecture:
 *   · The stage is a self-contained dark film frame (dark in both themes).
 *   · usePitchClock drives a 60s rAF accumulator; it runs only while playing,
 *     in view, and with the document visible — so it pauses off-screen.
 *   · Scenes are pure functions of local progress, so play, seek, and the
 *     reduced-motion stepper all render deterministically from one clock.
 *   · The scenes bundle is code-split (preloaded near the viewport); ONLY the
 *     lightweight poster renders above the fold, and the frame's aspect-ratio
 *     box reserves its height, so there is zero layout shift.
 *   · Reduced motion: no autoplay, no clock — a prev/next stepper with chapter
 *     dots showing each scene's static end-state (`progress = 1`).
 *   · No audio anywhere. The full story is also available to screen readers
 *     as a visually-hidden transcript (the captions are NOT aria-live).
 */

const PitchScenes = lazy(() => import('./PitchScenes'));

type InViewOptions = Parameters<typeof useInView>[1];

// ── The film frame ───────────────────────────────────────────────────────────
function StageFrame({ frameRef, children }: { frameRef?: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div
      ref={frameRef}
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0D1E]',
        'aspect-[3/4] min-h-[460px] sm:aspect-[16/10] sm:min-h-0',
        'shadow-[0_30px_90px_-30px_rgba(10,13,30,0.85),0_0_70px_-24px_rgba(99,102,241,0.35)]',
      )}
    >
      {/* soft top glow — the projector beam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(99,102,241,0.14),transparent_60%)]"
      />
      {children}
    </div>
  );
}

// ── Poster (renders immediately — NOT part of the lazy scenes chunk) ─────────
function PosterStill() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
      <CountdownChip days={90} />
      <SceneCard className="w-full max-w-sm p-3.5 opacity-80">
        <MonoTag className="text-white/50">Sourced stat</MonoTag>
        <p className="mt-1.5 text-[13px] leading-snug text-white/85">
          100+ apps a day: about 39% less likely to get a positive response.
        </p>
      </SceneCard>
      <MonoTag className="text-white/40">7 chapters · 60 seconds · no audio</MonoTag>
    </div>
  );
}

// ── Caption block (fixed height: growing text never resizes the scene) ───────
function CaptionBlock({ index, title, caption }: { index: number; title: string; caption: string }) {
  return (
    <div className="relative flex h-24 flex-col items-center gap-1 overflow-hidden px-4 pt-1.5 text-center sm:h-[4.75rem] sm:px-10">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-indigo-300/80">
        Chapter {index + 1} of 7 · {title}
      </p>
      <p className="text-[13px] leading-snug text-white/85 sm:text-sm">{caption}</p>
    </div>
  );
}

// ── Scrubber (a real range input; arrows jump chapters) ──────────────────────
function Scrubber({
  elapsed,
  sceneIndex,
  onScrub,
  onJump,
}: {
  elapsed: number;
  sceneIndex: number;
  onScrub: (t: number) => void;
  onJump: (dir: -1 | 1) => void;
}) {
  const pct = `${(elapsed / PITCH_TOTAL) * 100}%`;
  return (
    <div className="relative flex h-11 min-w-0 flex-1 items-center">
      {/* track + fill */}
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-indigo-400" style={{ width: pct }} />
      </div>
      {/* 7 chapter ticks */}
      {BEATS.map((b) => (
        <span
          key={b.id}
          aria-hidden
          className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full bg-white/40"
          style={{ left: `${(b.at / PITCH_TOTAL) * 100}%` }}
        />
      ))}
      <input
        type="range"
        min={0}
        max={PITCH_TOTAL}
        step={0.1}
        value={elapsed}
        onChange={(e) => onScrub(parseFloat(e.currentTarget.value))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onJump(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            onJump(1);
          }
        }}
        aria-label="Pitch timeline"
        aria-valuetext={`${Math.round(elapsed)} seconds of 60. Chapter ${sceneIndex + 1} of 7: ${BEATS[sceneIndex].title}`}
        className={cn(
          'relative z-10 h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent',
          FOCUS_DARK,
          // webkit: transparent 4px track + a real styled thumb, vertically centered
          '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent',
          '[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow',
          '[&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent',
          '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
        )}
      />
    </div>
  );
}

// ── The full player (motion allowed) ─────────────────────────────────────────
function PitchPlayer() {
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef);
  const nearView = useInView(frameRef, { once: true, margin: '360px' } as InViewOptions);
  const [docVisible, setDocVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const onVisibility = () => setDocVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Preload the scenes chunk once the section approaches the viewport.
  useEffect(() => {
    if (nearView) void import('./PitchScenes');
  }, [nearView]);

  const { elapsed, playing, seek, toggle } = usePitchClock({
    total: PITCH_TOTAL,
    active: inView && docVisible,
  });
  const { index, progress, duration } = sceneAt(elapsed);
  const beat = BEATS[index];

  const onToggle = () => {
    setStarted(true);
    toggle();
  };
  const onScrub = (t: number) => {
    setStarted(true);
    seek(t);
  };
  const onJump = (dir: -1 | 1) => {
    setStarted(true);
    if (dir === 1) {
      seek(index + 1 < BEATS.length ? BEATS[index + 1].at : PITCH_TOTAL);
    } else if (index > 0 && elapsed - beat.at < 1.5) {
      seek(BEATS[index - 1].at);
    } else {
      seek(beat.at);
    }
  };

  return (
    <StageFrame frameRef={frameRef}>
      {/* the scene — decorative; the transcript below is the text alternative */}
      <div aria-hidden className="relative min-h-0 flex-1 overflow-hidden">
        {started ? (
          <Suspense fallback={<PosterStill />}>
            <PitchScenes scene={index} progress={progress} duration={duration} />
          </Suspense>
        ) : (
          <PosterStill />
        )}
        {!started && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Play the 60-second pitch"
            className="group absolute inset-0 z-10 grid place-items-center focus-visible:outline-none"
          >
            <span className="flex flex-col items-center gap-3">
              <span
                className={cn(
                  'grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur',
                  'transition-transform duration-200 ease-expo group-hover:scale-105',
                  'group-focus-visible:ring-2 group-focus-visible:ring-indigo-300 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#0A0D1E]',
                )}
              >
                <Play className="ml-0.5 h-6 w-6 text-white" fill="currentColor" aria-hidden />
              </span>
              <span className="text-xs font-medium text-white/80">Play the 60-second pitch</span>
            </span>
          </button>
        )}
      </div>

      <CaptionBlock index={index} title={beat.title} caption={beat.caption} />

      {/* player chrome */}
      <div className="relative border-t border-white/10 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? 'Pause the pitch' : 'Play the pitch'}
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/10',
              FOCUS_DARK,
            )}
          >
            {playing ? (
              <Pause className="h-4 w-4" fill="currentColor" aria-hidden />
            ) : (
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
            )}
          </button>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/60">
            {formatTime(elapsed)} / 1:00
          </span>
          <Scrubber elapsed={elapsed} sceneIndex={index} onScrub={onScrub} onJump={onJump} />
        </div>
      </div>
    </StageFrame>
  );
}

// ── Reduced-motion stepper (no autoplay, no animation — same information) ────
function PitchStepper() {
  const frameRef = useRef<HTMLDivElement>(null);
  const nearView = useInView(frameRef, { once: true, margin: '360px' } as InViewOptions);
  const [index, setIndex] = useState(0);
  const beat = BEATS[index];

  return (
    <StageFrame frameRef={frameRef}>
      <div aria-hidden className="relative min-h-0 flex-1 overflow-hidden">
        {nearView ? (
          <Suspense fallback={<PosterStill />}>
            <PitchScenes scene={index} progress={1} duration={beatDuration(index)} />
          </Suspense>
        ) : (
          <PosterStill />
        )}
      </div>

      <CaptionBlock index={index} title={beat.title} caption={beat.caption} />

      <div className="relative border-t border-white/10 px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous chapter"
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/10 disabled:opacity-40',
              FOCUS_DARK,
            )}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div role="group" aria-label="Pitch chapters" className="flex min-w-0 flex-1 items-center justify-center">
            {BEATS.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Chapter ${i + 1}: ${b.title}`}
                aria-current={i === index ? 'step' : undefined}
                className={cn('grid h-11 min-w-8 max-w-11 flex-1 place-items-center rounded-full', FOCUS_DARK)}
              >
                <span
                  aria-hidden
                  className={cn('h-1.5 w-1.5 rounded-full', i === index ? 'bg-indigo-300' : 'bg-white/30')}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(BEATS.length - 1, i + 1))}
            disabled={index === BEATS.length - 1}
            aria-label="Next chapter"
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/10 disabled:opacity-40',
              FOCUS_DARK,
            )}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </StageFrame>
  );
}

// ── Text alternative: the full transcript, visually hidden ───────────────────
function PitchTranscript() {
  return (
    <div className="sr-only">
      <h3>Aspirely in 60 seconds, full transcript</h3>
      <ol>
        {BEATS.map((b) => (
          <li key={b.id}>
            {b.title}. {b.caption}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── The section ──────────────────────────────────────────────────────────────
export function PitchSection() {
  const reduce = useReducedMotion();
  return (
    <section id="pitch" className="scroll-mt-16 py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The pitch"
            eyebrowIcon={Clapperboard}
            title="Aspirely in 60 seconds"
            subtitle="Seven chapters, sixty seconds, no audio. Press play, or scrub anywhere."
          />
        </Reveal>
        <Reveal delay={0.06} className="mx-auto mt-10 max-w-4xl">
          {reduce ? <PitchStepper /> : <PitchPlayer />}
        </Reveal>
        <PitchTranscript />
      </Container>
    </section>
  );
}

export default PitchSection;
