/**
 * Learning Today — the one path to nudge forward, or the highest-value skill to
 * start closing. Empty state invites starting a path for any topic.
 */
import { GraduationCap } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, Bar } from './primitives';

export const learningTodayWidget: Widget = {
  key: 'learning-today',
  relevance: (ctx) => {
    const l = ctx.overview?.learning;
    if ((l?.in_progress?.length ?? 0) > 0) return 0.58;
    if ((ctx.overview?.skills.top_gaps?.length ?? 0) > 0) return 0.42;
    return 0.24;
  },
  span: () => 1,
  render: (ctx) => {
    const l = ctx.overview?.learning;
    const inProgress = l?.in_progress ?? [];
    const gaps = ctx.overview?.skills.top_gaps ?? [];

    return (
      <WidgetCard
        icon={GraduationCap}
        title="Learning today"
        eyebrow="Keep sharp"
        onOpen={() => ctx.navigate('learning')}
        footer={
          (l?.earned_skills_count ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => ctx.navigate('my-resumes')}
              className="rounded text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="font-semibold text-foreground">{l!.earned_skills_count}</span> earned skills → add to resume
            </button>
          ) : undefined
        }
      >
        {inProgress.length > 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-3">
            {inProgress.slice(0, 2).map((p) => (
              <button
                key={p.path_id}
                type="button"
                onClick={() => ctx.navigate('learning')}
                className="block w-full text-left focus-visible:outline-none"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-foreground/90">{p.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{p.percent}%</span>
                </div>
                <Bar pct={p.percent} tone="primary" />
              </button>
            ))}
          </div>
        ) : gaps.length > 0 ? (
          <WidgetEmpty
            title={`Close the gap on ${gaps[0].skill}`}
            body={`It's the skill most of your saved roles ask for. Build a short path to learn it.`}
            ctaLabel="Start a path"
            onCta={() => ctx.navigate('learning')}
          />
        ) : (
          <WidgetEmpty
            title="Learn a skill in your downtime"
            body="Start a guided path for any topic — it feeds straight back into your resume."
            ctaLabel="Explore learning"
            onCta={() => ctx.navigate('learning')}
          />
        )}
      </WidgetCard>
    );
  },
};
