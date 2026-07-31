/**
 * Home - daily briefing at `/app/home`.
 *
 * Reading order is the 9am question order, most urgent first:
 *
 *   1. WHAT NEEDS ME?    HeroPanel - the Today inbox: approvals, hand-offs,
 *                        nudges. If anything is blocking, it is the first
 *                        thing on the screen.
 *   2. WHERE DO I STAND? KpiRow - sent today, streak, funnel, readiness.
 *   3. WHAT'S NEW?       TopMatchesPanel - the strongest roles scored against
 *                        this resume, with one obvious way into the full list.
 *   4. SET-UP GAP        ResumeEntryPanel - self-gating; loud only when there
 *                        is no base resume, quiet once there is.
 *   5. WHERE ELSE?       FeatureLaunchpad - the product tour, below the fold.
 *   6. WHAT'S CHANGING?  Trend + funnel.
 *   7. WHY?              Recent roles table.
 *
 * The launchpad and the resume prompt used to sit ABOVE the status panels, so a
 * user with three approvals waiting opened Home and saw four static marketing
 * tiles first. Status now wins the fold; the tour is where a tour belongs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rise as riseIn } from '@/lib/motion';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness } from '@/types/career';
import type { PipelineFunnel } from '@/types/pipeline';
import type { SavedJob } from '@/types/jobs';
import type { TodayInbox } from '@/types/todayInbox';

import { HeroPanel, type HeroModel, type HeroInputItem } from './today/HeroPanel';
import { ResumeEntryPanel } from './today/ResumeEntryPanel';
import { FeatureLaunchpad } from './today/FeatureLaunchpad';
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
  const name = displayName?.split(' ')[0] || displayName || 'there';

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

  return (
    <div className="space-y-8">
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

      {/* Zone A - What needs me, and where do I stand? */}
      <motion.section {...rise(1)} aria-label="Today's status" className="space-y-4">
        <HeroPanel model={hero} onRetry={() => void load()} />
        <KpiRow
          loading={firstLoad && loading}
          overview={overview}
          readiness={readiness}
          streak={streak}
          funnel={funnel}
        />
      </motion.section>

      {/* Zone A2 - What's new and strong? The founder's "top jobs on landing".
          Owns its own async states off the shared job feed, so it never blocks
          (or is blocked by) the dashboard fetches above. */}
      <motion.section {...rise(2)} aria-label="Top matches">
        <TopMatchesPanel />
      </motion.section>

      {/* Resume upload entry point - the primary onboarding action when the
          user has no base resume; a quiet, discoverable affordance once they do. */}
      <motion.div {...rise(3)}>
        <ResumeEntryPanel onUploaded={() => void load()} />
      </motion.div>

      <motion.div {...rise(4)}>
        <FeatureLaunchpad />
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
