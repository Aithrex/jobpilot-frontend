import {
  type LucideIcon,
  Gauge,
  Github,
  KanbanSquare,
  Layers,
  Linkedin,
  MessagesSquare,
  Orbit,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, Reveal, SectionHeading } from './_shared';

/**
 * "Everything in one instrument" — the platform's supporting features composed
 * as a constellation on the night surface: eight luminous card-nodes joined by
 * static hairline SVG edges (aria-hidden), echoing the hero's SignalField and
 * the CloseCTA's constellation echo. Light DOM only: no timers, no lazy
 * mounting, zero layout shift (the lg canvas height is fixed; below lg the
 * nodes collapse to a plain 1/2-col grid and the edges hide). Cards are
 * non-interactive; hover is a decorative glow-lift (opacity + transform,
 * disabled under prefers-reduced-motion). Copy states only real capabilities.
 */

interface Node {
  icon: LucideIcon;
  index: string;
  /** Mono micro-label. */
  tag: string;
  title: string;
  promise: string;
  /** Literal Tailwind classes anchoring the card on the lg canvas. */
  pos: string;
}

const NODES: Node[] = [
  {
    icon: ShieldAlert,
    index: '01',
    tag: 'Shield',
    title: 'Scam and ghost-job shield',
    promise: 'Every posting gets a legitimacy score before you spend a minute on it.',
    pos: 'lg:left-[2%] lg:top-[4%]',
  },
  {
    icon: Gauge,
    index: '02',
    tag: 'Readiness',
    title: 'Career Readiness Score',
    promise: 'One honest number for where you stand, with a guided path to raise it.',
    pos: 'lg:left-[35.5%] lg:top-0',
  },
  {
    icon: Github,
    index: '03',
    tag: 'Proof',
    title: 'GitHub proof of skill',
    promise: 'Your public repos read as verified evidence, not claims.',
    pos: 'lg:left-[69%] lg:top-[6%]',
  },
  {
    icon: Linkedin,
    index: '04',
    tag: 'Audit',
    title: 'LinkedIn self-audit',
    promise: 'Your profile, checked against your resume, gap by gap.',
    pos: 'lg:left-[18%] lg:top-[36%]',
  },
  {
    icon: MessagesSquare,
    index: '05',
    tag: 'Prep',
    title: 'Real-skill interview prep',
    promise: 'Mock interviews and coaching that build ability, never cheat in the room.',
    pos: 'lg:left-[53%] lg:top-[33%]',
  },
  {
    icon: Timer,
    index: '06',
    tag: 'Clock',
    title: 'The OPT clock',
    promise: 'Your 90-day unemployment window, tracked, so deadlines never surprise you.',
    pos: 'lg:left-[2%] lg:top-[68%]',
  },
  {
    icon: KanbanSquare,
    index: '07',
    tag: 'Pipeline',
    title: 'Application pipeline',
    promise: 'Every application in one ledger. No double applies, no lost threads.',
    pos: 'lg:left-[35.5%] lg:top-[72%]',
  },
  {
    icon: Layers,
    index: '08',
    tag: 'Tailor',
    title: 'Cover letters, batch tailored',
    promise: 'Authored variants for every role, written from your real history.',
    pos: 'lg:left-[69%] lg:top-[66%]',
  },
];

/** Node centres in the 100x100 edge-field space (~card centres on the lg canvas). */
const CENTERS: Array<[number, number]> = [
  [16.5, 15],
  [50, 11],
  [83.5, 17],
  [32.5, 47],
  [67.5, 44],
  [16.5, 79],
  [50, 83],
  [83.5, 77],
];

/** Index pairs joined by hairline edges (the CloseCTA echo's grammar). */
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [3, 6], [4, 7], [5, 6], [6, 7],
];

/** Sparse static stars behind the field — CSS-only, VisionMission's language. */
const STARS =
  'radial-gradient(1.5px 1.5px at 8% 30%, hsl(var(--primary) / 0.35), transparent 70%), ' +
  'radial-gradient(2px 2px at 27% 88%, hsl(var(--primary) / 0.30), transparent 70%), ' +
  'radial-gradient(1.5px 1.5px at 49% 55%, hsl(var(--primary) / 0.30), transparent 70%), ' +
  'radial-gradient(2px 2px at 66% 10%, hsl(var(--primary) / 0.35), transparent 70%), ' +
  'radial-gradient(1.5px 1.5px at 93% 42%, hsl(var(--primary) / 0.35), transparent 70%)';

/**
 * The connective tissue: static hairline edges between card-nodes, drawn in a
 * percentage coordinate space that stretches with the lg canvas. Desktop only
 * (the stacked grid below lg hides it); purely decorative.
 */
function EdgeField() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
    >
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={CENTERS[a][0]}
          y1={CENTERS[a][1]}
          x2={CENTERS[b][0]}
          y2={CENTERS[b][1]}
          stroke="hsl(var(--primary))"
          strokeOpacity="0.16"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function NodeCard({ icon: Icon, index, tag, title, promise }: Node) {
  return (
    <div
      className="group relative flex h-full flex-col rounded-2xl border border-border bg-card/70 p-5 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Hover glow — opacity-only, sitting behind the card's content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(120% 100% at 50% 0%, hsl(var(--primary) / 0.12), transparent 72%)',
          boxShadow: '0 12px 40px -12px hsl(var(--primary) / 0.35)',
        }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/70">
          {index} · {tag}
        </span>
      </div>
      <h3 className="relative mt-4 text-[15px] font-semibold leading-snug text-foreground">{title}</h3>
      <p className="relative mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{promise}</p>
    </div>
  );
}

export function FeatureConstellation() {
  return (
    <section id="everything" aria-label="Everything in one instrument" className="relative isolate overflow-hidden py-20 sm:py-28">
      {/* Soft indigo glow anchoring the field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 48%, hsl(var(--primary) / 0.09), transparent 70%)' }}
      />
      {/* Sparse static stars — the SignalField, at rest */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: STARS }} />

      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The whole instrument"
            eyebrowIcon={Orbit}
            title={
              <>
                Everything the search demands, <span className="text-primary">in one place</span>.
              </>
            }
            subtitle="The four pillars carry the weight. These keep the rest of the search honest, on time, and in one ledger."
          />
        </Reveal>

        <div className="relative mt-12 sm:mt-16">
          <EdgeField />
          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:block lg:h-[720px]">
            {NODES.map((node, i) => (
              <li key={node.index} className={cn('lg:absolute lg:w-[29%]', node.pos)}>
                <Reveal className="h-full" delay={i * 0.04} y={14}>
                  <NodeCard {...node} />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export default FeatureConstellation;
