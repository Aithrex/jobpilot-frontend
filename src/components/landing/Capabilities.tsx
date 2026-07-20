import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, FileSearch, ShieldCheck, Target, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Container,
  DUR,
  EASE,
  Grain,
  Reveal,
  RevealGroup,
  RevealItem,
  scenePauseHandlers,
  useSceneLoop,
  useSceneState,
} from './_shared';
import {
  CountUpNumber,
  FIXTURE_BULLET,
  FIXTURE_JOBS,
  FIXTURE_REQUIREMENTS,
  FIXTURE_SKILLS,
  IllustrativeChip,
  IntegrityPassRow,
  LockedFactsRow,
  SkillChip,
} from './fixtures';

/**
 * The three differentiated capabilities, each led by a looping animated
 * infographic (~8-10s, deterministic, in-view gated, hover-pausable; a
 * complete static end-state under reduced motion). Copy stays inside the
 * honesty rails: sponsorship signals from public filings (never "verified
 * sponsor"), scores as estimates, tailoring that rephrases real experience
 * and never invents it.
 */

/* ── Scene A: sponsorship evidence travels from a public filing to a job ── */

const SPONSOR_BEATS = [1500, 1700, 1500, 3600] as const; // ~8.3s

function SponsorshipScene({ phase, reduce }: { phase: number; reduce: boolean }) {
  const p = reduce ? SPONSOR_BEATS.length - 1 : phase;
  const chip = (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success shadow-soft">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      Sponsorship signal
    </span>
  );

  return (
    <div className="flex h-full flex-col p-3.5">
      {/* the public filing */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-fit items-center gap-2 rounded-control border border-border bg-background px-2.5 py-1.5 shadow-soft"
      >
        <FileSearch className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-[11px] font-semibold leading-tight text-foreground">Public filing</p>
          <p className="text-[10px] leading-tight text-muted-foreground">Hiring disclosure, 2025</p>
        </div>
      </motion.div>

      {/* extraction path + travelling evidence chip */}
      <div className="relative min-h-0 flex-1 py-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <motion.path
            d="M 16 0 C 16 55, 50 40, 50 100"
            fill="none"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{ pathLength: p >= 1 ? 1 : 0, opacity: p >= 1 ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
          />
        </svg>
        <AnimatePresence>
          {p >= 1 && p < 3 && (
            <motion.span
              layout={!reduce}
              layoutId={reduce ? undefined : 'cap-evidence'}
              className={cn('absolute', p === 1 ? 'left-2 top-0' : 'left-[34%] top-[46%]')}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast, ease: EASE }}
            >
              {chip}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* the job card the evidence attaches to */}
      <div className="rounded-xl border border-border bg-background p-3 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{FIXTURE_JOBS[0].title}</p>
            <p className="truncate text-[10px] text-muted-foreground">{FIXTURE_JOBS[0].company}</p>
          </div>
        </div>
        <div className="mt-2 flex h-6 items-center">
          {p >= 3 ? (
            <motion.span
              layoutId={reduce ? undefined : 'cap-evidence'}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DUR.fast, ease: EASE }}
              className="inline-flex items-center gap-1.5"
            >
              {chip}
              <span className="text-[10px] text-muted-foreground">from public filings</span>
            </motion.span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Checking public filings...</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Scene B: skills connect to requirements, an estimate composes ──────── */

const MATCH_BEATS = [1300, 1900, 1300, 4200] as const; // ~8.7s
// Chip-center rows as % of the padded stage (four chips, justify-between).
const ROW_Y = [5.7, 35.2, 64.8, 94.3] as const;
// skill row -> requirement row (SQL->SQL, Python->Python(3rd), Tableau->Tableau(2nd))
const MATCH_LINES = [
  { from: 0, to: 0 },
  { from: 1, to: 2 },
  { from: 2, to: 1 },
] as const;

const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

function MatchingScene({ phase, reduce }: { phase: number; reduce: boolean }) {
  const p = reduce ? MATCH_BEATS.length - 1 : phase;
  return (
    <div className="relative h-full p-3.5">
      {/* connector lines, drawn under the chips (chips carry solid fills) */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-3.5" aria-hidden>
        {MATCH_LINES.map(({ from, to }, i) => (
          <motion.path
            key={i}
            d={`M 2 ${ROW_Y[from]} C 50 ${ROW_Y[from]}, 50 ${ROW_Y[to]}, 98 ${ROW_Y[to]}`}
            fill="none"
            stroke="hsl(var(--primary) / 0.55)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{ pathLength: p >= 1 ? 1 : 0, opacity: p >= 1 ? 1 : 0 }}
            transition={{ delay: reduce ? 0 : i * 0.18, duration: reduce ? 0 : 0.6, ease: EASE }}
          />
        ))}
        {/* the gap: a requirement with no matching skill, dashed and muted */}
        <motion.path
          d={`M 98 ${ROW_Y[3]} C 68 ${ROW_Y[3]}, 58 ${ROW_Y[3] - 8}, 48 ${ROW_Y[3] - 15}`}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.4)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{ pathLength: p >= 2 ? 1 : 0, opacity: p >= 2 ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
        />
      </svg>

      {/* resume skills (left) */}
      <div className="absolute bottom-3.5 left-3.5 top-3.5 flex flex-col justify-between">
        {FIXTURE_SKILLS.map((skill) => (
          <SkillChip key={skill}>{skill}</SkillChip>
        ))}
      </div>

      {/* job requirements (right) */}
      <div className="absolute bottom-3.5 right-3.5 top-3.5 flex flex-col items-end justify-between">
        {FIXTURE_REQUIREMENTS.map((req) => (
          <SkillChip key={req.label} tone={req.matched ? 'matched' : 'gap'}>
            {req.label}
          </SkillChip>
        ))}
      </div>

      {/* the estimate ring, composed from the matched count */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={{ opacity: p >= 3 ? 1 : 0, scale: p >= 3 || reduce ? 1 : 0.9 }}
        transition={{ duration: reduce ? 0 : DUR.base, ease: EASE }}
      >
        <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-card shadow-pop">
          <svg viewBox="0 0 60 60" className="absolute h-[68px] w-[68px] -rotate-90" aria-hidden>
            <circle cx="30" cy="30" r={RING_R} fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
            <motion.circle
              cx="30"
              cy="30"
              r={RING_R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              initial={false}
              animate={{ strokeDashoffset: p >= 3 ? RING_C * (1 - 0.76) : RING_C }}
              transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
            />
          </svg>
          <div className="text-center leading-none">
            <p className="font-mono text-lg font-bold tabular-nums text-primary">
              {p >= 3 && !reduce ? <CountUpNumber key="up" value={76} duration={0.9} /> : 76}
            </p>
            <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">estimate</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Scene C: a bullet is reworded while the facts stay locked ──────────── */

const INTEGRITY_BEATS = [1600, 900, 1500, 5000] as const; // ~9s

function IntegrityScene({ phase, reduce }: { phase: number; reduce: boolean }) {
  const p = reduce ? INTEGRITY_BEATS.length - 1 : phase;
  return (
    <div className="flex h-full flex-col gap-2.5 p-3.5">
      <LockedFactsRow />
      <div className="relative overflow-hidden rounded-control border border-border">
        <AnimatePresence mode="wait" initial={false}>
          {p < 2 ? (
            <motion.p
              key="before"
              className="bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: DUR.fast, ease: EASE }}
            >
              {FIXTURE_BULLET.before}
            </motion.p>
          ) : (
            <motion.p
              key="after"
              className="bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-foreground"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
            >
              {FIXTURE_BULLET.after}
            </motion.p>
          )}
        </AnimatePresence>
        {!reduce && (p === 1 || p === 2) && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            initial={{ x: '-120%' }}
            animate={{ x: '340%' }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: p >= 3 ? 1 : 0, y: p >= 3 || reduce ? 0 : 6 }}
        transition={{ duration: DUR.base, ease: EASE }}
      >
        <IntegrityPassRow />
      </motion.div>
    </div>
  );
}

/* ── The capability card shell ───────────────────────────────────────────── */

interface CapabilityDef {
  icon: LucideIcon;
  title: string;
  body: string;
  caption: string;
  stageLabel: string;
  beats: readonly number[];
  Scene: (props: { phase: number; reduce: boolean }) => JSX.Element;
}

const CAPABILITIES: CapabilityDef[] = [
  {
    icon: ShieldCheck,
    title: 'Sponsorship intelligence',
    body: 'Sponsorship signals read from public filings and attached to every role before you spend time applying.',
    caption: 'A signal from public filings. Evidence, never a verified-sponsor claim.',
    stageLabel:
      'Illustration: a sponsorship signal is extracted from a public filing and attached to a job card as evidence. It is a signal, not a guarantee.',
    beats: SPONSOR_BEATS,
    Scene: SponsorshipScene,
  },
  {
    icon: Target,
    title: 'Explainable matching',
    body: 'Openings come from direct employer career sites like Workday, Greenhouse, Lever, and Ashby, and every score shows its reason.',
    caption: 'Three of four requirements met composes the estimate. Never certainty.',
    stageLabel:
      'Illustration: resume skills connect to job requirements. Three of four match with solid lines, one gap stays dashed, and an estimated fit score of 76 composes from the matches. Scores are estimates.',
    beats: MATCH_BEATS,
    Scene: MatchingScene,
  },
  {
    icon: BadgeCheck,
    title: 'Integrity checked tailoring',
    body: 'Tailoring rephrases and reorders your real experience, never invents it. Every draft passes the check before you see it.',
    caption: 'Employers, titles, dates, and skills stay locked. Only wording adapts.',
    stageLabel:
      'Illustration: a resume bullet is reworded for a role while employer, title, dates, and skills sit in a locked row, unchanged, and IntegrityGuard passes the result.',
    beats: INTEGRITY_BEATS,
    Scene: IntegrityScene,
  },
];

function CapabilityCard({ icon: Icon, title, body, caption, stageLabel, beats, Scene }: CapabilityDef) {
  const { ref, inView, reduce } = useSceneState<HTMLDivElement>();
  const { phase, setPaused } = useSceneLoop(beats, { active: inView && !reduce, reduce });

  return (
    // Hover elevation lives on the inner div: RevealItem's framer transform
    // would override a CSS hover translate on the same element.
    <RevealItem as="li" className="flex">
      <div className="flex flex-1 flex-col rounded-container border border-border bg-background shadow-soft transition-[transform,box-shadow] duration-200 ease-expo hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="p-5 pb-4">
        <span className="grid h-10 w-10 place-items-center rounded-control bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div
        ref={ref}
        {...scenePauseHandlers(setPaused)}
        role="img"
        aria-label={stageLabel}
        className="relative mx-5 mt-auto h-[220px] overflow-hidden rounded-xl border border-border bg-card"
      >
        <Grain />
        <Scene phase={phase} reduce={reduce} />
        <IllustrativeChip className="absolute right-2.5 top-2.5" />
      </div>
      <p className="p-5 pt-3 text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
    </RevealItem>
  );
}

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

        <RevealGroup as="ul" className="mx-auto mt-10 grid max-w-5xl list-none gap-5 md:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <CapabilityCard key={cap.title} {...cap} />
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
