import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronLeft, FileText, Lock, ShieldCheck, Sparkles } from 'lucide-react';
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
 * One-tap apply — an EVIDENCE PANEL in three acts, all inside one phone frame.
 *
 * Act 1 (digest): a WhatsApp-style 8:00 digest lands with EXACTLY five rows
 * (monogram + sponsor chip + match). A tap ring flips APPROVE to emerald on
 * two of them.
 *
 * Act 2 (you submit): cut to a mini browser — fields fill line by line (name,
 * resume chip, one authored answer tagged YOUR WORDS), the autofill STOPS at a
 * hairline, and SUBMIT glows under a YOUR CLICK label until a cursor ring
 * clicks it.
 *
 * Act 3 (ledger): the apply ledger stamps 2 OF 5 TODAY · LOGGED, then the
 * comparison lands: BULK BOTS 100+ a day, struck through, FLAGGED, 39% fewer
 * responses — vs ASPIRELY 5 max, every one yours, HUMAN.
 *
 * Deterministic (constant data, fixed step durations), in-view gated, pauses
 * on hover/focus, and under reduced motion parks on the composed end state
 * (the ledger + comparison). Semantic tokens only; realistic data is tagged
 * illustrative.
 */

type Job = { company: string; role: string; match: number; approveAt?: number };

const JOBS: Job[] = [
  { company: 'Meridian Labs', role: 'Backend Engineer', match: 94, approveAt: 1 },
  { company: 'Cobalt Health', role: 'Data Engineer', match: 91 },
  { company: 'Vela Robotics', role: 'ML Engineer', match: 89, approveAt: 2 },
  { company: 'Northwind Retail', role: 'Data Analyst', match: 87 },
  { company: 'Quartz Systems', role: 'Platform Engineer', match: 85 },
];

const WHY_ANSWER = 'I ship high throughput Go services and want to own your payments reliability.';

/** Fixed per-step dwell (ms) — the whole loop runs about 10.5 seconds. */
const DURS = [1600, 800, 1000, 2400, 1700, 3000];
/** Steps: 0 digest · 1 approve #1 · 2 approve #2 · 3 autofill · 4 your click · 5 ledger. */
const LEDGER_STEP = 5;

function useTypewriter(text: string, run: boolean, reduce: boolean, cps = 46) {
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setN(text.length);
      return;
    }
    if (!run) {
      setN(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const chars = Math.min(text.length, Math.floor(((t - t0) / 1000) * cps));
      setN(chars);
      if (chars < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, reduce, cps]);
  return text.slice(0, n);
}

// ── Act 1 · the WhatsApp digest ──────────────────────────────────────────────
function ApproveChip({ on, tapping, reduce }: { on: boolean; tapping: boolean; reduce: boolean }) {
  return (
    <span className="relative inline-flex shrink-0">
      {tapping && !reduce && (
        <motion.span
          aria-hidden
          className="absolute -inset-1.5 rounded-full border-2 border-success"
          initial={{ opacity: 0, scale: 1.7 }}
          animate={{ opacity: [0, 1, 0], scale: [1.7, 1, 0.9] }}
          transition={{ duration: 0.7, delay: 0.15, ease: MOTION.ease }}
        />
      )}
      <motion.span
        initial={false}
        animate={{ scale: tapping && !reduce ? [1, 0.9, 1] : 1 }}
        transition={{ duration: 0.35, delay: 0.3, ease: MOTION.ease }}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-full px-2 font-mono text-[8.5px] font-bold uppercase tracking-wide',
          on
            ? 'bg-success text-primary-foreground'
            : 'border border-border bg-card text-muted-foreground',
        )}
      >
        {on && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />}
        {on ? 'Approved' : 'Approve'}
      </motion.span>
    </span>
  );
}

