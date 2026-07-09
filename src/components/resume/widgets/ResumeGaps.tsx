/**
 * Resume Gaps — the most-wanted skills the user's saved roles ask for that
 * aren't on their resume yet. For a user with no base resume it becomes a calm
 * nudge to add one (the hero carries the primary ask, so this stays secondary).
 */
import { ScanSearch } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError } from './primitives';
import { hasBaseResume } from './selectors';

export const resumeGapsWidget: Widget = {
  key: 'resume-gaps',
  relevance: (ctx) => {
    if (!hasBaseResume(ctx)) return 0.4;
    const gaps = ctx.overview?.skills.top_gaps?.length ?? 0;
    if (gaps > 0) return 0.6;
    return 0.3;
  },
  span: () => 1,
  render: (ctx) => {
    const gaps = ctx.overview?.skills.top_gaps ?? [];
    const hasResume = hasBaseResume(ctx);

    return (
      <WidgetCard icon={ScanSearch} title="Resume gaps" eyebrow="Close the distance" onOpen={() => ctx.navigate('tailor')}>
        {ctx.errors.overview && !ctx.overview ? (
          <WidgetError label="Couldn't load your gaps" onRetry={ctx.retry} />
        ) : !hasResume ? (
          <WidgetEmpty
            title="See your gaps the moment you add a resume"
            body="Aspirely compares your resume against the roles you're targeting and lists exactly what's missing."
            ctaLabel="Add your resume"
            onCta={() => ctx.navigate('tailor')}
          />
        ) : gaps.length === 0 ? (
          <WidgetEmpty
            title="No standout gaps right now"
            body="Save a few target roles and Aspirely surfaces the skills they ask for most."
            ctaLabel="Find roles"
            onCta={() => ctx.navigate('jobs')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <p className="mb-2 text-xs text-muted-foreground">Most-wanted skills you're missing</p>
            <div className="flex flex-wrap gap-1.5">
              {gaps.slice(0, 6).map((g) => (
                <button
                  key={g.skill}
                  type="button"
                  onClick={() => ctx.navigate('learning')}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {g.skill}
                  <span className="rounded-full bg-warning/15 px-1 text-[10px] font-bold text-warning">×{g.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </WidgetCard>
    );
  },
};
