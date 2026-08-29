/**
 * The pipeline as one column of grouped rows.
 *
 * The whole list is a single surface with hairline dividers, not forty
 * bordered cards. Grouping by stage turns each section into a drop target;
 * grouping by date or company disables dragging, because there is nothing
 * meaningful for a drop to write.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { TailoringRecord } from '@/types/resume';
import { appliedDayOf, formatCivilDay } from '@/lib/applicationDates';
import { cn } from '@/lib/utils';

import ApplicationRow from './ApplicationRow';
import {
  MERGED_SECTION_IDS,
  STAGE_SECTIONS,
  type GroupBy,
  statusKeyOf,
} from './trackerConfig';
import type { ApplicationPatch } from './useTrackerData';
import { companyOf } from './trackerUtils';

interface Group {
  id: string;
  label: string;
  dot: string | null;
  records: TailoringRecord[];
  defaultOpen: boolean;
  /** Stage sections accept drops; date and company groups do not. */
  droppable: boolean;
  /** True where one section holds several statuses, so rows must self-label. */
  merged: boolean;
}

/** Soonest next action first, then most recently created. */
function byUrgencyThenRecency(a: TailoringRecord, b: TailoringRecord) {
  const aDue = a.application?.next_action_date
    ? new Date(a.application.next_action_date).getTime()
    : Infinity;
  const bDue = b.application?.next_action_date
    ? new Date(b.application.next_action_date).getTime()
    : Infinity;
  if (aDue !== bDue) return aDue - bDue;
  const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bCreated - aCreated;
}

function buildGroups(records: TailoringRecord[], groupBy: GroupBy): Group[] {
  if (groupBy === 'stage') {
    // Empty sections are kept so they remain drop targets.
    return STAGE_SECTIONS.map((section) => ({
      id: section.id,
      label: section.label,
      dot: section.dot,
      defaultOpen: section.defaultOpen,
      droppable: true,
      merged: MERGED_SECTION_IDS.has(section.id),
      records: records
        .filter((r) => section.statuses.includes(statusKeyOf(r.application?.status)))
        .sort(byUrgencyThenRecency),
    }));
  }

  const buckets = new Map<string, TailoringRecord[]>();
  for (const r of records) {
    const key =
      groupBy === 'applied'
        ? appliedDayOf(r.application) || ''
        : companyOf(r) || '';
    const list = buckets.get(key);
    if (list) list.push(r);
    else buckets.set(key, [r]);
  }

  const keys = [...buckets.keys()];
  if (groupBy === 'applied') {
    // Most recent day first; everything never applied to sinks to the bottom.
    keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)));
  } else {
    keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  }

  return keys.map((key) => ({
    id: key || '__none__',
    label:
      key === ''
        ? groupBy === 'applied'
          ? 'Not applied'
          : 'Company not specified'
        : groupBy === 'applied'
          ? formatCivilDay(key, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : key,
    dot: null,
    defaultOpen: true,
    droppable: false,
    merged: true,
    records: (buckets.get(key) || []).sort(byUrgencyThenRecency),
  }));
}

interface TrackerListProps {
  records: TailoringRecord[];
  groupBy: GroupBy;
  selectedId: string | null;
  savingId: string | null;
  canDrag: boolean;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
  onDropOnSection: (sectionId: string, recordId: string) => void;
}

export default function TrackerList({
  records,
  groupBy,
  selectedId,
  savingId,
  canDrag,
  onSelect,
  onPatch,
  onDropOnSection,
}: TrackerListProps) {
  const groups = useMemo(() => buildGroups(records, groupBy), [records, groupBy]);

  // Explicit user toggles, layered over each group's default. Cleared when the
  // grouping changes, since the ids mean something different afterwards.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  useEffect(() => setOverrides({}), [groupBy]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragging = canDrag && groupBy === 'stage';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {groups.map((group, index) => {
        const open = overrides[group.id] ?? group.defaultOpen;
        const isDragOver = dragging && group.droppable && dragOver === group.id;

        return (
          <section
            key={group.id}
            onDragOver={(e) => {
              if (!dragging || !group.droppable) return;
              e.preventDefault();
              setDragOver(group.id);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget !== e.target) return;
              setDragOver((c) => (c === group.id ? null : c));
            }}
            onDrop={(e) => {
              if (!dragging || !group.droppable) return;
              e.preventDefault();
              setDragOver(null);
              const id = draggingId;
              setDraggingId(null);
              if (id) onDropOnSection(group.id, id);
            }}
            className={cn(
              index > 0 && 'border-t border-border',
              isDragOver && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
            )}
          >
            <h3>
              <button
                type="button"
                onClick={() => setOverrides((p) => ({ ...p, [group.id]: !open }))}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-expo',
                    open && 'rotate-90',
                  )}
                />
                {group.dot && (
                  <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', group.dot)} />
                )}
                <span className="overline truncate">{group.label}</span>
                <span className="text-label tabular-nums text-muted-foreground">
                  {group.records.length}
                </span>
              </button>
            </h3>

            {open && (
              <>
                {group.records.length > 0 ? (
                  <ul>
                    {group.records.map((record) => (
                      <ApplicationRow
                        key={record.record_id}
                        record={record}
                        selected={selectedId === record.record_id}
                        saving={savingId === record.record_id}
                        showStatusLabel={group.merged && groupBy === 'stage'}
                        draggable={dragging}
                        onSelect={() => onSelect(record.record_id)}
                        onDragStart={() => setDraggingId(record.record_id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOver(null);
                        }}
                        onPatch={(patch, opts) => onPatch(record.record_id, patch, opts)}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 pb-3 pl-8 text-label text-muted-foreground/70">
                    {isDragOver ? 'Drop to move here' : 'Nothing here yet'}
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
