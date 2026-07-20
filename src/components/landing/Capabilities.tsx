import { BadgeCheck, ShieldCheck, Target, type LucideIcon } from 'lucide-react';
import { Container, Reveal } from './_shared';
import { MiniMatchCard, MiniSignalRows, MiniTailorDiff } from './fixtures';

/**
 * The three differentiated capabilities, each with a small token-styled
 * visual built from the real UI patterns (never a fake dashboard screenshot).
 * Copy stays inside the honesty rails: "sponsorship signals from public
 * filings" (never "verified sponsor"), scores as estimates, tailoring that
 * rephrases real experience and never invents it.
 */

const SOURCES = ['Workday', 'Greenhouse', 'Lever', 'Ashby'] as const;

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
  visual: React.ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    icon: ShieldCheck,
    title: 'Sponsorship intelligence',
    body: 'Sponsorship signals from public filings, on every role, before you spend time applying. Signals are evidence, not guarantees.',
    visual: <MiniSignalRows />,
  },
  {
    icon: Target,
    title: 'Explainable matching',
    body: 'Openings come from direct employer career sites, and every match score is an estimate that comes with its reason.',
    visual: (
      <div>
        <MiniMatchCard />
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Job sources">
          {SOURCES.map((source) => (
            <li
              key={source}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {source}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    icon: BadgeCheck,
    title: 'Integrity checked tailoring',
    body: 'Tailoring rephrases and reorders your real experience, never invents it. Every draft passes the check before you see it.',
    visual: <MiniTailorDiff />,
  },
];

export function Capabilities() {
  return (
    <section aria-label="What makes Aspirely different" className="border-t border-border bg-card py-16 sm:py-20">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Built on evidence, not volume
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Fewer, better applications: honest signals, explained scores, and a resume that stays yours.
          </p>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body, visual }, i) => (
            <Reveal key={title} delay={i * 0.06} className="flex flex-col rounded-2xl border border-border bg-background p-5">
              <span className="grid h-10 w-10 place-items-center rounded-control bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <div className="mt-4">{visual}</div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
