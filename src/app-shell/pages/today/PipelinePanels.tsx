/**
 * Zone B — "What's changing?"  Trend + funnel.
 *
 *  • ApplicationTrend: a 30-day area chart built from the streak heatmap. The
 *    Y-axis starts at zero (never truncated) and the series carries a text
 *    alternative — a visible caption plus an sr-only data table.
 *  • ConversionFunnel: horizontal, zero-based bars for the application funnel
 *    with the conversion rate between stages. Colour is never the only cue —
 *    every stage is labelled and counted.
 */
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart, Filter } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { PipelineFunnel } from '@/types/pipeline';
import { PanelCard, PanelEmpty, PanelError, ZoneHeading, Stat } from './primitives';
import { Skeleton } from '@/components/ui/skeleton';

interface HeatCell {
  date: string;
  count: number;
}

/* ── Trend ──────────────────────────────────────────────────────────────── */

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const trendConfig: ChartConfig = {
  count: { label: 'Applications', color: 'hsl(var(--primary))' },
};

export function ApplicationTrend({
  state,
  heatmap,
  onRetry,
}: {
  state: 'loading' | 'error' | 'ready';
  heatmap: HeatCell[] | null;
  onRetry: () => void;
}) {
  const series = useMemo(() => {
    const byDate = new Map((heatmap ?? []).map((h) => [h.date, h.count]));
    const out: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = isoDay(d);
      out.push({
        date: iso,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: byDate.get(iso) ?? 0,
      });
    }
    return out;
  }, [heatmap]);

  const windowTotal = series.reduce((s, d) => s + d.count, 0);

  return (
    <PanelCard>
      <ZoneHeading
        overline="What's changing"
        title="Applications, last 30 days"
        hint={
          state === 'ready' && windowTotal > 0
            ? undefined
            : 'Your daily send-rate will chart here as you apply.'
        }
      />

      {state === 'loading' ? (
        <Skeleton className="h-56 w-full" />
      ) : state === 'error' ? (
        <PanelError onRetry={onRetry} />
      ) : windowTotal === 0 ? (
        <PanelEmpty
          icon={LineChart}
          title="No applications in the last 30 days"
          body="Once you start applying, this chart shows your momentum day by day."
        />
      ) : (
        <figure className="m-0">
          <figcaption className="sr-only">
            Line chart of applications submitted per day over the last 30 days. Total in window:{' '}
            {windowTotal}.
          </figcaption>
          <ChartContainer config={trendConfig} className="h-56 w-full">
            <AreaChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="today-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, 'auto']}
                width={28}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border))' }}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#today-trend-fill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
          {/* Equivalent data table — hidden visually, available to assistive tech. */}
          <table className="sr-only">
            <caption>Applications per day, last 30 days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Applications</th>
              </tr>
            </thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.date}>
                  <td>{d.label}</td>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </PanelCard>
  );
}

/* ── Funnel ─────────────────────────────────────────────────────────────── */

function rate(numer: number, denom: number): string | null {
  if (!denom) return null;
  return `${Math.round((numer / denom) * 100)}%`;
}

export function ConversionFunnel({
  state,
  funnel,
  onRetry,
}: {
  state: 'loading' | 'error' | 'ready';
  funnel: PipelineFunnel | null;
  onRetry: () => void;
}) {
  const stages = funnel?.stages ?? [];
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((s, st) => s + st.count, 0);

  return (
    <PanelCard>
      <ZoneHeading overline="What's changing" title="Where applications stand" />

      {state === 'loading' ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
        </div>
      ) : state === 'error' ? (
        <PanelError onRetry={onRetry} />
      ) : total === 0 ? (
        <PanelEmpty
          icon={Filter}
          title="Your funnel is empty for now"
          body="As applications move from applied to interview to offer, you'll see each stage — and where things stall — here."
        />
      ) : (
        <ol className="space-y-3">
          {stages.map((stage, i) => {
            const prev = i > 0 ? stages[i - 1] : null;
            const conv = prev ? rate(stage.count, prev.count) : null;
            const widthPct = Math.round((stage.count / max) * 100);
            return (
              <li key={stage.key}>
                {conv ? (
                  <p className="mb-1 pl-1 text-[0.75rem] text-muted-foreground">
                    <Stat>{conv}</Stat> continued from {prev?.label.toLowerCase()}
                  </p>
                ) : null}
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-caption font-medium text-foreground">
                        {stage.label}
                      </span>
                      <Stat className="text-caption font-semibold text-foreground">{stage.count}</Stat>
                    </div>
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${stage.label}: ${stage.count}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </PanelCard>
  );
}
