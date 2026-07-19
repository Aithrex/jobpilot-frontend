import { Fragment, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, CreditCard, Lock, Play, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE, startHref } from './_shared';
import { HeroLoop } from './HeroLoop';
import { HeroField } from './hero3d';

/**
 * Hero - the signature opening: the whole product understood at one glance.
 * Left, the approved copy (badge, headline, subtext, CTAs, trust row) with a
 * staged word-group entrance; right, the PRODUCT LOOP (HeroLoop) running as a
 * living machine - matched, approved, applied, reply - joined by a drawn
 * connector and a traveling pulse. Backdrop: soft indigo washes + faint grid
 * + the light WebGL SignalField, all behind the content and pointer-inert.
 *
 * Integrity: the badge and headline claim only what the product does (checked
 * against public filings - never "verified"); the trust row is the three real
 * product facts; every number inside the loop lives under its ILLUSTRATIVE
 * tag. No invented users, ratings, or press logos.
 */

const TRUST: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'Sponsorship signals from public H-1B filings' },
  { icon: CreditCard, label: 'Free to start, no card' },
  { icon: Lock, label: 'Your data stays yours' },
];

/** Approved headline, split into word groups for the settle entrance only -
 *  the rendered copy is verbatim "Find H1B-sponsored jobs faster." */
const WORDS = ['Find', 'H1B-sponsored', 'jobs', 'faster.'] as const;
const ACCENT_WORD = 'H1B-sponsored';

/** Word groups settle y+blur-to-sharp on the house ease; the key phrase gets
 *  a very subtle indigo-to-sky gradient shimmer (static indigo under
 *  prefers-reduced-motion). */
function Headline({ reduce }: { reduce: boolean }) {
  const shimmerStyle = {
    backgroundImage:
      'linear-gradient(105deg, hsl(var(--primary)) 32%, hsl(var(--brand-to)) 50%, hsl(var(--primary)) 68%)',
    backgroundSize: '220% 100%',
  };
  return (
    <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl xl:text-6xl">
      {WORDS.map((word, i) => {
        const accent = word === ACCENT_WORD;
        const inner = accent ? (
          reduce ? (
            <span className="text-primary">{word}</span>
          ) : (
            <motion.span
              className="bg-clip-text text-transparent"
              style={shimmerStyle}
              animate={{ backgroundPosition: ['140% 0%', '-140% 0%'] }}
              transition={{ duration: 3.6, ease: 'linear', repeat: Infinity, repeatDelay: 2.8, delay: 1.4 }}
            >
              {word}
            </motion.span>
          )
        ) : (
          word
        );
        return (
          <Fragment key={word}>
            {reduce ? (
              inner
            ) : (
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.08 + i * 0.05 }}
              >
                {inner}
              </motion.span>
            )}
            {i < WORDS.length - 1 ? ' ' : null}
          </Fragment>
        );
      })}
    </h1>
  );
}

/** Soft magnetic hover for the primary CTA - the button drifts toward the
 *  cursor by at most 2px on a damped spring. Mouse-only; plain wrapper under
 *  prefers-reduced-motion. Focus ring and hit target are untouched. */
function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 24, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 300, damping: 24, mass: 0.3 });
  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 2);
    y.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 2);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div className={className} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  );
}

export function Hero() {
  const reduce = !!useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, ease: EASE, delay },
        };

  return (
    <section className="relative isolate overflow-hidden bg-background pb-16 pt-28 sm:pt-32 md:pb-24">
      {/* Soft radial indigo washes - a premium light backdrop, never a wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 22% 12%, hsl(238 70% 57% / 0.08), transparent 70%), radial-gradient(ellipse 50% 42% at 82% 38%, hsl(238 70% 57% / 0.06), transparent 70%)',
        }}
      />

      {/* Faint grid, masked so it fades before the page body */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(215 20% 65% / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(215 20% 65% / 0.12) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 25%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 25%, transparent 75%)',
        }}
      />

      {/* The WebGL SignalField, light variant (or its static fallback) */}
      <HeroField variant="light" />

      <Container className="relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:gap-10 xl:gap-14">
          {/* -- The copy block ------------------------------------------------ */}
          <div>
            {/* Green sponsorship badge - the honest claim, worn up front */}
            <motion.p
              {...enter(0)}
              className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-[13px] font-medium text-success"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
              H1B and visa sponsored jobs, checked against public filings
            </motion.p>

            <Headline reduce={reduce} />

            <motion.p
              {...enter(0.3)}
              className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
            >
              We match you with real companies that sponsor visas. Stop wasting time on jobs that
              don&apos;t.
            </motion.p>

            <motion.div {...enter(0.38)} className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Magnetic className="w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="group/cta relative h-12 w-full overflow-hidden rounded-control px-7 text-base font-semibold sm:w-auto"
                >
                  <Link to={startHref()}>
                    Find my matches now{' '}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                    {/* Sheen sweep on hover - transform-only, hidden under reduced motion */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-full motion-reduce:hidden"
                    />
                  </Link>
                </Button>
              </Magnetic>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="group/cta2 h-12 w-full rounded-control bg-card px-7 text-base sm:w-auto"
              >
                <a href="#pitch">
                  <Play className="h-4 w-4 transition-transform duration-200 group-hover/cta2:translate-x-0.5 group-hover/cta2:scale-110 motion-reduce:transition-none" />{' '}
                  See how it works
                </a>
              </Button>
            </motion.div>

            {/* Honest trust row - real product facts, never invented social proof */}
            <motion.ul
              {...enter(0.46)}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5"
              aria-label="Why you can trust Aspirely"
            >
              {TRUST.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* -- THE CENTERPIECE: the product loop, live ----------------------- */}
          <motion.div {...enter(0.5)} className="w-full">
            <HeroLoop />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
