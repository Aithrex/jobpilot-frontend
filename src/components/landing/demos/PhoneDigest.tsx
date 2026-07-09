import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Mic, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoFrame, EASE, useDemoActive } from './_demoKit';

/**
 * Signature demo: the morning digest arrives as a WhatsApp chat with Aspirely.
 * Bubbles land one at a time, the "Approve ✅" reply gets its blue read ticks,
 * and the role slides into a Ready-to-Submit tray. Loops only while on-screen;
 * renders the finished state under reduced motion.
 *
 * WhatsApp-literal hex values are intentional brand mimicry, allowed ONLY in
 * this file — everything outside the chat surface stays on semantic tokens.
 */

const END_STEP = 6; // static end-state: all bubbles, blue ticks, tray filled
// Dwell after entering each step: 0-3 incoming bubbles · 4 reply lands ·
// 5 ticks flip blue (~0.6s after the reply) · 6 tray fills + hold · 7 fade out.
const STEP_MS = [1050, 1050, 1050, 1050, 600, 450, 2800, 420];

export default function PhoneDigest() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const [step, setStep] = useState(END_STEP);

  useEffect(() => {
    if (!active) {
      setStep(END_STEP);
      return;
    }
    let id = 0;
    const run = (s: number) => {
      setStep(s);
      id = window.setTimeout(() => run(s >= STEP_MS.length - 1 ? 0 : s + 1), STEP_MS[s]);
    };
    run(0);
    return () => window.clearTimeout(id);
  }, [active]);

  const show = (i: number) => step >= i;
  const read = step >= 5;
  const approved = step >= 6;
  const fading = step === 7;

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A WhatsApp chat with Aspirely: the morning digest delivers sponsor-verified roles, and replying Approve moves one into a ready-to-submit tray."
        className="mx-auto flex w-full max-w-[264px] flex-col"
      >
        {/* phone frame */}
        <div className="rounded-[2rem] border-4 border-foreground/10 bg-card p-1.5 shadow-2xl shadow-primary/10">
          {/* WhatsApp chat header */}
          <div className="flex items-center gap-2 rounded-t-2xl bg-[#008069] px-2.5 py-2 text-white dark:bg-[#1F2C34]">
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-[10px] font-bold leading-none">
              A
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold">Aspirely</p>
              <p className="text-[10px] leading-[11px] text-white/70">online</p>
            </div>
            <Video className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
            <Phone className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
          </div>

          {/* chat wallpaper */}
          <div className="relative bg-[#ECE5DD] px-2 py-2 dark:bg-[#0B141A]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 text-black/[0.06] dark:text-white/[0.04]"
              style={{
                backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                backgroundSize: '12px 12px',
              }}
            />
            {/* messages — every bubble reserves its space from the start, so the
                stack never shifts; entrances are opacity/transform only. */}
            <motion.div
              initial={false}
              animate={{ opacity: fading ? 0 : 1 }}
              transition={{ duration: 0.4, ease: 'linear' }}
              className="relative flex flex-col gap-1.5"
            >
              <MsgIn visible={show(0)} time="8:02">
                Morning, Priya ☀️ <span className="font-semibold">3 new roles</span> that sponsor — your daily digest.
              </MsgIn>

              <MsgIn visible={show(1)} time="8:02">
                <span className="block font-semibold">Data Analyst · Ramp</span>
                <span className="block">92% match · Remote (US)</span>
                <span className="block text-[10px] leading-[14px]">✅ Sponsors H-1B — 63 filings FY24</span>
              </MsgIn>

              <MsgIn visible={show(2)} time="8:02">
                <span className="block font-semibold">ML Engineer · Notion</span>
                <span className="block">86% match · ✅ Sponsors H-1B</span>
              </MsgIn>

              <MsgIn visible={show(3)} time="8:03">
                Résumé tailored for Ramp · <span className="font-semibold">ATS 92</span>. Reply to approve.
              </MsgIn>

              {/* user reply */}
              <motion.div
                initial={false}
                animate={show(4) ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="max-w-[90%] self-end rounded-xl rounded-tr-[4px] bg-[#DCF8C6] px-2.5 py-1.5 shadow-sm dark:bg-[#005C4B]"
              >
                <span className="flex items-end gap-1.5">
                  <span className="text-[11px] leading-[15px] text-[#111B21] dark:text-[#E9EDEF]">Approve ✅</span>
                  <span className="mb-px text-[9px] leading-[10px] text-[#667781] dark:text-[#8696A0]">8:04</span>
                  <Ticks read={read} />
                </span>
              </motion.div>
            </motion.div>
          </div>

          {/* input bar — static, for recognizability */}
          <div className="flex items-center gap-1.5 bg-[#F0F2F5] px-2 py-1.5 dark:bg-[#1F2C34]">
            <span className="flex h-7 flex-1 items-center rounded-full bg-white px-3 text-[11px] text-[#8696A0] dark:bg-[#2A3942]">
              Message
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#00A884] text-white">
              <Mic className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>

          {/* ready-to-submit tray (product surface — semantic tokens) */}
          <div className="rounded-b-2xl border-t border-border bg-card px-2.5 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ready to submit
              </p>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                {approved ? 1 : 0}
              </span>
            </div>
            {/* fixed-height slot so the row's arrival never shifts layout */}
            <div className="mt-1.5 h-[30px]">
              <motion.div
                initial={false}
                animate={approved ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex h-full items-center gap-1.5 rounded-lg border border-success/25 bg-success/10 px-2"
              >
                <Check className="h-3 w-3 shrink-0 text-success" aria-hidden />
                <p className="truncate text-[11px] font-medium leading-none text-foreground">
                  Data Analyst · Ramp — queued
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

/** Incoming (left, white) WhatsApp bubble with an in-bubble timestamp. */
function MsgIn({ visible, time, children }: { visible: boolean; time: string; children: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="max-w-[90%] self-start rounded-xl rounded-tl-[4px] bg-white px-2.5 py-1.5 shadow-sm dark:bg-[#202C33]"
    >
      <div className="text-[11px] leading-[15px] text-[#111B21] dark:text-[#E9EDEF]">{children}</div>
      <span className="mt-0.5 block text-right text-[9px] leading-[10px] text-[#667781] dark:text-[#8696A0]">
        {time}
      </span>
    </motion.div>
  );
}

/** WhatsApp double-check: two overlapped checks, gray until read, then blue. */
function Ticks({ read }: { read: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative mb-px inline-block h-[11px] w-[15px] transition-colors duration-300',
        read ? 'text-[#53BDEB]' : 'text-[#667781] dark:text-[#8696A0]',
      )}
    >
      <Check className="absolute left-0 top-0 h-[11px] w-[11px]" strokeWidth={2.75} />
      <Check className="absolute left-1 top-0 h-[11px] w-[11px]" strokeWidth={2.75} />
    </span>
  );
}
