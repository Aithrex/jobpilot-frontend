/**
 * The one open stage in the rail.
 *
 * Under ~25 rows this is a plain list. Over it, the column rolls up into a
 * header per day with only the most recent day open, because a column holding
 * two weeks of thirty-a-day applying is not a list anyone reads.
 */
import type { TailoringRecord } from '@/types/resume';
import { formatCivilDay } from '@/lib/applicationDates';

import ApplicationRow from './ApplicationRow';
import TrackerSection from './TrackerSection';
import { MERGED_SECTION_IDS, type StageSection } from './trackerConfig';
import { DAY_ROLLUP_THRESHOLD, buildDayBuckets, byUrgencyThenRecency } from './trackerGrouping';
import type { ApplicationPatch } from './useTrackerData';

interface StageColumnProps {
  section: StageSection;
  records: TailoringRecord[];
  selectedId: string | null;
  savingId: string | null;
  canDrag: boolean;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: ApplicationPatch, opts?: { quiet?: boolean }) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export default function StageColumn({
  section,
  records,
  selectedId,
  savingId,
  canDrag,
  onSelect,
  onPatch,
  onDragStart,
  onDragEnd,
}: StageColumnProps) {
  const merged = MERGED_SECTION_IDS.has(section.id);

  const renderRows = (rows: TailoringRecord[]) => (
    <ul>
      {rows.map((record) => (
        <ApplicationRow
          key={record.record_id}
          record={record}
          selected={selectedId === record.record_id}
          saving={savingId === record.record_id}
          showStatusLabel={merged}
          draggable={canDrag}
          onSelect={() => onSelect(record.record_id)}
          onDragStart={() => onDragStart(record.record_id)}
          onDragEnd={onDragEnd}
          onPatch={(patch, opts) => onPatch(record.record_id, patch, opts)}
        />
      ))}
    </ul>
  );

  if (records.length === 0) {
    return (
      <p className="px-3 py-10 text-center text-label text-muted-foreground/70">
        Nothing in {section.label.toLowerCase()} right now.
      </p>
    );
  }

  if (records.length <= DAY_ROLLUP_THRESHOLD) {
    return renderRows([...records].sort(byUrgencyThenRecency));
  }

  const buckets = buildDayBuckets(records);
  return (
    <div className="divide-y divide-border/60">
      {buckets.map((bucket, index) => (
        <TrackerSection
          key={bucket.day || '__undated__'}
          label={
            bucket.day
              ? formatCivilDay(bucket.day, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : 'No date'
          }
          count={bucket.records.length}
          defaultOpen={index === 0}
        >
          {renderRows(bucket.records)}
        </TrackerSection>
      ))}
    </div>
  );
}
