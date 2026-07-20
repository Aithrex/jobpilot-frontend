import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useMotionValue } from 'framer-motion';
import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, DUR, EASE, Grain, Reveal, useSceneState } from './_shared';
import { ProductFilm } from './ProductFilm';
import {
  FIXTURE_BULLET,
  FIXTURE_JOBS,
  FIXTURE_REQUIREMENTS,
  FIXTURE_SKILLS,
  IllustrativeChip,
  IntegrityPassRow,
  LockedFactsRow,
  ScoreBadge,
  SkillChip,
} from './fixtures';

/**
 * How it works: an interactive animated pipeline. Three keyboard-accessible
 * step buttons drive one fixed-height stage where the resume document flows
 * through the product: parsed (Upload), connected to requirements while five
 * scored matches fan in (Match), then reworded under locked facts to an
 * IntegrityGuard pass (Tailor). Shared layoutIds carry the document and the
 * selected job card between scenes.
 *
 * Auto-advances every 6s with a per-step progress bar; pauses on hover and
 * on focus within the widget, off screen, and under reduced motion. Reduced
 * motion renders each step as a complete static composition, all three still
 * switchable.
 */

const STEP_MS = 6000;

const STEPS = [
  {
    title: 'Upload resume',
    blurb: 'PDF or DOCX. We read your real experience.',
    sceneLabel:
      'Illustration: a resume document is parsed and its experience, skills, and education sections are read in sequence.',
  },
  {
    title: 'Review five matches',
    blurb: 'Five roles scored against live openings, each with its reason.',
    sceneLabel:
      'Illustration: resume skills connect to job requirements and five scored job matches fan into view. Scores are estimates.',
  },
  {
    title: 'Tailor one resume',
    blurb: 'Reworded for the role you pick. Nothing invented.',
    sceneLabel:
      'Illustration: a resume bullet is reworded for the selected role while employer, title, dates, and skills stay locked, and IntegrityGuard passes the result.',
  },
] as const;

/* ── Scene 1: Upload ─────────────────────────────────────────────────────── */

const DOC_SECTIONS = [
  { label: 'Experience', lines: ['w-4/5', 'w-3/5'] },
  { label: 'Skills', lines: [] },
  { label: 'Education', lines: ['w-2/3'] },
] as const;

