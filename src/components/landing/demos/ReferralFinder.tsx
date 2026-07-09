import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { User, GraduationCap, Building2, UserCheck } from 'lucide-react';
import { DemoFrame, EASE, useEntered } from './_demoKit';

const PATH = [
  { x: 12, y: 34, icon: User, label: 'You', sub: 'MS · CS', primary: true },
  { x: 50, y: 34, icon: GraduationCap, label: 'Alex', sub: "'19 alum", warm: true },
  { x: 88, y: 34, icon: Building2, label: 'Hiring mgr', sub: 'Ramp' },
];
const FAINT = [
  { x: 32, y: 74 },
  { x: 68, y: 76 },
];

/** Referral Finder: the warm-intro path from you to a hiring manager lights up. */
export default function ReferralFinder() {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useEntered(ref);
  const reduce = useReducedMotion();
  const show = reduce || entered;

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A network graph highlighting a warm-introduction path from you, through an alum named Alex, to the hiring manager at Ramp."
      >
        <div className="relative h-[184px] w-full">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {/* faint background links */}
            <line x1={12} y1={34} x2={32} y2={74} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={88} y1={34} x2={68} y2={76} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {/* warm path */}
            <motion.line
              x1={12}
              y1={34}
              x2={50}
              y2={34}
              className="stroke-primary"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: show ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.2 }}
            />
            <motion.line
              x1={50}
              y1={34}
              x2={88}
              y2={34}
              className="stroke-primary"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: show ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.7 }}
            />
          </svg>

          {FAINT.map((f, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-muted text-muted-foreground"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              <User className="h-3.5 w-3.5" />
            </span>
          ))}

          {PATH.map((n, i) => {
            const Icon = n.icon;
            return (
              <motion.div
                key={n.label}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.8 }}
                animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.8 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : i * 0.45 }}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full border shadow-sm ${
                    n.primary
                      ? 'border-primary bg-primary text-primary-foreground'
                      : n.warm
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-center leading-tight">
                  <span className="block text-[11px] font-semibold text-foreground">{n.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{n.sub}</span>
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-1 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <UserCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs text-foreground">
            <span className="font-semibold">Warm intro found</span> — Alex can introduce you (2nd degree).
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
