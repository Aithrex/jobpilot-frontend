import { createContext, useCallback, useContext, useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FileText, Lock, ShieldCheck, Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { atOrPast, type CinematicBeat } from './useCinematic';

/**
 * CinematicStage - the illustrative, pre-upload product sequence.
 *
 * HONESTY CONTRACT (enforced by tests):
 * Everything on this stage is REDACTED STRUCTURE - bars, pills and empty
 * slots. There is not one fictional company, job title, resume line, or match
 * score anywhere in this file, because a landing page that invents a "92% match
 * at Stripe" is lying about the product. What the sequence shows is the SHAPE
 * of the workflow; the real content only ever arrives from a real upload. The
 * "Illustrative workflow" badge says so in plain sight.
 *
 * ACCESSIBILITY CONTRACT:
 * The stage is NOT aria-hidden. It is a product demonstration, and hiding the
 * whole thing meant a screen-reader user was told nothing about what Aspirely
 * does. Only the genuinely meaningless sub-elements (bars, chips, glows, fit
 * indicators) carry aria-hidden. The three beats are real <button role="tab">
 * controls in a tablist: focusable, Enter/Space/arrow operable, visibly
 * focused, and they jump the illustration.
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

function RegionLabel({ children, lit }: { children: string; lit: boolean }) {
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

/** B: the resume sheet, with the one-pass scanning light. */
function ResumeSheet({ beat }: { beat: CinematicBeat }) {
  const still = useStill();
  const scanning = beat === 'scan';
  const read = atOrPast(beat, 'profile');
  const lit = scanning || read;

  // Fluid, not fixed: `w-[168px] shrink-0` could not fit beside the profile
  // panel at 320px, so the panel was silently clipped by the page's
  // overflow-x-clip. `flex-1 basis-0 min-w-0` gives each panel a definite
  // computed width the percentage bars can resolve against at any viewport.
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: -18, rotateZ: -1.5 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.75, ease: EASE }}
      className="relative min-w-0 flex-1 basis-0 overflow-hidden rounded-lg border border-white/10 bg-[hsl(var(--card))] p-2.5 shadow-panel sm:max-w-[190px] sm:p-3"
    >
      {/* Scanning light - a single pass, then gone. */}
      {scanning && !still && (
        <motion.span
          aria-hidden
          initial={{ y: '-110%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 z-10 h-14"
          style={{
            background:
              'linear-gradient(to bottom, transparent, hsl(var(--brand-to) / 0.30), transparent)',
          }}
        />
      )}

      <div className="mb-2.5 flex items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
        <Bar w="52%" lit={lit} />
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1">
          <RegionLabel lit={lit}>Experience</RegionLabel>
          <Bar w="92%" lit={lit} delay={0.05} />
          <Bar w="78%" lit={lit} delay={0.1} />
          <Bar w="85%" lit={lit} delay={0.15} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Skills</RegionLabel>
          <Bar w="70%" lit={lit} delay={0.2} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Education</RegionLabel>
          <Bar w="64%" lit={lit} delay={0.25} />
        </div>
        <div className="space-y-1">
          <RegionLabel lit={lit}>Impact</RegionLabel>
          <Bar w="88%" lit={lit} delay={0.3} />
          <Bar w="56%" lit={lit} delay={0.35} />
        </div>
      </div>
    </motion.div>
  );
}

/** C: the profile assembled from the resume's own signals. */
function ProfilePanel({ beat }: { beat: CinematicBeat }) {
  const still = useStill();
  const show = atOrPast(beat, 'profile');
  if (!show) return null;
  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      className="min-w-0 flex-1 basis-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 sm:max-w-[140px] sm:p-2.5"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))] opacity-70"
        />
        <span className="min-w-0 flex-1 space-y-1">
          <Bar w="80%" lit delay={0.1} />
          <Bar w="55%" delay={0.15} />
        </span>
      </div>

      {/* Experience becomes a concise timeline. */}
      <div className="my-2 space-y-1.5 border-l border-white/10 pl-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={still ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              still ? { duration: 0 } : { duration: 0.35, ease: EASE, delay: 0.25 + i * 0.09 }
            }
            className="block"
          >
            <Bar w={`${86 - i * 14}%`} lit={i === 0} />
          </motion.span>
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