function DigestRow({ job, show, delay, step, reduce }: { job: Job; show: boolean; delay: number; step: number; reduce: boolean }) {
  const on = job.approveAt !== undefined && step >= job.approveAt;
  return (
    <StepIn show={show} delay={delay} reduce={reduce} className="flex h-[34px] items-center gap-2">
      <Monogram name={job.company} className="h-7 w-7 rounded-[6px] text-[12px]" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[12px] font-semibold text-foreground">{job.company}</p>
        <p className="truncate text-[9.5px] text-muted-foreground">
          {job.role} · <span className="font-mono font-bold uppercase text-success">H1B</span>
        </p>
      </div>
      <span className="font-display text-[11px] font-bold tabular-nums text-primary">{job.match}%</span>
      <ApproveChip on={on} tapping={step === job.approveAt} reduce={reduce} />
    </StepIn>
  );
}

function ChatScreen({ step, reduce }: { step: number; reduce: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-success/10 px-3 py-2">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="grid h-7 w-7 place-items-center rounded-full bg-success/20 font-display text-xs font-bold text-success">
          A
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold text-foreground">Aspirely</p>
          <p className="text-[10px] text-success">online</p>
        </div>
        <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5 py-2">
        <p className="mx-auto rounded-full bg-muted/60 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
          Today · 8:00
        </p>

        <StepIn show reduce={reduce} className="max-w-[88%] self-start">
          <div className="rounded-container rounded-tl-sm border border-border bg-card px-2.5 py-1.5 shadow-soft">
            <p className="text-[11.5px] leading-snug text-foreground">
              Morning, Aditya. Your 5 for today. Every one a verified sponsor.
            </p>
          </div>
        </StepIn>

        <StepIn show delay={0.15} reduce={reduce} className="w-full self-start">
          <div className="space-y-1 rounded-container rounded-tl-sm border border-border bg-card p-2 shadow-soft">
            {JOBS.map((j, i) => (
              <DigestRow key={j.company} job={j} show delay={0.25 + i * 0.1} step={step} reduce={reduce} />
            ))}
          </div>
        </StepIn>

        <StepIn show={step >= 2} delay={0.55} reduce={reduce} className="self-end">
          <p className="inline-flex items-center gap-1.5 rounded-container rounded-tr-sm bg-success/15 px-2.5 py-1.5 text-[11px] font-semibold text-foreground">
            2 approved <Check className="h-3 w-3 text-success" strokeWidth={3} aria-hidden />
          </p>
        </StepIn>
      </div>
    </div>
  );
}

// ── Act 2 · the mini browser, and your click ─────────────────────────────────
function Field({ label, show, delay, reduce, children }: { label: string; show: boolean; delay: number; reduce: boolean; children: ReactNode }) {
  return (
    <StepIn show={show} delay={delay} reduce={reduce}>
      <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex min-h-[28px] items-center justify-between gap-2 rounded-[7px] border border-border bg-muted/40 px-2 py-1">
        {children}
      </div>
    </StepIn>
  );
}

