import { type ReactNode, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Check, Send, Gauge } from 'lucide-react';
import { DemoFrame, EASE, StatValue, useEntered } from './_demoKit';

const CHANGES = [
  { text: 'Surfaced your React perf work — from PR #482', traced: true },
  { text: 'Reordered bullets to hit their must-haves', traced: false },
  { text: 'Kept every fact exactly as you wrote it', traced: true },
];

/** The apply-in-90s Review Card: the browser extension proposes honest, traceable
 *  edits; a time-drop infographic contrasts 25 minutes by hand with 90 seconds. */
export default function ApplySpeed() {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useEntered(ref);
  const reduce = useReducedMotion();
  const show = reduce || entered;

  return (
    <DemoFrame>
      <div ref={ref} role="img" aria-label="JobPilot's browser extension Review Card proposing honest, traceable résumé edits, and a chart showing apply time dropping from 25 minutes to 90 seconds.">
        {/* extension review card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
                <Gauge className="h-3 w-3" aria-hidden />
              </span>
              JobPilot · Review
            </span>
            <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">
              ATS 92
            </span>
          </div>

          <ul className="mt-3 space-y-2">
            {CHANGES.map((c, i) => (
              <motion.li
                key={c.text}
                initial={{ opacity: reduce ? 1 : 0, x: reduce ? 0 : -8 }}
                animate={{ opacity: show ? 1 : 0, x: show ? 0 : -8 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : 0.1 + i * 0.15 }}
                className="flex items-start gap-2 text-xs text-foreground"
              >
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="flex-1">{c.text}</span>
                {c.traced && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    <ShieldCheck className="h-2.5 w-2.5 text-success" aria-hidden /> traced
                  </span>
                )}
              </motion.li>
            ))}
          </ul>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Approve &amp; apply <Send className="h-3.5 w-3.5" aria-hidden />
          </div>
        </div>

        {/* time-drop infographic */}
        <div className="mt-4 space-y-2.5">
          <TimeBar label="By hand" widthPct={100} tone="muted" show={show} reduce={reduce}>
            <StatValue to={25} suffix=" min" />
          </TimeBar>
          <TimeBar label="JobPilot" widthPct={12} tone="primary" show={show} reduce={reduce} delay={0.25}>
            <StatValue to={90} suffix="s" />
          </TimeBar>
        </div>
      </div>
    </DemoFrame>
  );
}

function TimeBar({
  label,
  widthPct,
  tone,
  show,
  reduce,
  delay = 0,
  children,
}: {
  label: string;
  widthPct: number;
  tone: 'muted' | 'primary';
  show: boolean;
  reduce: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/40">
        <motion.div
          className={`h-full rounded-lg ${tone === 'primary' ? 'bg-primary' : 'bg-muted ring-1 ring-inset ring-border'}`}
          initial={{ width: reduce ? `${widthPct}%` : '0%' }}
          animate={{ width: show ? `${widthPct}%` : '0%' }}
          transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : delay }}
        />
        <span
          className={`absolute inset-y-0 right-2.5 flex items-center whitespace-nowrap font-display text-xs font-bold ${
            tone === 'primary' ? 'text-primary' : 'text-foreground'
          }`}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
