import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  type: string;
  status: string;
  admin_response: string | null;
  created_at: string | null;
  responded_at: string | null;
}

type StatusFilter = 'all' | 'open' | 'responded' | 'resolved';

const TYPE_LABELS: Record<string, string> = {
  general: 'General',
  idea: 'Idea',
  bug: 'Bug',
  quota_bump: 'Quota bump',
};

const TYPE_TONE: Record<string, string> = {
  general: 'border-border bg-muted text-ink-muted',
  idea: 'border-info/30 bg-info/10 text-info',
  bug: 'border-destructive/30 bg-destructive/10 text-destructive',
  quota_bump: 'border-warning/30 bg-warning/10 text-warning',
};

const STATUS_TONE: Record<string, string> = {
  open: 'border-warning/40 bg-warning/10 text-warning',
  responded: 'border-info/40 bg-info/10 text-info',
  resolved: 'border-success/40 bg-success/10 text-success',
};

function formatTs(iso: string | null) {
  if (!iso) return 'None';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function FeedbackPanel() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const resp = await apiService.getAdminFeedback(
      filter === 'all' ? undefined : (filter as 'open' | 'responded' | 'resolved'),
    );
    setLoading(false);
    if (resp.error) {
      toast.error('Failed to load feedback', { description: resp.error });
      return;
    }
    setItems(resp.data?.feedback || []);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { open: 0, responded: 0, resolved: 0 };
    for (const it of items) {
      if (it.status === 'open') c.open++;
      else if (it.status === 'responded') c.responded++;
      else if (it.status === 'resolved') c.resolved++;
    }
    return c;
  }, [items]);

  const startReply = (id: string, existing: string | null) => {
    setRespondingId(id);
    setDraftResponse(existing || '');
  };

  const cancelReply = () => {
    setRespondingId(null);
    setDraftResponse('');
  };

  const saveReply = async (id: string) => {
    if (!draftResponse.trim()) {
      toast.error('Write a response first.');
      return;
    }
    setSavingId(id);
    const resp = await apiService.updateAdminFeedback(id, {
      admin_response: draftResponse.trim(),
      status: 'responded',
    });
    setSavingId(null);
    if (resp.error || !resp.data) {
      toast.error('Failed to send response', { description: resp.error });
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? resp.data! : it)));
    toast.success('Response saved.');
    cancelReply();
  };

  const setStatus = async (id: string, status: 'open' | 'resolved') => {
    setSavingId(id);
    const resp = await apiService.updateAdminFeedback(id, { status });
    setSavingId(null);
    if (resp.error || !resp.data) {
      toast.error('Failed to update', { description: resp.error });
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? resp.data! : it)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'open', 'responded', 'resolved'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`hit-target inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'open' && counts.open ? <span className="ml-1.5 text-warning">·{counts.open}</span> : null}
            {f === 'responded' && counts.responded ? (
              <span className="ml-1.5 text-info">·{counts.responded}</span>
            ) : null}
            {f === 'resolved' && counts.resolved ? (
              <span className="ml-1.5 text-success">·{counts.resolved}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Loading feedback...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No feedback in this view.
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const isReplying = respondingId === it.id;
          return (
            <div key={it.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-caption-sm font-medium ${TYPE_TONE[it.type] || TYPE_TONE.general}`}>
                    {TYPE_LABELS[it.type] || it.type}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-caption-sm font-medium ${STATUS_TONE[it.status] || STATUS_TONE.open}`}>
                    {it.status}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{it.email}</span>
                </div>
                <span className="text-caption-sm text-muted-foreground">{formatTs(it.created_at)}</span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{it.message}</p>

              {it.admin_response && !isReplying && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-1 text-caption-sm uppercase tracking-wide text-primary">Your response · {formatTs(it.responded_at)}</div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{it.admin_response}</p>
                </div>
              )}

              {isReplying ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={draftResponse}
                    onChange={(e) => setDraftResponse(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="Write a response. The user can read this in their feedback history."
                    className="w-full resize-none rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelReply}
                      className="hit-target inline-flex min-h-8 items-center rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveReply(it.id)}
                      disabled={savingId === it.id}
                      className="hit-target inline-flex min-h-8 items-center rounded-md border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {savingId === it.id ? 'Saving...' : 'Send response'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => startReply(it.id, it.admin_response)}
                    className="hit-target inline-flex min-h-8 items-center rounded-md border border-border px-3 py-1 text-xs text-ink-muted hover:bg-muted"
                  >
                    {it.admin_response ? 'Edit response' : 'Reply'}
                  </button>
                  {it.status !== 'resolved' && (
                    <button
                      onClick={() => setStatus(it.id, 'resolved')}
                      disabled={savingId === it.id}
                      className="hit-target inline-flex min-h-8 items-center rounded-md border border-success/40 bg-success/10 px-3 py-1 text-xs text-success hover:bg-success/20 disabled:opacity-50"
                    >
                      Mark resolved
                    </button>
                  )}
                  {it.status === 'resolved' && (
                    <button
                      onClick={() => setStatus(it.id, 'open')}
                      disabled={savingId === it.id}
                      className="hit-target inline-flex min-h-8 items-center rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
