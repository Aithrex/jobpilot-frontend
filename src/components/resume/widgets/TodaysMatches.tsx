/**
 * Today's Matches — the strongest roles waiting for the user, scored and (for
 * international students) sponsorship-aware. Reads saved jobs the frontend
 * already has; empty state invites the first search.
 */
import { Compass, Building2, ShieldCheck } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, MetaChip } from './primitives';
import { scoredMatches, isVisaUser } from './selectors';

function bandTone(band?: string): 'success' | 'primary' | 'default' {
  if (band === 'strong') return 'success';
  if (band === 'moderate') return 'primary';
  return 'default';
}

export const todaysMatchesWidget: Widget = {
  key: 'todays-matches',
  relevance: (ctx) => {
    const n = scoredMatches(ctx).length;
    if (n === 0) return 0.32;
    let r = 0.68;
    if (ctx.phase === 'exploring' || ctx.phase === 'applying') r += 0.08;
    return Math.min(r, 0.82);
  },
  span: (ctx) => (scoredMatches(ctx).length > 0 ? 2 : 1),
  render: (ctx) => {
    const matches = scoredMatches(ctx).slice(0, 4);
    const onVisa = isVisaUser(ctx);
    return (
      <WidgetCard icon={Compass} title="Your top matches" eyebrow="Roles for you" onOpen={() => ctx.navigate('jobs')}>
        {matches.length === 0 ? (
          <WidgetEmpty
            title="No matches scored yet"
            body="Run a search and JobPilot scores every role against your resume — fit, skills, and sponsorship."
            ctaLabel="Search jobs"
            onCta={() => ctx.navigate('jobs')}
          />
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {matches.map((m) => {
              const j = m.job_data;
              const score = Math.round(j.match_score || 0);
              const sp = j.sponsorship;
              return (
                <li key={m._id}>
                  <button
                    type="button"
                    onClick={() => ctx.navigate('jobs')}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{j.title || 'Role'}</span>
                      <span className="block truncate text-xs text-muted-foreground">{j.company}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {score > 0 && <MetaChip tone="primary">{score}%</MetaChip>}
                      {onVisa && sp && (sp.band === 'strong' || sp.band === 'moderate') && (
                        <MetaChip tone={bandTone(sp.band)}>
                          <ShieldCheck className="h-3 w-3" /> Sponsor
                        </MetaChip>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </WidgetCard>
    );
  },
};
