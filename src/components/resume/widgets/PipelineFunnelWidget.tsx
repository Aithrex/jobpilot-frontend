/**
 * Pipeline Funnel — applied → interview → offer with honest conversion. Reads
 * the pipeline intelligence endpoint the frontend already calls. Empty state
 * (no applications yet) invites the first tailor.
 */
import { GitCommitVertical } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError, Bar } from './primitives';

export const pipelineFunnelWidget: Widget = {
  key: 'pipeline-funnel',
  relevance: (ctx) => {
    const total = ctx.funnel?.stages?.reduce((s, x) => s + x.count, 0) ?? 0;
    if (total >= 3) return ctx.phase === 'applying' || ctx.phase === 'interviewing' ? 0.76 : 0.68;
    if (total >= 1) return 0.44;
    return 0.2;
  },
  span: (ctx) => {
    const total = ctx.funnel?.stages?.reduce((s, x) => s + x.count, 0) ?? 0;
    return total >= 3 ? 2 : 1;
  },
  render: (ctx) => {
    const funnel = ctx.funnel;
    const stages = funnel?.stages ?? [];
    const total = stages.reduce((s, x) => s + x.count, 0);
    const max = Math.max(1, ...stages.map((s) => s.count));

    return (
      <WidgetCard
        icon={GitCommitVertical}
        title="Application pipeline"
        eyebrow="Where things stand"
        onOpen={() => ctx.navigate('applications')}
        footer={
          funnel && total > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{funnel.conversion.applied_to_interview}%</span> to interview
              </span>
              <span>
                <span className="font-semibold text-foreground tabular-nums">{funnel.conversion.interview_to_offer}%</span> to offer
              </span>
            </div>
          ) : undefined
        }
      >
        {ctx.errors.funnel && !funnel ? (
          <WidgetError label="Couldn't load your pipeline" onRetry={ctx.retry} />
        ) : total === 0 ? (
          <WidgetEmpty
            title="Your pipeline starts with one application"
            body="Tailor a resume to a role and it'll flow through here: applied, interviewing, offer."
            ctaLabel="Tailor a resume"
            onCta={() => ctx.navigate('tailor')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {stages.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground/90">{s.label}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">{s.count}</span>
                </div>
                <Bar pct={(s.count / max) * 100} tone={s.key === 'offer' ? 'success' : 'primary'} />
              </div>
            ))}
          </div>
        )}
      </WidgetCard>
    );
  },
};
