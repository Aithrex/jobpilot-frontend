/**
 * Interviews & prep — surfaces live interviews to prepare for, or the user's
 * mock-interview readiness (avg score + weakest pattern). Empty state invites a
 * first mock so there's something to improve.
 */
import { Mic, Target } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, Stat } from './primitives';

export const interviewsUpcomingWidget: Widget = {
  key: 'interviews-upcoming',
  relevance: (ctx) => {
    const iv = ctx.overview?.interview;
    const interviewing = ctx.overview?.applications.interviewing ?? 0;
    if (interviewing > 0) return 0.8;
    if ((iv?.attempts ?? 0) > 0) return 0.48;
    return 0.28;
  },
  span: () => 1,
  render: (ctx) => {
    const o = ctx.overview;
    const iv = o?.interview;
    const interviewing = o?.applications.interviewing ?? 0;

    // Live interviews in the pipeline take priority — prep now.
    if (interviewing > 0) {
      return (
        <WidgetCard
          icon={Mic}
          title="Interviews in play"
          eyebrow="Prepare now"
          tone="success"
          onOpen={() => ctx.navigate('interview')}
        >
          <div className="flex flex-1 flex-col justify-center gap-3">
            <Stat value={interviewing} label={interviewing === 1 ? 'active interview' : 'active interviews'} tone="success" />
            <button
              type="button"
              onClick={() => ctx.navigate('interview')}
              className="inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Run a mock for these →
            </button>
          </div>
        </WidgetCard>
      );
    }

    // Otherwise show readiness from past mock answers, or invite the first one.
    return (
      <WidgetCard icon={Mic} title="Interview readiness" eyebrow="Practice" onOpen={() => ctx.navigate('interview')}>
        {(iv?.attempts ?? 0) === 0 ? (
          <WidgetEmpty
            title="Find your patterns before it counts"
            body="Run a mock answer and JobPilot scores it and points you at your weakest spot."
            ctaLabel="Run a mock"
            onCta={() => ctx.navigate('interview')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <Stat value={iv!.avg_score ?? '—'} label={`avg across ${iv!.attempts} ${iv!.attempts === 1 ? 'answer' : 'answers'}`} />
            {iv!.weakest && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 shrink-0 text-warning" />
                Weakest: <span className="font-medium text-foreground/90">{iv!.weakest.replace(/_/g, ' ')}</span>
                <button
                  type="button"
                  onClick={() => ctx.navigate('interview')}
                  className="rounded font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  drill it
                </button>
              </p>
            )}
          </div>
        )}
      </WidgetCard>
    );
  },
};
