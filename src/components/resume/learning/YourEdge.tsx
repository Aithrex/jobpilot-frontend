import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Compass, Sparkles, Loader2, Info, RefreshCw, ArrowRight, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import type {
  Differentiator, DifferentiatorsResult, EdgePlan, EdgeLevel, EdgeDuration,
} from '@/types/learning';
import { LEVEL_OPTIONS, DURATION_OPTIONS } from './edgeShared';
import { DifferentiatorCard } from './DifferentiatorCard';
import { EdgePlanView } from './EdgePlanView';

interface YourEdgeProps {
  /** Fired when the backend reports the feature is disabled (404) so the
   *  parent can hide the whole "Your edge" surface. */
  onUnavailable: () => void;
}

export function YourEdge({ onUnavailable }: YourEdgeProps) {
  const reduce = useReducedMotion();
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<DifferentiatorsResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState<EdgeLevel>('auto');
  const [days, setDays] = useState<EdgeDuration>(7);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<EdgePlan | null>(null);

  const findEdge = async () => {
    setFinding(true);
    const res = await apiService.findDifferentiators();
    setFinding(false);
    if (res.status === 404) {
      onUnavailable();
      return;
    }
    if (res.error || !res.data) {
      toast.error('Could not find your edge', { description: res.error || 'Please try again.' });
      return;
    }
    setResult(res.data);
    setSelected(null);
  };

  const generate = async () => {
    if (selected === null || !result) return;
    const diff: Differentiator = result.differentiators[selected];
    setGenerating(true);
    const res = await apiService.generateEdgePlan({
      differentiator: {
        gap: diff.gap,
        why_recruiters_care: diff.why_recruiters_care,
        market_frequency: diff.market_frequency,
      },
      days,
      level,
    });
    setGenerating(false);
    if (res.error || !res.data) {
      toast.error('Could not build your plan', { description: res.error || 'Please try again.' });
      return;
    }
    setPlan(res.data);
  };

  if (plan) {
    return <EdgePlanView plan={plan} onBack={() => setPlan(null)} />;
  }

  // Loading skeletons while the differentiators job runs.
  if (finding) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Scanning your target market for closeable gaps...
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // Intro - the "find my edge" CTA.
  if (!result) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/[0.07] via-card to-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Compass className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Your edge</span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight">
            Find the gap that makes you stand out
          </h3>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            We scan what your target roles keep asking for. Then surface a few trending,
            genuinely-scarce skills you could close in a week or two, with proof recruiters trust.
          </p>
          <Button className="mt-4" onClick={findEdge} disabled={finding}>
            <Sparkles className="h-4 w-4" /> Find my edge
          </Button>
        </div>
      </Card>
    );
  }

  const diffs = result.differentiators ?? [];

  // Honest empty state - the model found fewer than two real gaps.
  if (diffs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Info className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No standout gaps right now</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
            {result.note ||
              "We couldn't find a clearly scarce, closeable edge in your market this week. That's often a good sign. Your profile already covers the common asks."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={findEdge}>
          <RefreshCw className="h-4 w-4" /> Scan again
        </Button>
      </div>
    );
  }

  const selectedDiff = selected !== null ? diffs[selected] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Pick the edge to build</h3>
          <p className="text-sm text-muted-foreground">
            Trending, scarce, and closeable. Choose one to turn into a practical plan.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={findEdge} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Rescan
        </Button>
      </div>

      {result.note && diffs.length < 2 && (
        <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {result.note}
        </p>
      )}

      <div className="space-y-3" role="radiogroup" aria-label="Trending market gaps">
        {diffs.map((d, i) => (
          <DifferentiatorCard
            key={`${d.gap}-${i}`}
            diff={d}
            index={i}
            selected={selected === i}
            onSelect={() => setSelected(i)}
          />
        ))}
      </div>

      {/* Depth + duration + generate */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: selectedDiff ? 1 : 0.55, y: 0 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <p className="text-sm font-semibold">Choose your depth</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={level === opt.id}
              onClick={() => setLevel(opt.id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                level === opt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <span className={cn('text-sm font-medium', level === opt.id && 'text-primary')}>
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Duration
            </span>
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={selected === null || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {generating ? 'Building plan...' : 'Generate plan'}
          </Button>
        </div>
        {generating && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Designing a day-by-day plan with real proof of work, ~20s.
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default YourEdge;
