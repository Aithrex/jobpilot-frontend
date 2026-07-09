import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiService } from '@/lib/api';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { LockBadge } from '@/components/billing/LockBadge';
import {
  Brain, TrendingUp, Target, Sparkles, AlertTriangle, DollarSign, Loader2, Lightbulb,
  Mic, AlertCircle,
} from 'lucide-react';
import type { SalaryEstimate } from '@/types/interview';

const DIM_LABEL: Record<string, string> = {
  relevance: 'Relevance',
  clarity: 'Clarity',
  specificity: 'Specificity / metrics',
  structure: 'Structure (STAR)',
  technical_accuracy: 'Technical accuracy',
};

/** Score scale — meaning-coded (good / warming / weak), token-derived. */
function scoreColor(v: number) {
  if (v >= 80) return 'bg-success';
  if (v >= 60) return 'bg-warning';
  return 'bg-destructive';
}

interface InterviewInsightsProps {
  /** Lets the empty state jump straight into a mock interview. */
  onStartMock?: () => void;
}

export default function InterviewInsights({ onStartMock }: InterviewInsightsProps) {
  const ent = useEntitlements();
  const { open: openUpgrade } = useUpgrade();
  const coach = useQuery({
    queryKey: ['interview-coach'],
    queryFn: async () => {
      const res = await apiService.getInterviewCoach();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const hasTrends = ent.has('interview_analytics_trends');
  const hasPredictive = ent.has('interview_analytics_predictive');

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2 text-primary">
        <Brain className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-wide">Interview Pattern Coach</span>
      </header>

      {coach.isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="col-span-2 h-20 rounded-xl sm:col-span-1" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : coach.isError ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn't load your insights.</p>
            <p className="text-xs opacity-80">{coach.error instanceof Error ? coach.error.message : 'Please try again.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => coach.refetch()}>Retry</Button>
        </div>
      ) : !coach.data || coach.data.stats.count === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent py-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Mic className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">No answers to analyze yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Do a few mock evaluations and we'll spot the patterns in your answers across every role —
            then tell you exactly what to drill.
          </p>
          {onStartMock && (
            <Button className="mt-4 gap-1.5" size="sm" onClick={onStartMock}>
              <Mic className="h-3.5 w-3.5" /> Start a mock interview
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Summary band */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Avg score</p>
              <p className="text-2xl font-extrabold">{coach.data.stats.avg_score}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Answers analyzed</p>
              <p className="text-2xl font-extrabold">{coach.data.stats.count}</p>
            </Card>
            <Card className="col-span-2 p-4 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Weakest area</p>
              <p className="truncate text-lg font-bold">
                {(coach.data.stats.weakest_dimensions || []).map((d) => DIM_LABEL[d] || d).join(', ') || '—'}
              </p>
            </Card>
          </div>

          {coach.data.narrative && (
            <Card className="border-primary/30 bg-primary/5 p-4">
              <p className="flex items-start gap-2 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{coach.data.narrative}</span>
              </p>
            </Card>
          )}

          {/* Dimension bars */}
          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" /> By dimension</p>
            <div className="space-y-2.5">
              {Object.entries(coach.data.stats.dimension_avg || {}).map(([dim, v]) => (
                <div key={dim}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{DIM_LABEL[dim] || dim}</span>
                    <span className="font-medium tabular-nums">{v ?? '—'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${scoreColor(v ?? 0)}`} style={{ width: `${v ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recurring weak spots */}
          {(coach.data.stats.top_weak_spots?.length ?? 0) > 0 && (
            <Card className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Recurring weak spots (across roles)</p>
              <div className="flex flex-wrap gap-2">
                {coach.data.stats.top_weak_spots!.map((w) => (
                  <Badge key={w.tag} variant="outline" className="gap-1.5">
                    {w.tag}
                    <span className="rounded-full bg-warning/15 px-1.5 text-[10px] font-bold text-warning">×{w.count}</span>
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Trend (Premium) */}
          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Score trend
              {!hasTrends && <LockBadge feature="interview_analytics_trends" />}
            </p>
            {hasTrends && coach.data.trend.length > 1 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={coach.data.trend.map((t, i) => ({ i: i + 1, score: t.score }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="i" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        color: 'hsl(var(--foreground))',
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <button onClick={() => openUpgrade({ feature: 'interview_analytics_trends' })}
                className="w-full rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:border-primary/40">
                {hasTrends ? 'Do a few more evaluations to see your trend.' : 'Upgrade to track how your answers improve over time.'}
              </button>
            )}
          </Card>

          {/* Drills (Premium+) */}
          {hasPredictive && (coach.data.drills?.length ?? 0) > 0 && (
            <Card className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-primary" /> Recommended drills</p>
              <ul className="space-y-2">
                {coach.data.drills.map((d) => (
                  <li key={d.title} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.why}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <SalaryWidget />
    </div>
  );
}

function SalaryWidget() {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SalaryEstimate | null>(null);
  const [err, setErr] = useState('');

  const run = async () => {
    if (!role.trim()) return;
    setLoading(true); setErr('');
    const res = await apiService.getSalaryEstimate(role.trim(), location ? { location } : undefined);
    setLoading(false);
    if (res.status === 403) { setErr('Daily salary lookups used up — upgrade for unlimited.'); return; }
    if (res.error || !res.data) { setErr(res.error || "Couldn't estimate a range — try again."); return; }
    setData(res.data);
  };

  const est = data?.estimate;
  return (
    <Card className="p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><DollarSign className="h-4 w-4 text-primary" /> Salary benchmark</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, e.g. Backend Engineer" disabled={loading} />
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="sm:max-w-[180px]" disabled={loading} />
        <Button onClick={run} disabled={loading || !role.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Estimate'}
        </Button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      {est && (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Low</p>
              <p className="text-lg font-bold">${(est.low ?? 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Median</p>
              <p className="text-2xl font-extrabold text-primary">${(est.median ?? 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">High</p>
              <p className="text-lg font-bold">${(est.high ?? 0).toLocaleString()}</p>
            </div>
          </div>
          {est.percentiles && (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              {(['p25', 'p50', 'p75', 'p90'] as const).map((p) => (
                <div key={p} className="rounded-lg bg-muted p-2">
                  <p className="text-muted-foreground uppercase">{p}</p>
                  <p className="font-semibold">${((est.percentiles?.[p]) ?? 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">{est.notes} · AI estimate ({data?.confidence} confidence)</p>
        </div>
      )}
    </Card>
  );
}
