import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Github, Radar, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountUp,
  DemoStage,
  IllustrativeTag,
  MOTION,
  Panel,
  SegButton,
  SegGroup,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * The growth loop (signature differentiator) — Vision: Aspirely compounds your
 * edge. A looping ring drives four stations: FIND what makes you stand out →
 * a practical 7-DAY PLAN → a GitHub-VERIFIED proof-of-work → an auto-drafted
 * LINKEDIN post whose impressions rise → the next topic. learn → verify → post
 * → reach: the loop no competitor runs. Numbers are labelled illustrative.
 */

const STATIONS = [
  { icon: Radar, label: 'Find your edge' },
  { icon: CalendarDays, label: '7-day plan' },
  { icon: Github, label: 'Verify' },
  { icon: TrendingUp, label: 'Post & reach' },
] as const;

// ring geometry
const CX = 110;
const CY = 110;
const R = 82;
const C = 2 * Math.PI * R;
const ANGLES = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180);
const px = (i: number) => CX + R * Math.cos(ANGLES[i]);
const py = (i: number) => CY + R * Math.sin(ANGLES[i]);

function Ring({ step, reduce }: { step: number; reduce: boolean }) {
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full" role="presentation" aria-hidden>
      {/* faint track */}
      <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth="2" className="stroke-border" />

      {/* progress arc (top-anchored, clockwise) */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={C}
        transform={`rotate(-90 ${CX} ${CY})`}
        initial={false}
        animate={{ strokeDashoffset: C * (1 - step / 4) }}
        transition={{ duration: reduce ? 0 : 0.6, ease: MOTION.ease }}
      />

      {/* station nodes */}
      {STATIONS.map((_, i) => {
        const activeNode = i === step;
        return (
          <g key={i}>
            {activeNode && !reduce && (
              <motion.circle
                cx={px(i)}
                cy={py(i)}
                r="12"
                className="fill-primary/20"
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: `${px(i)}px ${py(i)}px` }}
              />
            )}
            <circle
              cx={px(i)}
              cy={py(i)}
              r={activeNode ? 6 : 4}
              className={activeNode ? 'fill-primary' : 'fill-muted-foreground'}
              opacity={activeNode ? 1 : 0.5}
            />
          </g>
        );
      })}

      {/* travelling orb at the active station */}
      <motion.circle
        r="4.5"
        className="fill-primary"
        initial={false}
        animate={{ cx: px(step), cy: py(step) }}
        transition={{ duration: reduce ? 0 : 0.6, ease: MOTION.ease }}
      />

      {/* center label */}
      <text x={CX} y={CY - 6} textAnchor="middle" className="fill-foreground font-display text-[13px] font-bold">
        Compound
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">
        your edge
      </text>
    </svg>
  );
}

// ── Station cards ────────────────────────────────────────────────────────────
function StationCard({ step, reduce, active }: { step: number; reduce: boolean; active: boolean }) {
  return (
    <div className="relative h-[188px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: MOTION.settle, ease: MOTION.ease }}
        >
          {step === 0 && <FindEdge reduce={reduce} />}
          {step === 1 && <Plan reduce={reduce} active={active} />}
          {step === 2 && <Verify reduce={reduce} active={active} />}
          {step === 3 && <Reach reduce={reduce} active={active} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CardHead({ icon: Icon, kicker, title }: { icon: typeof Radar; kicker: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-control bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{kicker}</p>
        <p className="font-display text-[15px] font-bold leading-tight text-foreground">{title}</p>
      </div>
    </div>
  );
}

function FindEdge({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Radar} kicker="Find" title="What makes you stand out" />
      <Panel className="mt-3 flex-1 space-y-3 p-3">
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Distributed Systems</span>
            <span className="font-display font-bold tabular-nums text-primary">Top 6%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: '94%' }}
              transition={{ duration: 0.7, ease: MOTION.ease }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-control border border-border bg-muted/30 px-2.5 py-1.5">
          <span className="text-[11px] text-muted-foreground">Roles also want</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Kafka</span>
        </div>
      </Panel>
    </div>
  );
}

function Plan({ reduce, active }: { reduce: boolean; active: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <CardHead icon={CalendarDays} kicker="Learn" title="A practical 7-day plan" />
      <Panel className="mt-3 flex flex-1 flex-col justify-center p-3">
        <div className="flex justify-between gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <StepIn key={i} show delay={reduce ? 0 : 0.08 * i} reduce={reduce} className="flex-1">
              <div className="grid h-9 place-items-center rounded-[6px] border border-primary/30 bg-primary/[0.06]">
                {i < 4 || reduce ? (
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} aria-hidden />
                ) : (
                  <span className="text-[10px] font-bold tabular-nums text-muted-foreground">D{i + 1}</span>
                )}
              </div>
            </StepIn>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-muted-foreground">One focused task a day — Kafka, start to shipped.</p>
      </Panel>
    </div>
  );
}

