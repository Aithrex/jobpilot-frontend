/**
 * One application, one line.
 *
 * The row deliberately carries four things — avatar, role, company, applied
 * date — plus at most one urgency marker. Everything else lives in the detail
 * pane. It also carries no status colour: the section header above it already
 * says the stage. Only rows inside a merged section label themselves.
 *
 * The main body is a real `<button>` so the row is reachable by keyboard, and
 * the apply prompt sits as a sibling beneath it rather than nested inside,
 * which would be invalid and unreachable.
 */
import { AlertTriangle } from 'lucide-react';

import type { TailoringRecord } from '@/types/resume';
import { appliedDayOf, formatCivilDay } from '@/lib/applicationDates';
import { cn } from '@/lib/utils';

import { APPLY_PROMPT, statusMeta } from './trackerConfig';
import type { ApplicationPatch } from './useTrackerData';
import {
  companyOf,
  daysUntil,
  initials,
  isConfirmationPending,
  relDate,
  titleOf,
} from './trackerUtils';

interface ApplicationRowProps {
  record: TailoringRecord;
  selected: boolean;
  saving: boolean;
  /** True inside a merged section, where the stage is ambiguous. */
  showStatusLabel: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onPatch: (patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
}

export default function ApplicationRow({
  record,
  selected,
  saving,
  showStatusLabel,
  draggable,
  onSelect,
  onDragStart,
  onDragEnd,
  onPatch,
}: ApplicationRowProps) {
  const app = record.application || {};
  const title = titleOf(record);
  const company = companyOf(record);
  const meta = statusMeta(app.status);

  const appliedDay = appliedDayOf(app);
  const due = daysUntil(app.next_action_date);
  const overdue = due !== null && due < 0;
  const urgent = due !== null && due >= 0 && due <= 2;
  const pending = isConfirmationPending(app);

  return (
    <li
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        onDragStart();
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', record.record_id);
        } catch {
          /* Safari refuses setData outside a user gesture; the drag still works. */
        }
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'border-b border-border/60 last:border-b-0 transition-colors duration-150',
        selected ? 'bg-[hsl(var(--nav-active))]' : 'hover:bg-muted/40',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-label font-semibold text-primary"
        >
          {initials(company || title)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-foreground">{title}</span>
          <span className="block truncate text-label text-muted-foreground">
            {company || 'Company not specified'}
            {showStatusLabel && (
              <>
                {' · '}
                <span className={meta.tone}>{meta.label}</span>
              </>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {appliedDay ? (
            <span className="block text-label tabular-nums text-muted-foreground">
              {formatCivilDay(appliedDay)}
            </span>
          ) : (
            <span className="block text-label text-muted-foreground/60">Not applied</span>
          )}
          {due !== null && (overdue || urgent) && (
            <span
              className={cn(
                'mt-0.5 flex items-center justify-end gap-1 text-label font-medium',
                overdue ? 'text-destructive' : 'text-warning',
              )}
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {relDate(app.next_action_date)}
            </span>
          )}
        </span>
      </button>

      {/* The unanswered question stays on the row. It is one tap, and moving it
          into the pane would mean it is only ever seen by someone who already
          went looking. */}
      {pending && (
        <div
          role="group"
          aria-label={`${APPLY_PROMPT.question} ${title}`}
          className="flex flex-wrap items-center gap-2 px-3 pb-2.5 pl-14"
        >
          <span className="text-label font-medium text-foreground">{APPLY_PROMPT.question}</span>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onPatch(
                {
                  status: 'applied',
                  applied_at: new Date().toISOString(),
                  confirmation_pending: false,
                },
                { quiet: true },
              )
            }
            className="rounded-md bg-primary px-2.5 py-1 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {APPLY_PROMPT.confirm}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onPatch({ status: 'saved', confirmation_pending: false }, { quiet: true })}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-label font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {APPLY_PROMPT.save}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onPatch({ confirmation_pending: false }, { quiet: true })}
            className="rounded-md px-2 py-1 text-label text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {APPLY_PROMPT.dismiss}
          </button>
        </div>
      )}
    </li>
  );
}
