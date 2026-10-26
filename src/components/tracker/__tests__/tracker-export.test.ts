import { describe, expect, test } from 'vitest';
import type { TailoringRecord } from '@/types/resume';
import { applicationsCsv } from '../trackerExport';

describe('application CSV export', () => {
  test('exports only supplied rows, escapes fields and blocks spreadsheet formulas', () => {
    const csv = applicationsCsv([
      {
        record_id: 'one',
        jd_analysis: { job_title: '=HYPERLINK("https://bad.test")', company: 'A, B' },
        application: {
          status: 'rejected',
          notes: 'First line\n"Quoted"',
          applied_date: '2026-10-25',
        },
      } as TailoringRecord,
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.test"")"');
    expect(csv).toContain('"A, B"');
    expect(csv).toContain('"First line\n""Quoted"""');
    expect(csv).toContain('"rejected","2026-10-25"');
    expect(csv).not.toContain('undefined');
  });
});
