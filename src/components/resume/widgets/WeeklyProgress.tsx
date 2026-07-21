/**
 * Weekly progress - a calm read on this week's effort: applied today, current
 * streak, and tailors used against the daily allowance. Recognizes the work
 * without gamifying it (nothing celebrates loudly, Compass §7).
 */
import { Activity, Flame } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError, Stat, Bar } from './primitives';

export const weeklyProgressWidget: Widget = {
  key: 'weekly-progress',
  relevance: (ctx) => {
    if (!ctx.streak && !ctx.overview) return 0.2;
    if ((ctx.streak?.current_streak ?? 0) > 0) return 0.46;
    return 0.34;
  },
  span: () => 1,
  render: (ctx) => {
    const streak = ctx.streak;
    const m = ctx.overview?.momentum;
    const tailorsToday = m?.tailors_today ?? 0;
    const tailorLimit = m?.tailor_limit ?? null;
    const anyActivity = (streak?.total_applications ?? 0) > 0 || tailorsToday > 0;

    return (
      <WidgetCard
        icon={Activity}
        title="This week"
        eyebrow="Your momentum"
        onOpen={() => ctx.navigate('applications')}
        footer={
          tailorLimit != null ? (
            <button
              type="button"
              onClick={() => ctx.navigate('billing')}
              className="rounded text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {Math.max(0, tailorLimit - tailorsToday)} tailors left today → upgrade for more
            </button>
          ) : undefined
        }
      >
        {ctx.errors.streak && !streak ? (
          <WidgetError label="Couldn't load your momentum" onRetry={ctx.retry} />
        ) : !anyActivity ? (
          <WidgetEmpty
            title="Start a streak today"
            body="One application or one tailored resume gets your momentum going."
            ctaLabel="Tailor a resume"
            onCta={() => ctx.navigate('tailor')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-4">
            <div className="flex items-end gap-6">
              <Stat value={streak?.today_count ?? 0} label="applied today" />
              <div>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-warning" />
                  <span className="font-display text-2xl font-extrabold tabular-nums leading-none tracking-tight">
                    {streak?.current_streak ?? 0}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">day streak · best {streak?.longest_streak ?? 0}</div>
              </div>
            </div>
            {tailorLimit != null && tailorLimit > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tailors today</span>
                  <span className="tabular-nums">
                    {tailorsToday}/{tailorLimit}
                  </span>
                </div>
                <Bar pct={(tailorsToday / tailorLimit) * 100} tone="primary" />
              </div>
            )}
          </div>
        )}
      </WidgetCard>
    );
  },
};
