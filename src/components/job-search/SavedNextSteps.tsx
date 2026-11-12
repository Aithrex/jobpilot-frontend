import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { JOB_FEED_GRID_CLASS } from '@/components/job-search/JobCard';
import { ApplicationList } from '@/components/job-search/ApplicationList';
import {
  APPLIED_GROUPS,
  SAVED_GROUPS,
  appliedGroupOf,
  daysSince,
  groupRows,
  savedGroupOf,
} from '@/lib/savedNextStep';
import { cn } from '@/lib/utils';
import type { SavedJob } from '@/types/jobs';

function ago(days: number | null, verb: string): string {
  if (days == null) return '';
  if (days === 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  return `${verb} ${days} days ago`;
}

/** Where a saved role stands, shown inside its card. */
export function savedNote(row: SavedJob): string {
  const ns = row.next_step;
  return [
    ago(daysSince(row.saved_at), 'Saved'),
    ns?.tailored ? 'resume tailored' : '',
    ns?.posting_state === 'closed' ? 'posting closed' : '',
  ].filter(Boolean).join(', ');
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The sentence above the groups: how many, and how many need the user. Counts
 * are the same groups shown below, so the sentence and the page always agree.
 */
function Summary({ mode, grouped, total }: {
  mode: 'saved' | 'applied';
  grouped: Map<string, SavedJob[]>;
  total: number;
}) {
  const n = (key: string) => grouped.get(key)?.length ?? 0;
  const parts =
    mode === 'saved'
      ? [
          n('ready') ? `${n('ready')} ready to apply` : '',
          n('tailor') ? `${plural(n('tailor'), 'needs', 'need')} a tailored resume` : '',
          n('old') ? `${n('old')} getting old` : '',
        ]
      : [
          n('follow_up') ? `${plural(n('follow_up'), 'needs', 'need')} a follow-up` : '',
          n('interviewing') ? `${n('interviewing')} in interviews` : '',
          n('waiting') ? `${n('waiting')} waiting to hear back` : '',
        ];
  const detail = parts.filter(Boolean);
  return (
    <p className="text-sm text-muted-foreground" data-testid={`${mode}-summary`}>
      <span className="font-semibold text-foreground">
        {mode === 'saved' ? plural(total, 'saved role', 'saved roles') : plural(total, 'application', 'applications')}
      </span>
      {detail.length > 0 && <>: {detail.join(', ')}.</>}
    </p>
  );
}

interface Props {
  mode: 'saved' | 'applied';
  rows: SavedJob[];
  /** Saved: the job card for a row. Applied rows render as a list instead. */
  renderCard: (row: SavedJob) => React.ReactNode;
  updateJobStatus?: (jobId: string, status: string) => Promise<unknown> | void;
  /** A link shown at the end of the summary line (Applied: Tracker). */
  aside?: React.ReactNode;
}

/**
 * Saved and Applied, grouped by what to do next. Each group says what it
 * holds and why; the groups that need nothing from the user (closed postings,
 * finished applications) start folded so the page opens on the work.
 */
export function SavedNextSteps({ mode, rows, renderCard, updateJobStatus, aside }: Props) {
  const reduce = useReducedMotion();
  const groups = mode === 'saved' ? SAVED_GROUPS : APPLIED_GROUPS;
  const grouped = useMemo(
    () => (mode === 'saved'
      ? groupRows(rows, (r) => savedGroupOf(r), SAVED_GROUPS)
      : groupRows(rows, (r) => appliedGroupOf(r), APPLIED_GROUPS)),
    [mode, rows],
  ) as Map<string, SavedJob[]>;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, !g.collapsed])));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Summary mode={mode} grouped={grouped} total={rows.length} />
        {aside}
      </div>
      {groups.map((group) => {
        const items = grouped.get(group.key) ?? [];
        if (!items.length) return null;
        const isOpen = open[group.key] ?? true;
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`} data-testid={`next-step-${group.key}`}>
            <button
              type="button"
              id={`group-${group.key}`}
              onClick={() => setOpen((prev) => ({ ...prev, [group.key]: !isOpen }))}
              aria-expanded={isOpen}
              className="press group mb-3 flex w-full items-start gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-title-sm tracking-tight text-foreground">{group.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-px text-caption-sm font-semibold tabular-nums text-secondary-foreground">
                    {items.length}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{group.hint}</span>
              </span>
              <ChevronDown
                className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base ease-standard motion-reduce:transition-none', isOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className={mode === 'saved' ? JOB_FEED_GRID_CLASS : undefined}
                >
                  {mode === 'applied' && updateJobStatus ? (
                    <ApplicationList rows={items} updateJobStatus={updateJobStatus} />
                  ) : (
                    items.map((row) => (
                      <div key={row.job_id} className="flex h-full flex-col">
                        {renderCard(row)}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
