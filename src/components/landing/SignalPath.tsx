import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import { Bell, FileText, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, SectionHead } from './_shared';

/**
 * SignalPath - the shipped product, shown as ONE interactive stepper.
 *
 * SIX steps, because the flow has six: Resume, Understood, Matched, Tailored,
 * Tracked, Updates. A shorter edit of this list once dropped the first two,
 * which removed the only part that explains WHY the matching is any good - the
 * section became four outcomes with no origin. The whole list is also visible
 * at once by design: the rows are uniform and compact, so a visitor can see
 * there are six of them without scrolling or hovering anything, and the active
 * step's claim rides on the stage that illustrates it rather than expanding
 * the row and pushing the last steps off screen.
 *
 * INTERACTION (the reason it no longer feels static):
 *  - The stage follows the cursor. Hovering a step previews it immediately;
 *    the pointer leaving reverts to whatever step is committed.
 *  - Clicking, or arrow-key navigation, COMMITS a step (and hands control to
 *    the visitor: scroll stops moving things under their hands).
 *  - Before anyone touches it, scroll POSITION advances the committed step, so
 *    the sequence tells itself as the section comes into view. No scroll
 *    hijacking - it only reads where the section sits.
 *  - Under prefers-reduced-motion none of that wiring attaches: the first step
 *    (Resume) paints immediately and nothing animates.
 *
 * HONESTY: every shape here is redacted structure - bars, empty slots, status
 * columns and region labels from the product's own vocabulary. There is no
 * invented company, job title, score, count or logo anywhere in this file, and
 * the stage says "Illustrative" in plain sight.
 *
 * SURFACE CONTRAST (the Aspirely language): the section is warm pearl
 * editorial; the stage inside it is deep obsidian, the real product surface.
 * Both are named token surfaces, so every child resolves semantic tokens with
 * no `dark:` variant.
 */

interface Stage {
  id: string;
  label: string;
  title: string;
  body: string;
}

const STAGES: readonly Stage[] = [
  {
    id: 'resume',
    label: 'Resume',
    title: 'Your resume, exactly as you wrote it.',
    body: 'One PDF or DOCX goes in. Nothing is rewritten, nothing is invented, and nothing leaves this step until you ask for it.',
  },
  {
    id: 'understood',
    label: 'Understood',
    title: 'Read as structure, not keywords.',
    body: 'Experience, skills, education and impact are separated out, so what you actually did is what gets compared.',
  },
  {
    id: 'matched',
    label: 'Matched',
    title: 'Ranked against real openings.',
    body: 'That structure is matched to up to 5 best-fit roles, each carrying the reason it fits.',
  },
  {
    id: 'tailored',
    label: 'Tailored',
    title: 'Rewritten for one role.',
    body: 'One resume, tailored for a chosen opening. IntegrityGuard holds your dates, employers, titles and claims in place while the emphasis moves.',
  },
  {
    id: 'tracked',
    label: 'Tracked',
    title: 'Every application in one pipeline.',
    body: 'Saved, applied, interviewing. Keep each role and its follow-ups in one place, so nothing slips.',
  },
  {
    id: 'updates',
    label: 'Updates',
    title: 'A digest, only when you want it.',
    body: 'Opt in to a morning or evening summary of new matches and pipeline movement. Off until you turn it on.',
  },
] as const;

const LAST = STAGES.length - 1;
const EASE = [0.16, 1, 0.3, 1] as const;

/* -- Redacted primitives ------------------------------------------------ */

/** A redacted content line. Width is structural and never meaningful. */
function Bar({ w, lit, className }: { w: string; lit?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: w }}
      className={cn(
        'block h-[5px] rounded-full transition-colors duration-500',
        lit ? 'bg-foreground/45' : 'bg-foreground/[0.16]',
        className,
      )}
    />
  );
}

function MiniLabel({ children }: { children: string }) {
  return (
    <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
      {children}
    </span>
  );
}

/**
 * The persistent resume sheet. Fluid by contract - no fixed pixel width, so it
 * cannot clip at 320px.
 */
