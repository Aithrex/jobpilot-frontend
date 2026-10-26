import type { TailoringRecord } from '@/types/resume';
import { appliedDayOf, localDayISO } from '@/lib/applicationDates';
import { statusKeyOf } from '@/components/tracker/trackerConfig';

export interface DatedApplication {
  record: TailoringRecord;
  day: string;
}

/** Creation and update timestamps are not evidence of an application. */
export function summarizeApplicationActivity(records: TailoringRecord[], now = new Date()) {
  const counts = new Map<string, number>();
  const datedRecords: DatedApplication[] = [];
  let undatedCount = 0;
  for (const record of records) {
    const day = appliedDayOf(record.application);
    const date = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00Z`) : null;
    const validDay = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
    if (day && validDay) {
      // A later rejection or return to Saved does not erase a submission.
      counts.set(day, (counts.get(day) ?? 0) + 1);
      datedRecords.push({ record, day });
    } else {
      const status = statusKeyOf(record.application?.status);
      if (status !== 'saved' && status !== 'draft') undatedCount++;
    }
  }
  datedRecords.sort((a, b) => b.day.localeCompare(a.day));
  return {
    heatmap: [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    datedRecords,
    todayCount: counts.get(localDayISO(0, now)) ?? 0,
    undatedCount,
  };
}
