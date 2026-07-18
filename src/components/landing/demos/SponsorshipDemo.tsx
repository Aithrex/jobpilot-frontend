import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DemoStage,
  IllustrativeTag,
  MOTION,
  Monogram,
  SegButton,
  SegGroup,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * Sponsorship intelligence — an EVIDENCE PANEL in two acts.
 *
 * Act 1 (the mechanic): a feed of four postings is swept by a scan beam and
 * resolves live — two earn DOL-shaped sponsor badges (filings + approval),
 * one flips gray "no filings" and strikes through, one flips red GHOST
 * POSTING (47 days stale, reposted 6x) and takes the scam-shield stamp.
 *
 * Act 2 (the payoff): a comparative strip fades up in the reserved verdict
 * zone — APPLYING BLIND (a bar leaking red/gray, "1 in 3: ghost") vs WITH
 * ASPIRELY (a solid indigo-to-emerald bar, "0 wasted").
 *
 * Deterministic: constant data, fixed step durations, no randomness. The loop
 * is in-view gated, pauses on hover/focus, and under reduced motion parks on
 * the composed end state (resolved feed + payoff). Company facts are labelled
 * illustrative; every color is a semantic token.
 */

type Verdict = 'sponsor' | 'none' | 'ghost';

type Posting = {
  company: string;
  role: string;
  verdict: Verdict;
  filings?: number;
  approval?: number;
  /** the loop step at which this row resolves */
  resolveAt: number;
};

const POSTINGS: Posting[] = [
  { company: 'Meridian Labs', role: 'Backend Engineer', verdict: 'sponsor', filings: 214, approval: 92, resolveAt: 1 },
  { company: 'Northwind Retail', role: 'Data Analyst', verdict: 'none', resolveAt: 2 },
  { company: 'Cobalt Health', role: 'Data Engineer', verdict: 'sponsor', filings: 87, approval: 89, resolveAt: 2 },
  { company: 'Apex Talent Group', role: 'Software Engineer', verdict: 'ghost', resolveAt: 3 },
];

/** Step at which the comparative payoff takes over the verdict zone. */
const PAYOFF = 4;
/** Fixed per-step dwell (ms) — the whole loop runs about 9 seconds. */
const DURS = [1500, 1100, 1200, 1800, 3600];

/** Left meter: applications leaking to ghosts (red) and non-sponsors (gray). */
const LEAK: { tone: 'gray' | 'red'; drains: boolean }[] = [
  { tone: 'gray', drains: false },
  { tone: 'red', drains: true },
  { tone: 'gray', drains: true },
  { tone: 'gray', drains: false },
  { tone: 'red', drains: true },
  { tone: 'gray', drains: true },
];
/** Right meter: every application lands — indigo into emerald. */
const LAND: ('primary' | 'success')[] = ['primary', 'primary', 'primary', 'primary', 'success', 'success'];

function VerdictBadge({ row, resolved, reduce }: { row: Posting; resolved: boolean; reduce: boolean }) {
  if (!resolved) {
    return (
      <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Scanning
      </span>
    );
  }
  if (row.verdict === 'sponsor') {
    return (
      <StepIn show reduce={reduce} y={4}>
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-success/30 bg-success/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
          <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
          H1B<span className="hidden sm:inline"> · {row.filings} filings</span> · {row.approval}% approval
        </span>
      </StepIn>
    );
  }
  if (row.verdict === 'none') {
    return (
      <StepIn show reduce={reduce} y={4}>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-muted/60 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          No filings
        </span>
      </StepIn>
    );
  }
  return (
    <StepIn show reduce={reduce} y={4}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-destructive">
        <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />
        Ghost posting
      </span>
    </StepIn>
  );
}

