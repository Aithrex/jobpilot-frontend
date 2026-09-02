/**
 * "Not interested", with a reason.
 *
 * The reason is the point: a dismissal with no reason teaches nothing. It is
 * stored locally today (see `lib/techFeedNotInterested.ts` for why there is no
 * API call yet - `apiService.submitFeedback` is product feedback, not job
 * relevance) and applied as a client-side suppression.
 */
import { useState } from 'react';
import { ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NOT_INTERESTED_REASONS, recordNotInterested, undoNotInterested } from '@/lib/techFeedNotInterested';
import type { NotInterestedReason } from '@/types/techFeed';

interface NotInterestedMenuProps {
  jobId: string;
  employerName: string;
  jobTitle: string;
  onDismissed: (jobId: string, reason: NotInterestedReason) => void;
  onRestored?: (jobId: string) => void;
}

export function NotInterestedMenu({
  jobId,
  employerName,
  jobTitle,
  onDismissed,
  onRestored,
}: NotInterestedMenuProps) {
  const [open, setOpen] = useState(false);

  const dismiss = (reason: NotInterestedReason) => {
    recordNotInterested(jobId, reason, employerName);
    setOpen(false);
    onDismissed(jobId, reason);
    toast('Hidden from this feed', {
      description: `${jobTitle} at ${employerName}`,
      action: {
        label: 'Undo',
        onClick: () => {
          undoNotInterested(jobId);
          onRestored?.(jobId);
        },
      },
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Not interested in ${jobTitle} at ${employerName}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
          Not interested
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Why is this a bad match?
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NOT_INTERESTED_REASONS.map((reason) => (
          <DropdownMenuItem
            key={reason.value}
            onSelect={() => dismiss(reason.value)}
            className="text-sm"
          >
            {reason.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotInterestedMenu;
