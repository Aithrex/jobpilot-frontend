/**
 * How the search is going, drawn instead of listed.
 *
 * Every figure is also written out beside its bar, so nothing depends on
 * reading a length or a colour, and a rate is only compared across groups once
 * each group holds enough applications to mean something.
 */
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { formatCivilDay } from '@/lib/applicationDates';
import { cn } from '@/lib/utils';

import {
  MIN_GROUP_SIZE,
  STALE_AFTER_DAYS,
  percent,
  type Comparison,
  type TrackerInsights,
} from './trackerInsights';

const BAR = 'bg-[hsl(var(--chart-1-hsl))]';

function Card({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="font-display text-body font-semibold text-foreground">{title}</h3>
      {lead && <p className="mt-0.5 text-body-sm text-muted-foreground">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One named row: a bar on a shared baseline, then its figure in words. */
function BarRow({
  label,
  share,
  figure,
  hint,
}: {
  label: string;
  /** 0 to 1 of the track. */
  share: number;
  figure: string;
  hint: string;
}) {
  return (
    <div
      role="listitem"
      tabIndex={0}
      title={hint}
      className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-x-3 gap-y-1 rounded-md py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,11rem)_1fr_minmax(0,9.5rem)]"
    >
      <span className="truncate text-body-sm text-foreground">{label}</span>
      <span
        aria-hidden
        className="order-3 col-span-2 h-2.5 rounded-r bg-muted sm:order-none sm:col-span-1"
      >
        <span
          className={cn('block h-full rounded-r', BAR)}
          style={{ width: `${Math.max(share > 0 ? 2 : 0, Math.round(share * 100))}%` }}
        />
      </span>
      <span className="text-right text-body-sm tabular-nums text-muted-foreground">{figure}</span>
    </div>
  );
}

function Funnel({ insights }: { insights: TrackerInsights }) {
  const of = (count: number) => {
    const share = percent(count, insights.applied);
    return share === null ? String(count) : `${count} · ${share}%`;
  };
  const rows = [
    { label: 'Sent', count: insights.applied, figure: String(insights.applied) },
    { label: 'Heard back', count: insights.replied, figure: of(insights.replied) },
    { label: 'Got an interview', count: insights.interviewed, figure: of(insights.interviewed) },
    { label: 'Got an offer', count: insights.offers, figure: of(insights.offers) },
  ];
  return (
    <Card title="How far your applications got" lead="A no still counts as hearing back.">
      <div role="list" aria-label="Applications that reached each stage">
        {rows.map((row) => (
          <BarRow
            key={row.label}
            label={row.label}
            share={insights.applied ? row.count / insights.applied : 0}
            figure={row.figure}
            hint={`${row.label}: ${row.count} of ${insights.applied} applications`}
          />
        ))}
      </div>
      {/* The three numbers a reader tries to add up, added up for them. */}
      <p className="mt-3 text-body-sm text-muted-foreground">
        Of the {insights.applied} you sent: {insights.replied} answered, {insights.waiting} still
        waiting
        {insights.closedUnanswered > 0 && `, ${insights.closedUnanswered} closed with no reply`}.
      </p>
    </Card>
  );
}

function Weekly({ insights }: { insights: TrackerInsights }) {
  const peak = Math.max(1, ...insights.weeks.map((w) => w.count));
  const last = insights.weeks.length - 1;
  const change = insights.last7 - insights.previous7;
  return (
    <Card
      title="Applications sent each week"
      lead={
        <>
          {insights.last7} in the last 7 days
          {change !== 0 &&
            `, ${Math.abs(change)} ${change > 0 ? 'more' : 'fewer'} than the 7 days before`}
          .
        </>
      }
    >
      <div className="flex h-36 items-end gap-2 border-b border-border" aria-hidden>
        {insights.weeks.map((week, i) => (
          <div
            key={week.start}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-caption-sm tabular-nums text-muted-foreground">{week.count}</span>
            <span
              title={`Week of ${formatCivilDay(week.start)}: ${week.count} ${week.count === 1 ? 'application' : 'applications'}`}
              className={cn(
                'w-full max-w-6 rounded-t',
                i === last ? BAR : 'bg-muted-foreground/35',
                week.count === 0 && 'bg-border',
              )}
              style={{
                height: `${week.count === 0 ? 2 : Math.max(6, Math.round((week.count / peak) * 78))}%`,
              }}
            />
          </div>
        ))}
      </div>
      {/* Two labels, not eight: on a phone eight dates truncate to "Sep..." */}
      <div
        className="mt-1.5 flex justify-between text-caption-sm text-muted-foreground"
        aria-hidden
      >
        <span>Week of {formatCivilDay(insights.weeks[0].start)}</span>
        <span>This week</span>
      </div>
      {/* A table ignores height, so `sr-only` on the table itself still
          stretches the page: hide a wrapper instead. */}
      <div className="sr-only">
        <table>
          <caption>Applications sent in each of the last {insights.weeks.length} weeks</caption>
          <thead>
            <tr>
              <th scope="col">Week starting</th>
              <th scope="col">Applications</th>
            </tr>
          </thead>
          <tbody>
            {insights.weeks.map((week) => (
              <tr key={week.start}>
                <th scope="row">{formatCivilDay(week.start)}</th>
                <td>{week.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Waiting({
  insights,
  onCloseStale,
  closing,
}: {
  insights: TrackerInsights;
  onCloseStale: () => void;
  closing: boolean;
}) {
  const stale = insights.staleIds.length;
  return (
    <Card
      title="Still waiting for a reply"
      lead={
        insights.waiting === 0
          ? undefined
          : `${insights.waiting} ${insights.waiting === 1 ? 'application has' : 'applications have'} had no answer yet. This is how long they have waited.`
      }
    >
      {insights.waiting === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nothing is waiting on an employer right now.
        </p>
      ) : (
        <div role="list" aria-label="Unanswered applications by how long they have waited">
          {insights.waitingBuckets.map((bucket) => (
            <BarRow
              key={bucket.key}
              label={bucket.label}
              share={bucket.count / insights.waiting}
              figure={`${bucket.count} ${bucket.count === 1 ? 'application' : 'applications'}`}
              hint={`Waiting ${bucket.label.toLowerCase()}: ${bucket.count} of ${insights.waiting}`}
            />
          ))}
        </div>
      )}
      {/* About other applications, the answered ones, so it sits apart from the bars. */}
      <p className="mt-3 text-body-sm text-muted-foreground">
        {insights.medianReplyDays === null
          ? 'No employer has replied yet, so there is no usual reply time to compare with.'
          : `For comparison: of the ${insights.replySample} ${insights.replySample === 1 ? 'employer that has' : 'employers that have'} replied, half answered within ${insights.medianReplyDays} ${insights.medianReplyDays === 1 ? 'day' : 'days'}.`}
      </p>
      {stale > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="min-w-0 flex-1 basis-56 text-body-sm text-foreground">
            {stale} {stale === 1 ? 'application has' : 'applications have'} waited more than{' '}
            {STALE_AFTER_DAYS} days. A reply that late is rare, and closing them keeps your numbers
            honest.
          </p>
          <Button variant="outline" size="sm" disabled={closing} onClick={onCloseStale}>
            {closing ? 'Closing...' : `Mark ${stale} as no response`}
          </Button>
        </div>
      )}
    </Card>
  );
}

function CompareBlock({ comparison }: { comparison: Comparison }) {
  return (
    <div>
      <h4 className="text-body-sm font-semibold text-foreground">{comparison.title}</h4>
      {comparison.enough ? (
        <div
          role="list"
          aria-label={`Interviews by ${comparison.title.toLowerCase()}`}
          className="mt-1"
        >
          {comparison.groups.map((group) => {
            const rate = percent(group.interviewed, group.applied) ?? 0;
            return (
              <BarRow
                key={group.label}
                label={group.label}
                // The whole track is 100%, as in every other card: a bar scaled
                // to the best group made 22% look like all of them.
                share={group.applied ? group.interviewed / group.applied : 0}
                figure={`${group.interviewed} of ${group.applied} · ${rate}%`}
                hint={`${group.label}: ${group.interviewed} of ${group.applied} applications got an interview`}
              />
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-body-sm text-muted-foreground">
          Not enough applications to compare yet. This needs at least {MIN_GROUP_SIZE} in each
          group. So far:{' '}
          {comparison.groups.map((g) => `${g.label.toLowerCase()} ${g.applied}`).join(', ')}.
        </p>
      )}
    </div>
  );
}

interface InsightsViewProps {
  insights: TrackerInsights;
  onCloseStale: () => void;
  closing: boolean;
}

export default function InsightsView({ insights, onCloseStale, closing }: InsightsViewProps) {
  if (insights.applied === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-display text-body font-semibold text-foreground">
          Nothing to measure yet
        </p>
        <p className="mx-auto mt-1 max-w-md text-body-sm text-muted-foreground">
          Insights start with your first application. Mark a job as applied and this page shows how
          many employers answer, how long they take and what gets you interviews.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Funnel insights={insights} />
      <Weekly insights={insights} />
      <Waiting insights={insights} onCloseStale={onCloseStale} closing={closing} />
      <Card
        title="What gets you interviews"
        lead="How many applications in each group got an interview. These are small numbers, so treat a gap as a hint to test, not a rule."
      >
        <div className="space-y-5">
          {insights.comparisons.map((comparison) => (
            <CompareBlock key={comparison.id} comparison={comparison} />
          ))}
        </div>
      </Card>
    </div>
  );
}
