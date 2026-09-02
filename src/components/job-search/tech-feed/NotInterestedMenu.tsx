/**
 * Feedback on one posting - hide it, or report that the record is wrong.
 *
 * Two acts, one menu, grouped by CONSEQUENCE. Only "Not for me" hides
 * anything; "Something's wrong with this listing" is a data-quality report the
 * server records, counts and acts on WITHOUT hiding the job. The confirmation
 * copy differs for exactly that reason: promising a card will disappear when
 * it will not is the failure this component is shaped to avoid.
 *
 * The write goes to the server (`lib/techFeedNotInterested.ts`), which is what
 * makes a dismissal on one device hold on another. localStorage is the
 * optimistic cache underneath it, and a refused write rolls back - a card is
 * never left hidden on the strength of a request the server rejected.
 */
import { useState } from 'react';
import { ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FEEDBACK_REASON_GROUPS,
  recordNotInterested,
  undoNotInterested,
} from '@/lib/techFeedNotInterested';
import type { TechFeedFeedbackReason } from '@/types/techFeed';

interface NotInterestedMenuProps {
  jobId: string;
  employerName: string;
  jobTitle: string;
  dedupeGroupId?: string;
  employerId?: string;
  searchId?: string | null;
  /** Called only when the reason actually hides the posting. */
  onDismissed: (jobId: string, reason: TechFeedFeedbackReason) => void;
  onRestored?: (jobId: string) => void;
}

export function NotInterestedMenu({
  jobId,
  employerName,
  jobTitle,
  dedupeGroupId,
  employerId,
  searchId,
  onDismissed,
  onRestored,
}: NotInterestedMenuProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async (reason: TechFeedFeedbackReason, hides: boolean) => {
    setOpen(false);
    setSending(true);
    // Hide first: the click should land immediately. A refused write undoes it
    // below, which is rarer than the happy path and is reported out loud.
    if (hides) onDismissed(jobId, reason);

    const outcome = await recordNotInterested(jobId, reason, {
      employerName,
      dedupeGroupId,
      employerId,
      searchId,
    });
    setSending(false);

    if (!outcome.ok) {
      if (hides) onRestored?.(jobId);
      toast.error('Could not save that feedback', {
        description: outcome.error || 'The job is still in your feed. Try again.',
      });
      return;
    }

    const undo = {
      label: 'Undo',
      onClick: () => {
        void undoNotInterested(jobId).then((result) => {
          if (!result.ok) {
            toast.error('Could not undo that', { description: result.error });
            return;
          }
          onRestored?.(jobId);
        });
      },
    };

    if (hides) {
      toast('Hidden from this feed', {
        description: `${jobTitle} at ${employerName}`,
        action: undo,
      });
      return;
    }

    // Data quality: the server logs it and re-checks the listing. It does not
    // disappear, and the toast says so rather than implying it did.
    toast("Thanks - we'll re-check this listing", {
      description: `${jobTitle} at ${employerName} stays in your feed.`,
      action: undo,
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sending}
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Hide or report ${jobTitle} at ${employerName}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
          Hide or report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {FEEDBACK_REASON_GROUPS.map((group, index) => (
          <DropdownMenuGroup key={group.heading} aria-label={group.heading}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="pb-0 text-xs font-semibold text-foreground">
              {group.heading}
            </DropdownMenuLabel>
            <p className="px-2 pb-1 text-[11px] leading-snug text-muted-foreground">
              {group.hint}
            </p>
            {group.reasons.map((reason) => (
              <DropdownMenuItem
                key={reason.value}
                onSelect={() => void send(reason.value, group.hides)}
                className="text-sm"
              >
                {reason.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotInterestedMenu;
