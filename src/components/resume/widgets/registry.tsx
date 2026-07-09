/**
 * The widget registry — the generated dashboard's catalog (Compass §6.2).
 *
 * Existing polished cards (OPT clock, Career Readiness, Career Path) are reused
 * as widgets here; the lightweight new widgets live in their own files. Every
 * entry is just `{ relevance, span, render }` — the engine in DashboardTab sorts
 * by relevance and lays them out. Adding a widget = add one entry.
 */
import type { NavKey, Widget } from './types';
import OptClockCard from '../OptClockCard';
import { CareerReadinessCard } from '../CareerReadinessCard';
import { CareerPath } from '../CareerPath';

import { todaysMatchesWidget } from './TodaysMatches';
import { readyToSubmitWidget } from './ReadyToSubmitTray';
import { pipelineFunnelWidget } from './PipelineFunnelWidget';
import { interviewsUpcomingWidget } from './InterviewsUpcoming';
import { learningTodayWidget } from './LearningToday';
import { resumeGapsWidget } from './ResumeGaps';
import { sponsorshipWidget } from './SponsorshipWidget';
import { postPerformanceWidget } from './PostPerformance';
import { weeklyProgressWidget } from './WeeklyProgress';
import { marketPulseWidget } from './MarketPulse';
import { sixSecondsWidget } from './SixSecondsWidget';
import { referralsWidget } from './ReferralsWidget';

/** OPT clock — jumps to the top and shifts to warning language when urgent. */
const optClockWidget: Widget = {
  key: 'opt-clock',
  relevance: (ctx) => {
    const c = ctx.optClock;
    if (!c || !c.has_profile) return 0.18; // present but quiet — an optional invite
    if (c.status_band === 'urgent') return 0.99;
    if (c.status_band === 'watch') return 0.82;
    if (c.unemployment_days_used == null) return 0.6;
    return 0.5;
  },
  span: (ctx) => (ctx.optClock?.status_band === 'urgent' ? 2 : 1),
  render: (ctx) => (
    <OptClockCard
      clock={ctx.optClock}
      loading={ctx.loading}
      error={ctx.optError}
      onOpenVisa={() => ctx.navigate('visa')}
      onRefresh={ctx.reloadOptClock}
    />
  ),
};

/** Career readiness — the Compass score. Full-width band; highest for new users. */
const careerReadinessWidget: Widget = {
  key: 'career-readiness',
  relevance: (ctx) => {
    if (!ctx.readiness) return 0;
    if (ctx.phase === 'new') return 0.85;
    if (ctx.readiness.band === 'standout') return 0.62;
    return 0.72;
  },
  span: () => 3,
  render: (ctx) => (
    <CareerReadinessCard data={ctx.readiness} loading={ctx.loading} onNavigate={(t) => ctx.navigate(t as NavKey)} />
  ),
};

/** Career path — the guided build plan. Promoted for new users, muted when done. */
const careerPathWidget: Widget = {
  key: 'career-path',
  relevance: (ctx) => {
    const plan = ctx.readiness?.build_plan;
    if (!plan || plan.length === 0) return 0;
    const done = plan.filter((s) => s.done).length;
    if (done === plan.length) return 0.3;
    return ctx.phase === 'new' ? 0.8 : 0.52;
  },
  span: () => 2,
  render: (ctx) =>
    ctx.readiness?.build_plan ? (
      <CareerPath steps={ctx.readiness.build_plan} onNavigate={(t) => ctx.navigate(t as NavKey)} />
    ) : null,
};

/** The full catalog. Order here is irrelevant — the engine ranks by relevance. */
export const WIDGETS: Widget[] = [
  optClockWidget,
  careerReadinessWidget,
  careerPathWidget,
  todaysMatchesWidget,
  readyToSubmitWidget,
  pipelineFunnelWidget,
  interviewsUpcomingWidget,
  learningTodayWidget,
  resumeGapsWidget,
  sponsorshipWidget,
  postPerformanceWidget,
  weeklyProgressWidget,
  marketPulseWidget,
  sixSecondsWidget,
  referralsWidget,
];
