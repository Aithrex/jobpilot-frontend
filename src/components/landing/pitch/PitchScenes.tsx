import { type ComponentType, type CSSProperties } from 'react';
import { Check, CheckCheck, MousePointer2, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountdownChip, DemoTag, MonoTag, SceneCard, easeOut, rise, seg } from './_pitchKit';

/**
 * The seven scenes of "Aspirely in 60 seconds" — compact animated UI mockups
 * built from divs + the stage palette. No images, no real logos, no fabricated
 * user data; anything implying a real message carries the DEMO tag.
 *
 * Every scene is a pure function of its local progress `p` (0..1), so seeking
 * the timeline in either direction (or parking the reduced-motion stepper on
 * `p = 1`) renders the exact same frame every time. This file is code-split:
 * only the poster ships above the fold.
 */

interface ScProps {
  p: number;
}

// ── 1 · The clock and the trap (t = 0–10) ────────────────────────────────────
const SCATTER = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return {
    x: Math.cos(a) * (52 + (i % 3) * 22),
    y: Math.sin(a) * (16 + (i % 4) * 7),
    r: ((i % 5) - 2) * 14,
  };
});

function SceneTrap({ p }: ScProps) {
  const days = 90 - Math.round(seg(p, 0.05, 0.95) * 22);
  const burst = easeOut(seg(p, 0.3, 0.6));
  const flagged = p > 0.62;
  const stamp = easeOut(seg(p, 0.6, 0.72));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 sm:gap-4">
      <div style={rise(seg(p, 0, 0.08))}>
        <CountdownChip days={days} />
      </div>

      <SceneCard style={rise(seg(p, 0.12, 0.26))} className="w-full max-w-sm p-3.5">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-white/90">Spray-and-pray bot</span>
          <MonoTag className="text-red-300/80">1,000 apps/wk</MonoTag>
        </div>
        <div className="relative mt-3 h-16">
          {SCATTER.map((s, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                'absolute left-1/2 top-1/2 h-2 w-8 rounded-sm',
                flagged ? 'bg-red-400/40' : 'bg-white/25',
              )}
              style={{
                opacity: Math.min(1, burst * 3),
                transform: `translate(${s.x * burst}px, ${s.y * burst}px) rotate(${s.r * burst}deg)`,
              }}
            />
          ))}
          <span
            className="absolute left-1/2 top-1/2 rounded border-2 border-red-400 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-red-400"
            style={{
              opacity: stamp,
              transform: `translate(-50%,-50%) rotate(-6deg) scale(${1.35 - 0.35 * stamp})`,
            }}
          >
            Account flagged
          </span>
        </div>
      </SceneCard>

      <SceneCard style={rise(seg(p, 0.78, 0.92))} className="w-full max-w-sm p-3.5">
        <MonoTag className="text-white/50">Sourced stat</MonoTag>
        <p className="mt-1.5 text-[13px] leading-snug text-white/85">
          100+ apps a day: about 39% less likely to get a positive response.
        </p>
      </SceneCard>
    </div>
  );
}

// ── 2 · Five, max (t = 10–16) ────────────────────────────────────────────────
interface DigestJob {
  role: string;
  vol: string;
  ok: string;
}

const DIGEST: DigestJob[] = [
  { role: 'Backend Engineer', vol: '214 filed FY25', ok: '93% approval' },
  { role: 'Data Engineer', vol: '96 filed FY25', ok: '88% approval' },
  { role: 'ML Engineer', vol: '311 filed FY25', ok: '91% approval' },
  { role: 'Platform Engineer', vol: '58 filed FY25', ok: '86% approval' },
  { role: 'Software Engineer', vol: '442 filed FY25', ok: '95% approval' },
];
const REPLACEMENT: DigestJob = { role: 'Cloud Engineer', vol: '187 filed FY25', ok: '92% approval' };

function DigestRow({
  idx,
  job,
  verified,
  className,
  style,
}: {
  idx: number;
  job: DigestJob;
  verified?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        'flex h-[46px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-2.5',
        className,
      )}
    >
      <span className="shrink-0 font-mono text-[9px] font-semibold text-indigo-300">{idx + 1}/5</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[11px] font-semibold text-white/90">{job.role}</span>
          {verified && <MonoTag className="text-emerald-300">Verified</MonoTag>}
        </span>
        <span className="mt-0.5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.1em]">
          <span className="text-white/50">{job.vol}</span>
          <span className="text-emerald-300/80">{job.ok}</span>
        </span>
      </span>
    </div>
  );
}

