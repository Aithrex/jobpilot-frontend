import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import { FileText, ListChecks, Lock, Mail, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMAIL_UPDATES, MATCH, TAILOR, TRACK, type Capability } from '@/lib/capabilities';
import { StatusBadge } from './workspace/CapabilityDock';
import { Container, Reveal, SectionHead } from './_shared';

/**
 * SignalPath - the transformation, shown rather than described.
 *
 * This section replaces the old four-card "Available now" grid. A grid of
 * infographic cards tells a visitor what we claim; watching ONE resume object
 * change through four stages shows them what actually happens to their file.
 * The object is continuous: the same sheet stays on the stage the whole way,
 * gaining structure, then opportunities, then a rewritten column. Nothing is
 * swapped for a different illustration.
 *
 * SURFACE CONTRAST (the Aspirely language): the section itself is warm pearl
 * editorial; the stage inside it is deep obsidian, because that is the actual
 * product surface. Both are real named token surfaces (`.surface-editorial`,
 * `.surface-obsidian` in index.css), not local colour classes, so every child
 * resolves semantic tokens correctly without one `dark:` variant.
 *
 * HONESTY: every shape here is redacted structure - bars, empty slots, region
 * labels from the product's own vocabulary. There is no invented company, job
 * title, score, count or logo anywhere in this file, and the stage says
 * "Illustrative" in plain sight.
 *
 * MOTION: the stage is driven by scroll POSITION, never by hijacking scroll.
 * The page scrolls at its normal speed; the sequence simply reads where the
 * section is. Touching a stage control latches manual mode so nothing moves
 * under the reader's hands. Under prefers-reduced-motion the scroll wiring is
 * never attached and the final stage paints immediately.
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
    body: 'Drop in a PDF or DOCX. Nothing is rewritten, and nothing is sent anywhere yet.',
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
    body: 'Up to 5 best-fit roles, each one carrying the reason it fits your background.',
  },
  {
    id: 'tailored',
    label: 'Tailored',
    title: 'One resume, rewritten for one role.',
    body: 'IntegrityGuard holds your dates, employers, titles and claims in place while the emphasis moves.',
  },
] as const;

const LAST = STAGES.length - 1;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Capabilities that are live today, stated once, compactly, from the registry. */
const LIVE: readonly { cap: Capability; icon: typeof Search }[] = [
  { cap: MATCH, icon: Search },
  { cap: TAILOR, icon: Sparkles },
  { cap: TRACK, icon: ListChecks },
  { cap: EMAIL_UPDATES, icon: Mail },
] as const;

/* ── The object on the stage ─────────────────────────────────────────── */

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

function RegionLabel({ children, lit }: { children: string; lit: boolean }) {
  return (
    <span
      className={cn(
        'text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors duration-500',
        lit ? 'text-[hsl(var(--brand-to))]' : 'text-muted-foreground/50',
      )}
    >
      {children}
    </span>
  );
}

/**
 * The persistent resume sheet. It is present at every stage - this is the
 * continuity that makes the section a transformation instead of four pictures.
 * Fluid by contract (`min-w-0 flex-1 basis-0`): no fixed pixel width, so it
 * cannot clip at 320px.
 */
