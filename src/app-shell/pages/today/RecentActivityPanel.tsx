/**
 * Zone C — "Why?"  Drill-down table of the most recent roles in play.
 *
 * Progressive disclosure: a compact summary (the latest handful) with a link to
 * the full workspace. Numbers are right-aligned and tabular; the header is
 * sticky; status is shown as icon + label + hue (never colour alone).
 */
import { ArrowUpRight, Search } from 'lucide-react';
import type { SavedJob } from '@/types/jobs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard, PanelEmpty, PanelError, ZoneHeading, StatusPill, Stat } from './primitives';

const WORKSPACE_HREF = '/app';
const MAX_ROWS = 8;

function shortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function matchPct(job: SavedJob): number | null {
  const m = job.job_data?.match_score;
  if (typeof m !== 'number' || m <= 0) return null;
  return m <= 1 ? Math.round(m * 100) : Math.round(m);
}

export function RecentActivityPanel({
  state,
  jobs,
  onRetry,
}: {
  state: 'loading' | 'error' | 'ready';
  jobs: SavedJob[] | null;
  onRetry: () => void;
}) {
  const rows = (jobs ?? [])
    .slice()
    .sort((a, b) => (b.saved_at || '').localeCompare(a.saved_at || ''))
    .slice(0, MAX_ROWS);

  return (
    <PanelCard>
      <ZoneHeading
        overline="Why"
        title="Recent roles"
        hint="The latest roles you've saved or applied to — open the workspace for the full history."
        action={
          state === 'ready' && rows.length > 0 ? (
            <a
              href={WORKSPACE_HREF}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-caption font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : undefined
        }
      />

      {state === 'loading' ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : state === 'error' ? (
        <PanelError onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <PanelEmpty
          icon={Search}
          title="No roles saved yet"
          body="Save roles from job search and they'll collect here so you can act on them fast."
          action={
            <a
              href={WORKSPACE_HREF}
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-caption font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Find roles <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          }
        />
      ) : (
        <div className="max-h-[26rem] overflow-auto rounded-control border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-caption">Role</TableHead>
                <TableHead className="text-caption">Status</TableHead>
                <TableHead className="text-right text-caption">Match</TableHead>
                <TableHead className="text-right text-caption">Saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((job) => {
                const m = matchPct(job);
                return (
                  <TableRow key={job._id || job.job_id}>
                    <TableCell className="max-w-[16rem] py-3">
                      <span className="block truncate text-body font-medium text-foreground">
                        {job.job_data?.title || 'Untitled role'}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {job.job_data?.company || 'Unknown company'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusPill status={job.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {m === null ? (
                        <span className="text-caption text-muted-foreground">—</span>
                      ) : (
                        <Stat className="text-body font-medium text-foreground">{m}%</Stat>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Stat className="text-caption text-muted-foreground">
                        {shortDate(job.saved_at)}
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