function FormScreen({ step, reduce, run }: { step: number; reduce: boolean; run: boolean }) {
  const typed = useTypewriter(WHY_ANSWER, run && step >= 3, reduce);
  const clicked = step >= 4;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        </span>
        <span className="truncate rounded-full bg-card px-2 py-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">
          jobs.meridianlabs.com/apply
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
          <Sparkles className="h-2.5 w-2.5" aria-hidden /> Aspirely
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-foreground">
            Meridian Labs · Backend Engineer
          </p>
          <p className="font-mono text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">1 of 2</p>
        </div>

        <Field label="Name" show={step >= 3} delay={0.15} reduce={reduce}>
          <span className="text-[11.5px] text-foreground">Aditya Rao</span>
          <Check className="h-3 w-3 shrink-0 text-success" strokeWidth={3} aria-hidden />
        </Field>

        <Field label="Resume" show={step >= 3} delay={0.4} reduce={reduce}>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-foreground">
            <FileText className="h-3 w-3 shrink-0 text-primary" aria-hidden />
            <span className="truncate">Aditya_Rao_Backend.pdf</span>
          </span>
          <Check className="h-3 w-3 shrink-0 text-success" strokeWidth={3} aria-hidden />
        </Field>

        <StepIn show={step >= 3} delay={0.6} reduce={reduce}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Why Meridian
            </p>
            <span className="rounded-[4px] border border-primary/30 bg-primary/[0.06] px-1.5 py-px font-mono text-[7.5px] font-bold uppercase tracking-[0.18em] text-primary">
              Your words
            </span>
          </div>
          <div className="mt-0.5 min-h-[44px] rounded-[7px] border border-primary/30 bg-primary/[0.04] px-2 py-1">
            <p className="text-[10.5px] leading-snug text-foreground">
              {typed}
              {!reduce && !clicked && typed.length < WHY_ANSWER.length && (
                <span className="ml-0.5 inline-block h-3 w-[2px] -translate-y-[1px] animate-pulse bg-primary align-middle" />
              )}
            </p>
          </div>
        </StepIn>

        {/* the fill STOPS — the integrity hairline */}
        <StepIn show={step >= 4} y={4} reduce={reduce} className="flex items-center gap-2">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Autofill stops
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </StepIn>

        <StepIn show={step >= 3} delay={0.8} reduce={reduce} className="mt-auto pb-0.5">
          <p
            className={cn(
              'mb-1 text-center font-mono text-[8.5px] font-bold uppercase tracking-[0.24em] transition-colors',
              clicked ? 'text-primary' : 'text-muted-foreground/70',
            )}
          >
            Your click
          </p>
          <motion.div
            initial={false}
            animate={clicked && !reduce ? { scale: [1, 1, 0.96, 1] } : { scale: 1 }}
            transition={{ duration: 1.2, times: [0, 0.6, 0.75, 1], delay: 0.2, ease: MOTION.ease }}
            className={cn(
              'relative w-full rounded-control bg-primary py-2 text-center text-[12px] font-semibold text-primary-foreground',
              clicked && 'shadow-pop ring-2 ring-primary/35',
            )}
          >
            Submit application
            {clicked && !reduce && (
              <motion.span
                aria-hidden
                style={{ x: '-50%', y: '-50%' }}
                className="absolute left-1/2 top-1/2 h-9 w-9 rounded-full border-2 border-foreground/60"
                initial={{ opacity: 0, scale: 1.8 }}
                animate={{ opacity: [0, 1, 1, 0.9], scale: [1.8, 1.1, 0.85, 1] }}
                transition={{ duration: 1.3, times: [0, 0.45, 0.72, 1], delay: 0.15, ease: MOTION.ease }}
              />
            )}
          </motion.div>
        </StepIn>
      </div>
    </div>
  );
}

// ── Act 3 · the ledger, and the comparison ───────────────────────────────────
function LedgerEntry({ time, company, delay, reduce }: { time: string; company: string; delay: number; reduce: boolean }) {
  return (
    <StepIn show delay={delay} reduce={reduce} className="flex items-center gap-2">
      <Check className="h-3 w-3 shrink-0 text-success" strokeWidth={3} aria-hidden />
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{time}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-foreground">
        {company}
      </span>
      <span className="rounded-[4px] border border-success/30 bg-success/10 px-1.5 py-px font-mono text-[7.5px] font-bold uppercase tracking-[0.18em] text-success">
        By you
      </span>
    </StepIn>
  );
}

