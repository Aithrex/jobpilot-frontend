/**
 * DashboardTab - the GENERATED dashboard (Compass §6.2).
 *
 * Not a template. This is a tiny client-side widget engine: a catalog of
 * widgets (see `./widgets/registry`), each with a `relevance(ctx) -> 0..1`
 * scorer and a natural grid `span`. Every render we assemble a `DashboardCtx`
 * from what the frontend already knows (OPT urgency, readiness, matches,
 * pipeline funnel, sponsorship, learning, interviews, posts, resume gaps,
 * activity phase), score every widget, and lay them out largest-and-first.
 *
 * Above the grid sits ONE hero recommended action, chosen by a ranker over the
 * user's strongest match + OPT urgency + ready-to-submit queue (see
 * `./widgets/HeroAction`). Calm, editorial, panic-reducing (Compass §7).
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness, ConnectStatus } from '@/types/career';
import type { OptClock } from '@/types/visa';
import type { PipelineFunnel } from '@/types/pipeline';
import type { SavedJob } from '@/types/jobs';
import type { PostDraft } from '@/types/events';
import type { TechChronicleItem } from '@/types/techChronicle';
import { RefreshCw } from 'lucide-react';

import { GitHubProofCard } from './GitHubProofCard';
import { LinkedInAuditCard } from './LinkedInAuditCard';
import { LinkedInArchiveCard } from './LinkedInArchiveCard';

import { DirectiveBlock } from './DirectiveBlock';
import { ActivitySpine, type SpineNode } from './ActivitySpine';
import AutoApplyEntryCard from '@/components/autoSubmit/AutoApplyEntryCard';
import { WIDGETS } from './widgets/registry';
import { spanClass, WidgetSkeleton } from './widgets/primitives';
import { scoredMatches } from './widgets/selectors';
import { EASE, clamp01 } from './widgets/types';
import type { ActivityPhase, DashboardCtx, NavKey, SliceErrors, StreakData } from './widgets/types';

interface DashboardTabProps {
  userName?: string | null;
  onNavigate: (tab: NavKey) => void;
}

const NO_ERRORS: SliceErrors = {
  overview: false, streak: false, trends: false, connect: false,
  funnel: false, savedJobs: false, posts: false,
};

/** Did this settled fetch actually carry data? (Rejections were caught to `{error}`.) */
function ok(r: object): boolean {
  return 'data' in r && !!(r as { data?: unknown }).data;
}

