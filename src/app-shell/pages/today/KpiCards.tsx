/**
 * Zone A KPI row - 3-5 stat cards, 4-up on lg / 2-up md / 1-up below.
 *
 * Rule enforced here: NO NAKED NUMBERS. Every card pairs its figure with
 * context - a target, a prior-period delta, or a trend arrow whose direction
 * carries meaning (and is never signalled by colour alone: arrow icon + words).
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Send,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness } from '@/types/career';
import type { PipelineFunnel } from '@/types/pipeline';
import { StatCardSkeleton, Stat } from './primitives';

interface StreakLike {
  today_count: number;
  current_streak: number;
  total_applications: number;
}

type TrendDir = 'up' | 'down' | 'flat';

function TrendChip({ dir, label }: { dir: TrendDir; label: string }) {
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-medium leading-none',
        dir === 'up' && 'bg-success/10 text-success',
        dir === 'down' && 'bg-warning/10 text-warning',
        dir === 'flat' && 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function StatCard({
  label,
  icon: Icon,
  value,
  context,
  trend,
}: {
  label: string;
  icon: LucideIcon;
  value: ReactNode | null;
  context: ReactNode;
  trend?: { dir: TrendDir; label: string };
}) {
  return (
    <div className="flex flex-col justify-between rounded-container border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-display font-display leading-none text-foreground">
          {value === null ? <span className="text-muted-foreground"> - </span> : <Stat>{value}</Stat>}
        </span>
        {trend ? <span className="pb-1"><TrendChip {...trend} /></span> : null}
      </div>
      <p className="mt-2 text-caption text-muted-foreground">{context}</p>
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

/** Reads a funnel stage count by any of a few likely keys. */
function stageCount(funnel: PipelineFunnel | null, keys: string[]): number | null {
  if (!funnel) return null;
  for (const k of keys) {
    const s = funnel.stages.find((st) => st.key === k);
    if (s) return s.count;
  }
  return null;
}

export function KpiRow({
  loading,
  overview,
  readiness,
  streak,
  funnel,
  orientation = 'grid',
}: {
  loading: boolean;
  overview: DashboardOverview | null;
  readiness: CareerReadiness | null;
  streak: StreakLike | null;
  funnel: PipelineFunnel | null;
  /**
   * Layout of the four cards. 'grid' (default) is the standalone 4-up row;
   * 'rail' is the command-center right column - 2-up on tablet, a single
   * vertical column only at xl where it sits beside the hero. Presentational
   * only; no metric changes. BOTH the loading and data branches read the same
   * `wrap` so loading and loaded share one layout (no shift).
   */
  orientation?: 'grid' | 'rail';
}) {
  const wrap =
    orientation === 'rail'
      ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1'
      : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <div className={wrap}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  /* All tracker records include saved roles and drafts, not just submissions. */
  const totalApps = overview?.applications.total ?? null;
  const today = streak?.today_count ?? 0;

  // Match the tracker's Active scope: every role except a closed outcome.
  const statuses = overview?.applications.by_status;
  const active = overview && statuses
    ? Math.max(0, overview.applications.total - (statuses.rejected ?? 0) - (statuses.withdrawn ?? 0) - (statuses.ghosted ?? 0))
    : null;
  const interviewing = overview?.applications.interviewing ?? 0;
  const offers = overview?.applications.offers ?? 0;

  /* 3 - Interview rate (context: the basis - advanced of applied) */
  const appliedCount = stageCount(funnel, ['applied']);
  const interviewCount = stageCount(funnel, ['interview', 'interviewing']);
  const interviewRate =
    appliedCount && appliedCount > 0 && interviewCount != null
      ? (interviewCount / appliedCount) * 100
      : null;

  /* 4 - Career readiness (context: band + next milestone) */
  const readinessScore = typeof readiness?.overall === 'number' ? Math.round(readiness.overall) : null;
  const bandLabel = readiness?.band
    ? readiness.band[0].toUpperCase() + readiness.band.slice(1)
    : null;

  return (
    <div className={wrap}>
      <StatCard
        label="Tracked roles"
        icon={Send}
        value={totalApps === null ? null : totalApps}
        trend={streak ? (
          today > 0
            ? { dir: 'up', label: `${today} applied today` }
            : { dir: 'flat', label: 'none applied today' }
        ) : undefined}
        context="Includes saved roles and drafts, across all stages"
      />

      <StatCard
        label="Open roles"
        icon={Briefcase}
        value={active === null ? null : active}
        context={
          active && active > 0 ? (
            <>
              Saved through offer: <Stat>{interviewing}</Stat> interviewing · <Stat>{offers}</Stat>{' '}
              {offers === 1 ? 'offer' : 'offers'}
            </>
          ) : (
            'Roles in play will show up here'
          )
        }
      />

      <StatCard
        label="Interview rate"
        icon={TrendingUp}
        value={interviewRate === null ? null : pct(interviewRate)}
        context={
          interviewRate === null ? (
            'Apply to a few roles to measure this'
          ) : (
            <>
              <Stat>{interviewCount}</Stat> of <Stat>{appliedCount}</Stat> applications advanced
            </>
          )
        }
      />

      <StatCard
        label="Career readiness"
        icon={Gauge}
        value={readinessScore === null ? null : `${readinessScore}`}
        context={
          readinessScore === null ? (
            'Finish onboarding to see your score'
          ) : (
            <>
              {bandLabel ? `${bandLabel} · ` : ''}
              {readiness?.next_step?.label
                ? `Next: ${readiness.next_step.label}`
                : 'out of 100'}
            </>
          )
        }
      />
    </div>
  );
}
