import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FlaskConical, GraduationCap, KanbanSquare, MessagesSquare, Route, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Container, DUR, EASE, Reveal } from './_shared';
import { ProductShot } from './ProductShot';

/**
 * #workspace — the interactive ecosystem preview replacing the single
 * screenshot: five tabs, each swapping in a GENUINE visual panel (three real
 * product shots with fictional data + two live micro-demos in the
 * DemoWorkspace idiom: pure client state, clearly labeled fictional, zero
 * backend traffic). Directional slide+fade between panels (transform +
 * opacity only; static swap under reduced motion).
 *
 * Keyboard contract: a real tablist with roving tabindex — Left/Right/Home/
 * End move focus AND selection, aria-selected tracks the active tab, panels
 * are labeled tabpanels. On mobile the tab row becomes a scroll-snap chip
 * row. The panel area reserves height so switching never shifts layout.
 */

type PanelKind =
  | { kind: 'shot'; name: string; alt: string; width: number; height: number; caption: string }
  | { kind: 'interview' }
  | { kind: 'skills' };

interface EcosystemTab {
  id: string;
  Icon: typeof Target;
  label: string;
  sentence: string;
  panel: PanelKind;
}

const TABS: readonly EcosystemTab[] = [
  {
    id: 'jobs',
    Icon: Target,
    label: 'Job opportunities and saved jobs',
    sentence: 'Live openings scored against your resume, with the reason each one fits.',
    panel: {
      kind: 'shot',
      name: 'match-dashboard',
      alt: 'The matches dashboard listing five scored openings with matched skills and a why-this-matches explanation, shown with fictional data',
      width: 1400,
      height: 798,
      caption: 'The match dashboard, shown with fictional data.',
    },
  },
  {
    id: 'tracking',
    Icon: KanbanSquare,
    label: 'Application tracking',
    sentence: 'Every application, stage, and follow-up in one pipeline you control.',
    panel: {
      kind: 'shot',
      name: 'workspace-pipeline',
      alt: 'The application tracking pipeline with applications in Applied, Interviewing, and Offer stages, shown with fictional data',
      width: 1600,
      height: 1139,
      caption: 'The application pipeline, shown with fictional data.',
    },
  },
  {
    id: 'interview',
    Icon: MessagesSquare,
    label: 'Interview prep',
    sentence: 'Practice questions built from the actual job description, not a generic bank.',
    panel: { kind: 'interview' },
  },
  {
    id: 'skills',
    Icon: GraduationCap,
    label: 'Skills and learning gaps',
    sentence: 'See which skills block your matches and get a plan to close them.',
    panel: { kind: 'skills' },
  },
  {
    id: 'planning',
    Icon: Route,
    label: 'Career planning',
    sentence: 'Aim at a target role and tailor honestly toward it, compare before you send.',
    panel: {
      kind: 'shot',
      name: 'tailored-compare',
      alt: 'The original versus tailored resume compare view with IntegrityGuard active and PDF and DOCX downloads, shown with fictional data',
      width: 1000,
      height: 966,
      caption: 'Tailoring toward a target role: the compare view, shown with fictional data.',
    },
  },
] as const;

/** Fictional-data ribbon shared by both micro-demos (always visible). */
function FictionalLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden />
      {text}
    </span>
  );
}

// ── Micro-demo 1: interview prep (pure client state, fictional) ──

const DEMO_QUESTIONS = [
  {
    q: 'Tell me about a dashboard you shipped end to end.',
    approach: [
      'Anchor on the internal dashboard project from the sample resume',
      'Name the stack it actually used: React and TypeScript',
      'Close with the measurable outcome you can defend',
    ],
  },
  {
    q: 'How do you approach accessibility in a component library?',
    approach: [
      'Point to the design system work three teams consumed',
      'Describe the WCAG checks you ran and what they caught',
      'Show how you made accessibility a default, not a fix',
    ],
  },
  {
    q: 'A page is slow. Walk me through your debugging.',
    approach: [
      'Start from the performance work on the sample resume',
      'Measure first: profiles and real user timings before changes',
      'Explain one concrete win and how you verified it held',
    ],
  },
] as const;

