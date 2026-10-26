import type { TailoringRecord } from '@/types/resume';
import { appliedDayOf, localDayISO } from '@/lib/applicationDates';
import { statusKeyOf } from './trackerConfig';
import { companyOf, titleOf } from './trackerUtils';

function cell(value: string | undefined | null): string {
  const text = value || '';
  // Quoting alone does not stop Excel from interpreting a field as a formula.
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function applicationsCsv(records: TailoringRecord[]): string {
  const rows = [
    [
      'Role',
      'Company',
      'Status',
      'Applied date',
      'Next action date',
      'Next action',
      'Recruiter',
      'Recruiter email',
      'Job URL',
      'Notes',
    ],
    ...records.map((r) => [
      titleOf(r),
      companyOf(r),
      statusKeyOf(r.application?.status),
      appliedDayOf(r.application),
      r.application?.next_action_date,
      r.application?.next_action_note,
      r.application?.recruiter_name,
      r.application?.recruiter_email,
      r.application?.job_url,
      r.application?.notes,
    ]),
  ];
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function downloadApplicationsCsv(records: TailoringRecord[]): void {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF', applicationsCsv(records)], { type: 'text/csv;charset=utf-8;' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `aspirely-applications-${localDayISO()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