function FeedRow({ row, step, reduce }: { row: Posting; step: number; reduce: boolean }) {
  const resolved = step >= row.resolveAt;
  const payoff = step >= PAYOFF;
  const dimmed = resolved && row.verdict !== 'sponsor';
  return (
    <motion.div
      initial={false}
      animate={{ opacity: dimmed ? (payoff ? 0.45 : 0.6) : 1 }}
      transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
      className={cn(
        'relative flex h-[42px] items-center gap-2.5 rounded-control border px-2.5',
        resolved && row.verdict === 'sponsor'
          ? 'border-success/25 bg-success/[0.05]'
          : resolved && row.verdict === 'ghost'
            ? 'border-destructive/25 bg-destructive/[0.04]'
            : 'border-border bg-card',
      )}
    >
      <Monogram name={row.company} className="h-7 w-7 rounded-[6px] text-[12px]" />
      <div className="min-w-0 flex-1 leading-tight">
        <p
          className={cn(
            'truncate text-[12.5px] font-semibold text-foreground',
            resolved && row.verdict === 'none' && 'line-through decoration-muted-foreground/70',
          )}
        >
          {row.company}
        </p>
        {resolved && row.verdict === 'ghost' ? (
          <p className="truncate font-mono text-[9px] font-bold uppercase tracking-wide text-destructive">
            47 days stale · reposted 6x
          </p>
        ) : (
          <p className="truncate text-[10.5px] text-muted-foreground">{row.role}</p>
        )}
      </div>
      <VerdictBadge row={row} resolved={resolved} reduce={reduce} />

      {/* scam-shield stamp on the ghost row */}
      {resolved && row.verdict === 'ghost' && (
        <motion.span
          aria-hidden
          style={{ left: '38%', x: '-50%' }}
          initial={reduce ? false : { opacity: 0, scale: 1.6, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -7 }}
          transition={{ duration: reduce ? 0 : MOTION.micro, delay: reduce ? 0 : 0.55, ease: MOTION.ease }}
          className="pointer-events-none absolute inline-flex items-center gap-1 rounded-[4px] border-2 border-destructive/60 bg-card/85 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-destructive"
        >
          <ShieldAlert className="h-2.5 w-2.5" aria-hidden /> Shielded
        </motion.span>
      )}
    </motion.div>
  );
}

