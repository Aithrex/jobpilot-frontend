import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, MailX } from 'lucide-react';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PanelEmpty, PanelError } from '@/app-shell/pages/today/primitives';
import type { ThreadSummary } from '@/types/mailbox';
import { ThreadList } from './ThreadList';
import { ThreadDetailView } from './ThreadDetailView';

interface ThreadsData {
  /** 404 from the backend = the feature flag is off. */
  disabled: boolean;
  threads: ThreadSummary[];
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 w-1/3 rounded bg-muted" />
            <span className="block h-3 w-2/3 rounded bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * INBOX tab of the /app/apply workspace: a master-detail view over the
 * managed mailbox. Selection + the unread filter live in the URL so a thread is
 * deep-linkable (?thread=<id>). Reads flow through React Query against the real
 * /api/resume/mailbox endpoints - no fabricated progress.
 */
export default function MailboxInboxTab() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const selectedId = params.get('thread');
  const unreadOnly = params.get('unread') === '1';

  const threadsQuery = useQuery<ThreadsData>({
    queryKey: ['mailbox', 'threads', unreadOnly],
    queryFn: async () => {
      const res = await apiService.getMailboxThreads(unreadOnly ? { unread: true } : undefined);
      if (res.status === 404) return { disabled: true, threads: [] };
      if (res.error) throw new Error(res.error);
      return { disabled: false, threads: res.data?.threads ?? [] };
    },
  });

  const detailQuery = useQuery({
    queryKey: ['mailbox', 'thread', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await apiService.getMailboxThread(selectedId as string);
      if (res.status === 404) throw new Error('This conversation is no longer available.');
      if (res.error) throw new Error(res.error);
      return res.data;
    },
  });

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mailbox'] });
  }, [queryClient]);

  const select = useCallback(
    (thread: ThreadSummary) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('thread', thread.thread_id);
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  const clearSelection = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('thread');
        return next;
      },
      { replace: false },
    );
  }, [setParams]);

  const toggleUnreadFilter = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (unreadOnly) next.delete('unread');
        else next.set('unread', '1');
        return next;
      },
      { replace: true },
    );
  }, [setParams, unreadOnly]);

  const data = threadsQuery.data;
  const threads = data?.threads ?? [];

  // Feature flag off -> hide the surface with a calm explanation.
  if (data?.disabled) {
    return (
      <PanelEmpty
        icon={MailX}
        title="Managed mailbox isn't available yet"
        body="Your private application address turns on with Auto-Apply. Check back soon."
      />
    );
  }

  return (
    <div className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      {/* List pane. Hidden on mobile once a thread is open. */}
      <div className={cn('min-w-0 rounded-container border border-border bg-card', selectedId && 'hidden lg:block')}>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={toggleUnreadFilter}
              // `accent-primary` is what actually themes a NATIVE checkbox.
              // `text-primary` only sets the text colour - the browser paints
              // the checked box with its own default (blue on Chrome/Edge), so
              // this control ignored the theme in BOTH light and dark.
              className="h-3.5 w-3.5 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            Unread only
          </label>
        </div>

        {threadsQuery.isLoading ? (
          <ListSkeleton />
        ) : threadsQuery.isError ? (
          <PanelError
            className="m-4"
            title="Couldn't load your inbox"
            onRetry={() => threadsQuery.refetch()}
          />
        ) : threads.length === 0 ? (
          <PanelEmpty
            className="m-4"
            icon={Inbox}
            title={unreadOnly ? 'No unread messages' : 'No messages yet'}
            body={
              unreadOnly
                ? 'You are all caught up.'
                : 'Replies to your managed application address will appear here.'
            }
          />
        ) : (
          <ThreadList threads={threads} selectedId={selectedId} onSelect={select} />
        )}
      </div>

      {/* Detail pane. */}
      <div className={cn('min-w-0 rounded-container border border-border bg-card', !selectedId && 'hidden lg:block')}>
        {!selectedId ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
            <Inbox className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">Select a conversation to read it.</p>
          </div>
        ) : detailQuery.isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : detailQuery.isError || !detailQuery.data ? (
          <PanelError
            className="m-4"
            title="Couldn't open this conversation"
            onRetry={() => detailQuery.refetch()}
          />
        ) : (
          <ThreadDetailView
            detail={detailQuery.data}
            onBack={clearSelection}
            onChanged={refetchAll}
          />
        )}
      </div>
    </div>
  );
}
