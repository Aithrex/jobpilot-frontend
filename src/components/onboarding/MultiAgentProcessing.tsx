import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, FileText, Sparkles, Target, ShieldCheck, Lightbulb, LayoutDashboard } from 'lucide-react';

const AGENTS = [
  { icon: FileText, label: 'Reading your experience', sub: 'Parsing roles, dates, and impact' },
  { icon: Sparkles, label: 'Extracting skills', sub: 'Building your skill graph' },
  { icon: Target, label: 'Matching target roles', sub: 'Finding the best-fit titles' },
  { icon: ShieldCheck, label: 'Scoring ATS readiness', sub: 'Checking how recruiters’ systems read you' },
  { icon: Lightbulb, label: 'Spotting skill gaps', sub: 'Where a little learning unlocks more roles' },
  { icon: LayoutDashboard, label: 'Personalizing your workspace', sub: 'Tailoring every tab to you' },
];

/**
 * Delightful "team of agents" processing screen shown while the uploaded resume
 * is parsed. Agents light up sequentially (spinner → check); when `done` flips,
 * all complete. Purely visual cadence — the real work is the single parse job.
 */
export function MultiAgentProcessing({ active, done }: { active: boolean; done?: boolean }) {
  const [stage, setStage] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!active || done) return;
    // Advance through agents, easing off near the end so we don't "finish"
    // before the real job resolves.
    const id = setInterval(() => {
      setStage((s) => (s < AGENTS.length - 1 ? s + 1 : s));
    }, 1900);
    return () => clearInterval(id);
  }, [active, done]);

  return (
    <div className="space-y-2.5">
      {/* Live region: screen readers hear the current agent as it advances. */}
      <div className="mb-1 text-center" role="status" aria-live="polite">
        <p className="text-sm font-semibold">Your AI team is reviewing your resume</p>
        <p className="text-xs text-muted-foreground">This usually takes ~20 seconds.</p>
        <p className="sr-only">
          {done ? 'Resume processed.' : `${AGENTS[Math.min(stage, AGENTS.length - 1)].label}…`}
        </p>
      </div>
      {AGENTS.map((a, i) => {
        const state = done || i < stage ? 'done' : i === stage ? 'active' : 'pending';
        const Icon = a.icon;
        return (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, x: reduce ? 0 : -8 }}
            animate={{ opacity: state === 'pending' ? 0.45 : 1, x: 0 }}
            transition={reduce ? { duration: 0 } : { delay: i * 0.05 }}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
              state === 'active' ? 'border-primary/50 bg-primary/[0.04]' : 'border-border'
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
              state === 'done' ? 'bg-emerald-500/15 text-emerald-500' : state === 'active' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.label}</p>
              <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
            </div>
            <span className="shrink-0">
              {state === 'done' ? (
                <Check className="h-5 w-5 text-emerald-500" />
              ) : state === 'active' ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <span className="block h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default MultiAgentProcessing;