function Sheet({ index, still }: { index: number; still: boolean }) {
  const lit = index >= 1;
  const scanning = index === 1;
  return (
    <div className="relative min-w-0 flex-1 basis-0 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-panel">
      {/* A single scanning pass on arrival at "Understood" - not a loop. */}
      {scanning && !still && (
        <motion.span
          aria-hidden
          initial={{ y: '-120%' }}
          animate={{ y: '120%' }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-x-0 z-10 h-12"
          style={{
            background:
              'linear-gradient(to bottom, transparent, hsl(var(--brand-to) / 0.28), transparent)',
          }}
        />
      )}

      <div className="mb-3 flex items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <Bar w="54%" lit={lit} />
      </div>

      <div className="space-y-3">
        {[
          { label: 'Experience', bars: ['92%', '78%', '85%'] },
          { label: 'Skills', bars: ['70%'] },
          { label: 'Impact', bars: ['88%', '56%'] },
        ].map((region) => (
          <div key={region.label} className="space-y-1">
            <RegionLabel lit={lit}>{region.label}</RegionLabel>
            {region.bars.map((w, i) => (
              <Bar key={i} w={w} lit={lit} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stage 1 - the structure the reader now has. Chips carry no invented text. */
function Structure({ still }: { still: boolean }) {
  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.42, ease: EASE }}
      className="min-w-0 flex-1 basis-0 space-y-3"
    >
      <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Understood as
      </span>
      <div className="rounded-xl border border-border bg-muted/40 p-2.5">
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
        <div className="my-2 space-y-1.5 border-l border-border pl-2">
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
    </motion.div>
  );
}

/** Stage 2/3 - up to five EMPTY opportunity positions. Never populated. */
function Opportunities({ selected, still }: { selected: boolean; still: boolean }) {
  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.42, ease: EASE }}
      className="min-w-0 flex-1 basis-0 space-y-1.5"
    >
      <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Opportunities
      </span>
      {[0, 1, 2, 3, 4].map((i) => {
        const chosen = selected && i === 0;
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all duration-500',
              chosen
                ? 'border-[hsl(var(--brand-to)/0.5)] bg-[hsl(var(--brand-to)/0.10)]'
                : selected
                  ? 'border-border/60 bg-muted/30 opacity-40'
                  : 'border-border bg-muted/40',
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
    </motion.div>
  );
}

/** Stage 3 - the rewrite, with the facts that stay locked. */
function Tailored({ still }: { still: boolean }) {
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.42, ease: EASE }}
      className="rounded-xl border border-border bg-muted/40 p-2.5"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Original
          </span>
          <Bar w="90%" />
          <Bar w="72%" />
          <Bar w="80%" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--brand-to))]">
            Tailored
          </span>
          <Bar w="94%" lit />
          <Bar w="84%" lit />
          <Bar w="78%" lit />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          IntegrityGuard
        </span>
        {['Dates', 'Employers', 'Titles', 'Claims'].map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-0.5 rounded-full border border-success/30 bg-success/10 px-1.5 py-[1px] text-[9px] font-medium text-success"
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
            {f}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────── */

export function SignalPath() {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Reduced motion resolves straight to the final, most meaningful stage.
  const [index, setIndex] = useState(reduce ? LAST : 0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (reduce) setIndex(LAST);
  }, [reduce]);

  // Scroll POSITION drives the stage. No scroll hijacking: the page keeps its
  // native scrolling, this only reads where the section sits. framer's
  // useScroll is passive and fires nothing while the section is parked, so it
  // costs nothing off-screen or in a hidden tab.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.85', 'end 0.45'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduce || manual) return;
    const next = Math.min(LAST, Math.max(0, Math.floor(p * STAGES.length)));
    setIndex((cur) => (cur === next ? cur : next));
  });

  // Once someone drives the sequence, scroll stops moving it under them.
  const select = useCallback((i: number) => {
    setManual(true);
    setIndex(i);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      let next = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = index === LAST ? 0 : index + 1;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = index === 0 ? LAST : index - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = LAST;
      if (next < 0) return;
      e.preventDefault();
      select(next);
      tabRefs.current[next]?.focus();
    },
    [index, select],
  );

  const still = reduce;

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
              From resume to tailored,{' '}
              <span className="text-[hsl(var(--brand-to))]">in one pass.</span>
            </>
          }
          lede="One file goes in. Watch what happens to it."
        />

        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-10">
          {/* The four stages: a real vertical tablist, keyboard and touch
              operable, each control at least 44px tall. */}
          <div
            role="tablist"
            aria-label="Resume transformation stages"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="flex flex-col gap-1 lg:col-span-5"
          >
            {STAGES.map((stage, i) => {
              const selected = i === index;
              return (
                <button
                  key={stage.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`signal-tab-${stage.id}`}
                  aria-selected={selected}
                  aria-controls="signal-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'group relative min-h-[44px] rounded-xl px-3 py-3 text-left transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected ? 'bg-card shadow-soft' : 'hover:bg-card/60',
                  )}
                >
                  <span className="flex items-center gap-3">
                    {/* Progress is never colour-only: the marker fills AND the
                        stage number stays readable at every state. */}
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums transition-colors duration-200',
                        selected
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : i < index
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        'font-display text-lg font-bold tracking-[-0.015em] transition-colors duration-200',
                        selected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {stage.label}
                    </span>
                  </span>

                  {/* The active stage expands with its claim. Height animation
                      is confined to this one small element. */}
                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.span
                        key="body"
                        initial={still ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={still ? undefined : { height: 0, opacity: 0 }}
                        transition={still ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                        className="block overflow-hidden pl-10"
                      >
                        <span className="block pt-2 font-medium text-foreground">
                          {stage.title}
                        </span>
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
              // a second tablist (the hero demo), and "Read"/"Resume" are far
              // too similar to tell apart by their tab's label alone.
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
                      index === LAST ? 'bg-success' : 'bg-[hsl(var(--brand-to))]',
                    )}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Stage {index + 1} of {STAGES.length}
                  </span>
                </span>
              </div>

              <div className="relative min-h-[290px] p-4 sm:min-h-[320px] sm:p-5">
                <div className="flex min-w-0 gap-3">
                  <Sheet index={index} still={still} />
                  {index === 1 && <Structure still={still} />}
                  {index >= 2 && <Opportunities selected={index === LAST} still={still} />}
                </div>
                {index === LAST && (
                  <div className="mt-3">
                    <Tailored still={still} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* What all of that adds up to today, read from the capability
            registry so a status can never drift out of sync with the code. */}
        <Reveal className="mt-12">
          <div className="rule-fade" />
          <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {LIVE.map(({ cap, icon: Icon }) => (
              <li key={cap.id} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <h3 className="text-[15px] font-bold text-foreground">{cap.name}</h3>
                  <StatusBadge status={cap.status} />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {cap.blurb}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

export default SignalPath;