function TallyStat({ n, label, tone }: { n: number; label: string; tone: 'success' | 'muted' | 'destructive' }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono uppercase">
      <span
        className={cn(
          'text-[15px] font-bold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {n}
      </span>
      <span className="text-[9px] font-semibold tracking-widest text-muted-foreground">{label}</span>
    </span>
  );
}

export function SponsorshipDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  // Pause the timeline while the pointer or keyboard focus is on the demo.
  const [held, setHeld] = useState(false);
  const running = active && !held;
  const { step, set } = useDemoLoop(DURS.length, { active: running, reduce, durations: DURS });
  const payoffOn = step >= PAYOFF;

  const counts = {
    verified: POSTINGS.filter((r) => r.verdict === 'sponsor' && step >= r.resolveAt).length,
    none: POSTINGS.filter((r) => r.verdict === 'none' && step >= r.resolveAt).length,
    ghost: POSTINGS.filter((r) => r.verdict === 'ghost' && step >= r.resolveAt).length,
  };

  const label =
    'Live scan of four job postings. Two resolve as verified H1B sponsors with filing counts and approval rates, one shows no filings and is struck through, and one is caught by the scam shield as a ghost posting, 47 days stale and reposted six times. A comparison follows: applying blind leaks applications to ghosts and non sponsors, roughly one in three postings is a ghost, while with Aspirely every application lands on a verified sponsor and zero are wasted. Figures are illustrative, shaped from public DOL data.';

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <DemoStage label={label} reserve={356} className="p-4">
        <div className="flex h-full flex-col">
          {/* header — scan status + the OPT clock urgency chip */}
          <div className="flex h-5 items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <motion.span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-success"
                animate={running && !payoffOn ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={{ duration: 1.4, repeat: running && !payoffOn ? Infinity : 0, ease: 'easeInOut' }}
              />
              <span className="hidden sm:inline">Sponsor&nbsp;</span>Scan
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">
                <motion.span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-warning"
                  animate={running ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
                  transition={{ duration: 1, repeat: running ? Infinity : 0, ease: 'easeInOut' }}
                />
                OPT · 214 days
              </span>
              <IllustrativeTag className="px-1.5 text-[9px]">Illustrative</IllustrativeTag>
            </span>
          </div>

          {/* Act 1 — the feed, swept by the scan beam */}
          <div className="relative mt-2.5 h-[186px] overflow-hidden">
            {!reduce && running && !payoffOn && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-9 bg-gradient-to-b from-transparent via-primary/[0.08] to-transparent"
                initial={{ y: -36 }}
                animate={{ y: [-36, 186] }}
                transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.35 }}
              />
            )}
            <div className="flex flex-col gap-1.5">
              {POSTINGS.map((row) => (
                <FeedRow key={row.company} row={row} step={step} reduce={reduce} />
              ))}
            </div>
          </div>

          {/* verdict zone — fixed height, so Act 2 never shifts layout */}
          <div className="relative mt-2.5 h-[96px]">
            {/* Act 1 tally */}
            <motion.div
              initial={false}
              animate={{ opacity: payoffOn ? 0 : 1, y: payoffOn && !reduce ? -8 : 0 }}
              transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
              className="absolute inset-0 flex items-center justify-center gap-4 rounded-control border border-dashed border-border sm:gap-6"
            >
              <TallyStat n={counts.verified} label="Verified" tone="success" />
              <TallyStat n={counts.none} label="No filings" tone="muted" />
              <TallyStat n={counts.ghost} label="Ghost" tone="destructive" />
            </motion.div>

            {/* Act 2 — the comparative payoff */}
            <motion.div
              initial={false}
              animate={{ opacity: payoffOn ? 1 : 0, y: payoffOn || reduce ? 0 : 10 }}
              transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
              className="absolute inset-0 grid grid-cols-2 gap-2"
            >
              {/* applying blind — the bar leaks */}
              <div className="flex flex-col justify-between rounded-control border border-border bg-muted/30 p-2.5">
                <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Applying blind
                </p>
                <div className="flex gap-1" aria-hidden>
                  {LEAK.map((seg, i) => (
                    <motion.span
                      key={i}
                      initial={false}
                      animate={{ opacity: payoffOn && seg.drains ? 0.25 : 1 }}
                      transition={{
                        duration: reduce ? 0 : MOTION.micro,
                        delay: reduce ? 0 : 0.35 + i * 0.09,
                        ease: MOTION.ease,
                      }}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        seg.tone === 'red' ? 'bg-destructive/70' : 'bg-muted-foreground/40',
                      )}
                    />
                  ))}
                </div>
                <div className="leading-tight">
                  <p className="font-mono text-[12px] font-bold uppercase tracking-tight text-foreground sm:text-[13px]">
                    1 in 3: ghost
                  </p>
                  <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Applications leak
                  </p>
                </div>
              </div>

              {/* with Aspirely — every application lands */}
              <div className="flex flex-col justify-between rounded-control border border-primary/25 bg-primary/[0.04] p-2.5">
                <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-primary">
                  With Aspirely
                </p>
                <div className="flex gap-1" aria-hidden>
                  {LAND.map((tone, i) => (
                    <motion.span
                      key={i}
                      initial={false}
                      animate={{ scaleX: payoffOn || reduce ? 1 : 0 }}
                      transition={{
                        duration: reduce ? 0 : MOTION.micro,
                        delay: reduce ? 0 : 0.35 + i * 0.09,
                        ease: MOTION.ease,
                      }}
                      className={cn(
                        'h-1.5 flex-1 origin-left rounded-full',
                        tone === 'success' ? 'bg-success' : 'bg-primary',
                      )}
                    />
                  ))}
                </div>
                <div className="leading-tight">
                  <p className="font-mono text-[12px] font-bold uppercase tracking-tight text-foreground sm:text-[13px]">
                    0 wasted
                  </p>
                  <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Verified sponsors only
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </DemoStage>

      {/* real, keyboard-operable act controls */}
      <div className="mt-3 flex items-center justify-center">
        <SegGroup label="Choose an act">
          <SegButton active={!payoffOn} onClick={() => set(0)}>
            Live scan
          </SegButton>
          <SegButton active={payoffOn} onClick={() => set(PAYOFF)}>
            The payoff
          </SegButton>
        </SegGroup>
      </div>
    </div>
  );
}

export default SponsorshipDemo;
