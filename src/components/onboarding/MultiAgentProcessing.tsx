import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, FileText, Sparkles, Target, ShieldCheck, Lightbulb, LayoutDashboard } from 'lucide-react';

const AGENTS = [
  { icon: FileText, label: 'Reading your experience', sub: 'Parsing roles, dates, and impact' },
  { icon: Sparkles, label: 'Extracting skills', sub: 'Building your skill graph' },
  { icon: Target, label: 'Matching target roles', sub: 'Finding the best-fit titles' },
  { icon: ShieldCheck, label: 'Scoring ATS readiness', sub: "Checking how recruiters' systems read you" },
  { icon: Lightbulb, label: 'Spotting skill gaps', sub: 'Where a little learning unlocks more roles' },
  { icon: LayoutDashboard, label: 'Personalizing your workspace', sub: 'Tailoring every tab to you' },
];

/**
 * Delightful "team of agents" processing screen shown while the uploaded resume
 * is parsed. Agents light up sequentially (spinner → check); when `done` flips,
 * all complete. Purely visual cadence - the real work is the single parse job.
 */
export function MultiAgentProcessing({ active, done }: { active: boolean; done?: boolean }) {
  const [stage, setStage] = useState(0);
  // Once the scripted agents finish but the real job is still running, we drop
  // into a calm "still working" state instead of clamping on the last agent
  // with a spinner (which reads as frozen).
  const [overtime, setOvertime] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!active || done) return;
    const id = setInterval(() => {
      setStage((s) => {
        if (s < AGENTS.length - 1) return s + 1;
        // Reached the last scripted agent - resolve the checklist and hand off
        // to the calm ongoing indicator.
        setOvertime(true);
        return s;
      });
    }, 1900);
    return () => clearInterval(id);
  }, [active, done]);

  // The checklist is "done" when the real job completes OR the scripted run
  // has caught up (overtime) - either way every step should read as resolved.
  const allDone = done || overtime;

  return (
    <div className="space-y-2.5">
      {/* Live region: screen readers hear the current agent as it advances. */}
      <div className="mb-1 text-center" role="status" aria-live="polite">
        <p className="text-sm font-semibold">Your AI team is reviewing your resume</p>
        <p className="text-xs text-muted-foreground">
          This can take up to a minute for detailed resumes.
        </p>
        <p className="sr-only">
          {done ? 'Resume processed.' : `${AGENTS[Math.min(stage, AGENTS.length - 1)].label}...`}
        </p>
      </div>
      {AGENTS.map((a, i) => {
        const state = allDone || i < stage ? 'done' : i === stage ? 'active' : 'pending';
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

      {/* Calm ongoing state: the scripted checklist is done but the real parse
          is still running. Honest, unhurried, never "frozen". */}
      {overtime && !done && (
        <div
          className="flex items-center justify-center gap-2 pt-1 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Still working, almost there
        </div>
      )}
    </div>
  );
}

export default MultiAgentProcessing;
