import {
  Fragment,
  type ReactNode,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGuestOnboardingEnabled } from '@/lib/guest';

/**
 * Shared editorial primitives for the marketing landing (Compass §7).
 * Calm, decisive settle — no bounce — gated by prefers-reduced-motion so the
 * page is equally good with motion fully off.
 */

// Editorial easing: a confident settle, never springy.
export const EASE = [0.16, 1, 0.3, 1] as const;

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds of stagger delay. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  /** Animate on mount (above the fold) instead of on scroll into view. */
  immediate?: boolean;
}

/**
 * A single gentle entrance. Renders a plain div (no motion) when the user
 * prefers reduced motion, so nothing ever moves against their wishes.
 */
export function Reveal({ children, className, delay = 0, y = 22, immediate = false }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const transition = { duration: 0.5, ease: EASE, delay };
  const from = { opacity: 0, y };
  const to = { opacity: 1, y: 0 };

  if (immediate) {
    return (
      <motion.div className={className} initial={from} animate={to} transition={transition}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={from}
      whileInView={to}
      viewport={{ once: true, margin: '-80px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** Section kicker — mono caps, indigo on the light surface (`--primary` is the
 *  AA indigo on the default light token set). */
export function Eyebrow({ children, icon: Icon, className }: { children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary',
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/**
 * The landing's mono chip — a quiet light-surface pill (hairline border on a
 * soft muted fill), fully token-driven so it holds on white and near-white
 * bands alike.
 */
export function MonoChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>}
    </div>
  );
}

// ── The product journey stepper ──────────────────────────────────────────────

export interface JourneyStep {
  /** mono step number, e.g. "01" */
  number: string;
  /** 1-word label, e.g. "Find" */
  label: string;
  /** id of the chapter section this step tracks + scrolls to */
  target: string;
}

/** The five journey chapters (JourneyStepper's default). Targets reuse the
 *  legacy section ids (old #sponsorship links keep working) plus the new
 *  #track chapter. Module-private: pass `steps` to override. */
const JOURNEY_STEPS: JourneyStep[] = [
  { number: '01', label: 'Find', target: 'sponsorship' },
  { number: '02', label: 'Apply', target: 'one-tap-apply' },
  { number: '03', label: 'Craft', target: 'tailoring' },
  { number: '04', label: 'Grow', target: 'growth-loop' },
  { number: '05', label: 'Track', target: 'track' },
];

/** Hairline connector between step pills. `done` = solid indigo; `current` =
 *  a calm looping indigo fill flowing toward the next step (static hairline
 *  under reduced motion). */
function JourneyConnector({ done, current, reduce }: { done: boolean; current: boolean; reduce: boolean }) {
  return (
    <span aria-hidden className="relative h-px w-3 shrink-0 overflow-hidden bg-border sm:w-6 lg:w-10">
      {done && <span className="absolute inset-0 bg-primary" />}
      {current && !reduce && (
        <motion.span
          className="absolute inset-y-0 left-0 w-full origin-left bg-primary/70"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 }}
        />
      )}
    </span>
  );
}

/**
 * Sticky numbered journey stepper for the feature chapters — sits just below
 * the fixed nav (top-16, fixed h-14 so it never shifts layout) and tracks
 * scroll via one IntersectionObserver over the five chapter sections. The
 * active pill is indigo-filled; passed connectors fill solid; the connector
 * ahead of the active step animates. Click smooth-scrolls to the chapter
 * (instant under reduced motion). Horizontally scrollable on mobile, with the
 * active pill auto-centered. Before any observer fires, step 1 is active.
 */
export function JourneyStepper({ steps = JOURNEY_STEPS, className }: { steps?: JourneyStep[]; className?: string }) {
  const reduce = !!useReducedMotion();
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // One observer, a thin band just above the viewport middle: whichever
  // chapter crosses it becomes the active step (works in both directions).
  useEffect(() => {
    const els = steps
      .map((s) => document.getElementById(s.target))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = steps.findIndex((s) => s.target === entry.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [steps]);

  // Keep the active pill in view on the mobile strip (no-op when not scrollable).
  useEffect(() => {
    const list = listRef.current;
    const btn = btnRefs.current[active];
    if (!list || !btn || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({
      left: btn.offsetLeft - list.clientWidth / 2 + btn.clientWidth / 2,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [active, reduce]);

  const go = (i: number) => {
    setActive(i);
    document.getElementById(steps[i].target)?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <nav
      aria-label="Product journey"
      className={cn(
        'sticky top-16 z-30 h-14 border-b border-border bg-background/95 backdrop-blur-md',
        className,
      )}
    >
      <Container className="h-full">
        <div ref={listRef} className="scrollbar-hide relative flex h-full items-center gap-1.5 overflow-x-auto sm:gap-2">
          {steps.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <Fragment key={s.target}>
                {i > 0 && <JourneyConnector done={i <= active} current={i === active + 1} reduce={reduce} />}
                <button
                  ref={(el) => {
                    btnRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 transition-colors sm:px-4',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-input hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold tabular-nums tracking-[0.12em]',
                      isActive ? 'text-primary-foreground/85' : isDone ? 'text-primary' : undefined,
                    )}
                  >
                    {s.number}
                  </span>
                  <span className="text-[13px] font-medium">{s.label}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </Container>
    </nav>
  );
}

/**
 * Scroll-linked drift for layered depth: the child translates gently from
 * `from` → `to` px as the element crosses the viewport. Pure transform (no
 * layout, GPU-composited); renders static under prefers-reduced-motion.
 */
export function Parallax({
  children,
  className,
  from = 26,
  to = -26,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/**
 * Pointer-tracked 3D tilt for showcase cards — a quiet, springy few degrees,
 * mouse-only (ignores touch) and fully inert under prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 130, damping: 18, mass: 0.5 });
  const springRy = useSpring(ry, { stiffness: 130, damping: 18, mass: 0.5 });

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max);
    rx.set(-py * max);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className={className}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: springRx, rotateY: springRy, transformPerspective: 900, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Ambient drifting light — soft brand-tinted blobs that breathe behind a
 * section. On the light surface they read as pastel indigo/sky washes (the
 * aurora-blob styles in index.css are token-driven, so they adapt without a
 * dark scope). CSS-keyframe driven (transform-only), play-state gated so it is
 * paused off-screen and fully static under prefers-reduced-motion.
 */
export function Aurora({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '15% 0px' } as unknown as Parameters<typeof useInView>[1]);
  const reduce = useReducedMotion();
  const playState = inView && !reduce ? 'running' : 'paused';
  return (
    <div ref={ref} aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <span className="aurora-blob aurora-blob-a" style={{ animationPlayState: playState }} />
      <span className="aurora-blob aurora-blob-b" style={{ animationPlayState: playState }} />
      <span className="aurora-blob aurora-blob-c" style={{ animationPlayState: playState }} />
    </div>
  );
}

/**
 * One-line caption under a feature demo: names the feature, states the
 * promise — so the demo explains itself without the surrounding copy.
 */
export function DemoCaption({
  feature,
  children,
  className,
}: {
  feature: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('mx-auto mt-4 max-w-md text-center text-[13px] leading-relaxed text-muted-foreground', className)}>
      <span className="font-semibold text-foreground">{feature}</span>
      <span aria-hidden> · </span>
      {children}
    </p>
  );
}

/** Fixed-size placeholder shown while a lazy demo loads — reserves space so
 *  mounting the demo never shifts layout. */
export function DemoSkeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn('h-full w-full animate-pulse rounded-2xl border border-border bg-muted/40', className)}
    />
  );
}

/**
 * Defers rendering of a (usually code-split) demo until it is near the
 * viewport, so heavy animated mockups never run — or even load — off-screen.
 * The wrapper reserves `minHeight` up front to avoid cumulative layout shift.
 */
export function LazyMount({
  minHeight,
  className,
  rootMargin = '360px',
  children,
}: {
  minHeight: number;
  className?: string;
  rootMargin?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: rootMargin } as unknown as Parameters<typeof useInView>[1]);
  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {inView ? children : <DemoSkeleton style={{ minHeight }} />}
    </div>
  );
}

/**
 * Primary-CTA destination: the zero-friction guest funnel (/start) when the
 * feature is enabled, otherwise account creation. One helper so the nav,
 * hero, pricing, and close CTAs can never drift onto different doors.
 */
export function startHref(): string {
  return isGuestOnboardingEnabled() ? '/start' : '/register';
}
