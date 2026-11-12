import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

interface PendingRequest {
  id: string;
  message: string;
  created_at: string | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  daily_tailor_limit_custom: number | null;
  daily_tailor_limit_effective: number;
  tailored_today: number;
  tailoring_sessions: number;
  last_login: string | null;
  pending_request: PendingRequest | null;
}

function formatTs(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function QuotasPanel() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [defaultLimit, setDefaultLimit] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [savingEmail, setSavingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull users and open feedback together so we can surface pending
    // "request more tailors" asks right next to the limit controls - the
    // admin shouldn't have to cross-reference the Feedback tab to act.
    const [resp, fbResp] = await Promise.all([
      apiService.getAdminUsers(),
      apiService.getAdminFeedback('open'),
    ]);
    setLoading(false);
    if (resp.error) {
      toast.error('Failed to load users', { description: resp.error });
      return;
    }
    if (!resp.data) return;

    // Map each user's email -> their most recent open quota-bump request.
    const pendingByEmail = new Map<string, PendingRequest>();
    for (const fb of fbResp.data?.feedback || []) {
      if (fb.type !== 'quota_bump' || fb.status !== 'open' || !fb.email) continue;
      // Feedback is returned newest-first; keep the first (latest) per email.
      if (!pendingByEmail.has(fb.email)) {
        pendingByEmail.set(fb.email, {
          id: fb.id,
          message: fb.message,
          created_at: fb.created_at,
        });
      }
    }

    setDefaultLimit(resp.data.default_daily_limit ?? 5);
    setRows(
      (resp.data.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        daily_tailor_limit_custom: u.daily_tailor_limit_custom,
        daily_tailor_limit_effective: u.daily_tailor_limit_effective,
        tailored_today: u.tailored_today ?? 0,
        tailoring_sessions: u.tailoring_sessions ?? 0,
        last_login: u.last_login,
        pending_request: pendingByEmail.get(u.email) ?? null,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => rows.filter((r) => r.pending_request).length, [rows]);

  const filtered = useMemo(() => {
    const base = !query.trim()
      ? rows
      : rows.filter((r) => {
          const q = query.trim().toLowerCase();
          return r.email.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q);
        });
    // Float users with a pending request to the top so they're impossible to miss.
    return [...base].sort((a, b) => {
      if (!!a.pending_request === !!b.pending_request) return 0;
      return a.pending_request ? -1 : 1;
    });
  }, [rows, query]);

  const setLimit = async (email: string, newLimit: number | null) => {
    setSavingEmail(email);
    const resp = await apiService.updateAdminUserQuota(email, newLimit);
    if (resp.error) {
      setSavingEmail(null);
      toast.error('Could not update quota', { description: resp.error });
      return;
    }
    if (!resp.data) {
      setSavingEmail(null);
      return;
    }

    // If this user had a pending quota-bump request and we just raised their
    // limit, mark that request resolved so it clears from the queue and the
    // user sees it was actioned in their feedback history.
    const row = rows.find((r) => r.email === email);
    const pending = row?.pending_request;
    let resolvedPending = false;
    if (pending && newLimit !== null) {
      const fbResp = await apiService.updateAdminFeedback(pending.id, { status: 'resolved' });
      resolvedPending = !fbResp.error;
    }
    setSavingEmail(null);

    setRows((prev) =>
      prev.map((r) =>
        r.email === email
          ? {
              ...r,
              daily_tailor_limit_custom: resp.data!.daily_tailor_limit_custom,
              daily_tailor_limit_effective: resp.data!.daily_tailor_limit_effective,
              pending_request: resolvedPending ? null : r.pending_request,
            }
          : r,
      ),
    );
    toast.success(
      newLimit === null
        ? `Reset ${email} to the default limit (${defaultLimit})`
        : `${email} can now tailor ${newLimit} resumes per day${resolvedPending ? '. Request resolved' : ''}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Daily tailor quotas
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-caption-sm font-medium text-warning">
                  {pendingCount} request{pendingCount === 1 ? '' : 's'} for more
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Default limit is{' '}
              <span className="font-medium text-ink-muted">{defaultLimit}</span> tailors per UTC day.
              Override per user as needed. Set to <span className="font-mono">0</span> to disable.
              {pendingCount > 0 && ' Users who asked for more are pinned to the top.'}
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or name..."
            aria-label="Search email or name"
            type="search"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Today</th>
              <th className="px-4 py-2">Limit</th>
              <th className="px-4 py-2">Override</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No users match.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <QuotaRow
                key={r.id}
                row={r}
                defaultLimit={defaultLimit}
                saving={savingEmail === r.email}
                onSave={(val) => setLimit(r.email, val)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotaRow({
  row,
  defaultLimit,
  saving,
  onSave,
}: {
  row: AdminUserRow;
  defaultLimit: number;
  saving: boolean;
  onSave: (val: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>(
    row.daily_tailor_limit_custom === null ? '' : String(row.daily_tailor_limit_custom),
  );

  useEffect(() => {
    setDraft(row.daily_tailor_limit_custom === null ? '' : String(row.daily_tailor_limit_custom));
  }, [row.daily_tailor_limit_custom]);

  const ratio = `${row.tailored_today} / ${row.daily_tailor_limit_effective}`;
  const overflowing = row.tailored_today >= row.daily_tailor_limit_effective;

  const apply = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onSave(null);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 0 || n > 1000) {
      toast.error('Limit must be 0-1000');
      return;
    }
    onSave(n);
  };

  const pending = row.pending_request;

  return (
    <>
    <tr className={`hover:bg-muted ${pending ? 'bg-warning/5' : ''}`}>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="text-foreground">{row.name || row.email.split('@')[0]}</span>
          {pending && (
            <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-caption-sm font-medium text-warning">
              Requested more
            </span>
          )}
        </div>
        <div className="font-mono text-xs text-muted-foreground">{row.email}</div>
      </td>
      <td className="px-4 py-3 align-middle">
        <span className={`text-sm font-medium ${overflowing ? 'text-destructive' : 'text-foreground'}`}>{ratio}</span>
      </td>
      <td className="px-4 py-3 align-middle text-sm">
        {row.daily_tailor_limit_custom !== null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Custom · {row.daily_tailor_limit_effective}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Default ({defaultLimit})</span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          inputMode="numeric"
          placeholder={`default (${defaultLimit})`}
          className="w-32 rounded-md border border-border bg-muted/40 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
        />
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <button
          type="button"
          onClick={apply}
          disabled={saving}
          className="hit-target inline-flex min-h-8 items-center rounded-md border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {row.daily_tailor_limit_custom !== null && (
          <button
            type="button"
            onClick={() => onSave(null)}
            disabled={saving}
            className="hit-target ml-2 inline-flex min-h-8 items-center rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </td>
    </tr>
    {pending && (
      <tr className="bg-warning/5">
        <td colSpan={5} className="px-4 pb-3 pt-0">
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-caption-sm uppercase tracking-wide text-warning">
              <span>Request for more tailors</span>
              {pending.created_at && <span className="text-warning">· {formatTs(pending.created_at)}</span>}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-muted">{pending.message}</p>
            <p className="mt-1.5 text-caption-sm text-muted-foreground">
              Set a higher limit above and hit Save. This request resolves automatically.
            </p>
          </div>
        </td>
      </tr>
    )}
    </>
  );
}
