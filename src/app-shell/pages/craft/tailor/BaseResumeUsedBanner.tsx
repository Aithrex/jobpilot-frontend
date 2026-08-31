/**
 * BaseResumeUsedBanner - after a tailor job, name the file that was used.
 *
 * The whole point of multi-resume auto-select: the user must never wonder
 * which of their uploads was the base.
 */
import { FileText } from 'lucide-react';
import type { BaseResumeSelection } from '@/types/resume';

export function displayResumeFilename(
  filename?: string | null,
  fallback = 'Untitled resume',
): string {
  const name = (filename || '').trim();
  return name || fallback;
}

export function BaseResumeUsedBanner({
  selection,
}: {
  selection: BaseResumeSelection;
}) {
  const name = displayResumeFilename(selection.filename);
  const score =
    typeof selection.match_score === 'number' ? selection.match_score : null;
  const auto = selection.mode === 'auto';

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-container border border-primary/25 bg-primary/5 px-4 py-3"
    >
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          Tailored from <span className="font-semibold">{name}</span>
          {auto && score !== null ? (
            <span className="text-muted-foreground">
              {' '}
              - best match for this role ({score}/100)
            </span>
          ) : null}
        </p>
        {selection.reason ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
            {selection.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
