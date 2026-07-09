import { Check, ArrowRight } from 'lucide-react';
import type { BuildStep } from '@/types/career';

/**
 * "Your Path" — the guided journey the UX audit found missing. An ordered set of
 * milestones the student completes one at a time; `done` reflects real state and
 * the first undone step is highlighted as "do this next". Recognizes building,
 * step by step, instead of dropping a newcomer onto a feature menu.
 */
export function CareerPath({
  steps,
  onNavigate,
}: {
  steps: BuildStep[];
  onNavigate: (tab: string) => void;
}) {
  if (!steps?.length) return null;
  const done = steps.filter((s) => s.done).length;
  const currentIdx = steps.findIndex((s) => !s.done);
  const pct = Math.round((100 * done) / steps.length);
  const complete = done === steps.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {complete ? 'Your path — complete' : 'Your path'}
        </h2>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{done}/{steps.length} done</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          const isCurrent = i === currentIdx;
          return (
            <li key={s.key}>
              <button
                onClick={() => onNavigate(s.cta_tab)}
                className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  s.done
                    ? 'border-transparent opacity-60 hover:opacity-100'
                    : isCurrent
                      ? 'border-primary/40 bg-primary/[0.04]'
                      : 'border-border hover:border-primary/30'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    s.done
                      ? 'bg-success text-white'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-muted-foreground/40'
                  }`}
                >
                  {s.done ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold tabular-nums">{i + 1}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${s.done ? 'line-through' : ''}`}>{s.label}</span>
                  {!s.done && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{s.description}</span>}
                </span>
                {isCurrent && (
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Next <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default CareerPath;
