import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DemoStage,
  MOTION,
  Monogram,
  Panel,
  ReplayButton,
  StepIn,
  useDemoInView,
  useDemoLoop,
} from './_kit';

/**
 * One-tap apply, even from WhatsApp — Vision: wake up to matched jobs on
 * WhatsApp, approve with one tap, Aspirely applies for you. A single narrative:
 * a WhatsApp morning digest (company · role · match% · sponsorship) → the user's
 * green "Approve" → the browser extension autofills the ATS form (incl. an
 * authored "why this company" answer) → a Review/Submit card confirms. The
 * green is the semantic `success` token (doubles as the WhatsApp / approve
 * signal); indigo stays the one brand accent.
 */

type Job = { company: string; role: string; match: number };
const JOBS: Job[] = [
  { company: 'Meridian Labs', role: 'Backend Engineer', match: 94 },
  { company: 'Cobalt Health', role: 'Data Engineer', match: 90 },
  { company: 'Vela Robotics', role: 'ML Engineer', match: 88 },
];
const LEAD = JOBS[0];
const WHY_ANSWER =
  'Your payments platform scales to millions of merchants. I ship high-throughput Go services and want to own that reliability.';

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

function JobRow({ job, show, delay, reduce }: { job: Job; show: boolean; delay: number; reduce: boolean }) {
  return (
    <StepIn show={show} delay={delay} reduce={reduce} className="flex items-center gap-2.5">
      <Monogram name={job.company} className="h-8 w-8 rounded-[7px] text-[13px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{job.company}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{job.role}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-display text-[13px] font-bold tabular-nums text-primary">{job.match}%</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden /> sponsor
        </span>
      </div>
    </StepIn>
  );
}

// ── WhatsApp screen ──────────────────────────────────────────────────────────
function ChatScreen({
  step,
  reduce,
  approved,
  onApprove,
}: {
  step: number;
  reduce: boolean;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* WhatsApp-style header (success = the WhatsApp / approve signal) */}
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

      {/* chat body */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
        <p className="mx-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          Today · 8:02 AM
        </p>

        {/* greeting bubble */}
        <StepIn show={step >= 0} reduce={reduce} className="max-w-[85%] self-start">
          <div className="rounded-container rounded-tl-sm border border-border bg-card px-3 py-2 shadow-soft">
            <p className="text-[12.5px] leading-snug text-foreground">
              Good morning, Aditya. 3 roles that fit <span className="font-semibold">and</span> sponsor you:
            </p>
          </div>
        </StepIn>

        {/* digest bubble */}
        <StepIn show={step >= 1} delay={0.05} reduce={reduce} className="w-[88%] self-start">
          <Panel className="space-y-2 rounded-tl-sm bg-card p-2.5 shadow-soft">
            {JOBS.map((j, i) => (
              <JobRow key={j.company} job={j} show={step >= 1} delay={0.12 + i * 0.12} reduce={reduce} />
            ))}
          </Panel>
        </StepIn>

        {/* approve — a real button */}
        <StepIn show={step >= 2 && !approved} delay={0.1} reduce={reduce} className="self-end">
          <button
            type="button"
            onClick={onApprove}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-container rounded-tr-sm bg-success px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-soft transition-transform',
              'hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Approve all
          </button>
        </StepIn>

        {/* approved echo */}
        <StepIn show={approved} reduce={reduce} className="self-end">
          <div className="rounded-container rounded-tr-sm bg-success/15 px-3 py-2 text-right">
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              Approved all <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} aria-hidden />
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Aspirely is applying…</p>
          </div>
        </StepIn>
      </div>
    </div>
  );
}

// ── Extension screen ─────────────────────────────────────────────────────────
function Field({ label, value, show, reduce, delay }: { label: string; value: string; show: boolean; reduce: boolean; delay: number }) {
  return (
    <StepIn show={show} delay={delay} reduce={reduce}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between rounded-[7px] border border-border bg-muted/40 px-2.5 py-1.5">
        <span className="truncate text-[12px] text-foreground">{value}</span>
        <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={3} aria-hidden />
      </div>
    </StepIn>
  );
}

