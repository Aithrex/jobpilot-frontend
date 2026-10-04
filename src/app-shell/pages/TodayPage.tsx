/**
 * Home - daily briefing at `/app/home`.
 *
 * A full-bleed two-column command center (`.page-full`) so a wide monitor is
 * spent on structure, not empty gutters. The reading order is the 9am question
 * order, most urgent first:
 *
 *   0. PAUSED PREVIEW    AutoApplyPreviewBar - a thin glass bar (desktop) /
 *                        swipe strip (mobile) for the on-hold Auto-Apply, read
 *                        only, never live.
 *   1. WHAT NEEDS ME?    HeroPanel - the Today inbox: approvals, hand-offs,
 *                        nudges (left column top).
 *   2. WHAT'S STRONG?    TopMatchesPanel - the best roles scored against this
 *                        resume (left column, below the hero).
 *   3. WHERE DO I STAND? KpiRow (rail) - sent today, streak, funnel, readiness,
 *                        beside the hero on xl rather than stranded below it.
 *   4. SET-UP GAP        ResumeEntryPanel - self-gating; loud when there is no
 *                        base resume, a quiet affordance once there is.
 *   5. WHAT'S CHANGING?  Trend + funnel.
 *   6. WHY?              Recent roles table.
 *
 * The static product-tour tiles (FeatureLaunchpad) were cut from Home: they
 * solved discovery, not an applying pain, and are covered by the palette, the
 * More sheet, and nav. Status wins the fold; every surviving panel earns its
 * place by removing a real manual-apply pain.
 *
 * First-run empty Home (upload + continue setup) is only for a settled empty
 * workspace. While dashboard fetches are in flight we keep the real layout and
 * its skeletons - otherwise an unfinished onboarding flag flashes the empty
 * page, then swaps in KPIs/matches and drops Continue workspace setup.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rise as riseIn } from '@/lib/motion';
import { toTitleCase } from '@/lib/format';
import { requestOnboardingOpen } from '@/components/onboarding/onboarding';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness } from '@/types/career';
import type { PipelineFunnel } from '@/types/pipeline';
import type { SavedJob } from '@/types/jobs';
import type { TodayInbox } from '@/types/todayInbox';

import { HeroPanel, type HeroModel, type HeroInputItem } from './today/HeroPanel';
import { ResumeEntryPanel } from './today/ResumeEntryPanel';
// FeatureLaunchpad (the static product-tour tiles) is intentionally no longer
// rendered on Home - discoverability is covered by the command palette, the
// mobile More sheet, and primary nav. The file is retained for reuse.
import { AutoApplyPreviewBar } from './today/AutoApplyPreviewBar';
import { KpiRow } from './today/KpiCards';
import { ApplicationTrend, ConversionFunnel } from './today/PipelinePanels';
import { RecentActivityPanel } from './today/RecentActivityPanel';
import { TopMatchesPanel } from './today/TopMatchesPanel';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
  total_applications: number;
  last_application_date: string | null;
  heatmap: { date: string; count: number }[];
}

interface TodayPageProps {
  userName?: string | null;
}

/** Did a settled fetch carry real data? (Rejections were caught to `{error}`.) */
function ok<T>(r: { data?: T } | { error: string }): r is { data: T } {
  return 'data' in r && !!(r as { data?: T }).data;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** First name for the greeting. Profile/email local-parts often arrive as
 *  `lavanya`; we title-case so the page does not shout the raw storage form. */
function givenName(raw?: string | null): string {
  const first = raw?.trim().split(/\s+/)[0];
  return first ? toTitleCase(first) : 'there';
}

/** Empty-home layout only after fetches settle and this workspace still has
 *  nothing to brief. Loading must not use this branch - `onboarded === false`
 *  is common for people who already applied / saved roles. */
export function shouldShowFirstRunHome({
  onboarded,
  settled,
  applicationCount,
  countsUnknown,
}: {
  onboarded: boolean | undefined;
  settled: boolean;
  applicationCount: number;
  countsUnknown: boolean;
}): boolean {
  return onboarded === false && settled && !countsUnknown && applicationCount === 0;
}

function ContinueWorkspaceSetup({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => requestOnboardingOpen()}
      className={cn(
        'rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      Continue workspace setup
    </button>
  );
}

export default function TodayPage({ userName }: TodayPageProps = {}) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [readiness, setReadiness] = useState<CareerReadiness | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [funnel, setFunnel] = useState<PipelineFunnel | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[] | null>(null);
  const [inbox, setInbox] = useState<TodayInbox | null>(null);

  const [err, setErr] = useState({ overview: false, streak: false, funnel: false, saved: false });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  // Announced to screen readers after a user-triggered Refresh completes.
  const [refreshAnnouncement, setRefreshAnnouncement] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ovR, crR, stR, pfR, sjR, tiR] = await Promise.all([
      apiService.getOverview().catch(() => ({ error: 'x' }) as const),
      apiService.getCareerReadiness().catch(() => ({ error: 'x' }) as const),
      apiService.getApplicationStreak().catch(() => ({ error: 'x' }) as const),
      apiService.getPipelineFunnel().catch(() => ({ error: 'x' }) as const),
      apiService.getSavedJobs().catch(() => ({ error: 'x' }) as const),
      apiService.getTodayInbox().catch(() => ({ error: 'x' }) as const),
    ]);

    if (ok(ovR)) setOverview(ovR.data as DashboardOverview);
    // Guard the backend's {}-error fallback - only accept a real readiness score.
    if (ok(crR) && Array.isArray((crR.data as CareerReadiness).dimensions)) {
      setReadiness(crR.data as CareerReadiness);
    }
    if (ok(stR)) setStreak(stR.data as StreakData);
    if (ok(pfR) && Array.isArray((pfR.data as PipelineFunnel).stages)) {
      setFunnel(pfR.data as PipelineFunnel);
    }
    if (ok(sjR)) setSavedJobs(((sjR.data as { jobs?: SavedJob[] }).jobs as SavedJob[]) || []);
    // Today inbox is best-effort - a failure just falls back to today's status.
    if (ok(tiR)) setInbox(tiR.data as TodayInbox);

    setErr({
      overview: !ok(ovR),
      streak: !ok(stR),
      funnel: !ok(pfR),
      saved: !ok(sjR),
    });
    setLoading(false);
    setFirstLoad(false);
    // Whether anything a panel depends on failed - the Refresh announcement.
    return !ok(ovR) || !ok(stR) || !ok(pfR) || !ok(sjR);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** User-triggered refresh - same load, plus a polite completion announcement. */
  const handleRefresh = useCallback(async () => {
    setRefreshAnnouncement('');
    const anyFailed = await load();
    setRefreshAnnouncement(
      anyFailed
        ? "Refresh finished, but some panels couldn't load. Use the retry buttons below."
        : 'Dashboard updated',
    );
  }, [load]);

  const displayName = userName ?? user?.name ?? user?.email?.split('@')[0] ?? null;
  const name = givenName(displayName);
  const settled = !(firstLoad && loading);
  const applicationCount = overview?.applications.total ?? streak?.total_applications ?? 0;
  const countsUnknown = settled && err.overview && err.streak;
  const firstRunHome = shouldShowFirstRunHome({
    onboarded: user?.onboarded,
    settled,
    applicationCount,
    countsUnknown,
  });
  const setupOpen = user?.onboarded === false;

  /* ── Zone A hero model - Today inbox first, else today's status ──────────── */
  const hero: HeroModel = useMemo(() => {
    const items: HeroInputItem[] = (inbox?.items ?? []).slice(0, 4).map((it) => ({
      id: it.id,
      kind: it.kind,
      title: it.title,
      detail: it.detail,
      deepLink: it.deep_link,
      actionLabel: it.action_label,
    }));

    // Core failure = we can't even show today's status.
    const coreFailed = err.overview && err.streak;
    const state: HeroModel['state'] = firstLoad && loading ? 'loading' : coreFailed ? 'error' : 'ready';

    return {
      state,
      needsCount: inbox?.count ?? 0,
      items,
      queueAvailable: inbox !== null,
      appliedToday: streak?.today_count ?? 0,
      streakDays: streak?.current_streak ?? 0,
      totalApps: overview?.applications.total ?? streak?.total_applications ?? 0,
    };
  }, [inbox, streak, overview, err.overview, err.streak, firstLoad, loading]);

  const panelState = (isErr: boolean): 'loading' | 'error' | 'ready' =>
    firstLoad && loading ? 'loading' : isErr ? 'error' : 'ready';

  /**
   * Staggered entrance, top to bottom - opacity + a small rise only, so
   * nothing reflows. Skeletons occupy the same slots, so there is zero layout
   * shift when data lands. Disabled entirely under prefers-reduced-motion.
   * Values come from the shared motion system (`@/lib/motion`).
   */
  const rise = (order: number) => riseIn({ reduce: reduceMotion, index: order });

  // First-run empty workspace: one next action, not seven blank panels.
  // The setup overlay sits on top of this (dimmed). This is also what they
  // land on if they close the overlay without finishing.
  if (firstRunHome) {
    return (
      <div className="page-full space-y-8">
        <motion.header {...rise(0)} className="space-y-2">
          <p className="overline leading-none">Home</p>
          <h1 className="text-title font-display text-foreground">
            {greeting()}, {name}
          </h1>
          <p className="max-w-xl text-body text-muted-foreground">
            Add your resume and this home fills in with matches, today's work, and your pipeline.
          </p>
        </motion.header>
        <motion.div {...rise(1)} className="space-y-4">
          <ResumeEntryPanel onUploaded={() => void load()} />
          <p className="text-center text-sm text-muted-foreground">
            <ContinueWorkspaceSetup />
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-full space-y-8">
      {/* Page header */}
      <motion.header {...rise(0)} className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="overline leading-none">Home</p>
          <h1 className="text-title font-display text-foreground">
            {greeting()}, {name}
          </h1>
          <p className="text-caption text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {refreshAnnouncement}
        </p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading}
          aria-label="Refresh dashboard"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-card px-3.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </motion.header>

      {setupOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-muted-foreground">
            Workspace setup is still open. Finish titles, location, and how you apply so this home stays on-target.
          </p>
          <ContinueWorkspaceSetup className="shrink-0 text-sm" />
        </div>
      )}

      {/* Row 1 - Auto-Apply, demoted to a paused preview (read-only). */}
      <AutoApplyPreviewBar />

      {/* The command center: one grid, two columns on xl, single column below.
          LEFT (2fr) is the "do something now" narrative - what needs me, then
          what's strong. RIGHT (1fr) is the at-a-glance scoreboard, beside the
          hero on wide screens instead of stranded below it. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Zone A - What needs me right now? */}
          <motion.section {...rise(1)} aria-label="What needs you">
            <HeroPanel model={hero} onRetry={() => void load()} />
          </motion.section>

          {/* Zone A2 - What's strong? The founder's "top jobs on landing".
              Owns its own async states off the shared job feed, so it never
              blocks (or is blocked by) the dashboard fetches above. */}
          <motion.section {...rise(2)} aria-label="Top matches">
            <TopMatchesPanel />
          </motion.section>
        </div>

        {/* Zone A3 - Where do I stand? KPI rail in the narrow right column. */}
        <motion.section {...rise(3)} aria-label="Where you stand" className="xl:col-span-1">
          <KpiRow
            orientation="rail"
            loading={firstLoad && loading}
            overview={overview}
            readiness={readiness}
            streak={streak}
            funnel={funnel}
          />
        </motion.section>
      </div>

      {/* Resume upload entry point - the primary onboarding action when the
          user has no base resume; a quiet, discoverable affordance once they do. */}
      <motion.div {...rise(4)}>
        <ResumeEntryPanel onUploaded={() => void load()} />
      </motion.div>

      {/* Zone B - What's changing? */}
      <motion.section {...rise(5)} aria-label="Trends" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ApplicationTrend
            state={panelState(err.streak)}
            heatmap={streak?.heatmap ?? null}
            onRetry={() => void load()}
          />
        </div>
        <div className="lg:col-span-1">
          <ConversionFunnel
            state={panelState(err.funnel)}
            funnel={funnel}
            onRetry={() => void load()}
          />
        </div>
      </motion.section>

      {/* Zone C - Why? */}
      <motion.section {...rise(6)} aria-label="Recent roles">
        <RecentActivityPanel
          state={panelState(err.saved)}
          jobs={savedJobs}
          onRetry={() => void load()}
        />
      </motion.section>
    </div>
  );
}
