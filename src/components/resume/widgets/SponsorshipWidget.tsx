/**
 * Sponsorship signal — for international students only. Aggregates the H-1B
 * track record across the user's saved companies so "can they even hire me?"
 * has a calm, evidence-backed answer. Hidden entirely for users with no visa
 * profile (relevance 0).
 */
import { ShieldCheck } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError, Stat } from './primitives';
import { isVisaUser, strongSponsors } from './selectors';

export const sponsorshipWidget: Widget = {
  key: 'sponsorship',
  relevance: (ctx) => {
    if (!isVisaUser(ctx)) return 0; // not relevant → hidden
    const withData = ctx.savedJobs.filter((j) => !!j.job_data?.sponsorship).length;
    if (withData > 0) return 0.58;
    return 0.34;
  },
  span: () => 1,
  render: (ctx) => {
    const strong = strongSponsors(ctx);
    const withData = ctx.savedJobs.filter((j) => !!j.job_data?.sponsorship);
    const totalApprovals = strong.reduce((s, j) => s + (j.job_data.sponsorship?.approvals_5y ?? 0), 0);

    return (
      <WidgetCard icon={ShieldCheck} title="Sponsorship" eyebrow="Can they hire you" tone="success" onOpen={() => ctx.navigate('jobs')}>
        {ctx.errors.savedJobs && ctx.savedJobs.length === 0 ? (
          <WidgetError label="Couldn't load sponsorship data" onRetry={ctx.retry} />
        ) : withData.length === 0 ? (
          <WidgetEmpty
            title="Know who sponsors before you apply"
            body="Search roles and Aspirely attaches each company's real H-1B track record — approvals, not guesses."
            ctaLabel="Find sponsor-friendly roles"
            onCta={() => ctx.navigate('jobs')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="flex items-end gap-5">
              <Stat value={strong.length} label={`strong ${strong.length === 1 ? 'sponsor' : 'sponsors'} saved`} tone="success" />
              {totalApprovals > 0 && <Stat value={totalApprovals.toLocaleString()} label="H-1Bs approved (5y)" />}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Evidence-backed from public LCA/approval data. Confirm current policy with each employer.
            </p>
          </div>
        )}
      </WidgetCard>
    );
  },
};
