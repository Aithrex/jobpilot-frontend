import { createContext, useCallback, useContext, useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FileText, Lock, ShieldCheck, Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CinematicBeat } from './useCinematic';

/**
 * CinematicStage - the illustrative, pre-upload product tour.
 *
 * ONE SCENE AT A TIME (this is the layout contract).
 * The stage used to ACCUMULATE: reaching the last beat left the resume sheet,
 * the profile, five opportunity rows, the tailor diff AND the pipeline board
 * all stacked in one window. That window was roughly twice the height of the
 * viewport it had to live in, so a visitor landing on the page saw a workflow
 * running off the bottom of the screen and never met the upload control seated
 * underneath it. Each beat now OWNS the stage: exactly one scene renders, they
 * cross-fade, and the container height is fixed so the window never resizes
 * mid-tour. Four tabs, four scenes, one payoff each.
 *
 * HONESTY CONTRACT (enforced by tests):
 * Everything on this stage is REDACTED STRUCTURE - bars, pills and empty
 * slots. There is not one fictional company, job title, resume line, or match
 * score anywhere in this file, because a landing page that invents a "92% match
 * at Stripe" is lying about the product. What the tour shows is the SHAPE of
 * the workflow; the real content only ever arrives from a real upload. The
 * "Illustrative workflow" badge says so in plain sight.
 *
 * ACCESSIBILITY CONTRACT:
 * The stage is NOT aria-hidden. It is a product demonstration, and hiding the
 * whole thing meant a screen-reader user was told nothing about what Aspirely
 * does. Only the genuinely meaningless sub-elements (bars, chips, glows, fit
 * indicators) carry aria-hidden. The four beats are real <button role="tab">
 * controls in a tablist: focusable, Enter/Space/arrow operable, visibly
 * focused, and they take over the tour.
 *
 * Region names ("Experience", "Skills") and UI affordance labels are the
 * product's own vocabulary, not fabricated user data, so they render as text.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * "Still" mode: prefers-reduced-motion. Every motion element below reads this
 * instead of taking a prop, so the final meaningful state paints immediately
 * with no entrance whatsoever.
 */
const StillContext = createContext(false);
const useStill = () => useContext(StillContext);

/** A redacted content line. Width is structural, never meaningful. */
function Bar({
  w,
  className,
  delay = 0,
  lit = false,
}: {
  w: string;
  className?: string;
  delay?: number;
  lit?: boolean;
}) {
  const still = useStill();
  return (
    <motion.span
      aria-hidden
      initial={still ? false : { opacity: 0, scaleX: 0.4 }}
      animate={{ opacity: lit ? 1 : 0.55, scaleX: 1 }}
      transition={still ? { duration: 0 } : { duration: 0.45, ease: EASE, delay }}
      style={{ width: w, transformOrigin: 'left' }}
      className={cn(
        'block h-[5px] rounded-full transition-colors duration-500',
        lit ? 'bg-foreground/45' : 'bg-foreground/20',
        className,
      )}
    />
  );
}