function InterviewPrepDemo() {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const item = DEMO_QUESTIONS[selected];
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FictionalLabel text="Live micro-demo, fictional data" />
        <span className="text-[11px] text-muted-foreground">
          Built from a sample job description
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sample interview questions">
        {DEMO_QUESTIONS.map(({ q }, i) => (
          <button
            key={q}
            type="button"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
            className={cn(
              'min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              i === selected
                ? 'border-primary/50 bg-primary/5 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30',
            )}
          >
            {q}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, transition: { duration: 0.15 } }}
          transition={{ duration: DUR.fast, ease: EASE }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            A strong answer shape
          </p>
          <ul className="mt-2 space-y-1.5">
            {item.approach.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                {line}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
      <p className="mt-auto text-[11px] leading-relaxed text-muted-foreground">
        In the real workspace, questions come from the job description of a role you matched.
      </p>
    </div>
  );
}

// ── Micro-demo 2: skills and learning gaps (pure client state, fictional) ──

const DEMO_GAPS: ReadonlyArray<{
  skill: string;
  blocked: number;
  plan: readonly string[];
}> = [
  {
    skill: 'GraphQL',
    blocked: 3,
    plan: ['Schema basics with one guided build', 'Convert one REST view in a sandbox', 'Ship a small end-to-end query'],
  },
  {
    skill: 'Testing (Playwright)',
    blocked: 2,
    plan: ['Record one real user flow', 'Stabilize it against flake', 'Wire it into CI'],
  },
  {
    skill: 'AWS fundamentals',
    blocked: 2,
    plan: ['Deploy a static site end to end', 'Add a serverless function', 'Put both behind a CDN'],
  },
] as const;

function SkillsGapDemo() {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const item = DEMO_GAPS[selected];
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FictionalLabel text="Live micro-demo, fictional data" />
        <span className="text-[11px] text-muted-foreground">From a sample resume's matches</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sample skill gaps">
        {DEMO_GAPS.map(({ skill, blocked }, i) => (
          <button
            key={skill}
            type="button"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
            className={cn(
              'min-h-[44px] rounded-xl border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              i === selected
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card hover:border-primary/30',
            )}
          >
            <span className="block text-xs font-semibold">{skill}</span>
            <span className="block text-[11px] text-muted-foreground">
              held back {blocked} {blocked === 1 ? 'match' : 'matches'}
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, transition: { duration: 0.15 } }}
          transition={{ duration: DUR.fast, ease: EASE }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            A plan to close it
          </p>
          <ol className="mt-2 space-y-1.5">
            {item.plan.map((line, i) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}.</span>
                {line}
              </li>
            ))}
          </ol>
          <Badge variant="secondary" className="mt-3 text-[11px] font-normal">
            Sample plan, fictional data
          </Badge>
        </motion.div>
      </AnimatePresence>
      <p className="mt-auto text-[11px] leading-relaxed text-muted-foreground">
        In the real workspace, gaps come from the postings you actually matched against.
      </p>
    </div>
  );
}

// ── The tabbed preview ──

export function EcosystemPreview() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (next: number) => {
    const clamped = (next + TABS.length) % TABS.length;
    setDirection(clamped > index || (clamped === 0 && index === TABS.length - 1) ? 1 : -1);
    setIndex(clamped);
    tabRefs.current[clamped]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      select(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      select(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      select(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      select(TABS.length - 1);
    }
  };

  const tab = TABS[index];

  return (
    <section
      id="workspace"
      aria-label="The full career workspace"
      className="scroll-mt-24 border-t border-border py-16 sm:py-20"
    >
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            One workspace for the whole search
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            A free account grows the guest flow into a full career workspace. Pick a surface to
            see it.
          </p>
        </Reveal>

        <Reveal>
          <div
            role="tablist"
            aria-label="Workspace areas"
            onKeyDown={onKeyDown}
            className="-mx-4 mt-10 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
          >
            {TABS.map(({ id, Icon, label }, i) => {
              const selected = i === index;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`workspace-tab-${id}`}
                  aria-selected={selected}
                  aria-controls={`workspace-panel-${id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'inline-flex min-h-[44px] shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selected
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">{tab.sentence}</p>

          {/* Reserved-height stage: switching tabs never shifts layout. */}
          <div className="relative mx-auto mt-6 min-h-[360px] max-w-4xl overflow-hidden sm:min-h-[440px]">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={tab.id}
                role="tabpanel"
                id={`workspace-panel-${tab.id}`}
                aria-labelledby={`workspace-tab-${tab.id}`}
                custom={direction}
                initial={reduceMotion ? false : { opacity: 0, x: 32 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, x: -24 * direction, transition: { duration: 0.18 } }
                }
                transition={{ duration: DUR.base, ease: EASE }}
                className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-pop sm:min-h-[440px]"
              >
                {tab.panel.kind === 'shot' ? (
                  <>
                    <ProductShot
                      name={tab.panel.name}
                      alt={tab.panel.alt}
                      width={tab.panel.width}
                      height={tab.panel.height}
                      loading="lazy"
                    />
                    <p className="border-t border-border/60 px-4 py-2.5 text-center text-xs text-muted-foreground">
                      {tab.panel.caption}
                    </p>
                  </>
                ) : tab.panel.kind === 'interview' ? (
                  <InterviewPrepDemo />
                ) : (
                  <SkillsGapDemo />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
