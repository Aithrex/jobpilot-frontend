/**
 * BaseResumePicker - which uploaded file Tailor should start from.
 *
 * One parsed resume: a quiet "Using {filename}" line (today's flow).
 * Two or more: default "Best match for this job", with an option to pin
 * a specific file. Does not change the global active resume.
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
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Using <span className="font-medium text-foreground">{only.filename || 'Untitled resume'}</span>
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-container border border-border bg-card px-4 py-3 shadow-soft">
      <label htmlFor="base-resume-pick" className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Base resume for this job
        </span>
        <select
          id="base-resume-pick"
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
              {r.is_active ? ' (active for job matching)' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
        We will pick the resume that fits this role best. Your active resume for
        job matching stays the same unless you pin a file here.
      </p>
    </div>
  );
}
