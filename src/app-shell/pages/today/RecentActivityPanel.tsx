/**
 * Zone C - "Why?"  Drill-down table of the most recent roles in play.
 *
 * Progressive disclosure: a compact summary (the latest handful) with a link to
 * the full workspace. Numbers are right-aligned and tabular; the header is
 * sticky; status is shown as icon + label + hue (never colour alone).
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCivilDay } from '@/lib/applicationDates';
import { companyOf, titleOf } from '@/components/tracker/trackerUtils';
import { statusKeyOf } from '@/components/tracker/trackerConfig';
import type { DatedApplication } from './applicationActivity';
import { PanelCard, PanelEmpty, PanelError, ZoneHeading, StatusPill, Stat } from './primitives';

/** Full pipeline lives in Applications; job search in Discover. */
const APPLICATIONS_HREF = '/app/apply/tracker';
const MAX_ROWS = 8;

export function RecentActivityPanel({
  state,
  applications,
  onRetry,
}: {
  state: 'loading' | 'error' | 'ready';
  applications: DatedApplication[] | null;
  onRetry: () => void;
}) {
  const rows = (applications ?? []).slice(0, MAX_ROWS);

  return (
    <PanelCard>
      <ZoneHeading
        title="Recent applications"
        hint="Latest recorded application dates, across all tracker stages."
        action={
          state === 'ready' && rows.length > 0 ? (
            <Link
              to={APPLICATIONS_HREF}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-caption font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />

      {state === 'loading' ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : state === 'error' ? (
        <PanelError onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <PanelEmpty
          icon={Search}
          title="No dated applications yet"
          body="Your saved roles and drafts stay in the tracker. Record an application date to include a role here."
          action={
            <Link
              to={APPLICATIONS_HREF}
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-caption font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open tracker <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <div className="max-h-[26rem] overflow-auto rounded-control border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-caption">Role</TableHead>
                <TableHead className="text-caption">Status</TableHead>
                <TableHead className="text-right text-caption">Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ record, day }) => {
                return (
                  <TableRow key={record.record_id}>
                    <TableCell className="max-w-[16rem] py-3">
                      <span className="block truncate text-body font-medium text-foreground">
                        {titleOf(record)}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {companyOf(record) || 'Unknown company'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusPill status={statusKeyOf(record.application?.status)} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Stat className="text-caption text-muted-foreground">
                        {formatCivilDay(day)}
                      </Stat>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PanelCard>
  );
}
