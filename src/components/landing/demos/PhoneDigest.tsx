import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, Sparkles, Send } from 'lucide-react';
import { DemoFrame, EASE, useDemoActive } from './_demoKit';

/**
 * Signature demo: a morning job digest arrives as chat bubbles, then an
 * "Approve" tap slides the role into a Ready-to-Submit tray. Loops only while
 * on-screen; renders the finished state under reduced motion.
 */
export default function PhoneDigest() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const [step, setStep] = useState(3); // static end-state when inactive

  useEffect(() => {
    if (!active) {
      setStep(3);
      return;
    }
    setStep(0);
    let s = 0;
    const id = window.setInterval(() => {
      s = s > 5 ? 0 : s + 1; // 0..3 reveal, 4-5 hold, then loop
      setStep(s);
    }, 1150);
    return () => clearInterval(id);
  }, [active]);

  const show = (i: number) => step >= i;
  const approved = step >= 3;

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A phone showing JobPilot's morning digest: three sponsoring roles arrive as chat messages, and approving one moves it into a ready-to-submit tray."
        className="mx-auto flex w-full max-w-[264px] flex-col"
      >
        {/* phone frame */}
        <div className="rounded-[2rem] border-4 border-foreground/10 bg-card p-2 shadow-2xl shadow-primary/10">
          {/* status / app bar */}
          <div className="flex items-center gap-2 rounded-t-2xl bg-primary px-3 py-2.5 text-primary-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-foreground/15">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">JobPilot</p>
              <p className="text-[11px] opacity-80">Daily digest · online</p>
            </div>
          </div>

          {/* chat */}
          <div className="flex min-h-[288px] flex-col gap-2.5 bg-muted/40 px-3 py-3">
            <Bubble visible={show(0)}>
              Morning, Priya ☀️ <span className="font-semibold text-foreground">3 new roles</span> that sponsor H-1B.
            </Bubble>

            {/* job card bubble */}
            <motion.div
              initial={false}
              animate={{ opacity: show(1) && !approved ? 1 : approved ? 0 : 0, y: show(1) ? 0 : 8, height: approved ? 0 : 'auto' }}
              transition={{ duration: 0.4, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">Ra</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">Data Analyst · Ramp</p>
                    <p className="truncate text-[11px] text-muted-foreground">Remote (US) · 88% match</p>
                  </div>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-foreground">
                  <ShieldCheck className="h-3 w-3 text-success" aria-hidden /> Sponsors H-1B
                </span>
              </div>
            </motion.div>

            <Bubble visible={show(2)}>
              Résumé tailored · <span className="font-semibold text-foreground">ATS 92</span>. Approve to apply?
            </Bubble>

            {/* approve control */}
            <motion.div
              initial={false}
              animate={{ opacity: show(2) ? 1 : 0, y: show(2) ? 0 : 8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="self-end"
            >
              <motion.div
                animate={approved ? { scale: [1, 0.92, 1] } : {}}
                transition={{ duration: 0.35, ease: EASE }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  approved ? 'bg-success/15 text-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {approved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden /> Approved
                  </>
                ) : (
                  <>
                    Approve &amp; apply <Send className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* ready-to-submit tray */}
          <div className="rounded-b-2xl border-t border-border bg-card px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ready to submit</p>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {approved ? 1 : 0}
              </span>
            </div>
            <motion.div
              initial={false}
              animate={{ opacity: approved ? 1 : 0, y: approved ? 0 : 10, height: approved ? 'auto' : 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-success/15">
                  <Check className="h-3 w-3 text-success" aria-hidden />
                </span>
                <p className="truncate text-[11px] font-medium text-foreground">Data Analyst · Ramp — queued</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

function Bubble({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <motion.p
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-sm"
    >
      {children}
    </motion.p>
  );
}