export default function DashboardTab({ userName, onNavigate }: DashboardTabProps) {
  const reduce = useReducedMotion();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [readiness, setReadiness] = useState<CareerReadiness | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [trends, setTrends] = useState<TechChronicleItem[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [optClock, setOptClock] = useState<OptClock | null>(null);
  const [optError, setOptError] = useState(false);
  const [funnel, setFunnel] = useState<PipelineFunnel | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [posts, setPosts] = useState<PostDraft[]>([]);
  const [errors, setErrors] = useState<SliceErrors>(NO_ERRORS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [ovR, crR, stR, trR, cnR, ocR, pfR, sjR, psR] = await Promise.all([
      apiService.getOverview().catch(() => ({ error: 'x' } as const)),
      apiService.getCareerReadiness().catch(() => ({ error: 'x' } as const)),
      apiService.getApplicationStreak().catch(() => ({ error: 'x' } as const)),
      apiService.getTechChronicle('all').catch(() => ({ error: 'x' } as const)),
      apiService.getConnectStatus().catch(() => ({ error: 'x' } as const)),
      apiService.optClock().catch(() => ({ error: 'x' } as const)),
      apiService.getPipelineFunnel().catch(() => ({ error: 'x' } as const)),
      apiService.getSavedJobs().catch(() => ({ error: 'x' } as const)),
      apiService.getPosts().catch(() => ({ error: 'x' } as const)),
    ]);
    if ('data' in ovR && ovR.data) setOverview(ovR.data as DashboardOverview);
    // Guard the backend's {} error-fallback - only accept a real score.
    if ('data' in crR && crR.data && Array.isArray((crR.data as CareerReadiness).dimensions)) {
      setReadiness(crR.data as CareerReadiness);
    }
    if ('data' in stR && stR.data) setStreak(stR.data as StreakData);
    if ('data' in trR && trR.data) setTrends((trR.data.items || []).slice(0, 6));
    if ('data' in cnR && cnR.data && (cnR.data as ConnectStatus).github && (cnR.data as ConnectStatus).linkedin) {
      setConnect(cnR.data as ConnectStatus);
    }
    if ('data' in ocR && ocR.data) { setOptClock(ocR.data as OptClock); setOptError(false); }
    else setOptError(true);
    if ('data' in pfR && pfR.data && Array.isArray((pfR.data as PipelineFunnel).stages)) setFunnel(pfR.data as PipelineFunnel);
    if ('data' in sjR && sjR.data) setSavedJobs((sjR.data.jobs as SavedJob[]) || []);
    if ('data' in psR && psR.data) setPosts((psR.data.posts as PostDraft[]) || []);
    setErrors({
      overview: !ok(ovR),
      streak: !ok(stR),
      trends: !ok(trR),
      connect: !ok(cnR),
      funnel: !ok(pfR),
      savedJobs: !ok(sjR),
      posts: !ok(psR),
    });
    setLoading(false);
  };

  const reloadOptClock = async () => {
    const r = await apiService.optClock().catch(() => ({ error: 'x' } as const));
    if ('data' in r && r.data) { setOptClock(r.data as OptClock); setOptError(false); }
    else setOptError(true);
  };

  const reloadConnect = async () => {
    const r = await apiService.getConnectStatus().catch(() => ({ error: 'x' } as const));
    if ('data' in r && r.data && (r.data as ConnectStatus).github && (r.data as ConnectStatus).linkedin) {
      setConnect(r.data as ConnectStatus);
    }
  };

  useEffect(() => { void load(); }, []);

  // After OAuth the backend redirects to /app?connected=<p> | ?connect_error=<r>.
  // Surface a toast, then strip the param so a refresh doesn't re-fire it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('connect_error');
    if (!connected && !error) return;
    if (connected) toast.success(`${connected} connected`);
    if (error) toast.error(`Couldn't connect: ${error.replace(/_/g, ' ')}`);
    params.delete('connected');
    params.delete('connect_error');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, []);

  const name = userName?.split(' ')[0] || userName || 'there';

  // ── Derive the user's activity phase - nudges widget relevance by context.
  const phase: ActivityPhase = useMemo(() => {
    const totalApps = overview?.applications.total ?? streak?.total_applications ?? 0;
    const interviewing = overview?.applications.interviewing ?? 0;
    const hasResume = !!overview?.resume.has_base;
    if (interviewing > 0) return 'interviewing';
    if (totalApps >= 1) return 'applying';
    if (savedJobs.length > 0 || hasResume) return 'exploring';
    return 'new';
  }, [overview, streak, savedJobs]);

  // ── The single argument to every scorer + renderer.
  const ctx: DashboardCtx = {
    loading, overview, readiness, streak, optClock, optError, funnel, savedJobs, posts,
    trends, connect, errors, phase, userName: name,
    navigate: (t) => onNavigate(t),
    reloadOptClock,
    retry: () => void load(),
  };

  // ── The activity spine's four nodes - every count is real ctx data, honest
  //    zeros included. `scanned` = roles saved/scored into the workspace,
  //    `matched` = those carrying a match score, `applied` = applications sent,
  //    `responded` = employers who moved you forward (interviewing + offers).
  const stageCount = (k: string) => funnel?.stages.find((s) => s.key === k)?.count ?? 0;
  const applied =
    overview?.applications.total ??
    (funnel ? stageCount('applied') : undefined) ??
    streak?.total_applications ??
    0;
  const responded = overview
    ? overview.applications.interviewing + overview.applications.offers
    : stageCount('interview') + stageCount('offer');
  const spineNodes: SpineNode[] = [
    { key: 'scanned', label: 'Scanned', value: overview?.jobs.saved ?? savedJobs.length },
    { key: 'matched', label: 'Matched', value: scoredMatches(ctx).length },
    { key: 'applied', label: 'Applied', value: applied },
    { key: 'responded', label: 'Responded', value: responded },
  ];

  // ── Rank the catalog. Hidden widgets (relevance <= 0) drop out entirely.
  const scored = WIDGETS
    .map((w) => ({ w, score: clamp01(w.relevance(ctx)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const firstLoad = loading && !overview && !readiness && !optClock && savedJobs.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Utility row - refresh only. The directive below is the opener. */}
      <div className="flex justify-end">
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {firstLoad ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 1. The directive - concrete roles worth applying to today (or, when
                there are none yet, the ranker's single best next step). */}
          <DirectiveBlock ctx={ctx} />

          {/* 2. The activity spine - scanned → matched → applied → responded. */}
          <ActivitySpine nodes={spineNodes} />

          {/* 3. Everything else, one level deeper. */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              More insights
            </h2>

            {/* Auto-Apply entry point - self-hides when the feature is unavailable */}
            <AutoApplyEntryCard onOpen={() => onNavigate('auto-apply')} />

            {/* The generated, relevance-ranked widget grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-flow:dense]">
              {scored.map(({ w }, i) => (
                <motion.div
                  key={w.key}
                  className={cn(spanClass(w.span?.(ctx) ?? 1), '[&>*]:h-full')}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE, delay: reduce ? 0 : Math.min(i * 0.03, 0.24) }}
                >
                  {w.render(ctx)}
                </motion.div>
              ))}
            </div>
          </section>

          {/* Build your presence - proof that recognizes the building (kept surface) */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Build your professional presence
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <GitHubProofCard onLinked={load} connect={connect} reloadConnect={reloadConnect} />
              <LinkedInAuditCard connect={connect} reloadConnect={reloadConnect} />
              <LinkedInArchiveCard />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** First-load skeleton - mirrors the hero + grid so nothing shifts when data lands. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-hidden="true">
      <div className="h-52 animate-pulse rounded-container border border-border bg-card shadow-soft sm:h-44" />
      <div className="h-24 animate-pulse rounded-container border border-border bg-card shadow-soft" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WidgetSkeleton span={3} lines={2} />
        <WidgetSkeleton span={2} lines={4} />
        <WidgetSkeleton span={1} lines={3} />
        <WidgetSkeleton span={1} lines={3} />
        <WidgetSkeleton span={1} lines={3} />
        <WidgetSkeleton span={2} lines={3} />
      </div>
    </div>
  );
}
