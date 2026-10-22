/**
 * "Who is hiring, is it still open, and where does the application go" for one
 * posting - the per-row blocks of contract `employer-policy-1.0.0`.
 *
 * Renders NOTHING for a row without the new blocks, so an older backend's
 * cards look exactly as they did. Every label comes from
 * `lib/employerPolicy.ts`, which is where the two hard rules live: unknown is
 * never "Direct employer", and "no warnings found" is never "Verified".
 *
 * Kept to a few compact lines: a chip row (employer type + what the posting
 * is), one availability line with its time and method, one destination line,
 * and a warning box only when there is a warning.
 */
import { AlertTriangle, Building2, CircleCheck, CircleSlash, Clock3, ExternalLink, HelpCircle, ShieldQuestion } from 'lucide-react';

import {
  applicationDestinationHost,
  availabilityLineOf,
  employerCategoryOf,
  hasEmployerPolicyFields,
  postingRelationshipLabels,
  trustLineOf,
  type ExplanationTone,
} from '@/lib/employerPolicy';
import { cn } from '@/lib/utils';
import type { EmployerPolicyRowFields } from '@/types/employerPolicy';

export const EXPLANATION_TONE_CLASS: Record<ExplanationTone, string> = {
  positive: 'border-success/30 bg-success/10 text-success',
  neutral: 'border-border bg-secondary text-secondary-foreground',
  caution: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  muted: 'border-dashed border-border bg-muted/50 text-muted-foreground',
};

const AVAILABILITY_ICON = {
  verified_open: CircleCheck,
  closed: CircleSlash,
  unverifiable: ShieldQuestion,
  unknown: HelpCircle,
} as const;

const AVAILABILITY_TEXT: Record<ExplanationTone, string> = {
  positive: 'text-foreground/80',
  neutral: 'text-muted-foreground',
  caution: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

type Row = EmployerPolicyRowFields & { apply_link?: string | null; apply_url?: string | null };

interface JobEmployerContextProps {
  row: Row;
  /** Human label of the source the posting came from ("Greenhouse"). */
  sourceLabel?: string | null;
  /** Hide the destination line when the card already states it. */
  showDestination?: boolean;
  /** Render "No warning signs found (automated check)" for a clean row. Off by default. */
  showCleanTrust?: boolean;
  className?: string;
}

export function JobEmployerContext({
  row,
  sourceLabel,
  showDestination = true,
  showCleanTrust = false,
  className,
}: JobEmployerContextProps) {
  if (!hasEmployerPolicyFields(row)) return null;

  const category = employerCategoryOf(row);
  const relationship = postingRelationshipLabels(row);
  // "Seen on the employer's board" is said only of an employer we classified
  // as an operating business - otherwise the board we saw may be an agency's.
  const availability = availabilityLineOf(row, { onEmployerBoard: category?.kind === 'operating' });
  const trust = trustLineOf(row, { showClean: showCleanTrust });
  const host = showDestination ? applicationDestinationHost(row) : null;
  const AvailabilityIcon = availability ? AVAILABILITY_ICON[availability.state] : Clock3;

  return (
    <div className={cn('space-y-1', className)} data-testid="job-employer-context">
      {(category || relationship.length > 0) && (
        <ul className="flex flex-wrap items-center gap-1" aria-label="Employer and posting type">
          {category && (
            <li>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
                  EXPLANATION_TONE_CLASS[category.tone],
                )}
                title={category.basis ?? undefined}
                data-testid="employer-category"
                data-kind={category.kind}
              >
                <Building2 className="h-3 w-3" aria-hidden />
                {category.label}
                {category.basis && <span className="sr-only">. {category.basis}</span>}
              </span>
            </li>
          )}
          {relationship.map((label) => (
            <li key={label}>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
                  EXPLANATION_TONE_CLASS.neutral,
                )}
                data-testid="posting-relationship"
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {availability && (
        <p
          className={cn('flex items-center gap-1 text-[11px]', AVAILABILITY_TEXT[availability.tone])}
          data-testid="job-availability"
          data-state={availability.state}
        >
          <AvailabilityIcon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{availability.text}</span>
        </p>
      )}

      {host && (
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground" data-testid="job-destination">
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">
            Applies on <span className="font-medium text-foreground/80">{host}</span>
            {sourceLabel ? ` - found via ${sourceLabel}` : ''}
          </span>
        </p>
      )}

      {trust && (
        <div
          role="note"
          className={cn('rounded-md border px-2 py-1 text-[11px] leading-snug', EXPLANATION_TONE_CLASS[trust.tone])}
          data-testid="job-trust-line"
          data-state={trust.state}
        >
          <p className="flex items-start gap-1 font-semibold">
            {trust.state !== 'no_warnings_found' && (
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
            )}
            {trust.title}
          </p>
          {trust.items.length > 0 && (
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 font-normal">
              {trust.items.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default JobEmployerContext;