function Verify({ reduce, active }: { reduce: boolean; active: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Github} kicker="Verify" title="Proof-of-work, on GitHub" />
      <Panel className="mt-3 flex-1 space-y-2.5 p-3">
        <div className="flex items-center gap-2">
          <Github className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <code className="truncate rounded bg-muted/50 px-1.5 py-0.5 text-[11px] text-foreground">
            feat: add Kafka consumer group
          </code>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/[0.07] px-2 py-0.5">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-success text-primary-foreground">
            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
          </span>
          <span className="text-[11px] font-semibold text-foreground">Verified on GitHub</span>
        </div>
        {/* contribution squares */}
        <div className="flex gap-1 pt-0.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const lit = [3, 7, 9, 10, 12].includes(i);
            return (
              <motion.span
                key={i}
                className={cn('h-3.5 w-3.5 rounded-[3px]', lit ? 'bg-primary' : 'bg-muted')}
                initial={reduce || !lit ? false : { opacity: 0.3, scale: 0.8 }}
                animate={active && lit ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: MOTION.micro, ease: MOTION.ease, delay: reduce ? 0 : i * 0.03 }}
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Reach({ reduce, active }: { reduce: boolean; active: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <CardHead icon={TrendingUp} kicker="Reach" title="Auto-drafted, your voice" />
      <Panel className="mt-3 flex-1 p-3">
        <p className="line-clamp-2 text-[11.5px] leading-snug text-foreground">
          &ldquo;Shipped a Kafka consumer group that cut lag 40% — here&apos;s what I learned about back-pressure…&rdquo;
        </p>
        <div className="mt-2 flex items-end gap-3">
          {/* rising sparkline */}
          <svg viewBox="0 0 90 34" className="h-9 w-24 shrink-0" aria-hidden>
            <motion.polyline
              points="2,30 18,26 34,27 50,18 66,12 88,3"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={active ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 0.9, ease: MOTION.ease }}
            />
          </svg>
          <div>
            <p className="font-display text-lg font-bold leading-none text-foreground">
              <CountUp key={`imp-${active}`} target={1240} run={active} reduce={reduce} dur={1000} />
              <span className="ml-1 text-[11px] font-semibold text-success">↑</span>
            </p>
            <p className="text-[10px] text-muted-foreground">impressions</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 self-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            next <ArrowRight className="h-2.5 w-2.5" aria-hidden />
          </span>
        </div>
      </Panel>
    </div>
  );
}

// ── Track strip — pipeline funnel + warm referrals ───────────────────────────
const PIPE = [
  { stage: 'Applied', n: 24, w: 100 },
  { stage: 'Screen', n: 8, w: 62 },
  { stage: 'Onsite', n: 3, w: 38 },
  { stage: 'Offer', n: 1, w: 20 },
];

export function TrackStrip() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const label =
    'Track: an application pipeline funnel — 24 applied, 8 screens, 3 onsites, 1 offer (illustrative) — alongside 2 warm referral introductions.';
  return (
    <div ref={ref}>
      <DemoStage label={label} reserve={132} className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
        <div className="grid flex-1 grid-cols-4 gap-2 sm:gap-3">
          {PIPE.map((p, i) => (
            <div key={p.stage}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{p.stage}</span>
                <span className="font-display text-sm font-bold tabular-nums text-foreground">{p.n}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  style={{ opacity: 1 - i * 0.16 }}
                  initial={reduce ? false : { width: 0 }}
                  animate={active ? { width: `${p.w}%` } : reduce ? { width: `${p.w}%` } : {}}
                  transition={{ duration: MOTION.settle, ease: MOTION.ease, delay: reduce ? 0 : i * 0.08 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-2 border-l border-border pl-4 sm:flex sm:pl-6">
          <span className="grid h-8 w-8 place-items-center rounded-control bg-success/10 text-success">
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold leading-none text-foreground">2 warm</p>
            <p className="text-[10px] text-muted-foreground">referral intros</p>
          </div>
        </div>
      </DemoStage>
      <div className="mt-2 flex justify-center">
        <IllustrativeTag>Illustrative pipeline</IllustrativeTag>
      </div>
    </div>
  );
}

export function GrowthLoopDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const { step, set } = useDemoLoop(4, { active, reduce, durations: 3000 });

  const label = `Aspirely's growth loop, showing station ${step + 1} of 4: find your edge, a 7-day plan, GitHub-verified proof-of-work, and an auto-drafted LinkedIn post whose impressions rise — then the next topic. Learn, verify, post, reach — compounding.`;

  return (
    <div ref={ref}>
      <DemoStage label={label} reserve={360} className="p-4 sm:p-5">
        <div className="grid h-full grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_1fr] sm:gap-6">
          {/* ring */}
          <div className="mx-auto h-[180px] w-[180px] sm:h-full sm:w-auto sm:max-h-[300px]">
            <Ring step={step} reduce={reduce} />
          </div>
          {/* active station */}
          <StationCard step={step} reduce={reduce} active={active} />
        </div>
      </DemoStage>

      {/* the loop, spelled out + station tabs */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <p className="text-caption font-medium text-muted-foreground">
          <span className="text-foreground">learn</span> → <span className="text-foreground">verify</span> →{' '}
          <span className="text-foreground">post</span> → <span className="text-foreground">reach</span>
        </p>
        <SegGroup label="Jump to a loop stage">
          {STATIONS.map((s, i) => (
            <SegButton key={s.label} active={step === i} onClick={() => set(i)} icon={s.icon}>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden tabular-nums">{i + 1}</span>
            </SegButton>
          ))}
        </SegGroup>
      </div>
    </div>
  );
}

export default GrowthLoopDemo;
