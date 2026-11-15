/**
 * What Gmail changed for you: every status a check moved by itself, with the
 * email that caused it and a way to put it back.
 *
 * An automatic move the user cannot see or reverse is the fastest way to lose
 * their trust in the tracker, so this sits right under the connection.
 */
import { useState } from 'react';

import type { GmailChange } from '@/types/gmail';
import { statusMeta } from '@/components/tracker/trackerConfig';
import { formatRelative } from '@/components/resume/gmailState';

interface GmailActivityProps {
  changes: GmailChange[];
  busyId: string | null;
  error: string | null;
  onUndo: (change: GmailChange) => void;
  /** Rows shown before "Show all". */
  preview?: number;
  className?: string;
}

export default function GmailActivity({
  changes,
  busyId,
  error,
  onUndo,
  preview = 3,
  className,
}: GmailActivityProps) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  if (changes.length === 0) return null;
  const shown = all ? changes : changes.slice(0, preview);

  return (
    <section aria-label="What Gmail changed" className={className}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-label font-semibold text-foreground">
          What Gmail changed <span className="font-normal text-muted-foreground">· last 30 days</span>
        </h4>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded text-label font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? 'Hide' : `Show ${changes.length}`}
        </button>
      </div>
      {open && (
        <>
          <p className="mt-1 text-label text-muted-foreground">
            These moved by themselves because the email was clear. Undo any that are wrong.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-label text-destructive">
              {error}
            </p>
          )}
          <ul className="mt-2 divide-y divide-border/60 rounded-lg border border-border/70">
            {shown.map((change) => {
              const role = change.title || 'Untitled role';
              return (
                <li
                  key={change.suggestion_id}
                  className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3 py-2"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="break-words text-label font-medium text-foreground">
                      {role}
                      {change.company && (
                        <span className="font-normal text-muted-foreground"> · {change.company}</span>
                      )}
                    </p>
                    <p className="text-label text-muted-foreground">
                      {change.from_status ? (
                        <>
                          Moved from {statusMeta(change.from_status).label} to{' '}
                          <span className="font-medium text-foreground">
                            {statusMeta(change.to_status).label}
                          </span>
                        </>
                      ) : (
                        <>
                          Marked{' '}
                          <span className="font-medium text-foreground">
                            {statusMeta(change.to_status).label}
                          </span>
                        </>
                      )}
                      {change.applied_at && <>, {formatRelative(change.applied_at)}</>}
                    </p>
                    {change.subject && (
                      <p className="break-words text-label text-muted-foreground">
                        Because of the email: {change.subject}
                      </p>
                    )}
                  </div>
                  {change.undone ? (
                    <span className="shrink-0 text-label text-muted-foreground">Undone</span>
                  ) : change.undoable ? (
                    <button
                      type="button"
                      disabled={busyId === change.suggestion_id}
                      aria-label={`Undo the change to ${role}`}
                      onClick={() => onUndo(change)}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-label font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {busyId === change.suggestion_id ? 'Undoing...' : 'Undo'}
                    </button>
                  ) : (
                    <span className="shrink-0 text-label text-muted-foreground">Changed since</span>
                  )}
                </li>
              );
            })}
          </ul>
          {changes.length > preview && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-2 rounded text-label font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {all ? 'Show fewer' : `Show all ${changes.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
