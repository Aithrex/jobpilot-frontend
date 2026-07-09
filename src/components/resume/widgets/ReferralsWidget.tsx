/**
 * Warm intros — referrals beat cold applies, and for F-1 students they're the
 * fastest route past the resume pile. Reads the LinkedIn side of the connect
 * status the dashboard already fetches; deliberately shows only numbers that
 * exist in ctx (saved companies) — never a fabricated referral count.
 */
import { Users } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError } from './primitives';

export const referralsWidget: Widget = {
  key: 'referrals',
  relevance: (ctx) => {
    if (ctx.phase === 'applying') return 0.45; // intros matter most mid-hunt
    if (ctx.phase === 'interviewing') return 0.4;
    return 0.3;
  },
  span: () => 1,
  render: (ctx) => {
    const linked = !!ctx.connect?.linkedin.connected;
    const name = ctx.connect?.linkedin.name;
    const savedCompanies = ctx.savedJobs.length;

    return (
      <WidgetCard icon={Users} title="Warm intros" eyebrow="Referrals" onOpen={() => ctx.navigate('network')}>
        {ctx.errors.connect && !ctx.connect ? (
          <WidgetError label="Couldn't check your connections" onRetry={ctx.retry} />
        ) : !linked ? (
          <WidgetEmpty
            title="Find the alumni who can refer you"
            body="Connect LinkedIn and Aspirely helps you turn shared schools and past companies into warm intros."
            ctaLabel="Connect LinkedIn"
            onCta={() => ctx.navigate('network')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-2">
            <p className="text-sm font-medium leading-snug text-foreground/90">
              LinkedIn is connected{name ? ` as ${name}` : ''}.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {savedCompanies > 0
                ? `A referral beats a cold apply — start with alumni at your ${savedCompanies} saved ${savedCompanies === 1 ? 'company' : 'companies'}.`
                : 'A referral beats a cold apply — save a few target companies and work the alumni angle.'}
            </p>
            <button
              type="button"
              onClick={() => ctx.navigate('network')}
              className="mt-1 inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Open your network →
            </button>
          </div>
        )}
      </WidgetCard>
    );
  },
};
