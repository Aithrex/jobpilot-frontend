import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Container, EASE } from './_shared';

/**
 * How it works — exactly three steps, each a *reduced* instance of the Signal
 * Resolve motif (not a generic icon): a resume dot enters, the noise dims to a
 * few matches, one match routes out to an application. Sequential reveal on
 * scroll; static resolved end-state under prefers-reduced-motion.
 */

const NOISE = [
  [40, 22],
  [66, 16],
  [92, 30],
  [118, 20],
  [52, 44],
  [80, 52],
  [104, 48],
  [128, 40],
  [46, 68],
  [72, 74],
  [100, 70],
  [124, 66],
] as const;

type Variant = 'enter' | 'resolve' | 'route';
const MATCHED: Record<Variant, number[]> = { enter: [], resolve: [5, 6, 2], route: [6] };

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: { pathLength: 1, opacity: 1, transition: { duration: 0.4, ease: EASE, delay: 0.15 } },
};

function StepMotif({ variant, label }: { variant: Variant; label: string }) {
  const reduce = useReducedMotion();
  const matched = new Set(MATCHED[variant]);

  return (
    <svg viewBox="0 0 160 96" className="h-24 w-full" role="img" aria-label={label}>
      {/* incoming resume dot (enter) */}
      {variant === 'enter' && (
        <>
          <rect x="8" y="34" width="20" height="28" rx="4" className="fill-none stroke-border" strokeWidth={1.5} />
          <line x1="13" y1="42" x2="23" y2="42" className="stroke-muted-foreground" strokeWidth={1.5} opacity={0.6} />
          <line x1="13" y1="48" x2="23" y2="48" className="stroke-muted-foreground" strokeWidth={1.5} opacity={0.6} />
          <line x1="13" y1="54" x2="20" y2="54" className="stroke-muted-foreground" strokeWidth={1.5} opacity={0.6} />
          <motion.circle
            r={4.5}
            className="fill-primary"
            initial={reduce ? { cx: 118, cy: 48, opacity: 1 } : { cx: 30, cy: 48, opacity: 0 }}
            whileInView={{ cx: 118, cy: 48, opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          />
        </>
      )}

      {/* the noise field */}
      {NOISE.map(([x, y], i) => {
        const isMatch = matched.has(i);
        const dim = variant === 'resolve' && !isMatch;
        if (variant === 'enter') {
          return <circle key={i} cx={x} cy={y} r={2.4} className="fill-muted-foreground" opacity={0.4} />;
        }
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            className={isMatch ? 'fill-primary' : 'fill-muted-foreground'}
            initial={reduce ? { r: isMatch ? 4 : 2.4, opacity: isMatch ? 1 : dim ? 0.14 : 0.4 } : { r: 2.4, opacity: 0.4 }}
            whileInView={{ r: isMatch ? 4 : 2.4, opacity: isMatch ? 1 : dim ? 0.14 : 0.4 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : 0.1 }}
          />
        );
      })}

      {/* one match routes out to an application target */}
      {variant === 'route' && (
        <>
          <motion.path
            d="M 104 48 C 122 48, 126 40, 140 40"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.75}
            strokeLinecap="round"
            variants={reduce ? undefined : draw}
            initial={reduce ? false : 'hidden'}
            whileInView={reduce ? undefined : 'shown'}
            viewport={{ once: true, margin: '-60px' }}
            opacity={0.7}
          />
          <rect x="132" y="32" width="16" height="16" rx="4" className="fill-primary/10 stroke-primary" strokeWidth={1.5} />
          <path d="M 136 40 l 3 3 l 5 -6" fill="none" className="stroke-primary" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

const STEPS: Array<{ n: string; variant: Variant; label: string; support: string; aria: string }> = [
  {
    n: '01',
    variant: 'enter',
    label: 'Connect your resume',
    support: 'Add your resume and the roles you want.',
    aria: 'Step one: a resume enters the field of listings.',
  },
  {
    n: '02',
    variant: 'resolve',
    label: 'We resolve matches',
    support: 'Sponsorship-verified, never fabricated.',
    aria: 'Step two: filters fire, the noise dims, a few real matches remain.',
  },
  {
    n: '03',
    variant: 'route',
    label: 'You apply, tailored',
    support: 'One tailored application, out in a minute.',
    aria: 'Step three: one matched role routes out to a sent application.',
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <Container>
        <h2 className="max-w-xl font-display text-title font-bold tracking-tight text-foreground">How it works</h2>
        <ol className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              className="rounded-container border border-border bg-card p-5 shadow-soft"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: reduce ? 0.15 : 0.24, ease: EASE, delay: reduce ? 0 : i * 0.12 }}
            >
              <StepMotif variant={s.variant} label={s.aria} />
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-sm font-bold tabular-nums text-primary">{s.n}</span>
                <h3 className="font-display text-h2 font-bold tracking-tight text-foreground">{s.label}</h3>
              </div>
              <p className="mt-1.5 text-body text-muted-foreground">{s.support}</p>
            </motion.li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
