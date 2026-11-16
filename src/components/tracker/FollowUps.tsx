/**
 * Applications that have gone a week or more without an answer.
 *
 * Each one offers the three things a person actually does about silence:
 * write to them, call it closed, or leave it for now. The draft is written on
 * request, so nothing is spent until someone asks for it.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { AiDisclosure } from '@/components/ai/AiDisclosure';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { notifyError } from '@/lib/notify';
import type { TailoringRecord } from '@/types/resume';

import { STALE_AFTER_DAYS, waitingDays } from './trackerInsights';
import { cn } from '@/lib/utils';
import { atsTone, companyOf, isUntailoredStub, titleOf } from './trackerUtils';

interface FollowUpsProps {
  records: TailoringRecord[];
  savingId: string | null;
  onSelect: (id: string) => void;
  onNoResponse: (id: string) => void;
  onDismiss: (id: string) => void;
  /** Close everything that has waited past the point a reply is likely. */
  onCloseStale: () => void;
  closing: boolean;
}

/** Rows shown before "Show all": enough to act on, not a wall. */
const PREVIEW = 5;

interface Draft {
  subject: string;
  message: string;
}

export default function FollowUps({
  records,
  savingId,
  onSelect,
  onNoResponse,
  onDismiss,
  onCloseStale,
  closing,
}: FollowUpsProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  const draft = async (recordId: string) => {
    setDraftingId(recordId);
    const resp = await apiService.generateIntelligenceFollowup({
      record_id: recordId,
      channel: 'email',
    });
    setDraftingId(null);
    const followup = resp.data?.followup;
    if (!followup) {
      notifyError("Couldn't draft a follow-up", resp.error);
      return;
    }
    setDrafts((prev) => ({
      ...prev,
      [recordId]: { subject: followup.subject, message: followup.message },
    }));
  };

  const sorted = [...records].sort((a, b) => (waitingDays(b) ?? 0) - (waitingDays(a) ?? 0));
  const stale = sorted.filter((record) => (waitingDays(record) ?? 0) > STALE_AFTER_DAYS).length;
  const shown = all ? sorted : sorted.slice(0, PREVIEW);

  return (
    <>
      {stale > 1 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/40 px-3 py-2.5">
          <p className="min-w-0 flex-1 basis-56 text-body-sm text-foreground">
            {stale} of these have waited more than {STALE_AFTER_DAYS} days. A reply that late is
            rare.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="hit-target h-8"
            disabled={closing}
            onClick={onCloseStale}
          >
            {closing ? 'Closing...' : `Mark ${stale} as no response`}
          </Button>
        </div>
      )}
      <ul>
        {shown.map((record) => {
          const id = record.record_id;
          const days = waitingDays(record) ?? 0;
          const written = drafts[id];
          const company = companyOf(record);
          const score = record.ats_scores?.overall;
          const baseResume = isUntailoredStub(record);
          return (
            <li key={id} className="border-b border-border/60 px-3 py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  title="Open this application"
                  className="min-w-0 flex-1 basis-56 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-body font-medium text-foreground">
                    {titleOf(record)}
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {company || 'Company not specified'} · {days} {days === 1 ? 'day' : 'days'}{' '}
                    without a reply
                  </span>
                  {/* The same two facts a row in the stage list carries. */}
                  {(typeof score === 'number' || baseResume) && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-body-sm text-muted-foreground">
                      {typeof score === 'number' && (
                        <span className={cn('font-medium tabular-nums', atsTone(score))}>
                          Match score {Math.round(score)}
                        </span>
                      )}
                      {typeof score === 'number' && baseResume && <span aria-hidden>·</span>}
                      {baseResume && <span>Base resume</span>}
                    </span>
                  )}
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="hit-target h-8"
                    disabled={draftingId === id}
                    onClick={() => void draft(id)}
                  >
                    {draftingId === id
                      ? 'Writing...'
                      : written
                        ? 'Write another'
                        : 'Draft a follow-up'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hit-target h-8"
                    disabled={savingId === id}
                    title="Close this application as no response"
                    onClick={() => onNoResponse(id)}
                  >
                    No response
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hit-target h-8 text-muted-foreground"
                    title="Hide this reminder until the application changes"
                    onClick={() => onDismiss(id)}
                  >
                    Not now
                  </Button>
                </div>
              </div>

              {written && (
                <div className="mt-3 space-y-2 rounded-lg border-l-2 border-primary/40 bg-muted/50 px-3 py-2.5">
                  <AiDisclosure kind="draft" />
                  <p className="text-body-sm font-semibold text-foreground">{written.subject}</p>
                  <p className="whitespace-pre-wrap text-body-sm text-ink-muted">
                    {written.message}
                  </p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hit-target h-8"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(`Subject: ${written.subject}\n\n${written.message}`)
                          .then(() => toast.success('Copied. Paste it into your email'))
                          .catch(() => notifyError("Couldn't copy the draft"));
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="hit-target h-8"
                      onClick={() => {
                        const params = new URLSearchParams({
                          view: 'cm',
                          fs: '1',
                          su: written.subject,
                          body: written.message,
                          ...(record.application?.recruiter_email
                            ? { to: record.application.recruiter_email }
                            : {}),
                        });
                        window.open(
                          `https://mail.google.com/mail/?${params.toString()}`,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }}
                    >
                      Open in Gmail
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {sorted.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="hit-target w-full border-t border-border/60 px-3 py-2.5 text-left text-body-sm font-medium text-primary transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {all ? 'Show fewer' : `Show all ${sorted.length}`}
        </button>
      )}
    </>
  );
}
