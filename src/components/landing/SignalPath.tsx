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
 * This section used to do two things that fought each other: a four-stage
 * resume-transformation demo (Resume / Understood / Matched / Tailored) AND,
 * directly beneath it, a four-card capability list (Match / Tailor / Track /
 * Email). Match and Tailor therefore appeared twice, a few hundred pixels
 * apart, saying more or less the same thing. That is now one control: the four
 * things Aspirely genuinely does today are the four steps, each driving the
 * obsidian stage on the right. There is no separate card grid anymore.
 *
 * INTERACTION (the reason it no longer feels static):
 *  - The stage follows the cursor. Hovering a step previews it immediately;
 *    the pointer leaving reverts to whatever step is committed.
 *  - Clicking, or arrow-key navigation, COMMITS a step (and hands control to
 *    the visitor: scroll stops moving things under their hands).
 *  - Before anyone touches it, scroll POSITION advances the committed step, so
 *    the sequence tells itself as the section comes into view. No scroll
 *    hijacking - it only reads where the section sits.
 *  - Under prefers-reduced-motion none of that wiring attaches: the first,
 *    headline step (Matched) paints immediately and nothing animates.
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
    id: 'matched',
    label: 'Matched',
    title: 'Ranked against real openings.',
    body: 'Your resume is read as structure, then matched to up to 5 best-fit roles, each carrying the reason it fits.',
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
 * The persistent resume sheet. Fluid by contract (`min-w-0 flex-1 basis-0`):
 * no fixed pixel width, so it cannot clip at 320px.
 */
function Sheet() {
  return (
    <div className="relative min-w-0 flex-1 basis-0 overflow-hidden rounded-xl border border-white/10 bg-card p-3 shadow-panel">
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

/** Up to five EMPTY opportunity positions. Never populated. */
function Opportunities() {
  return (
    <div className="min-w-0 flex-1 basis-0 space-y-1.5">
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
      className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHead
          eyebrow="Available now"
          titleId="signal-path-heading"
          title={
            <>
              From resume to matched, tailored,{' '}
              <span className="text-[hsl(var(--brand-to))]">and tracked.</span>
            </>
          }
          lede="One file goes in. Every step below already works today. Hover or click to drive it."
        />

        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-10">
          {/* The four steps: a real vertical tablist, keyboard and touch
              operable, each control at least 44px tall. The stage tracks a
              pointer hover but selection is committed on click/keys. */}
          <div
            role="tablist"
            aria-label="Resume transformation stages"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="flex flex-col gap-1 lg:col-span-5"
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
                    'group relative min-h-[44px] rounded-xl px-3 py-3 text-left transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive ? 'bg-card shadow-soft' : 'hover:bg-card/60',
                  )}
                >
                  <span className="flex items-center gap-3">
                    {/* Progress is never colour-only: the marker fills AND the
                        step number stays readable at every state. */}
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums transition-colors duration-200',
                        isActive
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : i < display
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        'font-display text-lg font-bold tracking-[-0.015em] transition-colors duration-200',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {stage.label}
                    </span>
                  </span>

                  {/* The active step expands with its claim. Height animation
                      is confined to this one small element. */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key="body"
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                        className="block overflow-hidden pl-10"
                      >
                        <span className="block pt-2 font-medium text-foreground">{stage.title}</span>
                        <span className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">
                          {stage.body}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
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
              className="surface-obsidian relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
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

              <div className="relative min-h-[290px] p-4 sm:min-h-[320px] sm:p-5">
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
