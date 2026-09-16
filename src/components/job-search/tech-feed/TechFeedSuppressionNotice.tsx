/**
 * What the show / demote / hide preference is costing right now.
 *
 * A filter that removes results has to say so, say how many, and be one click
 * from being undone. This is the whole reason `hide` is not the default: the
 * moment results vanish silently, the user cannot tell an empty market from an
 * over-narrow search, and they stop trusting the count at the top of the page.
 *
 * The numbers are counts of rows THIS PAGE received, not an estimate of the
 * whole index - the copy says "on this page" rather than implying a total we
 * do not have.
 */
import { EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TechFeedFilters } from '@/types/techFeed';

export interface TechFeedSuppressionNoticeProps {
  hiddenTotal: number;
  hiddenClearance: number;
  hiddenNoSponsorship: number;
  filters: TechFeedFilters;
  onPatch: (patch: Partial<TechFeedFilters>) => void;
}

export function TechFeedSuppressionNotice({
  hiddenTotal,
  hiddenClearance,
  hiddenNoSponsorship,
  filters,
  onPatch,
}: TechFeedSuppressionNoticeProps) {
  if (hiddenTotal <= 0) return null;

  const parts: string[] = [];
  if (hiddenClearance > 0) {
    parts.push(`${hiddenClearance} that require a security clearance`);
  }
  if (hiddenNoSponsorship > 0) {
    parts.push(`${hiddenNoSponsorship} that state the employer does not sponsor`);
  }

  // Put everything back where it was: demoted, which is the default and the
  // only setting that hides nothing while still ranking honestly.
  const restore: Partial<TechFeedFilters> = {
    ...(filters.clearanceRoles === 'hide' ? { clearanceRoles: 'demote' as const } : {}),
    ...(filters.noSponsorshipRoles === 'hide' ? { noSponsorshipRoles: 'demote' as const } : {}),
  };

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
      data-testid="tech-feed-suppression-notice"
      role="status"
    >
      <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-foreground">
        Hiding {hiddenTotal} {hiddenTotal === 1 ? 'posting' : 'postings'} on this page
        {parts.length > 0 ? `: ${parts.join(', ')}` : ''}.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onPatch(restore)}
      >
        Show them again
      </Button>
    </div>
  );
}

export default TechFeedSuppressionNotice;
