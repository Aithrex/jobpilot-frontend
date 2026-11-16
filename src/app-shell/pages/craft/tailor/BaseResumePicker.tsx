/**
 * BaseResumePicker - which uploaded file Tailor should start from.
 *
 * One parsed resume: a quiet "Using {filename}" line (today's flow).
 * Two or more: default "Best match for this job", with an option to pin
 * a specific file. Does not change the global active resume.
 *
 * Styled as one row of the start form, matching the Format row under it.
 */
import { FileText } from 'lucide-react';
import type { ResumeAssetRow } from '@/types/resume';
import { cn } from '@/lib/utils';

export const AUTO_BASE = 'auto';

export function BaseResumePicker({
  resumes,
  value,
  onChange,
  disabled,
}: {
  resumes: ResumeAssetRow[];
  /** `auto` or a resume_id. */
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const parsed = resumes.filter((r) => r.parse_status === 'parsed');
  if (parsed.length === 0) return null;

  if (parsed.length === 1) {
    const only = parsed[0];
    return (
      <p className="flex min-h-11 items-center gap-2.5 rounded-container border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          Using <span className="font-medium text-foreground">{only.filename || 'Untitled resume'}</span>
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-container border border-border bg-muted/30 px-4 py-3">
      <label htmlFor="base-resume-pick" className="block">
        <span className="text-sm font-medium text-foreground">Resume to start from</span>
        <select
          id="base-resume-pick"
          aria-label="Base resume for this job"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'mt-1.5 w-full min-h-11 rounded-control border border-border bg-background px-3 text-sm text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            disabled && 'opacity-60',
          )}
        >
          <option value={AUTO_BASE}>Best match for this job (recommended)</option>
          {parsed.map((r) => (
            <option key={r.resume_id} value={r.resume_id}>
              {r.filename || 'Untitled resume'}
              {r.is_active ? ' (used for job matching)' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1.5 text-caption-sm leading-relaxed text-muted-foreground">
        We pick the resume that fits this job best. The one used for job
        matching stays the same unless you choose a file here.
      </p>
    </div>
  );
}
