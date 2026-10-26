/**
 * Home - daily briefing at `/app/home`.
 *
 * A full-bleed command center (`.page-full`) so a wide monitor is spent on
 * structure, not empty gutters. The reading order is the 9am question order:
 *
 *   0. PAUSED PREVIEW    AutoApplyPreviewBar - a thin glass bar (desktop) /
 *                        swipe strip (mobile) for the on-hold Auto-Apply, read
 *                        only, never live.
 *   1. WHERE DO I STAND? KpiRow (strip) - sent today, pipeline, interview rate,
 *                        readiness. A confident, scannable horizontal rail that
 *                        is now the first thing the user reads.
 *   2. WHAT'S STRONG?    TopMatchesPanel - the best roles scored against this
 *                        resume, filtered to the candidate's own experience
 *                        level (mirrors the "For you" board default). The lead
 *                        of the main content column.
 *   3. SET-UP GAP        ResumeEntryPanel - self-gating; loud when there is no
 *                        base resume, a quiet affordance once there is.
 *   4. WHAT'S CHANGING?  Trend + funnel.
 *   5. WHY?              Recent roles table.
 *
 * The Today-inbox hero ("needs your input") was removed from Home for now; its
 * component and fetch are retained in the repo so the capability can return.
 * The static product-tour tiles (FeatureLaunchpad) were cut earlier for the
 * same reason: Home shows status and the strongest next move, and every
 * surviving panel earns its place by removing a real manual-apply pain.
 *
 * First-run empty Home (upload + continue setup) is only for a settled empty
 * workspace. While dashboard fetches are in flight we keep the real layout and
 * its skeletons - otherwise an unfinished onboarding flag flashes the empty
 * page, then swaps in KPIs/matches and drops Continue workspace setup.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ClipboardList, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { rise as riseIn } from '@/lib/motion';
import { toTitleCase } from '@/lib/format';
import { requestOnboardingOpen } from '@/components/onboarding/onboarding';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness } from '@/types/career';
import type { PipelineFunnel } from '@/types/pipeline';
import type { TailoringRecord } from '@/types/resume';

// HeroPanel (the Today-inbox "needs your input" block) is intentionally no
// longer mounted on Home - the capability and `apiService.getTodayInbox` are
// retained in the repo so it can return later. See the layout note below.
import { ResumeEntryPanel } from './today/ResumeEntryPanel';
// FeatureLaunchpad (the static product-tour tiles) is intentionally no longer
// rendered on Home - discoverability is covered by the command palette, the
// mobile More sheet, and primary nav. The file is retained for reuse.
import { KpiRow } from './today/KpiCards';
import { ApplicationTrend, ConversionFunnel } from './today/PipelinePanels';
import { RecentActivityPanel } from './today/RecentActivityPanel';
import { TopMatchesPanel } from './today/TopMatchesPanel';
import { summarizeApplicationActivity } from './today/applicationActivity';

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
  const [records, setRecords] = useState<TailoringRecord[] | null>(null);
  const [funnel, setFunnel] = useState<PipelineFunnel | null>(null);

  const [err, setErr] = useState({ overview: false, records: false, funnel: false });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  // Announced to screen readers after a user-triggered Refresh completes.
  const [refreshAnnouncement, setRefreshAnnouncement] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ovR, crR, recordsR, pfR] = await Promise.all([
      apiService.getOverview().catch(() => ({ error: 'x' }) as const),
      apiService.getCareerReadiness().catch(() => ({ error: 'x' }) as const),
      apiService.listTailoringRecords({ view: 'list' }).catch(() => ({ error: 'x' }) as const),
      apiService.getPipelineFunnel().catch(() => ({ error: 'x' }) as const),
    ]);

    if (ok(ovR)) setOverview(ovR.data as DashboardOverview);
    // Guard the backend's {}-error fallback - only accept a real readiness score.
    if (ok(crR) && Array.isArray((crR.data as CareerReadiness).dimensions)) {
      setReadiness(crR.data as CareerReadiness);
    }
    setRecords(ok(recordsR) ? recordsR.data.records : null);
    if (ok(pfR) && Array.isArray((pfR.data as PipelineFunnel).stages)) {
      setFunnel(pfR.data as PipelineFunnel);
    }

    setErr({
      overview: !ok(ovR),
      records: !ok(recordsR),
      funnel: !ok(pfR),
    });
    setLoading(false);
    setFirstLoad(false);
    // Whether anything a panel depends on failed - the Refresh announcement.
    return !ok(ovR) || !ok(recordsR) || !ok(pfR);
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
  const applicationCount = overview?.applications.total ?? records?.length ?? 0;
  const countsUnknown = settled && err.overview && err.records;
  const activity = useMemo(() => records ? summarizeApplicationActivity(records) : null, [records]);
  const firstRunHome = shouldShowFirstRunHome({
    onboarded: user?.onboarded,
    settled,
    applicationCount,
    countsUnknown,
  });
  const setupOpen = user?.onboarded === false;

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

      <section aria-label="Application tracker" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-display font-semibold">Keep every application in view</h2>
            <p className="text-sm text-muted-foreground">Connect Gmail, review replies, and follow up from your application tracker.</p>
          </div>
        </div>
        <Link to="/app/apply/tracker" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Open tracker <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {/* Zone 1 - Where do I stand? With the hero gone this is the first thing
          the user reads: a confident, scannable horizontal KPI strip across the
          full width (4-up on lg, 2-up on md, stacked below). */}
      <motion.section {...rise(1)} aria-label="Where you stand">
        <KpiRow
          orientation="grid"
          loading={firstLoad && loading}
          overview={overview}
          readiness={readiness}
          applicationsToday={activity?.todayCount ?? null}
          funnel={funnel}
        />
      </motion.section>

      {/* Zone 2 - What's strong? The founder's "top jobs on landing", now the
          lead of the command center with the hero gone. It owns its own async
          states off the shared job feed, so it never blocks (or is blocked by)
          the dashboard fetches above. Full width so the matches read as the
          primary surface of the page. */}
      <motion.section {...rise(2)} aria-label="Top matches">
        <TopMatchesPanel />
      </motion.section>

      {/* Resume upload entry point - the primary onboarding action when the
          user has no base resume; a quiet, discoverable affordance once they do. */}
      <motion.div {...rise(3)}>
        <ResumeEntryPanel onUploaded={() => void load()} />
      </motion.div>

      {/* Zone 3 - What's changing? */}
      <motion.section {...rise(4)} aria-label="Trends" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ApplicationTrend
            state={panelState(err.records)}
            heatmap={activity?.heatmap ?? null}
            undatedCount={activity?.undatedCount ?? 0}
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

      {/* Zone 4 - Why? */}
      <motion.section {...rise(5)} aria-label="Recent applications">
        <RecentActivityPanel
          state={panelState(err.records)}
          applications={activity?.datedRecords ?? null}
          onRetry={() => void load()}
        />
      </motion.section>
    </div>
  );
}
