/**
 * Six stages side by side, one of them open.
 *
 * A six-column kanban gives every stage a fifth of the width and none of them
 * enough, so the whole thing reads as cramped no matter how it is styled. The
 * rail keeps the shape of the pipeline — you can still see the counts marching
 * left to right — and spends the width on the one stage you are actually
 * working in. Collapsed spines are still drop targets, so moving a card
 * onwards is the same gesture it was on the board.
 */
import { useMemo, useState } from 'react';

import type { TailoringRecord } from '@/types/resume';
import { cn } from '@/lib/utils';

import StageColumn from './StageColumn';
import { STAGE_SECTIONS, statusForSection, statusKeyOf } from './trackerConfig';
import { useMediaQuery } from './useMediaQuery';
import type { ApplicationPatch } from './useTrackerData';

interface StageRailProps {
  records: TailoringRecord[];
  selectedId: string | null;
  savingId: string | null;
  canDrag: boolean;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
  onMove: (recordId: string, status: ReturnType<typeof statusForSection>) => void;
}

export default function StageRail({
  records,
  selectedId,
  savingId,
  canDrag,
  onSelect,
  onPatch,
  onMove,
}: StageRailProps) {
  const byStage = useMemo(() => {
    const map = new Map<string, TailoringRecord[]>();
    for (const section of STAGE_SECTIONS) map.set(section.id, []);
    for (const record of records) {
      const status = statusKeyOf(record.application?.status);
      const section = STAGE_SECTIONS.find((s) => s.statuses.includes(status));
      if (section) map.get(section.id)!.push(record);
    }
    return map;
  }, [records]);

  /**
   * Open the busiest live stage rather than the first one. Someone with four
   * hundred applied and two saved is not here to look at the two saved.
   */
  const busiest = useMemo(() => {
    let best: string | null = null;
    let bestCount = 0;
    for (const section of STAGE_SECTIONS) {
      if (section.id === 'closed') continue;
      const count = byStage.get(section.id)?.length ?? 0;
      if (count > bestCount) {
        best = section.id;
        bestCount = count;
      }
    }
    if (best) return best;
    // Nothing live at all: open Closed rather than an empty Saved column.
    return (byStage.get('closed')?.length ?? 0) > 0 ? 'closed' : 'applied';
  }, [byStage]);

  const [openedId, setOpenedId] = useState<string | null>(null);
  const expandedId = openedId ?? busiest;

  // Five spines plus gaps eat 280px, which on a phone leaves the open stage
  // about a hundred. Below this the spines become a scrollable row of chips
  // above a full-width column instead.
  const roomForSpines = useMediaQuery('(min-width: 768px)');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dropHandlers = (sectionId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!canDrag || !draggingId) return;
      e.preventDefault();
      setDragOverId(sectionId);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget !== e.target) return;
      setDragOverId((current) => (current === sectionId ? null : current));
    },
    onDrop: (e: React.DragEvent) => {
      if (!canDrag) return;
      e.preventDefault();
      setDragOverId(null);
      const id = draggingId;
      setDraggingId(null);
      if (id) onMove(id, statusForSection(sectionId));
    },
  });

  const expandedSection =
    STAGE_SECTIONS.find((s) => s.id === expandedId) || STAGE_SECTIONS[0];

  const column = (
    <StageColumn
      section={expandedSection}
      records={byStage.get(expandedSection.id) || []}
      selectedId={selectedId}
      savingId={savingId}
      canDrag={canDrag}
      onSelect={onSelect}
      onPatch={onPatch}
      onDragStart={setDraggingId}
      onDragEnd={() => {
        setDraggingId(null);
        setDragOverId(null);
      }}
    />
  );

  if (!roomForSpines) {
    return (
      <div className="space-y-2">
        <div
          role="radiogroup"
          aria-label="Stage"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {STAGE_SECTIONS.map((section) => {
            const count = (byStage.get(section.id) || []).length;
            const on = section.id === expandedSection.id;
            return (
              <button
                key={section.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setOpenedId(section.id)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-label font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  on
                    ? 'border-primary/40 bg-card text-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', section.dot)} />
                {section.label}
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">{column}</div>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2">
      {STAGE_SECTIONS.map((section) => {
        const stageRecords = byStage.get(section.id) || [];
        const expanded = section.id === expandedId;
        const isDropTarget = dragOverId === section.id;

        if (!expanded) {
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setOpenedId(section.id)}
              aria-expanded={false}
              aria-label={`${section.label}, ${stageRecords.length} applications`}
              {...dropHandlers(section.id)}
              className={cn(
                'group flex w-12 shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-card py-3 transition-colors',
                'hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isDropTarget && 'border-primary/50 bg-primary/5 ring-1 ring-inset ring-primary/30',
              )}
            >
              <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', section.dot)} />
              <span
                aria-hidden
                className="text-label font-semibold tabular-nums text-foreground"
              >
                {stageRecords.length}
              </span>
              <span
                aria-hidden
                className="overline whitespace-nowrap [writing-mode:vertical-rl]"
              >
                {section.label}
              </span>
            </button>
          );
        }

        return (
          <section
            key={section.id}
            {...dropHandlers(section.id)}
            className={cn(
              'min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card',
              isDropTarget && 'border-primary/50 ring-1 ring-inset ring-primary/30',
            )}
          >
            <h3 className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', section.dot)} />
              <span className="overline truncate">{section.label}</span>
              <span className="text-label tabular-nums text-muted-foreground">
                {stageRecords.length}
              </span>
            </h3>

            {column}
          </section>
        );
      })}
    </div>
  );
}