function ExtScreen({ step, reduce, active }: { step: number; reduce: boolean; active: boolean }) {
  const typed = useTypewriter(WHY_ANSWER, active && step >= 3, reduce);
  const submitted = step >= 4;
  return (
    <div className="flex h-full flex-col">
      {/* browser + extension chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        </span>
        <span className="truncate rounded-full bg-card px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          boards.greenhouse.io/meridianlabs
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles className="h-2.5 w-2.5" aria-hidden /> Aspirely
        </span>
      </div>

      <div className="flex-1 space-y-2.5 overflow-hidden px-3 py-3">
        <p className="text-[12px] font-semibold text-foreground">
          Autofilling · {LEAD.company} · {LEAD.role}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Full name" value="Aditya Rao" show={step >= 3} reduce={reduce} delay={0.1} />
          <Field label="Work auth" value="F-1 OPT · needs H-1B" show={step >= 3} reduce={reduce} delay={0.2} />
        </div>

        {/* authored "why this company" answer */}
        <StepIn show={step >= 3} delay={0.3} reduce={reduce}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Why {LEAD.company}?</p>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">Authored</span>
          </div>
          <div className="mt-1 min-h-[52px] rounded-[7px] border border-primary/30 bg-primary/[0.05] px-2.5 py-1.5">
            <p className="text-[11.5px] leading-snug text-foreground">
              {typed}
              {!reduce && !submitted && typed.length < WHY_ANSWER.length && (
                <span className="ml-0.5 inline-block h-3 w-[2px] -translate-y-[1px] animate-pulse bg-primary align-middle" />
              )}
            </p>
          </div>
        </StepIn>

        {/* review / submit */}
        <StepIn show={step >= 3} delay={0.45} reduce={reduce}>
          <div
            className={cn(
              'flex items-center justify-between rounded-control border px-3 py-2 transition-colors',
              submitted ? 'border-success/30 bg-success/[0.07]' : 'border-border bg-card',
            )}
          >
            {submitted ? (
              <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-success text-primary-foreground">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                </span>
                Submitted · 2 more queued
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground">Reviewed. Nothing fabricated</p>
                <span className="rounded-[6px] bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                  Submit application
                </span>
              </>
            )}
          </div>
        </StepIn>
      </div>
    </div>
  );
}

const DURS = [1500, 2200, 2600, 3000, 3400];

export function WhatsAppApplyDemo() {
  const { ref, active, reduce } = useDemoInView<HTMLDivElement>();
  const { step, set, replay } = useDemoLoop(5, { active, reduce, durations: DURS });
  const screen = step <= 2 ? 'chat' : 'ext';

  const label =
    'A WhatsApp morning digest lists three matched, sponsorship-verified roles; the user taps Approve all, and Aspirely’s browser extension autofills the application, including an authored "why this company" answer, and submits it.';

  // reduced motion: one static frame that still tells the whole story —
  // the full WhatsApp digest (approved) plus the resolved "submitted" outcome.
  if (reduce) {
    return (
      <div ref={ref}>
        <DemoStage label={label} reserve={440} className="p-3">
          <div className="mx-auto flex h-full max-w-[340px] flex-col gap-2.5">
            <div className="min-h-0 flex-1 overflow-hidden rounded-container border border-border bg-background shadow-soft">
              <ChatScreen step={2} reduce approved onApprove={() => {}} />
            </div>
            <div className="flex items-center gap-2 rounded-control border border-success/30 bg-success/[0.07] px-3 py-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              <p className="text-[12px] font-medium text-foreground">
                Extension autofilled &amp; submitted your application · 2 more queued
              </p>
            </div>
          </div>
        </DemoStage>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <span className="sr-only" aria-live="polite">
        {screen === 'chat'
          ? step >= 2
            ? 'WhatsApp digest ready. Approve to apply.'
            : 'A WhatsApp morning digest is arriving.'
          : step >= 4
            ? 'Application submitted; two more queued.'
            : 'Autofilling the application form.'}
      </span>

      <DemoStage label={label} reserve={440} className="p-3">
        {/* phone / panel frame */}
        <div className="relative mx-auto h-full max-w-[340px] overflow-hidden rounded-container border border-border bg-background shadow-soft">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="absolute inset-0"
              initial={{ opacity: 0, x: screen === 'ext' ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: screen === 'ext' ? -24 : 24 }}
              transition={{ duration: MOTION.settle, ease: MOTION.ease }}
            >
              {screen === 'chat' ? (
                <ChatScreen step={step} reduce={false} approved={step >= 3} onApprove={() => set(3)} />
              ) : (
                <ExtScreen step={step} reduce={false} active={active} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DemoStage>

      <div className="mt-3 flex items-center justify-center">
        <ReplayButton onClick={replay} label="Replay from digest" />
      </div>
    </div>
  );
}

export default WhatsAppApplyDemo;
