import { motion } from "framer-motion";
import {
  Activity,
  Award,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flame,
  Hammer,
  History,
  Percent,
  Rocket,
  Trophy,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AchievementsGrid from "./AchievementsGrid";
import { useHubAnalytics } from "@/hooks/useHub";
import type { HubPathParams } from "@/types/hub";

interface AnalyticsPanelProps {
  params?: HubPathParams;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-1.5 text-2xl font-extrabold text-foreground">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </motion.div>
  );
}

function relTime(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AnalyticsPanel({ params }: AnalyticsPanelProps) {
  const { data, isLoading, isError, refetch } = useHubAnalytics(params);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your analytics.</p>
        <button onClick={() => refetch()} className="mt-2 text-sm font-medium text-primary hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Complete your first challenge to unlock analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Career Path</p>
          <p className="text-lg font-bold text-foreground">{data.career_path}</p>
        </div>
        {data.estimated_completion_date ? (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. completion</p>
            <p className="text-sm font-semibold text-foreground">{data.estimated_completion_date}</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Current Day" value={`${data.current_day} / ${data.total_days}`} />
        <StatCard icon={Percent} label="Completion" value={`${data.completion_pct}%`} sub={`${data.completed_count} tickets`} />
        <StatCard icon={Flame} label="Current Streak" value={data.current_streak} sub="days" />
        <StatCard icon={Trophy} label="Longest Streak" value={data.longest_streak} sub="days" />
        <StatCard icon={Clock} label="Learning Hours" value={data.learning_hours} />
        <StatCard icon={CheckCircle2} label="Tasks Completed" value={data.tasks_completed} />
        <StatCard icon={Hammer} label="Projects Built" value={data.projects_built} />
        <StatCard icon={Rocket} label="Level" value={data.level} sub={`${data.xp.toLocaleString()} XP`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-primary" /> Challenge History
          </h4>
          {data.challenge_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed challenges yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.challenge_history.map((h) => (
                <li key={h.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-foreground">
                      <span className="text-muted-foreground">D{h.day}</span> {h.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">+{h.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </h4>
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet — get started!</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                      {a.type === "achievement" ? <Award className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate text-foreground">{a.label}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relTime(a.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Award className="h-4 w-4 text-primary" /> Achievements
        </h4>
        <AchievementsGrid />
      </div>
    </div>
  );
}