function SceneDigest({ p }: ScProps) {
  const flip = easeOut(seg(p, 0.55, 0.7));
  const swap = easeOut(seg(p, 0.76, 0.92));
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-[252px] rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex items-center justify-between px-1 pb-2">
          <MonoTag className="text-indigo-300/90">Morning digest</MonoTag>
          <span className="inline-flex items-center gap-1.5">
            <MonoTag className="text-white/50">5 max</MonoTag>
            <DemoTag />
          </span>
        </div>
        <div className="space-y-1.5">
          {DIGEST.map((job, i) => {
            const enter = rise(seg(p, 0.04 + i * 0.07, 0.16 + i * 0.07), 10);
            if (i !== 2) return <DigestRow key={job.role} idx={i} job={job} style={enter} />;
            return (
              <div key="flip-row" className="relative h-[46px]" style={enter}>
                <DigestRow idx={i} job={job} className="absolute inset-0" style={{ opacity: 1 - flip }} />
                <div
                  className="absolute inset-0 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-2.5"
                  style={{ opacity: flip * (1 - swap) }}
                >
                  <span className="text-[11px] font-medium text-white/45">{"Won't sponsor. Removed."}</span>
                  <MonoTag className="text-white/35">Unverified</MonoTag>
                </div>
                <DigestRow
                  idx={i}
                  job={REPLACEMENT}
                  verified
                  className="absolute inset-0"
                  style={{ opacity: swap, transform: `translateX(${(1 - swap) * 28}px)` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 3 · You approve. You submit. (t = 16–27) ─────────────────────────────────
const FORM_FIELDS = ['Full name', 'Email', 'Work authorization'];
const LEDGER_CHECKS = ['Human approved', 'Capped', 'Own browser', 'Logged'];

function SceneApprove({ p }: ScProps) {
  const glow = easeOut(seg(p, 0.6, 0.66));
  const press = seg(p, 0.7, 0.76);
  const pressScale = 1 - 0.06 * Math.sin(press * Math.PI);
  const submitted = p >= 0.76;
  const cursorMove = easeOut(seg(p, 0.56, 0.72));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-3">
      {/* two tap-approvals */}
      <div className="flex w-full max-w-sm gap-2">
        {(['Backend Engineer', 'Data Engineer'] as const).map((role, i) => {
          const done = p > 0.1 + i * 0.08;
          return (
            <div
              key={role}
              style={rise(seg(p, 0.02 + i * 0.08, 0.1 + i * 0.08))}
              className={cn(
                'flex flex-1 items-center justify-between rounded-lg border px-2.5 py-1.5',
                done ? 'border-indigo-300/40 bg-indigo-400/10' : 'border-white/10 bg-white/[0.05]',
              )}
            >
              <span className="truncate text-[11px] font-medium text-white/80">{role}</span>
              <MonoTag className={done ? 'text-indigo-300' : 'text-white/40'}>
                {done ? 'Approved' : 'Approve?'}
              </MonoTag>
            </div>
          );
        })}
      </div>

      {/* the browser — your own */}
      <SceneCard style={rise(seg(p, 0.18, 0.3))} className="w-full max-w-sm overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-2 w-2 rounded-full bg-white/20" />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] text-white/50">
            careers.example.com/apply
          </span>
          <DemoTag />
        </div>
        <div className="space-y-1.5 p-3">
          {FORM_FIELDS.map((label, i) => {
            const e = easeOut(seg(p, 0.3 + i * 0.09, 0.38 + i * 0.09));
            return (
              <div key={label} className="relative h-7 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                <span aria-hidden className="absolute inset-y-0 left-0 bg-indigo-400/15" style={{ width: `${e * 100}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-[0.14em] text-white/40">
                  {label}
                </span>
                <span
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-indigo-300/90"
                  style={{ opacity: e }}
                >
                  Autofilled
                </span>
              </div>
            );
          })}
          <div className="relative flex justify-end pt-1">
            <span
              className={cn(
                'inline-flex h-7 items-center rounded-md px-4 text-[12px] font-semibold',
                submitted ? 'bg-emerald-400/90 text-[#0A0D1E]' : 'bg-indigo-400 text-[#0A0D1E]',
              )}
              style={{
                transform: `scale(${pressScale})`,
                boxShadow:
                  glow > 0 && !submitted ? `0 0 0 ${3 * glow}px rgba(129,140,248,0.35)` : undefined,
              }}
            >
              {submitted ? 'Submitted' : 'Submit'}
            </span>
            {/* the user's cursor — the human hits submit */}
            <MousePointer2
              aria-hidden
              className="absolute bottom-0 right-8 h-4 w-4 text-white drop-shadow"
              style={{
                opacity: seg(p, 0.5, 0.58),
                transform: `translate(${(1 - cursorMove) * 46}px, ${(1 - cursorMove) * 30}px)`,
              }}
            />
          </div>
        </div>
      </SceneCard>

      {/* the ledger */}
      <div style={rise(seg(p, 0.78, 0.86))} className="w-full max-w-sm">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5">
          <MonoTag className="text-white/70">App #3 of 5 today</MonoTag>
          <MonoTag className="text-emerald-300">Logged 8:41am</MonoTag>
        </div>
        <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {LEDGER_CHECKS.map((label, i) => {
            const e = seg(p, 0.86 + i * 0.03, 0.9 + i * 0.03);
            return (
              <span
                key={label}
                className="inline-flex items-center gap-1 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/60"
                style={{ opacity: 0.25 + 0.75 * easeOut(e) }}
              >
                <Check className="h-3 w-3 text-emerald-300" aria-hidden style={{ opacity: e }} />
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 4 · The loop nobody has (t = 27–31) ──────────────────────────────────────
const FREE_CHIPS = ['Sponsor list CSV', 'H-1B filings DB', 'Approval rates'];
const LOOP_NODES = [
  { label: 'Digest', left: '50%', top: '8%' },
  { label: 'You approve', left: '90%', top: '50%' },
  { label: 'Own browser', left: '50%', top: '92%' },
  { label: 'Ledger', left: '10%', top: '50%' },
];

function SceneLoop({ p }: ScProps) {
  const collapse = easeOut(seg(p, 0.06, 0.4));
  const draw = seg(p, 0.22, 0.85);
  const feed = easeOut(seg(p, 0.45, 0.62));
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="mx-auto grid h-full w-full max-w-md grid-cols-[1fr_auto_1.25fr] items-center gap-2 sm:gap-3">
      {/* free-everywhere data collapses into the bin */}
      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="relative h-[84px] w-full">
          {FREE_CHIPS.map((label, i) => (
            <span
              key={label}
              className="absolute left-1/2 w-max max-w-full truncate rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-white/60"
              style={{
                top: i * 28,
                opacity: 1 - 0.55 * collapse,
                transform: `translateX(-50%) translateY(${collapse * (64 - i * 28)}px) scale(${1 - 0.35 * collapse})`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <span className="rounded-md border border-dashed border-white/25 px-2 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/50 sm:text-[9px]">
          Free everywhere
        </span>
      </div>

      {/* data feeds INTO the loop */}
      <div className="flex flex-col items-center gap-1" style={{ opacity: feed }}>
        <MoveRight className="h-5 w-5 text-indigo-300" aria-hidden />
        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/45">feeds</span>
      </div>

      {/* the four-node loop draws itself */}
      <div className="relative mx-auto aspect-square w-full max-w-[176px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="2.5" className="stroke-white/10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-indigo-400"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - draw)}
          />
        </svg>
        {LOOP_NODES.map((n, i) => (
          <span
            key={n.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-indigo-300/40 bg-[#0A0D1E] px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-indigo-200"
            style={{ left: n.left, top: n.top, opacity: easeOut(seg(p, 0.24 + i * 0.13, 0.34 + i * 0.13)) }}
          >
            {n.label}
          </span>
        ))}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-white/40"
          style={{ opacity: seg(p, 0.85, 1) }}
        >
          nobody
          <br />
          else
        </span>
      </div>
    </div>
  );
}

// ── 5 · Quality wins, and we measure (t = 31–41) ─────────────────────────────
function SceneQuality({ p }: ScProps) {
  const struck = p > 0.3;
  const drop = easeOut(seg(p, 0.36, 0.54));
  const read = easeOut(seg(p, 0.6, 0.7));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 sm:gap-3">
      <SceneCard style={rise(seg(p, 0.02, 0.14))} className="w-full max-w-sm divide-y divide-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <MonoTag className="shrink-0 text-red-300">Myth</MonoTag>
          <span className={cn('text-[11px] text-white/75', struck && 'text-white/35 line-through')}>
            ATS auto-rejects 75% of applications.
          </span>
        </div>
        <div
          className="flex items-center gap-2.5 px-3 py-2"
          style={{ opacity: 0.2 + 0.8 * easeOut(seg(p, 0.14, 0.28)) }}
        >
          <MonoTag className="shrink-0 text-emerald-300">Reality</MonoTag>
          <span className="text-[11px] text-white/85">90 to 95% get human review.</span>
        </div>
      </SceneCard>

      <SceneCard style={rise(seg(p, 0.3, 0.4))} className="w-full max-w-sm p-2.5">
        <MonoTag className="text-white/50">Recruiter review queue</MonoTag>
        <div className="relative mt-1.5 h-10">
          <span aria-hidden className="absolute inset-0 rounded-md border border-dashed border-white/15" />
          <div
            className="absolute inset-0 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.05] px-2.5"
            style={{ opacity: Math.min(1, drop * 2), transform: `translateY(${(1 - drop) * -26}px)` }}
          >
            <span className="text-[11px] font-medium text-white/85">Your application · 1 of 5 today</span>
            <span
              className="inline-flex items-center gap-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-300"
              style={{ opacity: read }}
            >
              <CheckCheck className="h-3 w-3" aria-hidden /> Read
            </span>
          </div>
        </div>
      </SceneCard>

      <SceneCard style={rise(seg(p, 0.72, 0.84))} className="w-full max-w-sm p-2.5">
        <div className="flex items-center justify-between gap-2">
          <MonoTag className="text-white/50">Response rate per application</MonoTag>
          <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            Instrumenting
          </span>
        </div>
        <div className="mt-2 flex h-8 items-end rounded-md border border-white/10 bg-white/[0.03] px-2">
          <span aria-hidden className="mb-2 w-full border-t border-dashed border-white/20" />
        </div>
        <p className="mt-1.5 text-[10px] text-white/45">No claims yet. Measuring every application from day one.</p>
      </SceneCard>
    </div>
  );
}

// ── 6 · Free wedge, campus business (t = 41–52) ──────────────────────────────
const TAM = ['OPT: 250K/yr', '1M+ international students', '4M+ US students'];

function SceneWedge({ p }: ScProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 sm:gap-3">
      <SceneCard style={rise(seg(p, 0.02, 0.16))} className="w-full max-w-sm divide-y divide-white/10">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-[12px] font-semibold text-white/90">Students</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[11px] text-white/60">Free. No card.</span>
            <MonoTag className="text-emerald-300">Free</MonoTag>
          </span>
        </div>
        <div
          className="flex items-center justify-between gap-2 px-3 py-2"
          style={{ opacity: 0.3 + 0.7 * easeOut(seg(p, 0.12, 0.26)) }}
        >
          <span className="text-[12px] font-semibold text-white/90">Universities</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[11px] text-white/60">Per-campus license</span>
            <MonoTag className="text-indigo-300">The business</MonoTag>
          </span>
        </div>
      </SceneCard>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2" style={rise(seg(p, 0.3, 0.46))}>
        <SceneCard className="p-2.5">
          <MonoTag className="text-red-300/90">Career center notice</MonoTag>
          <p className="mt-1 text-[11px] leading-snug text-white/75">Interview copilots banned on campus.</p>
        </SceneCard>
        <SceneCard className="p-2.5">
          <MonoTag className="text-indigo-300/90">Aspirely one-pager</MonoTag>
          <ul className="mt-1 space-y-0.5">
            {['Human approval', 'Own browser', 'Audit trail'].map((item, i) => (
              <li
                key={item}
                className="flex items-center gap-1 text-[10px] text-white/75"
                style={{ opacity: 0.3 + 0.7 * seg(p, 0.42 + i * 0.05, 0.5 + i * 0.05) }}
              >
                <Check className="h-2.5 w-2.5 shrink-0 text-emerald-300" aria-hidden /> {item}
              </li>
            ))}
          </ul>
        </SceneCard>
      </div>

      {/* TAM rings expand: the wedge, then the market */}
      <div className="flex w-full max-w-sm items-center justify-center gap-4" style={rise(seg(p, 0.58, 0.72))}>
        <div className="relative h-24 w-24 shrink-0">
          {TAM.map((label, i) => {
            const e = easeOut(seg(p, 0.6 + i * 0.11, 0.74 + i * 0.11));
            const size = 32 + i * 30;
            return (
              <span
                key={label}
                aria-hidden
                className="absolute left-1/2 top-1/2 rounded-full border"
                style={{
                  width: size,
                  height: size,
                  borderColor: `rgba(165,180,252,${0.7 - i * 0.18})`,
                  opacity: e,
                  transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * e})`,
                }}
              />
            );
          })}
        </div>
        <ul className="space-y-1">
          {TAM.map((label, i) => (
            <li
              key={label}
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/70"
              style={{ opacity: 0.25 + 0.75 * easeOut(seg(p, 0.6 + i * 0.11, 0.74 + i * 0.11)) }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: `rgba(165,180,252,${0.9 - i * 0.2})` }}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── 7 · Live, and the exhale (t = 52–60) ─────────────────────────────────────
function SceneLive({ p }: ScProps) {
  const inboxIn = easeOut(seg(p, 0.35, 0.5));
  const markIn = easeOut(seg(p, 0.7, 0.88));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 sm:gap-4">
      <SceneCard style={rise(seg(p, 0.02, 0.14))} className="grid w-full max-w-sm grid-cols-3 divide-x divide-white/10">
        {(['API', 'Apply loop', 'Ledger'] as const).map((label, i) => {
          const on = seg(p, 0.08 + i * 0.07, 0.14 + i * 0.07);
          return (
            <div key={label} className="flex flex-col items-center gap-1 px-2 py-2.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: `rgba(52,211,153,${0.15 + 0.85 * easeOut(on)})`,
                  boxShadow: on > 0.5 ? '0 0 6px rgba(52,211,153,0.6)' : undefined,
                }}
              />
              <MonoTag className="text-white/70">{label}</MonoTag>
              <span
                className="font-mono text-[8px] uppercase tracking-[0.12em] text-emerald-300"
                style={{ opacity: easeOut(on) }}
              >
                Operational
              </span>
            </div>
          );
        })}
      </SceneCard>

      {/* the reply arrives — with time still on the clock */}
      <SceneCard
        className="flex w-full max-w-sm items-center gap-2.5 p-2.5"
        style={{ opacity: inboxIn, transform: `translateX(${(1 - inboxIn) * 26}px)` }}
      >
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-400/20 font-display text-xs font-bold text-indigo-200"
        >
          R
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-white/50">Recruiter</span>
            <DemoTag />
          </span>
          <span className="block truncate text-[12px] font-semibold text-white/90">Can you interview Thursday?</span>
        </span>
        <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-300">
          68 days left
        </span>
      </SceneCard>

      <div
        className="flex flex-col items-center gap-2"
        style={{ opacity: markIn, transform: `scale(${1.04 - 0.04 * markIn})` }}
      >
        <span className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Aspirely</span>
        <MonoTag className="rounded border border-white/15 px-2 py-1 text-white/70">
          Integrity-first. No fabricated claims.
        </MonoTag>
      </div>
    </div>
  );
}

// ── The switch ───────────────────────────────────────────────────────────────
const SCENES: ReadonlyArray<ComponentType<ScProps>> = [
  SceneTrap,
  SceneDigest,
  SceneApprove,
  SceneLoop,
  SceneQuality,
  SceneWedge,
  SceneLive,
];

export interface PitchScenesProps {
  /** 0-based scene index */
  scene: number;
  /** local scene progress 0..1 */
  progress: number;
  /** scene duration in seconds (scales the cut-in fade) */
  duration?: number;
}

export default function PitchScenes({ scene, progress, duration = 8 }: PitchScenesProps) {
  const Scene = SCENES[Math.min(Math.max(scene, 0), SCENES.length - 1)];
  // A short cut-in fade (~0.35s of the chapter), still purely progress-derived.
  const fade = easeOut(seg(progress, 0, Math.min(0.5, 0.35 / duration)));
  return (
    <div className="absolute inset-0 p-3 sm:p-6" style={{ opacity: fade }}>
      <Scene p={progress} />
    </div>
  );
}
