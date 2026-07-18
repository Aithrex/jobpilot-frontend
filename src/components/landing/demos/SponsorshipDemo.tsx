import { motion } from 'framer-motion';
import { CalendarClock, MapPin, Minus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountUp,
  DemoStage,
  IllustrativeTag,
  MOTION,
  Monogram,
  Panel,
  SegButton,
  SegGroup,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * Sponsorship intelligence — Vision: never waste an application on a company
 * that won't sponsor you. A job card reveals HONEST, public-data-shaped H-1B
 * facts (sponsor volume · approval rate · fiscal year), and a calm, never
 * punitive "no recent filings" state for the rest — tied to the OPT clock so
 * the urgency is real. Numbers are labelled illustrative (shaped from public
 * DOL H-1B disclosure data), never a fabricated measured claim.
 */

type Company = {
  name: string;
  role: string;
  location: string;
  match: number;
  sponsors: boolean;
  // sponsor facts (illustrative, public-data shape)
  approvals?: number;
  approvalRate?: number;
  // OPT urgency
  optDays: number;
};

const COMPANIES: Company[] = [
  {
    name: 'Meridian Labs',
    role: 'Senior Backend Engineer',
    location: 'San Francisco, CA',
    match: 94,
    sponsors: true,
    approvals: 1240,
    approvalRate: 92,
    optDays: 214,
  },
  {
    name: 'Northwind Retail',
    role: 'Data Analyst',
    location: 'Austin, TX',
    match: 86,
    sponsors: false,
    optDays: 214,
  },
];

const OPT_TOTAL = 365; // F-1 OPT window (days) — illustrative frame for the clock

function MatchRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-11 w-11 place-items-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth={3.5} className="stroke-muted" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth={3.5}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ duration: MOTION.settle, ease: MOTION.ease }}
        />
      </svg>
      <span className="absolute font-display text-[11px] font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function SponsorshipDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  // rest on the sponsor (step 0) under reduced motion — the honest H-1B facts
  // are the point of this demo.
  const { step, set } = useDemoLoop(COMPANIES.length, { active, reduce, durations: 3400, restAt: 0 });
  const c = COMPANIES[step];
  const optPct = Math.round(((OPT_TOTAL - c.optDays) / OPT_TOTAL) * 100);

  const label = c.sponsors
    ? `Job card for ${c.role} at ${c.name}: ${c.match} percent match, verified H-1B sponsor with about ${c.approvals} approvals and ${c.approvalRate} percent approval rate in fiscal year 2024 (illustrative, public data), with ${c.optDays} days left on the OPT clock.`
    : `Job card for ${c.role} at ${c.name}: ${c.match} percent match, no recent H-1B filings found. Aspirely will flag it if that changes.`;

  return (
    <div ref={ref}>
      <DemoStage label={label} reserve={356} className="p-4 sm:p-5">
        {/* ambient scan sweep — the single loop element */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent"
            initial={{ x: '-40%' }}
            animate={active ? { x: ['-40%', '340%'] } : { x: '-40%' }}
            transition={{ duration: 3.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0 }}
            key={step}
          />
        )}

        <div className="relative flex h-full flex-col">
          {/* header */}
          <div className="flex items-start gap-3">
            <Monogram name={c.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-h3 font-bold text-foreground">{c.name}</p>
              <p className="truncate text-caption text-muted-foreground">{c.role}</p>
            </div>
            <MatchRing value={c.match} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden /> {c.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" aria-hidden /> New today
            </span>
          </div>

          {/* verdict — fixed min-height so swapping states never shifts layout */}
          <Panel
            className={cn(
              'mt-3 flex min-h-[104px] flex-col justify-center gap-1.5 p-3.5',
              c.sponsors ? 'border-success/30 bg-success/[0.06]' : 'bg-muted/30',
            )}
          >
            <div className="flex items-center gap-2">
              {c.sponsors ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="text-body font-semibold text-foreground">
                {c.sponsors ? 'Verified H-1B sponsor' : 'No recent H-1B filings'}
              </span>
            </div>

            {c.sponsors ? (
              <StepIn show reduce={reduce} className="pl-6">
                <p className="text-caption text-foreground">
                  <span className="font-display font-bold text-foreground">
                    ~
                    <CountUp key={`ap-${step}`} target={c.approvals!} run={active} reduce={reduce} dur={800} />
                  </span>{' '}
                  approvals ·{' '}
                  <span className="font-display font-bold text-foreground">
                    <CountUp
                      key={`rt-${step}`}
                      target={c.approvalRate!}
                      run={active}
                      reduce={reduce}
                      dur={800}
                      format={(n) => `${n}%`}
                    />
                  </span>{' '}
                  approval · <span className="tabular-nums">FY24</span>
                </p>
                <div className="mt-1.5">
                  <IllustrativeTag>Illustrative · public DOL data</IllustrativeTag>
                </div>
              </StepIn>
            ) : (
              <p className="pl-6 text-caption text-muted-foreground">
                We&apos;ll flag this role the moment sponsorship signals appear. No wasted application.
              </p>
            )}
          </Panel>

          {/* OPT clock — real urgency, calm (warning, never alarm-red) */}
          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">OPT clock</span>
              <span className="tabular-nums text-muted-foreground">
                {c.optDays} of {OPT_TOTAL} days left
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-warning"
                initial={false}
                animate={{ width: `${optPct}%` }}
                transition={{ duration: MOTION.settle, ease: MOTION.ease }}
              />
            </div>
          </div>
        </div>
      </DemoStage>

      {/* real, keyboard-operable controls */}
      <div className="mt-3 flex items-center justify-center">
        <SegGroup label="Preview a company">
          {COMPANIES.map((co, i) => (
            <SegButton key={co.name} active={step === i} onClick={() => set(i)}>
              {co.name}
            </SegButton>
          ))}
        </SegGroup>
      </div>
    </div>
  );
}

export default SponsorshipDemo;
