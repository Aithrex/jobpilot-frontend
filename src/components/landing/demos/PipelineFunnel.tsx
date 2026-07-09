import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DemoFrame, EASE, StatValue, useEntered } from './_demoKit';

const STAGES = [
  { label: 'Matched', value: 340, width: 100 },
  { label: 'Applied', value: 128, width: 74 },
  { label: 'Screens', value: 22, width: 50 },
  { label: 'Onsites', value: 7, width: 32 },
  { label: 'Offers', value: 2, width: 18 },
];

/** The pipeline funnel: every stage tracked, bars settling from matched to offer. */
export default function PipelineFunnel() {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useEntered(ref);
  const reduce = useReducedMotion();
  const show = reduce || entered;

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A hiring funnel tracked end to end: 340 matched, 128 applied, 22 screens, 7 onsites, 2 offers."
        className="space-y-3 py-1"
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your pipeline</p>
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{s.label}</span>
            <div className="relative h-8 flex-1">
              <motion.div
                className="absolute inset-y-0 left-0 flex items-center rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/25"
                initial={{ width: reduce ? `${s.width}%` : '0%' }}
                animate={{ width: show ? `${s.width}%` : '0%' }}
                transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.1 + i * 0.1 }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-l-lg bg-primary"
                  style={{ width: 4 }}
                  aria-hidden
                />
              </motion.div>
              <span className="absolute inset-y-0 right-2 flex items-center font-display text-sm font-bold text-foreground">
                <StatValue to={s.value} />
              </span>
            </div>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">
          One board for every role — no more spreadsheet at 2am.
        </p>
      </div>
    </DemoFrame>
  );
}
