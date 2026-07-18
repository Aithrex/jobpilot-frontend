import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CalendarDays, Gauge, Trophy } from 'lucide-react';
import type { EdgePlan, EdgeTask, EdgeVerifyResult } from '@/types/learning';
import { EdgeTaskCard } from './EdgeTaskCard';

interface EdgePlanViewProps {
  plan: EdgePlan;
  onBack: () => void;
}

export function EdgePlanView({ plan, onBack }: EdgePlanViewProps) {
  const { path, path_id } = plan;
  const [verifyByRef, setVerifyByRef] = useState<Record<string, EdgeVerifyResult>>({});

  const total = path.tasks.length;
  const verified = useMemo(
    () => path.tasks.filter((t) => verifyByRef[t.task_ref]?.status === 'verified').length,
    [path.tasks, verifyByRef],
  );
  const pct = total ? Math.round((verified / total) * 100) : 0;

  // Tasks arrive day-ordered; group so the list reads like a schedule.
  const byDay = useMemo(() => {
    const groups = new Map<number, EdgeTask[]>();
    for (const t of path.tasks) {
      const arr = groups.get(t.day) ?? [];
      arr.push(t);
      groups.set(t.day, arr);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [path.tasks]);

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to gaps
      </button>

      <header className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight">{path.title}</h3>
        {path.summary && <p className="text-sm text-muted-foreground">{path.summary}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary" className="gap-1 capitalize">
            <Gauge className="h-3 w-3" /> {path.level}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3 w-3" /> {path.duration_days} days
          </Badge>
          {verified > 0 && (
            <Badge className="gap-1 bg-success text-primary-foreground hover:bg-success">
              <Trophy className="h-3 w-3" /> {verified}/{total} verified
            </Badge>
          )}
        </div>
        {total > 0 && (
          <div className="pt-1">
            <Progress value={pct} className="h-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {verified === total && total > 0
                ? 'All tasks verified. You closed the gap. Share it.'
                : `${verified} of ${total} tasks verified`}
            </p>
          </div>
        )}
      </header>

      <div className="space-y-5">
        {byDay.map(([day, tasks]) => (
          <div key={day} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Day {day}
            </p>
            {tasks.map((t) => (
              <EdgeTaskCard
                key={t.task_ref}
                pathId={path_id}
                task={t}
                verifyResult={verifyByRef[t.task_ref] ?? null}
                onVerify={(result) => setVerifyByRef((prev) => ({ ...prev, [t.task_ref]: result }))}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default EdgePlanView;
