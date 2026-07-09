/**
 * Ready to Submit — the queue of saved-but-not-yet-applied roles. For an active
 * applicant this is the fastest lever, so it scores high when the queue is warm.
 * Empty state invites saving roles to build the queue.
 */
import { Send, ArrowUpRight } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty } from './primitives';
import { readyToSubmit } from './selectors';

export const readyToSubmitWidget: Widget = {
  key: 'ready-to-submit',
  relevance: (ctx) => {
    const n = readyToSubmit(ctx).length;
    if (n === 0) return 0.24;
    let r = 0.7;
    if (ctx.phase === 'applying' || ctx.phase === 'interviewing') r += 0.06;
    return Math.min(r, 0.78);
  },
  span: () => 1,
  render: (ctx) => {
    const queue = readyToSubmit(ctx);
    return (
      <WidgetCard
        icon={Send}
        title="Ready to submit"
        eyebrow="Your queue"
        tone="primary"
        onOpen={() => ctx.navigate('applications')}
        footer={
          queue.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Submitting today keeps your pipeline warm and your momentum going.
            </p>
          ) : undefined
        }
      >
        {queue.length === 0 ? (
          <WidgetEmpty
            title="Nothing queued yet"
            body="Save roles you want to apply to and they'll line up here, ready to send."
            ctaLabel="Browse jobs"
            onCta={() => ctx.navigate('jobs')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">
                {queue.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {queue.length === 1 ? 'application ready' : 'applications ready'}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {queue.slice(0, 3).map((m) => (
                <li key={m._id} className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="truncate">
                    {m.job_data.company}
                    {m.job_data.title ? ` · ${m.job_data.title}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => ctx.navigate('applications')}
              className="mt-3 inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Submit them <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </WidgetCard>
    );
  },
};
