import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, FileText, Pause, Play, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Grain } from './_shared';
import { FILM_ARIA_LABEL } from './ProductFilm';
import {
  FIXTURE_BULLET,
  FIXTURE_JOBS,
  FIXTURE_SKILLS,
  IntegrityPassRow,
  LockedFactsRow,
  ScoreBadge,
  SkillChip,
} from './fixtures';

/**
 * ProductFilmBody - the deterministic motion-graphics film behind the
 * ProductFilm bezel. One requestAnimationFrame loop advances a single clock
 * MotionValue (seconds, 0..40, looping); every animated property is a
 * useTransform of that clock, so play, pause, and seeking are exact: the
 * frame at t is always the same frame. No <video>, no audio.
 *
 * Scenes (40s loop):
 *   1  0-10s  the resume glides in and parses, sections light up
 *   2 10-20s  five job matches cascade with counting scores + one
 *             sponsorship signal
 *   3 20-32s  the top match is selected, a bullet is reworded under a
 *             highlight sweep, IntegrityGuard stamps the pass
 *   4 32-40s  closing frame with the product promise
 *
 * The clock only runs while the stage is in view and not user-paused. Under
 * reduced motion nothing ever plays: the film parks on a scene end-state and
 * the controls become a "Step through" previous/next pair that jumps between
 * the four end-states.
 *
 * Scenes are laid out on a fixed 640x360 canvas that scales uniformly to the
 * stage width, so composition is identical at every viewport and the 16:9 box
 * never shifts layout.
 */

type MV = MotionValue<number>;

const DURATION = 40;
const CANVAS_W = 640;
const CANVAS_H = 360;
/** End-state time of each scene: where reduced-motion stepping parks. */
const SCENE_REST = [9.2, 19.2, 31.2, 39.2] as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ── Film primitives ─────────────────────────────────────────────────────── */

interface BeatProps {
  t: MV;
  /** [start, end] of the entrance (opacity 0 to 1, rise settles). */
  at: readonly [number, number];
  /** Optional [start, end] of the exit (opacity back to 0). */
  out?: readonly [number, number];
  /** Entrance travel in px. */
  rise?: number;
  /** Entrance scale start (1 = none). */
  scaleFrom?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A film element keyed entirely off the clock: enters at `at`, exits at `out`. */
function Beat({ t, at, out, rise = 0, scaleFrom = 1, className, style, children }: BeatProps) {
  const opacity = useTransform(
    t,
    out ? [at[0], at[1], out[0], out[1]] : [at[0], at[1]],
    out ? [0, 1, 1, 0] : [0, 1],
  );
  const y = useTransform(t, [at[0], at[1]], [rise, 0]);
  const scale = useTransform(t, [at[0], at[1]], [scaleFrom, 1]);
  return (
    <motion.div className={className} style={{ ...style, opacity, y, scale }}>
      {children}
    </motion.div>
  );
}

/** Per-scene caption, bottom left of the canvas. */
function Caption({ t, at, children }: { t: MV; at: number; children: ReactNode }) {
  return (
    <Beat t={t} at={[at, at + 0.6]} rise={10} className="absolute bottom-4 left-6">
      <p className="text-[11px] font-semibold text-muted-foreground">{children}</p>
    </Beat>
  );
}

/** A score badge whose number counts up from the clock itself. */
function FilmScore({ t, at, score }: { t: MV; at: number; score: number }) {
  const n = useTransform(t, [at, at + 0.9], [Math.round(score * 0.4), score]);
  const text = useTransform(n, (v) => String(Math.round(v)));
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 rounded-control bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
      <motion.span>{text}</motion.span>
      <span className="text-[10px] font-medium text-primary/80">est.</span>
    </span>
  );
}

/* ── Scene 1: the resume glides in and parses ────────────────────────────── */

