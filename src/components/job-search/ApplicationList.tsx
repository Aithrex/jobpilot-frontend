import { ExternalLink, MoreHorizontal, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompanyLogo } from '@/components/CompanyLogo';
import { daysSince } from '@/lib/savedNextStep';
import { toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SavedJob } from '@/types/jobs';

/**
 * Applied, as a list of applications rather than a grid of job ads.
 *
 * Once a role is applied to, the fit dial, skill chips and Tailor button have
 * done their job. What the user needs is where each application stands, how
 * long it has been, and the one thing to record next. Each row shows exactly
 * that; the job-ad card is not rendered here.
 */

type Stage = 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';

const STEPS: Array<{ key: Stage; label: string }> = [
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
];

const STATUS_WORD: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function stageOf(row: SavedJob): Stage {
  const own = (row.status || '').toLowerCase();
  const tracker = (row.next_step?.tracker_status || '').toLowerCase();
  for (const s of [own, tracker]) {
    if (s === 'rejected' || s === 'withdrawn') return s;
  }
  for (const s of [own, tracker]) {
    if (s === 'offer') return 'offer';
  }
  for (const s of [own, tracker]) {
    if (s === 'interview') return 'interview';
  }
  return 'applied';
}

function appliedAgo(row: SavedJob): string {
  const days = daysSince(row.next_step?.applied_at);
  if (days == null) return 'Applied, date not recorded';
  if (days === 0) return 'Applied today';
  if (days === 1) return 'Applied yesterday';
  return `Applied ${days} days ago`;
}

/** Applied -> Interview -> Offer, with the reached steps filled. */
function StageTrack({ stage }: { stage: Stage }) {
  const closed = stage === 'rejected' || stage === 'withdrawn';
  const reached = closed ? 0 : STEPS.findIndex((s) => s.key === stage);
  return (
    <ol
      className="flex items-center gap-1.5"
      aria-label={`Stage: ${STATUS_WORD[stage]}`}
    >
      {STEPS.map((step, i) => {
        const done = !closed && i <= reached;
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden
                className={cn('h-px w-4 sm:w-6', done ? 'bg-primary' : 'bg-border')}
              />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium',
                done ? 'text-foreground' : 'text-muted-foreground/70',
                closed && 'line-through decoration-muted-foreground/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'h-2 w-2 rounded-full border',
                  done ? 'border-primary bg-primary' : 'border-border bg-transparent',
                )}
              />
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface RowProps {
  row: SavedJob;
  updateJobStatus: (jobId: string, status: string) => Promise<unknown> | void;
}

function ApplicationRow({ row, updateJobStatus }: RowProps) {
  const job = row.job_data;
  const stage = stageOf(row);
  const closed = stage === 'rejected' || stage === 'withdrawn';
  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);
  const location = toTitleCase(job.location);

  const move = (next: Stage, done: string) => {
    const previous = (row.status || 'applied').toLowerCase();
    void Promise.resolve(updateJobStatus(row.job_id, next)).then(() => {
      toast(done, {
        description: title,
        action: { label: 'Undo', onClick: () => void updateJobStatus(row.job_id, previous) },
      });
    });
  };

  // The one thing to record next, by stage. Closed rows offer only Undo.
  const primary =
    stage === 'applied'
      ? { label: 'Got an interview', run: () => move('interview', 'Moved to Interviewing') }
      : stage === 'interview'
        ? { label: 'Got an offer', run: () => move('offer', 'Marked as an offer') }
        : null;

  return (
    <li
      className="grid gap-x-4 gap-y-2.5 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      data-testid={`application-${row.job_id}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo company={company || title} logoUrl={job.logo_url} size={36} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn('truncate text-sm font-semibold', closed ? 'text-muted-foreground' : 'text-foreground')} title={title}>
            {title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{company}</span>
            {location ? ` · ${location}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <StageTrack stage={stage} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {closed ? `${STATUS_WORD[stage]}. ${appliedAgo(row)}` : appliedAgo(row)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
        {primary && (
          <Button
            size="sm"
            variant="outline"
            onClick={primary.run}
            className="h-8 border-border bg-card text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            {primary.label}
          </Button>
        )}
        {!closed && stage !== 'offer' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => move('rejected', 'Marked as rejected')}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Rejected
          </Button>
        )}
        {closed && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => move('applied', 'Moved back to Applied')}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reopen
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`More for ${title}`}
              className="h-8 w-8 px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {job.apply_link && (
              <DropdownMenuItem asChild>
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> Open the posting
                </a>
              </DropdownMenuItem>
            )}
            {!closed && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => move('withdrawn', 'Marked as withdrawn')}>
                  {stage === 'offer' ? 'I declined the offer' : 'I withdrew my application'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

interface Props {
  rows: SavedJob[];
  updateJobStatus: RowProps['updateJobStatus'];
}

/** One bordered list per group; rows are divided, not boxed one by one. */
export function ApplicationList({ rows, updateJobStatus }: Props) {
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <ApplicationRow key={row.job_id} row={row} updateJobStatus={updateJobStatus} />
      ))}
    </ul>
  );
}
