/** Record-derived helpers shared by the tracker's row, detail pane and insights. */
import type { TailoringRecord } from '@/types/resume';

/** Whole days from now until an ISO instant. Negative means overdue. */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

export function relDate(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d <= 7) return `In ${d}d`;
  if (d <= 30) return `In ~${Math.round(d / 7)}w`;
  return `In ${Math.round(d / 30)}mo`;
}

export function initials(name?: string | null): string {
  if (!name || name === 'Not specified') return '·';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** The company, or null when the backend could not name one. */
export function companyOf(record: TailoringRecord): string | null {
  const c = record.jd_analysis?.company;
  return c && c !== 'Not specified' ? c : null;
}

export function titleOf(record: TailoringRecord): string {
  return record.jd_analysis?.job_title || 'Untitled role';
}

/**
 * Reads the canonical flag or its legacy batch-only name. BatchTailor still
 * writes only `batch_confirmation_pending`, so dropping the fallback would
 * silently swallow every batch-tailored prompt.
 */
export function isConfirmationPending(app: TailoringRecord['application']): boolean {
  const a = (app || {}) as Record<string, unknown>;
  return Boolean(a.confirmation_pending ?? a.batch_confirmation_pending);
}

/** A tracker stub that never got a tailored resume attached. */
export function isUntailoredStub(record: TailoringRecord): boolean {
  if (record.source === 'pipeline_stub') return true;
  if (record.application?.resume_used !== 'base') return false;
  // The tracker's `view=list` rows never read `versions` or `tailored_resume`,
  // so prefer what the server counted and fall back to the full shape for
  // callers that fetched it.
  const versionCount = record.version_count ?? record.versions?.length ?? 0;
  const hasTailored = record.has_tailored_resume ?? Boolean(record.tailored_resume);
  return versionCount === 0 && !hasTailored;
}

export function atsTone(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}
