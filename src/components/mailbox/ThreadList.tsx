import { useCallback, useRef, type KeyboardEvent } from 'react';
import { Paperclip, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MailTrust, ThreadSummary } from '@/types/mailbox';

/** First participant is the correspondent (recruiter/ATS). Falls back safely. */
export function threadSender(t: ThreadSummary): string {
  return t.participants?.find(Boolean) || 'Unknown sender';
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TrustChip({ trust, className }: { trust: MailTrust; className?: string }) {
  const verified = trust === 'verified';
  const Icon = verified ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
        verified
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-warning/30 bg-warning/10 text-warning',
        className,
      )}
      title={
        verified
          ? 'Verified: matches an application you submitted.'
          : 'Unverified: cannot change any application status on its own.'
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

interface ThreadListProps {
  threads: ThreadSummary[];
  selectedId?: string | null;
  onSelect: (thread: ThreadSummary) => void;
}

/**
 * Accessible list of mailbox conversations. Rows form a roving-tabindex
 * `listbox`: ArrowUp/Down move focus, Enter/Space open, and the active row is
 * marked with `aria-selected` (never color alone - an unread dot + weight also
 * encode state).
 */
export function ThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLUListElement>) => {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-thread-row]') ?? [],
    );
    if (rows.length === 0) return;
    const idx = rows.findIndex((el) => el === document.activeElement);
    let next = idx;
    switch (key) {
      case 'ArrowDown':
        next = idx < 0 ? 0 : (idx + 1) % rows.length;
        break;
      case 'ArrowUp':
        next = idx <= 0 ? rows.length - 1 : idx - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = rows.length - 1;
        break;
    }
    event.preventDefault();
    rows[next]?.focus();
  }, []);

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Conversations"
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      className="divide-y divide-border"
    >
      {threads.map((t) => {
        const unread = t.unread_count > 0;
        const active = t.thread_id === selectedId;
        return (
          <li key={t.thread_id} role="none">
            <button
              type="button"
              data-thread-row
              role="option"
              aria-selected={active}
              onClick={() => onSelect(t)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                active ? 'bg-accent' : 'hover:bg-muted/50',
              )}
            >
              <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                {unread && (
                  <span
                    className="h-2 w-2 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm',
                      unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
                    )}
                  >
                    {threadSender(t)}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {relativeTime(t.last_message_at)}
                  </span>
                </span>

                <span className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'truncate text-[13px]',
                      unread ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {t.subject || '(no subject)'}
                  </span>
                  {t.has_attachments && (
                    <Paperclip
                      className="h-3 w-3 shrink-0 text-muted-foreground"
                      aria-label="Has attachments"
                    />
                  )}
                </span>

                {t.snippet && (
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {t.snippet}
                  </span>
                )}

                <span className="mt-1.5 flex items-center gap-2">
                  <TrustChip trust={t.trust} />
                  {t.message_count > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      {t.message_count} messages
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
