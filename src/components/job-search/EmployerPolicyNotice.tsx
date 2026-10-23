/**
 * What the server's employer policy removed from THIS list, said out loud.
 *
 * The numbers are the server's own `policy.excluded_counts` - the client never
 * re-filters by policy, so these are counts of rows that genuinely never
 * arrived. Two surfaces:
 *  - `EmployerPolicySummary`: one compact line above the results, with a
 *    "Show them" entry into the employer-type toggles;
 *  - `EmployerFilteredEmptyState`: when the filters removed EVERYTHING, an
 *    empty state that says so and offers to adjust them. It never widens the
 *    filters on its own - a filter that silently relaxes itself is not a
 *    filter.
 *
 * Both render nothing for an older backend that sends no policy block.
 */
import { Building2, Filter } from 'lucide-react';

import { EmployerFiltersPopover } from '@/components/job-search/EmployerPreferencesControl';
import { Button } from '@/components/ui/button';
import { excludedBreakdown } from '@/lib/employerPolicy';
import { cn } from '@/lib/utils';
import type { PolicyBlock } from '@/types/employerPolicy';

interface EmployerPolicyProps {
  policy: PolicyBlock | null | undefined;
  className?: string;
}

export function EmployerPolicySummary({ policy, className }: EmployerPolicyProps) {
  if (!policy) return null;
  const breakdown = excludedBreakdown(policy);
  // Only what the filters HID is reported here. A count of shown rows from
  // unclassified employers ("561 shown from employers we couldn't verify")
  // read as a problem with the feed and explained nothing a user could act on.
  if (breakdown.total === 0) return null;

  return (
    <p
      className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground', className)}
      data-testid="employer-policy-summary"
    >
      <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span data-testid="employer-policy-excluded">
        Hidden by your employer filters: {breakdown.text}
      </span>
      <EmployerFiltersPopover>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-xs font-semibold"
          data-testid="employer-policy-show"
        >
          Show them
        </Button>
      </EmployerFiltersPopover>
    </p>
  );
}

export function EmployerFilteredEmptyState({ policy, className }: EmployerPolicyProps) {
  const breakdown = excludedBreakdown(policy);
  if (breakdown.total === 0) return null;
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground',
        className,
      )}
      data-testid="employer-policy-empty"
    >
      <Building2 className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden />
      <p className="font-medium text-foreground">Your employer filters hid every match here</p>
      <p className="mx-auto mt-1 max-w-md text-xs">
        {breakdown.text} {breakdown.total === 1 ? 'was' : 'were'} hidden. We don't widen your
        filters for you - change them if you want to see these.
      </p>
      <EmployerFiltersPopover align="center">
        <Button type="button" variant="outline" size="sm" className="mt-3 gap-1.5">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Adjust employer filters
        </Button>
      </EmployerFiltersPopover>
    </div>
  );
}
