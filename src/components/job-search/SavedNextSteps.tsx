import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JOB_FEED_GRID_CLASS } from '@/components/job-search/JobCard';
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

/** The one line above a card that says where it stands. */
function contextLine(row: SavedJob, mode: 'saved' | 'applied'): string {
  const ns = row.next_step;
  if (mode === 'applied') {
    const applied = ago(daysSince(ns?.applied_at), 'Applied');
    return applied || 'Applied (date not recorded)';
  }
  return [
    ago(daysSince(row.saved_at), 'Saved'),
    ns?.tailored ? 'resume tailored' : '',
    ns?.posting_state === 'closed' ? 'posting closed' : '',
  ].filter(Boolean).join(', ');
}

interface Props {
  mode: 'saved' | 'applied';
  rows: SavedJob[];
  renderCard: (row: SavedJob) => React.ReactNode;
  updateJobStatus?: (jobId: string, status: string) => Promise<unknown> | void;
}

/**
 * Saved and Applied, grouped by what to do next. Each group says what it
 * holds and why; the groups that need nothing from the user (closed postings,
 * finished applications) start folded so the page opens on the work.
 */
export function SavedNextSteps({ mode, rows, renderCard, updateJobStatus }: Props) {
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
              className="press group mb-3 flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{group.label}</span>
              <span className="rounded-full bg-secondary px-2 py-px text-[11px] font-semibold tabular-nums text-secondary-foreground">
                {items.length}
              </span>
              <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">{group.hint}</span>
              <ChevronDown
                className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
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
                  className={JOB_FEED_GRID_CLASS}
                >
                  {items.map((row) => (
                    <div key={row.job_id} className="flex h-full flex-col gap-1.5">
                      <div className="flex min-h-5 items-center justify-between gap-2 px-0.5">
                        <p className="truncate text-[11px] font-medium text-muted-foreground">{contextLine(row, mode)}</p>
                        {mode === 'applied' && updateJobStatus && group.key !== 'closed' && (
                          <div className="flex shrink-0 items-center gap-1">
                            {group.key !== 'interviewing' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                                onClick={() => void updateJobStatus(row.job_id, 'interview')}
                              >
                                Got an interview
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:bg-muted"
                              onClick={() => void updateJobStatus(row.job_id, 'rejected')}
                            >
                              Rejected
                            </Button>
                          </div>
                        )}
                      </div>
                      {renderCard(row)}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
