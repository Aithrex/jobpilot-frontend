import { describe, expect, test } from 'vitest';
import { summarizeApplicationActivity } from '../applicationActivity';
import { localDayISO } from '@/lib/applicationDates';
import type { TailoringRecord } from '@/types/resume';

function record(record_id: string, application: TailoringRecord['application']): TailoringRecord {
  return { record_id, user_email: 'test@example.com', created_at: '2026-01-01T12:00:00Z', application };
}

describe('application activity dates', () => {
  test('preserves the stored civil day over the instant, including applications now saved or closed', () => {
    const result = summarizeApplicationActivity([
      record('reopened', { status: 'saved', applied_date: '2026-10-22', applied_at: '2026-10-23T06:30:00Z' }),
      record('closed', { status: 'rejected', applied_date: '2026-10-22' }),
      record('draft', { status: 'draft' }),
    ], new Date('2026-10-22T12:00:00'));
    expect(result.heatmap).toEqual([{ date: '2026-10-22', count: 2 }]);
    expect(result.todayCount).toBe(2);
    expect(result.undatedCount).toBe(0);
  });

  test('handles legacy UTC instants and never substitutes creation or update dates', () => {
    const result = summarizeApplicationActivity([
      record('legacy', { status: 'offer', applied_at: '2026-10-22T00:30:00' }),
      record('undated', { status: 'applied', updated_at: '2026-10-25T12:00:00Z' }),
    ]);
    expect(result.heatmap).toEqual([{ date: localDayISO(0, new Date('2026-10-22T00:30:00Z')), count: 1 }]);
    expect(result.undatedCount).toBe(1);
    expect(result.datedRecords.map(({ record: row }) => row.record_id)).toEqual(['legacy']);
  });
});
