/**
 * Four numbers that say how the search is going, above everything else.
 *
 * Each one answers a question a job seeker actually asks: am I applying
 * enough, is anyone answering, am I getting interviews, what am I still
 * waiting on. Each is also a button that takes you to the rows behind it.
 */
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { percent, type TrackerInsights } from './trackerInsights';

export type SummaryTarget = 'recent' | 'insights' | 'interviewing' | 'waiting';

interface TrackerSummaryProps {
  insights: TrackerInsights;
  onOpen: (target: SummaryTarget) => void;
}

function Tile({
  label,
  value,
  detail,
  hint,
  onClick,
  children,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  hint: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="group flex min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-caption-sm font-medium text-muted-foreground sm:text-body-sm">
        {label}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="font-display text-2xl font-semibold leading-none text-foreground">
          {value}
        </span>
        {children}
      </span>
      <span className="text-caption-sm leading-snug text-muted-foreground sm:text-body-sm">
        {detail}
      </span>
    </button>
  );
}

/** The last eight weeks as bars, this week in the accent. Decoration: the figures are in Insights. */
function WeekBars({ counts }: { counts: number[] }) {
  const peak = Math.max(1, ...counts);
  return (
    <span aria-hidden className="flex h-7 items-end gap-0.5">
      {counts.map((count, i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 rounded-t-sm',
            i === counts.length - 1 ? 'bg-[hsl(var(--chart-1-hsl))]' : 'bg-muted-foreground/30',
          )}
          style={{ height: `${Math.max(8, Math.round((count / peak) * 100))}%` }}
        />
      ))}
    </span>
  );
}

export default function TrackerSummary({ insights, onOpen }: TrackerSummaryProps) {
  const change = insights.last7 - insights.previous7;
  const Trend = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const replyRate = percent(insights.replied, insights.applied);
  const interviewRate = percent(insights.interviewed, insights.applied);

  return (
    <section
      aria-label="How your search is going"
      className="grid grid-cols-2 gap-1 p-1.5 lg:grid-cols-4"
    >
      <Tile
        label="Sent, last 7 days"
        value={String(insights.last7)}
        hint="Show the applications from the last 7 days"
        onClick={() => onOpen('recent')}
        detail={
          <span className="inline-flex items-center gap-1">
            <Trend className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {change === 0
              ? 'Same as the week before'
              : `${Math.abs(change)} ${change > 0 ? 'more' : 'fewer'} than the week before`}
          </span>
        }
      >
        <WeekBars counts={insights.weeks.map((w) => w.count)} />
      </Tile>
      <Tile
        label="Heard back"
        value={replyRate === null ? '0' : `${replyRate}%`}
        hint="Open Insights to see who answered and how long it took"
        onClick={() => onOpen('insights')}
        detail={
          insights.applied
            ? `${insights.replied} of the ${insights.applied} you sent`
            : 'No applications sent yet'
        }
      />
      <Tile
        label="Got an interview"
        value={String(insights.interviewed)}
        hint="Show the applications at the interview stage now"
        onClick={() => onOpen('interviewing')}
        detail={
          interviewRate === null
            ? 'None yet'
            : `${interviewRate}% of those sent · ${insights.interviewingNow} in progress`
        }
      />
      <Tile
        label="Waiting for a reply"
        value={String(insights.waiting)}
        hint="Show the applications nobody has answered yet"
        onClick={() => onOpen('waiting')}
        detail={
          insights.oldestWaitingDays === null
            ? 'Nothing outstanding'
            : `Longest wait ${insights.oldestWaitingDays} ${insights.oldestWaitingDays === 1 ? 'day' : 'days'}`
        }
      />
    </section>
  );
}