function LedgerScreen({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground">Apply ledger</p>
        <p className="font-mono text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">Today</p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3 px-3 py-3">
        {/* the stamp */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.3, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          transition={{ duration: reduce ? 0 : MOTION.micro, delay: reduce ? 0 : 0.1, ease: MOTION.ease }}
          className="mx-auto w-fit rounded-control border-2 border-success/50 px-4 py-1.5 text-center"
        >
          <p className="font-mono text-[15px] font-bold uppercase tracking-[0.14em] text-success">2 of 5 today</p>
          <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Logged · by you
          </p>
        </motion.div>

        <div className="space-y-1.5">
          <LedgerEntry time="8:12" company="Meridian Labs" delay={0.3} reduce={reduce} />
          <LedgerEntry time="8:19" company="Vela Robotics" delay={0.4} reduce={reduce} />
        </div>

        {/* the comparison */}
        <StepIn show delay={0.55} reduce={reduce} className="space-y-1.5">
          <div className="flex items-center gap-2 rounded-control border border-destructive/25 bg-destructive/[0.05] px-2.5 py-1.5">
            <Bot className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-mono text-[9.5px] font-bold uppercase tracking-wide text-foreground">
                Bulk bots · <span className="line-through decoration-destructive/70 decoration-2">100+ a day</span>
              </p>
              <p className="truncate font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-destructive">
                39% fewer responses
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-destructive">
              Flagged
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-control border border-success/30 bg-success/[0.06] px-2.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-mono text-[9.5px] font-bold uppercase tracking-wide text-foreground">
                Aspirely · 5 max
              </p>
              <p className="truncate font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-success">
                Every one yours
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-success">
              Human
            </span>
          </div>
        </StepIn>
      </div>
    </div>
  );
}

// ── The panel ────────────────────────────────────────────────────────────────
export function WhatsAppApplyDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const [held, setHeld] = useState(false);
  const running = active && !held;
  const { step, set } = useDemoLoop(DURS.length, { active: running, reduce, durations: DURS });
  const act = step <= 2 ? 'chat' : step <= 4 ? 'form' : 'ledger';

  const label =
    'A WhatsApp style 8:00 digest lists exactly five sponsor verified roles; approve flips to emerald on two. A mini browser then autofills name, resume, and one authored answer tagged your words, the autofill stops, and a cursor ring clicks Submit under a your click label. The apply ledger stamps two of five today, logged, then compares bulk bots at one hundred plus a day, flagged with 39 percent fewer responses, against Aspirely at five max where every application is yours. Data is illustrative.';

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <span className="sr-only" aria-live="polite">
        {act === 'chat'
          ? 'Morning digest: five verified roles, two approved.'
          : act === 'form'
            ? 'Autofill runs, then stops. You click submit.'
            : 'Ledger: two of five logged. Bulk bots flagged; every Aspirely apply is yours.'}
      </span>

      <DemoStage label={label} reserve={440} className="p-3">
        <div className="flex h-full flex-col">
          <div className="flex h-5 items-center justify-between px-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              5 max · by design
            </span>
            <IllustrativeTag className="px-1.5 text-[9px]">Illustrative</IllustrativeTag>
          </div>

          {/* the phone frame — one frame, three acts */}
          <div className="relative mx-auto mt-2 w-full max-w-[340px] flex-1 overflow-hidden rounded-container border border-border bg-background shadow-soft">
            <AnimatePresence mode="wait">
              <motion.div
                key={act}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: reduce ? 0 : MOTION.settle, ease: MOTION.ease }}
              >
                {act === 'chat' ? (
                  <ChatScreen step={step} reduce={reduce} />
                ) : act === 'form' ? (
                  <FormScreen step={step} reduce={reduce} run={active} />
                ) : (
                  <LedgerScreen reduce={reduce} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DemoStage>

      {/* real, keyboard-operable act controls */}
      <div className="mt-3 flex items-center justify-center">
        <SegGroup label="Jump to an act">
          <SegButton active={act === 'chat'} onClick={() => set(0)}>
            Digest
          </SegButton>
          <SegButton active={act === 'form'} onClick={() => set(3)}>
            You submit
          </SegButton>
          <SegButton active={act === 'ledger'} onClick={() => set(LEDGER_STEP)}>
            Ledger
          </SegButton>
        </SegGroup>
      </div>
    </div>
  );
}

export default WhatsAppApplyDemo;