function ParsedSection({
  t,
  at,
  label,
  lines,
  chips,
}: {
  t: MV;
  at: number;
  label: string;
  lines?: readonly string[];
  chips?: readonly string[];
}) {
  const glow = useTransform(t, [at, at + 0.45], [0, 1]);
  return (
    <div className="relative rounded-control border border-border/70 p-2.5">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-control border border-primary/40 bg-primary/5"
        style={{ opacity: glow }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">{label}</p>
        <motion.span style={{ opacity: glow }}>
          <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} aria-hidden />
        </motion.span>
      </div>
      {chips ? (
        <div className="relative mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <SkillChip key={c}>{c}</SkillChip>
          ))}
        </div>
      ) : (
        <div className="relative mt-1.5 space-y-1">
          {(lines ?? []).map((w) => (
            <span key={w} className={cn('block h-1.5 rounded-full bg-muted', w)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneParse({ t }: { t: MV }) {
  const parsingOpacity = useTransform(t, [7.2, 7.7], [1, 0]);
  const parsedOpacity = useTransform(t, [7.2, 7.7], [0, 1]);
  return (
    <Beat t={t} at={[0, 0.6]} out={[9.2, 10]} className="absolute inset-0">
      <Beat
        t={t}
        at={[0.3, 1.6]}
        rise={40}
        className="absolute left-[195px] top-[26px] w-[250px] rounded-xl border border-border bg-card p-4 shadow-pop"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">resume.pdf</p>
            <span className="relative block h-4 text-xs text-muted-foreground">
              <motion.span className="absolute inset-0" style={{ opacity: parsingOpacity }}>
                184 KB, parsing
              </motion.span>
              <motion.span className="absolute inset-0" style={{ opacity: parsedOpacity }}>
                184 KB, parsed
              </motion.span>
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <ParsedSection t={t} at={2.4} label="Experience" lines={['w-4/5', 'w-3/5']} />
          <ParsedSection t={t} at={4.2} label="Skills" chips={FIXTURE_SKILLS.slice(0, 3)} />
          <ParsedSection t={t} at={6.0} label="Education" lines={['w-2/3']} />
        </div>
      </Beat>
      <Caption t={t} at={2.0}>
        Step 1. Your resume, read as written
      </Caption>
    </Beat>
  );
}

/* ── Scene 2: five matches cascade with scores + one sponsorship signal ──── */

function SponsorChip({ t, at }: { t: MV; at: number }) {
  const opacity = useTransform(t, [at, at + 0.5], [0, 1]);
  const scale = useTransform(t, [at, at + 0.5], [0.7, 1]);
  return (
    <motion.span
      style={{ opacity, scale }}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"
    >
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      Sponsorship signal
    </motion.span>
  );
}

function SceneMatches({ t }: { t: MV }) {
  return (
    <Beat t={t} at={[10, 10.6]} out={[19.2, 20]} className="absolute inset-0">
      <Beat
        t={t}
        at={[10.2, 10.8]}
        rise={12}
        className="absolute left-6 top-5 flex items-center gap-1.5 rounded-control border border-border bg-card px-2.5 py-1.5 shadow-soft"
      >
        <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="text-[11px] font-medium text-foreground">resume.pdf</span>
      </Beat>
      {FIXTURE_JOBS.map((job, i) => {
        const at = 11 + i * 0.55;
        return (
          <Beat
            key={job.title}
            t={t}
            at={[at, at + 0.7]}
            rise={20}
            className="absolute left-[120px] w-[400px] rounded-lg border border-border bg-card px-3 shadow-soft"
            style={{ top: 50 + i * 48, height: 40 }}
          >
            <div className="flex h-full items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {job.title}
                <span className="text-muted-foreground"> at {job.company}</span>
              </p>
              {i === 0 && <SponsorChip t={t} at={15.3} />}
              <FilmScore t={t} at={at + 0.35} score={job.score} />
            </div>
          </Beat>
        );
      })}
      <Caption t={t} at={14.4}>
        Step 2. Five matches, scored with reasons
      </Caption>
    </Beat>
  );
}

/* ── Scene 3: selection, rewrite sweep, IntegrityGuard pass ──────────────── */

function SceneTailorFilm({ t }: { t: MV }) {
  const beforeOpacity = useTransform(t, [24.1, 24.7], [1, 0]);
  const afterOpacity = useTransform(t, [24.1, 24.7], [0, 1]);
  const sweepX = useTransform(t, [23.5, 24.9], ['-120%', '340%']);
  const sweepOpacity = useTransform(t, [23.5, 23.7, 24.7, 24.9], [0, 1, 1, 0]);
  return (
    <Beat t={t} at={[20, 20.6]} out={[31.2, 32]} className="absolute inset-0">
      <Beat
        t={t}
        at={[20.2, 21.0]}
        rise={16}
        className="absolute left-[130px] top-[20px] w-[380px] rounded-xl border border-primary/40 bg-card p-3 shadow-pop"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{FIXTURE_JOBS[0].title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {FIXTURE_JOBS[0].company}, selected for tailoring
            </p>
          </div>
          <ScoreBadge score={FIXTURE_JOBS[0].score} />
        </div>
      </Beat>

      <Beat
        t={t}
        at={[21.4, 22.1]}
        rise={14}
        className="absolute left-[90px] top-[102px] w-[460px] rounded-xl border border-border bg-card p-3 shadow-soft"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tailored bullet</p>
        <div className="relative mt-2 h-9 overflow-hidden rounded-control border border-border">
          <motion.p
            className="absolute inset-0 bg-muted/40 px-3 py-2 text-xs leading-tight text-muted-foreground"
            style={{ opacity: beforeOpacity }}
          >
            {FIXTURE_BULLET.before}
          </motion.p>
          <motion.p
            className="absolute inset-0 bg-primary/5 px-3 py-2 text-xs leading-tight text-foreground"
            style={{ opacity: afterOpacity }}
          >
            {FIXTURE_BULLET.after}
          </motion.p>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            style={{ x: sweepX, opacity: sweepOpacity }}
          />
        </div>
      </Beat>

      <Beat t={t} at={[22.3, 22.9]} rise={10} className="absolute left-[90px] top-[196px] w-[460px]">
        <LockedFactsRow />
      </Beat>

      <Beat t={t} at={[27.5, 28.0]} scaleFrom={1.4} className="absolute left-[90px] top-[262px] w-[460px]">
        <IntegrityPassRow />
      </Beat>

      <Caption t={t} at={29.0}>
        Step 3. Reworded for the role, never invented
      </Caption>
    </Beat>
  );
}

/* ── Scene 4: the promise ────────────────────────────────────────────────── */

function SceneClose({ t }: { t: MV }) {
  return (
    <Beat t={t} at={[32, 32.8]} out={[39.2, 40]} className="absolute inset-0">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center">
        <Beat t={t} at={[32.4, 33.0]} rise={10}>
          <p className="font-display text-sm font-bold tracking-tight text-primary">Aspirely</p>
        </Beat>
        <Beat t={t} at={[33.0, 33.9]} rise={14}>
          <p className="max-w-[440px] text-balance font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
            Upload your resume. See the jobs that fit.
          </p>
        </Beat>
        <Beat t={t} at={[33.9, 34.6]} rise={10}>
          <p className="text-xs text-muted-foreground">
            Five matched roles and one tailored resume free. No account or card.
          </p>
        </Beat>
      </div>
    </Beat>
  );
}

/* ── The player body ─────────────────────────────────────────────────────── */

export default function ProductFilmBody() {
  const reduce = !!useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: '-10% 0px' } as Parameters<typeof useInView>[1]);

  const time = useMotionValue(reduce ? SCENE_REST[0] : 0);
  const [playing, setPlaying] = useState(true);
  const [uiTime, setUiTime] = useState(0);
  const [scale, setScale] = useState(1);
  const [restScene, setRestScene] = useState(0);

  const running = playing && inView && !reduce;

  // The single film clock. Pausing (click or offscreen) just stops the loop;
  // the clock, and therefore the frame, freezes in place.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      let t = time.get() + dt;
      if (t >= DURATION) t -= DURATION;
      time.set(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, time]);

  // Quantized UI clock (0.5s) for the timestamp + seek position, so the
  // React tree re-renders twice a second, not per frame.
  useMotionValueEvent(time, 'change', (v) => {
    const q = Math.floor(v * 2) / 2;
    setUiTime((prev) => (prev === q ? prev : q));
  });

  // Reduced motion: park the clock on the chosen scene's end-state.
  useEffect(() => {
    if (reduce) time.set(SCENE_REST[restScene]);
  }, [reduce, restScene, time]);

  // Uniform canvas scale: composition is fixed at 640x360 and scaled to fit.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(w / CANVAS_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    time.set(v);
    setUiTime(v);
  };

  return (
    <>
      <div
        ref={stageRef}
        role="img"
        aria-label={FILM_ARIA_LABEL}
        className="mesh-accent relative aspect-[16/9] w-full overflow-hidden"
      >
        <Grain />
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <SceneParse t={time} />
          <SceneMatches t={time} />
          <SceneTailorFilm t={time} />
          <SceneClose t={time} />
        </div>
      </div>

      {/* Control bar: same 44px height as the shell placeholder (zero CLS). */}
      <div className="flex h-11 items-center gap-3 px-3.5">
        {reduce ? (
          <>
            <p className="shrink-0 text-[11px] font-medium text-background/70">Step through</p>
            <button
              type="button"
              onClick={() => setRestScene((s) => Math.max(0, s - 1))}
              disabled={restScene === 0}
              aria-label="Previous scene"
              className="focus-ring-visible grid h-8 w-8 shrink-0 place-items-center rounded-control text-background/90 hover:bg-background/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p aria-live="polite" className="flex-1 text-center font-mono text-[11px] tabular-nums text-background/70">
              Scene {restScene + 1} of 4
            </p>
            <button
              type="button"
              onClick={() => setRestScene((s) => Math.min(SCENE_REST.length - 1, s + 1))}
              disabled={restScene === SCENE_REST.length - 1}
              aria-label="Next scene"
              className="focus-ring-visible grid h-8 w-8 shrink-0 place-items-center rounded-control text-background/90 hover:bg-background/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause the film' : 'Play the film'}
              className="focus-ring-visible grid h-8 w-8 shrink-0 place-items-center rounded-control text-background/90 hover:bg-background/10"
            >
              {playing ? (
                <Pause className="h-4 w-4" fill="currentColor" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={DURATION}
              step={0.5}
              value={uiTime}
              onChange={onSeek}
              aria-label="Seek through the film"
              aria-valuetext={`${fmt(uiTime)} of ${fmt(DURATION)}`}
              className="h-1.5 min-w-0 flex-1 cursor-pointer [accent-color:hsl(var(--primary))]"
            />
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-background/70">
              {fmt(uiTime)} / {fmt(DURATION)}
            </span>
          </>
        )}
      </div>
    </>
  );
}