function SceneUpload({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <motion.div
        layoutId={reduce ? undefined : 'hiw-doc'}
        className="w-full max-w-[280px] rounded-xl border border-border bg-card p-4 shadow-pop"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">resume.pdf</p>
            <p className="text-xs text-muted-foreground">184 KB, parsed</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {DOC_SECTIONS.map((section, i) => (
            <div key={section.label} className="relative rounded-control border border-border/70 p-2.5">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-control border border-primary/40 bg-primary/5"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.55 + i * 0.75, duration: DUR.fast }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-foreground">{section.label}</p>
                <motion.span
                  initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduce ? 0 : 0.7 + i * 0.75, duration: DUR.fast }}
                >
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} aria-hidden />
                </motion.span>
              </div>
              {section.lines.length > 0 ? (
                <div className="relative mt-1.5 space-y-1">
                  {section.lines.map((w) => (
                    <span key={w} className={cn('block h-1.5 rounded-full bg-muted', w)} />
                  ))}
                </div>
              ) : (
                <div className="relative mt-1.5 flex flex-wrap gap-1">
                  {FIXTURE_SKILLS.slice(0, 3).map((s) => (
                    <SkillChip key={s}>{s}</SkillChip>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
      <p className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        Experience, skills, and education read as written
        <IllustrativeChip />
      </p>
    </div>
  );
}

/* ── Scene 2: Match ──────────────────────────────────────────────────────── */

function SceneMatch({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-full flex-col gap-1.5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <motion.div
          layoutId={reduce ? undefined : 'hiw-doc'}
          className="flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-card px-2.5 py-1.5 shadow-soft"
        >
          <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="text-[11px] font-medium text-foreground">resume.pdf</span>
        </motion.div>
        <div className="flex flex-wrap gap-1.5">
          {FIXTURE_SKILLS.map((skill, i) => (
            <motion.span
              key={skill}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.15 + i * 0.07, duration: DUR.fast, ease: EASE }}
            >
              <SkillChip>{skill}</SkillChip>
            </motion.span>
          ))}
        </div>
      </div>

      {/* animated connector paths from skills down to the lead card */}
      <div className="relative h-9 shrink-0" aria-hidden>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {[
            [16, 44],
            [38, 50],
            [62, 56],
          ].map(([x0, x1], i) => (
            <motion.path
              key={i}
              d={`M ${x0} 0 C ${x0} 62, ${x1} 38, ${x1} 100`}
              fill="none"
              stroke="hsl(var(--primary) / 0.45)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.45 + i * 0.14, duration: DUR.slow, ease: EASE }}
            />
          ))}
        </svg>
      </div>

      {/* lead match card with requirement chips */}
      <motion.div
        layoutId={reduce ? undefined : 'hiw-job0'}
        className="rounded-xl border border-primary/30 bg-card p-3 shadow-pop"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.65, duration: DUR.base, ease: EASE }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{FIXTURE_JOBS[0].title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{FIXTURE_JOBS[0].company}, via its careers site</p>
          </div>
          <ScoreBadge score={FIXTURE_JOBS[0].score} countUp={!reduce} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FIXTURE_REQUIREMENTS.map((req) => (
            <SkillChip key={req.label} tone={req.matched ? 'matched' : 'gap'}>
              {req.label}
            </SkillChip>
          ))}
        </div>
      </motion.div>

      {/* four more matches fan in behind */}
      <div className="relative mt-1 min-h-0 flex-1">
        {FIXTURE_JOBS.slice(1).map((job, i) => (
          <motion.div
            key={job.title}
            className="absolute inset-x-1 rounded-lg border border-border bg-card px-3 py-1.5 shadow-soft"
            style={{ top: i * 30, zIndex: 4 - i }}
            initial={reduce ? false : { opacity: 0, y: 18, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: (i - 1.5) * 0.8 }}
            transition={{ delay: reduce ? 0 : 0.9 + i * 0.1, duration: DUR.base, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-foreground">
                {job.title}
                <span className="text-muted-foreground"> at {job.company}</span>
              </p>
              <ScoreBadge size="xs" score={job.score} countUp={!reduce} />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-end">
        <IllustrativeChip />
      </div>
    </div>
  );
}

/* ── Scene 3: Tailor ─────────────────────────────────────────────────────── */

function SceneTailor({ reduce }: { reduce: boolean }) {
  // Internal beat: before -> sweep -> after -> integrity pass. Parks on the
  // resolved end state under reduced motion.
  const [beat, setBeat] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) {
      setBeat(3);
      return;
    }
    const ids = [
      window.setTimeout(() => setBeat(1), 850),
      window.setTimeout(() => setBeat(2), 1750),
      window.setTimeout(() => setBeat(3), 2600),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [reduce]);

  return (
    <div className="flex h-full flex-col gap-2.5 p-4">
      <motion.div
        layoutId={reduce ? undefined : 'hiw-job0'}
        className="rounded-xl border border-primary/30 bg-card p-3 shadow-soft"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{FIXTURE_JOBS[0].title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{FIXTURE_JOBS[0].company}, selected for tailoring</p>
          </div>
          <ScoreBadge score={FIXTURE_JOBS[0].score} />
        </div>
      </motion.div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-pop">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tailored bullet</p>
          <IllustrativeChip />
        </div>
        <div className="relative mt-2 overflow-hidden rounded-control border border-border">
          <AnimatePresence mode="wait" initial={false}>
            {beat < 2 ? (
              <motion.p
                key="before"
                className="bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: DUR.fast, ease: EASE }}
              >
                {FIXTURE_BULLET.before}
              </motion.p>
            ) : (
              <motion.p
                key="after"
                className="bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
              >
                {FIXTURE_BULLET.after}
              </motion.p>
            )}
          </AnimatePresence>
          {!reduce && (beat === 1 || beat === 2) && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              initial={{ x: '-120%' }}
              animate={{ x: '340%' }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )}
        </div>
        <motion.div
          className="mt-2.5"
          initial={false}
          animate={{ opacity: beat >= 3 ? 1 : 0, y: beat >= 3 || reduce ? 0 : 6 }}
          transition={{ duration: DUR.base, ease: EASE }}
        >
          <IntegrityPassRow />
        </motion.div>
      </div>

      {/* immutable throughout the scene */}
      <LockedFactsRow className="mt-auto" />
    </div>
  );
}

/* ── The section ─────────────────────────────────────────────────────────── */

export function HowItWorks() {
  const { ref, inView, reduce } = useSceneState<HTMLDivElement>();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const running = inView && !reduce && !hovered && !focused;

  // 6s auto-advance driven by one rAF loop writing a MotionValue, so the
  // progress bar and the step change can never drift apart. Pausing simply
  // stops the loop; progress freezes in place and resumes later.
  const progress = useMotionValue(0);
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => setActive((a) => (a + 1) % STEPS.length);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      let p = progress.get() + dt / STEP_MS;
      if (p >= 1) {
        p = 0;
        advanceRef.current();
      }
      progress.set(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, progress]);

  const select = useCallback(
    (i: number) => {
      setActive(i);
      progress.set(0);
    },
    [progress],
  );

  const onListKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (active + 1) % STEPS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (active - 1 + STEPS.length) % STEPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = STEPS.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(next);
    btnRefs.current[next]?.focus();
  };

  return (
    <section id="how-it-works" aria-label="How it works" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Three steps, no busywork
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Upload once, review real matches, tailor for the role you pick.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            ref={ref}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={() => setFocused(false)}
            className="mx-auto mt-10 grid max-w-5xl items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10"
          >
            {/* Step buttons */}
            <ol className="space-y-2.5" onKeyDown={onListKeyDown}>
              <li className="sr-only">
                Steps advance automatically. Use the buttons, or arrow keys, to choose a step; advancing pauses while you
                point at or focus this area.
              </li>
              {STEPS.map((step, i) => {
                const isActive = i === active;
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      ref={(el) => (btnRefs.current[i] = el)}
                      onClick={() => select(i)}
                      aria-current={isActive ? 'step' : undefined}
                      className={cn(
                        'focus-ring-visible flex min-h-[44px] w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none',
                        isActive
                          ? 'border-primary/40 bg-primary/5 shadow-soft'
                          : 'border-border bg-card hover:border-input hover:shadow-soft',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold tabular-nums',
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-sm font-semibold',
                            isActive ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {step.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{step.blurb}</span>
                        {/* auto-advance progress, decorative */}
                        <span aria-hidden className="mt-2.5 block h-0.5 overflow-hidden rounded-full bg-border/70">
                          {isActive && !reduce && (
                            <motion.span
                              className="block h-full w-full origin-left bg-primary"
                              style={{ scaleX: progress }}
                            />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* The stage. Fixed height so advancing never shifts layout. */}
            <div
              role="img"
              aria-label={STEPS[active].sceneLabel}
              className="mesh-accent relative h-[420px] overflow-hidden rounded-container border border-border shadow-panel sm:h-[400px]"
            >
              <Grain />
              <LayoutGroup>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active}
                    className="absolute inset-0"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: DUR.fast, ease: EASE }}
                  >
                    {active === 0 && <SceneUpload reduce={reduce} />}
                    {active === 1 && <SceneMatch reduce={reduce} />}
                    {active === 2 && <SceneTailor reduce={reduce} />}
                  </motion.div>
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </div>
        </Reveal>

        {/* The section's closing element: the whole pipeline as one film. */}
        <ProductFilm />
      </Container>
    </section>
  );
}