/** A redacted skill chip - a pill with no invented label. */
function Chip({ w, delay = 0 }: { w: number; delay?: number }) {
  const still = useStill();
  return (
    <motion.span
      aria-hidden
      initial={still ? false : { opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={still ? { duration: 0 } : { duration: 0.4, ease: EASE, delay }}
      style={{ width: w }}
      className="inline-block h-[18px] rounded-full border border-[hsl(var(--brand-to)/0.35)] bg-[hsl(var(--brand-to)/0.14)]"
    />
  );
}

function RegionLabel({ children, lit }: { children: string; lit?: boolean }) {
  return (
    <span
      className={cn(
        'text-[9px] font-semibold uppercase tracking-[0.13em] transition-colors duration-500',
        lit ? 'text-[hsl(var(--brand-to))]' : 'text-muted-foreground/45',
      )}
    >
      {children}
    </span>
  );
}

/* ── Scene A: READ ─────────────────────────────────────────────────
   The sheet, scanned once, becoming structure. */

function ResumeSheet({ scanning = false, compact = false }: { scanning?: boolean; compact?: boolean }) {
  const still = useStill();

  // Fluid, not fixed: `w-[168px] shrink-0` could not fit beside the profile
  // panel at 320px, so the panel was silently clipped by the page's
  // overflow-x-clip. `flex-1 basis-0 min-w-0` gives each panel a definite
  // computed width the percentage bars can resolve against at any viewport.
  return (
    <div className="relative min-w-0 flex-1 basis-0 overflow-hidden rounded-lg border border-white/10 bg-[hsl(var(--card))] p-2.5 shadow-panel">
      {/* Scanning light - a single pass on arrival, then gone. */}
      {scanning && !still && (
        <motion.span
          aria-hidden
          initial={{ y: '-110%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 z-10 h-14"
          style={{
            background:
              'linear-gradient(to bottom, transparent, hsl(var(--brand-to) / 0.30), transparent)',
          }}
        />
      )}

      <div className="mb-2.5 flex items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
        <Bar w="52%" lit />
      </div>

      <div className="space-y-2.5">
        {(compact
          ? [
              { label: 'Experience', bars: ['92%', '78%'] },
              { label: 'Skills', bars: ['70%'] },
            ]
          : [
              { label: 'Experience', bars: ['92%', '78%', '85%'] },
              { label: 'Skills', bars: ['70%'] },
              { label: 'Education', bars: ['64%'] },
              { label: 'Impact', bars: ['88%', '56%'] },
            ]
        ).map((region, r) => (
          <div key={region.label} className="space-y-1">
            <RegionLabel lit>{region.label}</RegionLabel>
            {region.bars.map((w, i) => (
              <Bar key={i} w={w} lit delay={0.05 * (r + i)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The profile assembled from the sheet's own signals. */
function ProfilePanel() {
  const still = useStill();
  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.5, ease: EASE, delay: 0.15 }}
      className="min-w-0 flex-1 basis-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5"
    >
      <RegionLabel>Understood as</RegionLabel>
      <div className="mb-2 mt-1.5 flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))] opacity-70"
        />
        <span className="min-w-0 flex-1 space-y-1">
          <Bar w="80%" lit delay={0.2} />
          <Bar w="55%" delay={0.25} />
        </span>
      </div>

      {/* Experience becomes a concise timeline. */}
      <div className="my-2 space-y-1.5 border-l border-white/10 pl-2">
        {[0, 1, 2].map((i) => (
          <Bar key={i} w={`${86 - i * 14}%`} lit={i === 0} delay={0.3 + i * 0.08} />
        ))}
      </div>

      {/* Skills become structural chips. */}
      <div className="flex flex-wrap gap-1">
        {[30, 22, 34, 26, 20].map((w, i) => (
          <Chip key={i} w={w} delay={0.5 + i * 0.06} />
        ))}
      </div>
    </motion.div>
  );
}

function ReadScene() {
  return (
    <div className="flex min-w-0 gap-2 sm:gap-3">
      <ResumeSheet scanning />
      <ProfilePanel />
    </div>
  );
}

/* ── Scene B: MATCH ────────────────────────────────────────────────
   Up to five EMPTY opportunity positions. Never populated. */

function MatchScene() {
  const still = useStill();
  return (
    <div className="flex min-w-0 gap-2 sm:gap-3">
      <div className="hidden min-w-0 flex-1 basis-0 sm:block">
        <ResumeSheet compact />
      </div>
      <div className="min-w-0 flex-[1.4] space-y-1.5">
        <RegionLabel>Opportunities</RegionLabel>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={still ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={still ? { duration: 0 } : { duration: 0.35, ease: EASE, delay: i * 0.07 }}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2 py-1.5',
              i === 0
                ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            {/* Empty slot: no logo, no company, no title, no score. */}
            <span aria-hidden className="h-5 w-5 shrink-0 rounded bg-foreground/10" />
            <span className="min-w-0 flex-1 space-y-1">
              <Bar w={`${74 - i * 6}%`} lit={i === 0} />
              <Bar w={`${46 - i * 4}%`} />
            </span>
            {/* Fit indicator is a bar of relative height, never a number. */}
            <span aria-hidden className="flex h-4 shrink-0 items-end gap-[2px]">
              {[0, 1, 2].map((b) => (
                <span
                  key={b}
                  style={{ height: `${(3 - b) * 4 + 4 - i * 1.5}px` }}
                  className={cn(
                    'w-[3px] rounded-full',
                    i === 0 ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/20',
                  )}
                />
              ))}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Scene C: TAILOR ───────────────────────────────────────────────
   Original vs Tailored, with IntegrityGuard holding the facts. */

function TailorScene() {
  const still = useStill();
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <RegionLabel>Original</RegionLabel>
          <Bar w="90%" />
          <Bar w="72%" />
          <Bar w="80%" />
          <Bar w="64%" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[hsl(var(--brand-to))]">
            Tailored
          </span>
          <Bar w="94%" lit delay={0.1} />
          <Bar w="84%" lit delay={0.18} />
          <Bar w="78%" lit delay={0.26} />
          <Bar w="88%" lit delay={0.34} />
        </div>
      </div>

      {/* IntegrityGuard: the facts that stay locked. */}
      <motion.div
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={still ? { duration: 0 } : { duration: 0.4, delay: 0.4 }}
        className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-2.5"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          IntegrityGuard
        </span>
        {['Dates', 'Employers', 'Titles', 'Claims'].map((f, i) => (
          <motion.span
            key={f}
            initial={still ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={still ? { duration: 0 } : { duration: 0.3, delay: 0.5 + i * 0.07 }}
            className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-[1px] text-[9px] font-medium text-emerald-300/90"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
            {f}
          </motion.span>
        ))}
      </motion.div>

      {/* Export affordances - real product actions, shown inert here. */}
      <motion.div
        initial={still ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={still ? { duration: 0 } : { duration: 0.35, delay: 0.8 }}
        className="mt-2.5 flex gap-1.5"
      >
        {['PDF', 'DOCX'].map((f) => (
          <span
            key={f}
            className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-[3px] text-[10px] font-semibold text-foreground/70"
          >
            {f}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Scene D: TRACK ────────────────────────────────────────────────
   The pipeline - applications held across three status columns. */

function TrackScene() {
  const still = useStill();
  const columns: { label: string; cards: number; lit?: boolean }[] = [
    { label: 'Saved', cards: 3 },
    { label: 'Applied', cards: 2 },
    { label: 'Interview', cards: 1, lit: true },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      {columns.map((col, c) => (
        <div key={col.label} className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <RegionLabel lit={col.lit}>{col.label}</RegionLabel>
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                col.lit ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/25',
              )}
            />
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: col.cards }).map((_, i) => (
              <motion.div
                key={i}
                initial={still ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  still ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: c * 0.1 + i * 0.06 }
                }
                className={cn(
                  'rounded-md border p-1.5',
                  col.lit && i === 0
                    ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                    : 'border-white/[0.07] bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-1.5">
                  {/* Empty slot: no logo, no company, no title. */}
                  <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded bg-foreground/10" />
                  <Bar w="68%" lit={col.lit && i === 0} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The four beats a person can jump to. `beat` is the scene each control owns;
 * the caption is a claim about the product, never data.
 */
const STEPS = [
  {
    id: 'read',
    label: 'Read',
    beat: 'read' as CinematicBeat,
    caption: 'Aspirely reads the structure of your resume.',
    Scene: ReadScene,
  },
  {
    id: 'match',
    label: 'Match',
    beat: 'match' as CinematicBeat,
    caption: 'It ranks real openings against that structure.',
    Scene: MatchScene,
  },
  {
    id: 'tailor',
    label: 'Tailor',
    beat: 'tailor' as CinematicBeat,
    caption: 'It tailors one resume, with your facts locked.',
    Scene: TailorScene,
  },
  {
    id: 'track',
    label: 'Track',
    beat: 'track' as CinematicBeat,
    caption: 'It keeps every application in one pipeline.',
    Scene: TrackScene,
  },
] as const;

export interface CinematicStageProps {
  beat: CinematicBeat;
  /** Jump the tour to a beat (see useCinematic.select). */
  onSelectBeat?: (beat: CinematicBeat) => void;
  /** The tour is advancing on its own - draw the progress hairline. */
  autoplay?: boolean;
  /** How long the current scene holds, so the hairline lands on the change. */
  holdMs?: number;
  /** Hold / release the tour (the tablist has, or lost, keyboard focus). */
  onHold?: (holding: boolean) => void;
  className?: string;
}

export function CinematicStage({
  beat,
  onSelectBeat,
  autoplay = false,
  holdMs = 3000,
  onHold,
  className,
}: CinematicStageProps) {
  const still = !!useReducedMotion();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Exactly one step is active: the one whose scene is on the stage. The old
  // "furthest reached" rule is what pinned the highlight to Track forever.
  const rawIndex = STEPS.findIndex((s) => s.beat === beat);
  const activeIndex = rawIndex < 0 ? 0 : rawIndex;
  const active = STEPS[activeIndex];
  const Scene = active.Scene;

  const select = useCallback(
    (i: number) => {
      onSelectBeat?.(STEPS[i].beat);
    },
    [onSelectBeat],
  );

  // Roving tabindex: arrows/Home/End move focus AND selection (automatic
  // activation); Enter and Space work natively because these are buttons.
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const last = STEPS.length - 1;
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        next = activeIndex === last ? 0 : activeIndex + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        next = activeIndex === 0 ? last : activeIndex - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = last;
      if (next < 0) return;
      e.preventDefault();
      select(next);
      tabRefs.current[next]?.focus();
    },
    [activeIndex, select],
  );

  return (
    <StillContext.Provider value={still}>
      <div className={cn('relative flex h-full flex-col p-3 sm:p-4', className)}>
        {/* Says out loud what this is, so nobody reads redacted shapes as
            their own data or as somebody else's real matches. */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Shapes className="h-3 w-3 shrink-0" aria-hidden />
            Illustrative workflow
          </span>

          <div
            role="tablist"
            aria-label="Illustrative workflow steps"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            // KEYBOARD focus holds the tour. `:focus-visible` is the whole
            // point of the check: a plain `onFocus` also fires when a pointer
            // clicks a button (buttons take focus on click), so holding on any
            // focus meant clicking a tab silently stopped the tour and killed
            // its progress hairline - the exact thing selecting a tab is
            // supposed to leave running.
            onFocus={(e) => {
              if (e.target.matches(':focus-visible')) onHold?.(true);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHold?.(false);
            }}
            className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/20 p-1"
          >
            {STEPS.map((step, i) => {
              const selected = i === activeIndex;
              return (
                <button
                  key={step.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`cinematic-tab-${step.id}`}
                  aria-selected={selected}
                  aria-controls="cinematic-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'relative rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    // The pill stays visually small so it reads as chrome, but a
                    // 44px-tall pseudo-element carries the touch target. Growing
                    // the pill itself would unbalance the window header.
                    'after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[""]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {/* The lit pill slides between tabs instead of blinking on and
                      off, so the tour reads as one object moving. */}
                  {selected && (
                    <motion.span
                      aria-hidden
                      layoutId="cinematic-tab-pill"
                      transition={
                        still ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }
                      }
                      className="absolute inset-0 -z-10 rounded-full bg-[hsl(var(--brand-to)/0.18)] ring-1 ring-inset ring-[hsl(var(--brand-to)/0.35)]"
                    />
                  )}
                  <span className="relative">{step.label}</span>
                  {/* Autoplay progress: a hairline that empties as the scene
                      runs out, so the tour never feels like it jumped. */}
                  {selected && autoplay && !still && (
                    <motion.span
                      aria-hidden
                      key={`progress-${step.id}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: holdMs / 1000, ease: 'linear' }}
                      style={{ transformOrigin: 'left' }}
                      className="absolute inset-x-2 bottom-[2px] h-[2px] rounded-full bg-[hsl(var(--brand-to)/0.75)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="cinematic-panel"
          role="tabpanel"
          aria-labelledby={`cinematic-tab-${active.id}`}
          tabIndex={0}
          className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* The caption changes with the scene, so it is part of the swap. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`caption-${active.id}`}
              initial={still ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? undefined : { opacity: 0, y: -4 }}
              transition={still ? { duration: 0 } : { duration: 0.2 }}
              className="mb-2.5 text-[11px] leading-snug text-muted-foreground"
            >
              {active.caption}
            </motion.p>
          </AnimatePresence>

          {/* Fixed stage height: the window must not resize as the tour runs,
              or the upload control below it would walk up and down the page.
              The scenes are stacked absolutely and cross-fade CONCURRENTLY
              (no `mode="wait"`): waiting for the outgoing scene to leave first
              meant the stage was empty for a quarter second on every change,
              and a scene selected by click did not exist in the DOM at the
              moment of the click - which is exactly what an assistive tech
              user, and the tab test, observe. */}
          <div className="relative min-h-[218px] sm:min-h-[236px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={active.id}
                initial={still ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={still ? undefined : { opacity: 0, y: -8 }}
                transition={still ? { duration: 0 } : { duration: 0.26, ease: EASE }}
                className="absolute inset-x-0 top-0 min-w-0"
              >
                <Scene />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </StillContext.Provider>
  );
}
