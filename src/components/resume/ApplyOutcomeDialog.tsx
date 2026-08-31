import { useEffect, useState } from 'react';
import { Briefcase, Bookmark, Clock, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { civilDayToInstant, localDayISO } from '@/lib/applicationDates';
import type { ApplicationStatus } from '@/types/resume';

export interface ApplyOutcome {
  status: Extract<ApplicationStatus, 'applied' | 'saved' | 'draft'>;
  /** Only set when the user picked "applied" — a noon-local ISO instant. */
  applied_at?: string;
  job_url?: string;
}

interface ApplyOutcomeDialogProps {
  open: boolean;
  /** Role/company for the prompt copy, when known. */
  jobTitle?: string;
  company?: string;
  /** Prefills the posting URL — useful for roles pasted in from other portals. */
  defaultJobUrl?: string;
  saving?: boolean;
  onSubmit: (outcome: ApplyOutcome) => void;
  onDismiss: () => void;
}

/**
 * Asks what actually happened after a tailored resume is downloaded.
 *
 * Without this the record sits in Draft forever, which is wrong for the common
 * case: the user tailored precisely because they were about to apply. It is
 * shown after the first download rather than straight after tailoring, since
 * downloading is the point where applying becomes plausible.
 */
export default function ApplyOutcomeDialog({
  open,
  jobTitle,
  company,
  defaultJobUrl,
  saving = false,
  onSubmit,
  onDismiss,
}: ApplyOutcomeDialogProps) {
  const [appliedDay, setAppliedDay] = useState(() => localDayISO());
  const [jobUrl, setJobUrl] = useState(defaultJobUrl || '');
  const [showDetails, setShowDetails] = useState(false);

  // Reopening for a different record must not inherit the previous answer.
  useEffect(() => {
    if (!open) return;
    setAppliedDay(localDayISO());
    setJobUrl(defaultJobUrl || '');
    setShowDetails(false);
  }, [open, defaultJobUrl]);

  const role = jobTitle?.trim();
  const org = company && company !== 'Not specified' ? company.trim() : '';
  const label = role ? (org ? `${role} at ${org}` : role) : 'this role';

  const submitApplied = () => {
    onSubmit({
      status: 'applied',
      applied_at: civilDayToInstant(appliedDay),
      job_url: jobUrl.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Did you apply?</DialogTitle>
          <DialogDescription>
            Your tailored resume for <span className="font-medium text-foreground">{label}</span> is
            downloaded. Tell us where it stands so your tracker stays accurate.
          </DialogDescription>
        </DialogHeader>

        {showDetails ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="apply-date" className="text-xs font-medium text-foreground">
                Date applied
              </label>
              <Input
                id="apply-date"
                type="date"
                value={appliedDay}
                max={localDayISO()}
                onChange={(e) => setAppliedDay(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Back-date it if you applied earlier. This is the date your tracker filters on.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="apply-url" className="text-xs font-medium text-foreground">
                Job posting link <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="apply-url"
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Handy when the role came from another job board.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)} disabled={saving}>
                Back
              </Button>
              <Button size="sm" onClick={submitApplied} disabled={saving || !appliedDay}>
                {saving ? 'Saving...' : 'Save to tracker'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <OutcomeButton
              icon={<Send className="h-4 w-4" aria-hidden />}
              title="Yes, I applied"
              detail="Moves it to Applied and records today's date"
              onClick={submitApplied}
              disabled={saving}
              primary
            />
            <OutcomeButton
              icon={<Briefcase className="h-4 w-4" aria-hidden />}
              title="I applied on another day"
              detail="Pick the date and add the posting link"
              onClick={() => setShowDetails(true)}
              disabled={saving}
            />
            <OutcomeButton
              icon={<Bookmark className="h-4 w-4" aria-hidden />}
              title="Save for later"
              detail="Keeps it in Saved so you can come back to it"
              onClick={() => onSubmit({ status: 'saved' })}
              disabled={saving}
            />
            <OutcomeButton
              icon={<Clock className="h-4 w-4" aria-hidden />}
              title="Not yet"
              detail="Leaves it in Draft"
              onClick={() => onSubmit({ status: 'draft' })}
              disabled={saving}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutcomeButton({
  icon, title, detail, onClick, disabled, primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
        primary
          ? 'border-primary/30 bg-primary/[0.06] hover:bg-primary/10'
          : 'border-border bg-card hover:bg-muted/60'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
          primary ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
