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
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Container, EASE, Reveal, SectionHeading } from './_shared';

/**
 * "Everything in one instrument" — the platform's supporting features as a
 * clean light feature grid (the old night constellation's SVG edge-field read
 * as noise on white, so the edges are gone and the grid is tight instead).
 * Cards: white, hairline border, soft shadow, indigo icon tile, gentle hover
 * lift. Three cards carry a tiny visual accent so the grid is scannable
 * without reading: a pulsing shield halo (scam), a drawn progress ring
 * (readiness), and a ticking amber dot (the OPT clock) — all subtle and fully
 * inert under prefers-reduced-motion. Copy states only real capabilities.
 */

type Accent = 'shield' | 'ring' | 'clock';

interface Node {
  icon: LucideIcon;
  index: string;
  /** Mono micro-label. */
  tag: string;
  title: string;
  promise: string;
  accent?: Accent;
}

const NODES: Node[] = [
  {
    icon: ShieldAlert,
    index: '01',
    tag: 'Shield',
    title: 'Scam and ghost-job shield',
    promise: 'Every posting gets a legitimacy score before you spend a minute on it.',
    accent: 'shield',
  },
  {
    icon: Gauge,
    index: '02',
    tag: 'Readiness',
    title: 'Career Readiness Score',
    promise: 'One honest number for where you stand, with a guided path to raise it.',
    accent: 'ring',
  },
  {
    icon: Github,
    index: '03',
    tag: 'Proof',
    title: 'GitHub proof of skill',
    promise: 'Your public repos read as verified evidence, not claims.',
  },
  {
    icon: Linkedin,
    index: '04',
    tag: 'Audit',
    title: 'LinkedIn self-audit',
    promise: 'Your profile, checked against your resume, gap by gap.',
  },
  {
    icon: MessagesSquare,
    index: '05',
    tag: 'Prep',
    title: 'Real-skill interview prep',
    promise: 'Mock interviews and coaching that build ability, never cheat in the room.',
  },
  {
    icon: Timer,
    index: '06',
    tag: 'Clock',
    title: 'The OPT clock',
    promise: 'Your 90-day unemployment window, tracked, so deadlines never surprise you.',
    accent: 'clock',
  },
  {
    icon: KanbanSquare,
    index: '07',
    tag: 'Pipeline',
    title: 'Application pipeline',
    promise: 'Every application in one ledger. No double applies, no lost threads.',
  },
  {
    icon: Layers,
    index: '08',
    tag: 'Tailor',
    title: 'Cover letters, batch tailored',
    promise: 'Authored variants for every role, written from your real history.',
  },
];

/** The indigo icon tile, with the card's optional tiny animated accent. */
function IconTile({ icon: Icon, accent }: { icon: LucideIcon; accent?: Accent }) {
  const reduce = useReducedMotion();

  if (accent === 'ring') {
    // A drawn progress ring around a circular tile — draws once in view,
    // rests fully drawn under reduced motion.
    return (
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
        <svg aria-hidden viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="20" cy="20" r="18.5" fill="none" stroke="hsl(var(--primary) / 0.15)" strokeWidth="2.5" />
          <motion.circle
            cx="20"
            cy="20"
            r="18.5"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 0.72 : 0 }}
            whileInView={{ pathLength: 0.72 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: 0.2 }}
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      {/* Pulsing halo (shield) — an opacity-only breathe, off under reduced motion */}
      {accent === 'shield' && (
        <span aria-hidden className="absolute inset-0 rounded-lg bg-primary/10 motion-safe:animate-pulse" />
      )}
      <Icon className="relative h-4 w-4" aria-hidden />
      {/* Ticking dot (the OPT clock) — a quiet amber blink, off under reduced motion */}
      {accent === 'clock' && (
        <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning motion-safe:animate-pulse" />
      )}
    </span>
  );
}

function NodeCard({ icon, index, tag, title, promise, accent }: Node) {
  return (
    <div
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft',
        'transition-[border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-panel',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <IconTile icon={icon} accent={accent} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {index} · {tag}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold leading-snug text-foreground">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{promise}</p>
    </div>
  );
}

export function FeatureConstellation() {
  return (
    <section id="everything" aria-label="Everything in one instrument" className="scroll-mt-16 py-20 sm:py-28">
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
            subtitle="The four pillars carry the weight. These keep the rest honest, on time, and in one ledger."
          />
        </Reveal>

        <ul className="mt-12 grid list-none grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {NODES.map((node, i) => (
            <li key={node.index}>
              <Reveal className="h-full" delay={i * 0.04} y={14}>
                <NodeCard {...node} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default FeatureConstellation;