/** D: up to five EMPTY opportunity positions. Never populated. */
function OpportunityPanel({ beat }: { beat: CinematicBeat }) {
  const still = useStill();
  const show = atOrPast(beat, 'match');
  const tailoring = atOrPast(beat, 'tailor');
  if (!show) return null;

  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      className="min-w-0 flex-1 space-y-1.5"
    >
      <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
        Opportunities
      </span>
      {[0, 1, 2, 3, 4].map((i) => {
        const selected = tailoring && i === 0;
        return (
          <motion.div
            key={i}
            layout={!still}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{
              opacity: selected ? 1 : tailoring ? 0.3 : 1,
              y: 0,
            }}
            transition={
              still ? { duration: 0 } : { duration: 0.4, ease: EASE, delay: show ? i * 0.08 : 0 }
            }
            className={cn(
              'flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors duration-500',
              selected
                ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            {/* Empty slot: no logo, no company, no title, no score. */}
            <span aria-hidden className="h-5 w-5 shrink-0 rounded bg-foreground/10" />
            <span className="min-w-0 flex-1 space-y-1">
              <Bar w={`${74 - i * 6}%`} lit={selected} />
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
                    selected ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/20',
                  )}
                />
              ))}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/** E: Original vs Tailored, with IntegrityGuard holding the facts. */
function TailorPanel() {
  const still = useStill();
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.5, ease: EASE }}
      className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0 space-y-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
            Original
          </span>
          <Bar w="90%" />
          <Bar w="72%" />
          <Bar w="80%" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[hsl(var(--brand-to))]">
            Tailored
          </span>
          <Bar w="94%" lit delay={0.1} />
          <Bar w="84%" lit delay={0.18} />
          <Bar w="78%" lit delay={0.26} />
        </div>
      </div>

      {/* IntegrityGuard: the facts that stay locked. */}
      <motion.div
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={still ? { duration: 0 } : { duration: 0.4, delay: 0.4 }}
        className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-2"
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
        className="mt-2 flex gap-1.5"
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
    </motion.div>
  );
}

/**
 * The three beats a person can jump to. `beat` is the timeline position each
 * control lands on; the caption is a claim about the product, never data.
 */
const STEPS = [
  {
    id: 'read',
    label: 'Read',
    beat: 'scan' as CinematicBeat,
    caption: 'Aspirely reads the structure of your resume.',
  },
  {
    id: 'match',
    label: 'Match',
    beat: 'match' as CinematicBeat,
    caption: 'It ranks real openings against that structure.',
  },
  {
    id: 'tailor',
    label: 'Tailor',
    beat: 'tailor' as CinematicBeat,
    caption: 'It tailors one resume, with your facts locked.',
  },
] as const;

export interface CinematicStageProps {
  beat: CinematicBeat;
  /** Jump the illustration to a beat (see useCinematic.select). */
  onSelectBeat?: (beat: CinematicBeat) => void;
  className?: string;
}

export function CinematicStage({ beat, onSelectBeat, className }: CinematicStageProps) {
  const still = !!useReducedMotion();
  const showTailor = atOrPast(beat, 'tailor');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // The furthest step the illustration has reached. Before the first beat we
  // still highlight "Read", so the tablist is never in a null state.
  let activeIndex = 0;
  STEPS.forEach((step, i) => {
    if (atOrPast(beat, step.beat)) activeIndex = i;
  });

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
      <div className={cn('relative flex h-full flex-col p-3 sm:p-5', className)}>
        {/* Says out loud what this is, so nobody reads redacted shapes as
            their own data or as somebody else's real matches. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Shapes className="h-3 w-3 shrink-0" aria-hidden />
            Illustrative workflow
          </span>

          <div
            role="tablist"
            aria-label="Illustrative workflow steps"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1"
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
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    // The pill stays visually small so it reads as chrome, but a
                    // 44px-tall pseudo-element carries the touch target. Growing
                    // the pill itself would unbalance the window header.
                    'relative after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[""]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected
                      ? 'bg-[hsl(var(--brand-to)/0.18)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="cinematic-panel"
          role="tabpanel"
          aria-labelledby={`cinematic-tab-${STEPS[activeIndex].id}`}
          tabIndex={0}
          className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="mb-2.5 text-[11px] leading-snug text-muted-foreground">
            {STEPS[activeIndex].caption}
          </p>

          {/* At phone widths the three panels cannot sit side by side without
              the opportunity rows being clipped, so the resume + profile pair
              rides on top and the opportunity list takes the full width. */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Both children are fluid (flex-1 basis-0 min-w-0), so this pair
                fits 320px without clipping and grows on wider screens. */}
            <div className="flex min-w-0 gap-2 sm:flex-1 sm:gap-3">
              <ResumeSheet beat={beat} />
              <AnimatePresence>
                <ProfilePanel key="profile" beat={beat} />
              </AnimatePresence>
            </div>
            <OpportunityPanel beat={beat} />
          </div>
          <AnimatePresence>{showTailor && <TailorPanel key="tailor" />}</AnimatePresence>
        </div>
      </div>
    </StillContext.Provider>
  );
}