function Sheet({ scanning = false }: { scanning?: boolean }) {
  const reduce = useReducedMotion();
  return (
    // `flex-1 basis-0` only from `sm` up, where this sheet actually shares a
    // ROW with the panel beside it. Below that the stages stack in a column,
    // and a zero height-basis plus `overflow-hidden` collapsed the sheet to a
    // single visible line on every phone.
    <div className="relative w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-card p-3 shadow-panel sm:flex-1 sm:basis-0">
      {/* A single scanning pass on arrival at "Understood" - not a loop. */}
      {scanning && !reduce && (
        <motion.span
          aria-hidden
          initial={{ y: '-120%' }}
          animate={{ y: '120%' }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 z-10 h-12"
          style={{
            background:
              'linear-gradient(to bottom, transparent, hsl(var(--brand-to) / 0.28), transparent)',
          }}
        />
      )}
      <div className="mb-3 flex items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <Bar w="54%" lit />
      </div>
      <div className="space-y-3">
        {[
          { label: 'Experience', bars: ['92%', '78%', '85%'] },
          { label: 'Skills', bars: ['70%'] },
          { label: 'Impact', bars: ['88%', '56%'] },
        ].map((region) => (
          <div key={region.label} className="space-y-1">
            <MiniLabel>{region.label}</MiniLabel>
            {region.bars.map((w, i) => (
              <Bar key={i} w={w} lit />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The structure the reader now holds. Chips carry no invented text. */
function Structure() {
  return (
    <div className="w-full min-w-0 space-y-2 sm:flex-1 sm:basis-0">
      <MiniLabel>Understood as</MiniLabel>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))] opacity-80"
          />
          <span className="min-w-0 flex-1 space-y-1">
            <Bar w="78%" lit />
            <Bar w="52%" />
          </span>
        </div>
        <div className="my-2 space-y-1.5 border-l border-white/10 pl-2">
          {[86, 72, 58].map((w, i) => (
            <Bar key={w} w={`${w}%`} lit={i === 0} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {[30, 22, 34, 26, 20].map((w, i) => (
            <span
              key={i}
              aria-hidden
              style={{ width: w }}
              className="inline-block h-[18px] rounded-full border border-[hsl(var(--brand-to)/0.35)] bg-[hsl(var(--brand-to)/0.14)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Up to five EMPTY opportunity positions. Never populated. */
function Opportunities() {
  return (
    <div className="w-full min-w-0 space-y-1.5 sm:flex-1 sm:basis-0">
      <MiniLabel>Opportunities</MiniLabel>
      {[0, 1, 2, 3, 4].map((i) => {
        const chosen = i === 0;
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2 py-1.5',
              chosen
                ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            {/* Empty slot: no logo, no company, no title, no score. */}
            <span aria-hidden className="h-5 w-5 shrink-0 rounded bg-foreground/10" />
            <span className="min-w-0 flex-1 space-y-1">
              <Bar w={`${74 - i * 6}%`} lit={chosen} />
              <Bar w={`${46 - i * 4}%`} />
            </span>
            {/* Fit is a relative bar, never a number. */}
            <span aria-hidden className="flex h-4 shrink-0 items-end gap-[2px]">
              {[0, 1, 2].map((b) => (
                <span
                  key={b}
                  style={{ height: `${(3 - b) * 4 + 4 - i * 1.5}px` }}
                  className={cn(
                    'w-[3px] rounded-full',
                    chosen ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/20',
                  )}
                />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Original vs Tailored, with the facts IntegrityGuard keeps locked. */
function TailoredPanel() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <MiniLabel>Original</MiniLabel>
          <Bar w="90%" />
          <Bar w="72%" />
          <Bar w="80%" />
          <Bar w="64%" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--brand-to))]">
            Tailored
          </span>
          <Bar w="94%" lit />
          <Bar w="84%" lit />
          <Bar w="78%" lit />
          <Bar w="88%" lit />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          IntegrityGuard
        </span>
        {['Dates', 'Employers', 'Titles', 'Claims'].map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-[1px] text-[9px] font-medium text-emerald-300/90"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A pipeline board: three status columns of redacted application cards. */
function TrackBoard() {
  const columns: { label: string; cards: number; lit?: boolean }[] = [
    { label: 'Saved', cards: 3 },
    { label: 'Applied', cards: 2 },
    { label: 'Interview', cards: 1, lit: true },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {columns.map((col) => (
        <div key={col.label} className="min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <MiniLabel>{col.label}</MiniLabel>
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                col.lit ? 'bg-[hsl(var(--brand-to))]' : 'bg-foreground/25',
              )}
            />
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: col.cards }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border p-2',
                  col.lit && i === 0
                    ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                    : 'border-white/[0.07] bg-white/[0.02]',
                )}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  {/* Empty slot: no logo, no company, no title. */}
                  <span aria-hidden className="h-4 w-4 shrink-0 rounded bg-foreground/10" />
                  <Bar w="70%" lit={col.lit && i === 0} />
                </div>
                <Bar w="52%" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** An opt-in digest card: a mail summary of new matches and pipeline moves. */
function DigestCard() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-2.5">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[hsl(var(--brand-to)/0.14)] text-[hsl(var(--brand-to))]"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <Bar w="46%" lit />
          <Bar w="30%" />
        </span>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Morning
        </span>
      </div>

      {[
        { label: 'New matches', rows: 2 },
        { label: 'Pipeline moves', rows: 1 },
      ].map((section) => (
        <div key={section.label} className="mt-2.5 space-y-1.5">
          <MiniLabel>{section.label}</MiniLabel>
          {Array.from({ length: section.rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 shrink-0 rounded bg-foreground/10" />
              <span className="min-w-0 flex-1 space-y-1">
                <Bar w={`${76 - i * 8}%`} lit={i === 0} />
                <Bar w={`${50 - i * 6}%`} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The obsidian stage content for a given step. */
function StageVisual({ id }: { id: string }) {
  switch (id) {
    case 'resume':
      // The file on its own, before anything has been done to it.
      //
      // A PLAIN BLOCK WRAPPER, deliberately. `Sheet` is `flex-1 basis-0` so it
      // can share a row with the panel beside it in later stages - but in a
      // flex COLUMN that basis applies to height, so the sheet collapsed to
      // nothing and its `overflow-hidden` clipped everything below the first
      // line. The stage rendered as a single stray bar in an empty panel.
      // Flex properties are inert on a child of a block container, so this
      // wrapper lets the same component be a full-height sheet here and a
      // flexible column elsewhere.
      return (
        <div className="mx-auto w-full max-w-[300px]">
          <Sheet />
        </div>
      );
    case 'understood':
      return (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <Sheet scanning />
          <Structure />
        </div>
      );
    case 'matched':
      return (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <Sheet />
          <Opportunities />
        </div>
      );
    case 'tailored':
      return <TailoredPanel />;
    case 'tracked':
      return <TrackBoard />;
    case 'updates':
      return <DigestCard />;
    default:
      return null;
  }
}

/* -- Section ------------------------------------------------------------ */

export function SignalPath() {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // `committed` is the selected step; `hover` is a transient pointer preview.
  // What the stage shows is hover ?? committed, so the panel tracks the cursor
  // but always has a definite fallback.
  const [committed, setCommitted] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const display = hover ?? committed;

  // Scroll POSITION advances the committed step until the visitor takes over.
  // Passive: framer's useScroll fires nothing while the section is parked, so
  // it costs nothing off-screen or in a hidden tab. Never attached under
  // reduced motion.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.5'],
  });
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduce || manual) return;
    const next = Math.min(LAST, Math.max(0, Math.floor(p * STAGES.length)));
    setCommitted((cur) => (cur === next ? cur : next));
  });

  const select = useCallback((i: number) => {
    setManual(true);
    setHover(null);
    setCommitted(i);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      let next = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = committed === LAST ? 0 : committed + 1;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = committed === 0 ? LAST : committed - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = LAST;
      if (next < 0) return;
      e.preventDefault();
      select(next);
      tabRefs.current[next]?.focus();
    },
    [committed, select],
  );

  return (
    <section
      id="how"
      ref={sectionRef}
      aria-labelledby="signal-path-heading"
      className="relative scroll-mt-4 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHead
          eyebrow="Available now"
          titleId="signal-path-heading"
          title={
            <>
              From resume to tracked,{' '}
              <span className="text-[hsl(var(--brand-to))]">in one pass.</span>
            </>
          }
          lede="One file goes in. Watch what happens to it."
        />

        {/* `lg:items-center` - the stepper is six 48px rows, the stage is a
            fixed-height product panel, and top-aligning two columns of very
            different heights read as a mistake rather than a choice. They now
            share a centre line. */}
        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* ALL SIX STEPS FIT ON ONE SCREEN. Each step used to expand in place
              with its title and body, which pushed the list to roughly 700px:
              a visitor saw four or five rows and had no way to know the
              sequence had six. The rows are now uniform and compact - a real
              index of the flow - and the active step's claim moved onto the
              stage it describes, where the illustration can carry it.

              Still a real vertical tablist: keyboard and touch operable, every
              control at least 44px tall, hover previews and click commits. */}
          <div
            role="tablist"
            aria-label="Resume transformation stages"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            // `gap-0`: the rail below is drawn in per-row halves, so any gap
            // between rows would show as a break in a line that is meant to be
            // continuous.
            className="relative flex flex-col lg:col-span-5"
          >
            {STAGES.map((stage, i) => {
              const isCommitted = i === committed;
              const isActive = i === display;
              return (
                <button
                  key={stage.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`signal-tab-${stage.id}`}
                  aria-selected={isCommitted}
                  aria-controls="signal-panel"
                  tabIndex={isCommitted ? 0 : -1}
                  onClick={() => select(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  className={cn(
                    // A FIXED 48px row. The rail behind these markers is drawn
                    // from the first marker's centre to the last one's, which
                    // only lines up if every row is exactly the same height.
                    'group relative flex h-12 items-center gap-3 rounded-xl px-3 text-left transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive ? 'bg-card shadow-soft' : 'hover:bg-card/60',
                  )}
                >
                  {/* THE RAIL, in two halves per row - above the marker and
                      below it. Six disconnected numbers are a list; a rail
                      that fills down to where you are is a progress stepper,
                      and it says "these happen in order, to one file" without
                      spending a word of copy on it. Hovering any step fills
                      the rail to that step, because `display` already follows
                      the pointer.

                      Drawn per row rather than as one line behind the column:
                      the active row has its own card background, which would
                      paint straight over a single full-height rail and leave a
                      gap in it exactly where the reader is looking. The
                      staggered delay makes the colour change read as the rail
                      filling downward rather than all of it flipping at once. */}
                  {[
                    { key: 'up', show: i > 0, top: '-top-px', filled: i <= display },
                    { key: 'down', show: i < LAST, top: 'top-6', filled: i < display },
                  ].map((seg) =>
                    seg.show ? (
                      <span
                        key={seg.key}
                        aria-hidden
                        // Two things keep this reading as ONE line rather than
                        // a column of dashes:
                        //
                        // `z-10` - rows are painted in order, so the ACTIVE
                        // row (which has its own card background and a soft
                        // shadow) was painting over the tail of the segment
                        // belonging to the row above it. The marker sits
                        // higher still (`z-20`) so the rail runs behind the
                        // numbers rather than through them.
                        //
                        // SQUARE ENDS AND A 1px OVERLAP - `rounded-full` on a
                        // 3px-wide bar tapers both ends by 1.5px, and where
                        // two segments met, those tapers formed a waist that
                        // read as a break. Butt ends that overlap by a pixel
                        // cannot show a seam at any device pixel ratio.
                        className={cn(
                          'absolute left-[26px] z-10 h-[25px] w-[3px] -translate-x-1/2 overflow-hidden bg-border',
                          seg.top,
                        )}
                      >
                        {/* The fill GROWS rather than switching colour: a
                            scaleY from the top is what makes the rail read as
                            progress moving down the list instead of six
                            independent lines changing shade at once. */}
                        <span
                          className={cn(
                            'block h-full w-full origin-top bg-[hsl(var(--brand-to))] transition-transform duration-300 ease-out',
                            seg.filled ? 'scale-y-100' : 'scale-y-0',
                          )}
                          style={{ transitionDelay: reduce ? '0ms' : `${i * 40}ms` }}
                        />
                      </span>
                    ) : null,
                  )}

                  {/* Progress is never colour-only: the marker fills AND the
                      step number stays readable at every state.
                      EVERY fill here is OPAQUE. A translucent one (the passed
                      steps used `bg-primary/15`) let the rail show straight
                      through the circle, so the first three step numbers
                      looked struck through. */}
                  {/* The stepper wears the SIGNAL accent - the same
                      `--brand-to` as "in one pass" in the heading above it and
                      the lit state inside the product stage beside it. Indigo
                      is the page's action colour (the CTAs); this rail is not
                      an action, it is the thread running through the section,
                      so it takes the thread's colour. On the pearl surface
                      that token resolves to a deep teal, so white numerals on
                      a filled marker stay well clear of AA. */}
                  <span
                    aria-hidden
                    className={cn(
                      'relative z-20 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums transition-colors duration-300',
                      i < display &&
                        'border-[hsl(var(--brand-to))] bg-[hsl(var(--brand-to))] text-white',
                      isActive &&
                        'border-[hsl(var(--brand-to))] bg-[hsl(var(--brand-to))] text-white shadow-[0_0_0_4px_hsl(var(--brand-to)/0.16)]',
                      i > display && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      'font-display text-[17px] font-bold tracking-[-0.015em] transition-colors duration-200',
                      isActive ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {stage.label}
                  </span>
                  {/* The active row grows a marker on its trailing edge, so
                      which step the stage is showing is never colour alone. */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--brand-to))]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* The product surface. Obsidian by design: the workspace never goes
              pearl, and the contrast is what makes the editorial page feel
              like marketing ABOUT a product rather than more product. */}
          <div className="lg:col-span-7">
            <div
              id="signal-panel"
              role="tabpanel"
              // Named explicitly rather than via aria-labelledby: the page has
              // a second tablist (the hero demo), and its labels are too
              // similar to tell apart by their tab's label alone.
              aria-label="Resume transformation stage"
              tabIndex={0}
              // A FIXED HEIGHT from `sm` up. The panel used to be sized by
              // whatever step was showing - a two-line claim over a short
              // sheet, then a three-line claim over a five-row list - so the
              // whole stage grew and shrank as the stepper advanced and the
              // section visibly jittered. The height is now constant and the
              // illustration area absorbs the difference, so only the content
              // inside changes. Left auto on phones, where the panel is
              // full-width and the copy needs however many lines it needs.
              className="surface-obsidian relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-[404px]"
            >
              {/* Controlled glow: one soft cyan bloom, static, never a loop. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-1/4 -top-1/3 h-[70%] w-[70%] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(closest-side, hsl(var(--brand-to) / 0.13), transparent 70%)',
                }}
              />
              <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  Illustrative
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/25 px-2 py-[3px]">
                  <span
                    aria-hidden
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      display === LAST ? 'bg-success' : 'bg-[hsl(var(--brand-to))]',
                    )}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Stage {display + 1} of {STAGES.length}
                  </span>
                </span>
              </div>

              {/* The claim for the active step, seated with the illustration
                  that demonstrates it rather than inside the step button. Its
                  own fixed height keeps a two-line body and a three-line one
                  from moving the illustration below them. */}
              <div className="relative shrink-0 border-b border-white/[0.07] px-4 py-3 sm:h-[92px] sm:px-5">
                {reduce ? (
                  <>
                    <p className="font-medium text-foreground">{STAGES[display].title}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                      {STAGES[display].body}
                    </p>
                  </>
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`claim-${STAGES[display].id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: EASE }}
                    >
                      <p className="font-medium text-foreground">{STAGES[display].title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                        {STAGES[display].body}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <div className="relative min-h-[248px] flex-1 overflow-hidden p-4 sm:min-h-0 sm:p-5">
                {reduce ? (
                  <StageVisual id={STAGES[display].id} />
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={STAGES[display].id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: EASE }}
                    >
                      <StageVisual id={STAGES[display].id} />
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default SignalPath;
