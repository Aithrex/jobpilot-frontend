import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { apiService } from '@/lib/api';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, CheckCircle2, Target, Zap, Briefcase, ArrowRight, Loader2,
  AlertCircle, ChevronDown, ExternalLink, Flame, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LearningTrend } from '@/types/learning';

interface MarketTrendsProps {
  /** Trailing-day window for the market aggregate. */
  window?: number;
  /** Fired with the new path_id once a plan is generated from a topic. */
  onPlanCreated: (pathId: string) => void;
}

function isUpgrade(res: { status?: number; errorPayload?: Record<string, unknown> }) {
  return res.status === 403 && res.errorPayload?.error === 'upgrade_required';
}

/** Learnability weight (0..1) → an honest, non-promising label. */
function learnabilityLabel(v: number): string {
  if (v >= 0.75) return 'Fast to build';
  if (v >= 0.5) return 'Moderate';
  return 'Deep';
}

export function MarketTrends({ window = 90, onPlanCreated }: MarketTrendsProps) {
  const reduce = useReducedMotion();
  const { open: openUpgrade } = useUpgrade();
  const [starting, setStarting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const trends = useQuery({
    queryKey: ['learning-trends', window],
    queryFn: async () => {
      const res = await apiService.getLearningTrends(window);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Reuse the exact plan-generation flow the Topics tab uses: seed
  // createLearningPlan with the trend's plan_topic, then hand the new path_id
  // back so the hub can open it.
  const startPlan = async (item: LearningTrend) => {
    setStarting(item.plan_topic);
    const res = await apiService.createLearningPlan(item.plan_topic);
    setStarting(null);
    if (isUpgrade(res)) {
      openUpgrade({
        feature: 'learning',
        title: 'Unlock more learning paths',
        description: 'Free includes one active path. Upgrade for more topics and capstones.',
      });
      return;
    }
    if (res.error || !res.data) {
      toast.error('Could not build plan', { description: res.error || 'Please try again.' });
      return;
    }
    toast.success('Your learning plan is ready!');
    onPlanCreated(res.data.path_id);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-gradient-to-br from-primary/[0.06] via-card to-card px-4 py-3">
        <div className="flex items-center gap-2 text-primary">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-semibold">Trending in your market</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What the roles you're chasing keep asking for right now. Learned across everyone's job
          matches, matched to your real gaps.
        </p>
      </div>

      <div className="p-4">
        {trends.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : trends.isError ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Couldn't load market trends.</p>
              <p className="text-xs opacity-80">
                {trends.error instanceof Error ? trends.error.message : 'Please try again.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] shrink-0"
              onClick={() => trends.refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (trends.data?.items.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">No market signal yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {trends.data?.note ||
                "Apply to a few more roles and we'll spot what the market wants."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {trends.data!.items.map((item, i) => {
              const pct = Math.round(item.market_pct * 100);
              const isOpen = expanded === item.plan_topic;
              const hasUnlocked = (item.unlocked?.length ?? 0) > 0;
              return (
                <motion.li
                  key={item.plan_topic}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize">{item.skill}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium tabular-nums text-foreground">{pct}%</span>{' '}
                        of {trends.data!.role.replace(/_/g, ' ')} roles ask for this
                      </p>
                    </div>
                    {/* You-have vs gap — icon + label, never colour alone. */}
                    {item.user_has ? (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> You have this
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-primary">
                        <Target className="h-3.5 w-3.5" /> Gap
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-primary" /> {learnabilityLabel(item.learnability)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{item.unlocks_jobs}</span>{' '}
                      {item.unlocks_jobs === 1 ? 'job' : 'jobs'} unlocked
                    </span>
                    {item.outcome_pressure > 0 && (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <Flame className="h-3.5 w-3.5" /> Wanted by{' '}
                        <span className="tabular-nums">{item.outcome_pressure}</span> role
                        {item.outcome_pressure === 1 ? '' : 's'} that passed on you
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => startPlan(item)}
                      disabled={starting !== null}
                    >
                      {starting === item.plan_topic ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      {starting === item.plan_topic ? 'Building…' : 'Start a 10-day plan'}
                    </Button>
                    {hasUnlocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px]"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : item.plan_topic)}
                      >
                        See unlocked roles
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                        />
                      </Button>
                    )}
                  </div>

                  {hasUnlocked && isOpen && (
                    <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                      {item.unlocked.map((j) => (
                        <li key={j.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">
                            {j.title || 'Saved role'}
                            {j.company ? ` · ${j.company}` : ''}
                          </span>
                          {j.url && (
                            <a
                              href={j.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${j.title || 'saved role'}`}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-primary hover:bg-primary/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default MarketTrends;
