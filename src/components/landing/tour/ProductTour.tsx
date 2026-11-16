import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SAMPLE_NOTE, SAMPLE_ROLES } from '../sample';
import { MatchScene } from '../scenes/MatchScene';
import { ReadScene } from '../scenes/ReadScene';
import { TailorScene } from '../scenes/TailorScene';
import { TrackScene } from '../scenes/TrackScene';

/**
 * The hero's picture of the product: a four-step tour a visitor can drive.
 *
 * READ, MATCH, TAILOR, TRACK are the product's four verbs, and each step is a
 * small working scene rather than a screenshot. The tour plays itself like a
 * short film until the visitor touches it. From then on it is theirs: the
 * steps are tabs, and the button inside each scene carries the role they
 * picked into the next one (pick a role, tailor for it, mark it applied, watch
 * the reply move it).
 *
 * WHAT IS REAL AND WHAT IS NOT. The wording of every chip, the score bands
 * and the rule that tailoring never adds a fact are the product's own. The
 * resume and the roles are sample data, and the line under the tour says so
 * in words. Nothing here touches the network.
 *
 * MOTION. Because the film runs longer than five seconds it carries a pause
 * control (WCAG 2.2.2), and it also holds while the pointer is over it. With
 * reduced motion nothing plays by itself and every scene opens already
 * resolved.
 */

/** Accessible name for the whole scene. */
export const TOUR_LABEL = 'A sample tour of Aspirely. Sample data, not real results.';

const STEPS = [
  { id: 'read', verb: 'Read', rest: 'your resume', dwell: 5600 },
  { id: 'match', verb: 'Match', rest: 'roles that fit', dwell: 8400 },
  { id: 'tailor', verb: 'Tailor', rest: 'without inventing', dwell: 7400 },
  { id: 'track', verb: 'Track', rest: 'every reply', dwell: 7600 },
] as const;

/** The film opens on the outcome (the matches), not on the input. */
const FIRST_STEP = 1;

export function ProductTour({
  className,
  onUpload,
}: {
  className?: string;
  /** Opens the page's one file picker. Absent when guest upload is off. */
  onUpload?: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  // A low threshold on purpose: on a phone the tour is taller than the screen,
  // and it should start as soon as a fifth of it is visible.
  const inView = useInView(rootRef, { amount: 0.2 });

  const [step, setStep] = useState(FIRST_STEP);
  const [roleIdx, setRoleIdx] = useState(0);
  const [saved, setSaved] = useState<ReadonlySet<string>>(() => new Set());
  /** The visitor has taken the tour: it never advances by itself again. */
  const [taken, setTaken] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);

  const auto = !reduce && !taken;
  const playing = auto && !paused && !hovering && inView;
  const run = reduce || inView;
  const role = SAMPLE_ROLES[roleIdx];

  // The film's clock. It only runs while the tour is on screen, unpaused and
  // not under the pointer, so a step is never skipped behind the reader's back.
  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    progress.set(0);
  }, [step, progress]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!document.hidden) elapsed.current += now - last;
      last = now;
      const dwell = STEPS[step].dwell;
      progress.set(Math.min(1, elapsed.current / dwell));
      if (elapsed.current >= dwell) {
        setStep((s) => (s + 1) % STEPS.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, step, progress]);

  const go = (next: number) => {
    setTaken(true);
    setStep(next);
  };

  const tabId = (i: number) => `${uid}-step-${i}`;
  const panelId = `${uid}-scene`;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = STEPS.length - 1;
    let next = i;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    go(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div className={className}>
      <motion.div
        ref={rootRef}
        role="group"
        aria-label={TOUR_LABEL}
        data-product-tour={reduce ? 'still' : 'live'}
        className="pub-stage overflow-hidden"
        initial={reduce ? false : { opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        {/* THE STEPS. Real tabs: click or arrow to any of them. Each carries
            the film's progress along its top edge. */}
        <div
          role="tablist"
          aria-label="Tour steps"
          className="grid grid-cols-4 border-b border-border"
        >
          {STEPS.map((s, i) => {
            const isSel = i === step;
            return (
              <button
                key={s.id}
                id={tabId(i)}
                type="button"
                role="tab"
                aria-selected={isSel}
                aria-controls={panelId}
                tabIndex={isSel ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  // On a phone the verb alone fits; the number and the object return
                  // from `sm` up.
                  'relative flex min-w-0 items-center justify-center gap-2.5 px-1.5 py-3.5 text-left transition-colors duration-200 sm:justify-start sm:px-6 sm:py-4',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  i > 0 && 'border-l border-border',
                  isSel ? 'bg-card' : 'bg-[hsl(var(--band))] hover:bg-[hsl(var(--band)/0.55)]',
                )}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
                  {auto ? (
                    <motion.span
                      className="block h-full w-full origin-left bg-primary"
                      style={{ scaleX: i < step ? 1 : isSel ? progress : 0 }}
                    />
                  ) : (
                    <span
                      className={cn(
                        'block h-full w-full origin-left bg-primary transition-transform duration-300',
                        isSel ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'hidden h-6 w-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold tabular-nums transition-colors duration-200 sm:grid',
                    isSel
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[hsl(var(--band-strong))] text-ink-muted',
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 truncate text-[0.9375rem]">
                  <span
                    className={cn(
                      'font-semibold',
                      isSel ? 'text-foreground' : 'text-ink-muted',
                    )}
                  >
                    {s.verb}
                  </span>{' '}
                  <span className="hidden text-muted-foreground md:inline">{s.rest}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={tabId(step)}
          className="lg:min-h-[32.5rem]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={STEPS[step].id}
              initial={reduce ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -18 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              {step === 0 && <ReadScene run={run} onNext={() => go(1)} nudge={auto} />}
              {step === 1 && (
                <MatchScene
                  selected={roleIdx}
                  onSelect={(i) => {
                    setTaken(true);
                    setRoleIdx(i);
                  }}
                  saved={saved}
                  onToggleSave={(id) => {
                    setTaken(true);
                    setSaved((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }}
                  onTailor={() => go(2)}
                  run={run}
                  nudge={auto}
                />
              )}
              {step === 2 && (
                <TailorScene role={role} run={run} onNext={() => go(3)} nudge={auto} />
              )}
              {step === 3 && (
                <TrackScene role={role} run={run} onRestart={() => go(0)} onTry={onUpload} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-4 flex min-h-9 items-center justify-between gap-4">
        <p className="text-[0.8125rem] text-muted-foreground">
          {SAMPLE_NOTE} In the product: employers' own career pages and public H-1B
          filings.
        </p>
        {auto && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play animation' : 'Pause animation'}
            className="focus-ring-visible grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-ink-muted transition-colors hover:text-foreground"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
