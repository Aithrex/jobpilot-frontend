/**
 * The owner's side of Gmail early access.
 *
 * While Google's consent screen is in Testing, only addresses on Google's
 * test-user list can connect, and only the owner can add one, by hand, in
 * Google Cloud. This panel is the queue for that chore: who asked, the address
 * to add, and a button to record that it has been added. Recording it is what
 * lets the person press Connect, and sends them an email saying so.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import { notifyError } from '@/lib/notify';
import type { GmailAccessOverview, GmailAccessRow } from '@/types/gmail';

const BTN =
  'rounded-lg border border-border px-2.5 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50';
const PRIMARY =
  'rounded-lg bg-primary px-3 py-1.5 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50';

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export function GmailAccessPanel() {
  const [overview, setOverview] = useState<GmailAccessOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [early, setEarly] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const resp = await apiService.getAdminGmailAccess();
    setLoading(false);
    if (resp.error || !resp.data) {
      notifyError("Couldn't load Gmail access", resp.error);
      return;
    }
    setOverview(resp.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (target: { user_email?: string; google_email?: string }, key: string) => {
    setBusy(key);
    const resp = await apiService.approveAdminGmailAccess(target);
    setBusy(null);
    if (resp.error || !resp.data) {
      notifyError("Couldn't record that address", resp.error);
      return;
    }
    setOverview(resp.data);
    toast.success(resp.data.notified ? 'Recorded. The person has been emailed.' : 'Recorded.');
  };

  const remove = async (row: GmailAccessRow) => {
    const key = row.user_email || row.google_email || '';
    setBusy(key);
    const resp = await apiService.removeAdminGmailAccess(
      row.user_email ? { user_email: row.user_email } : { google_email: row.google_email || '' },
    );
    setBusy(null);
    if (resp.error || !resp.data) {
      notifyError("Couldn't remove that entry", resp.error);
      return;
    }
    setOverview(resp.data);
  };

  const copy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Address copied'))
      .catch(() => notifyError("Couldn't copy the address"));
  };

  if (loading && !overview) {
    return <p className="text-body-sm text-muted-foreground">Loading Gmail access...</p>;
  }
  if (!overview) {
    return (
      <p className="text-body-sm text-muted-foreground">
        Gmail access could not be loaded.{' '}
        <button
          type="button"
          className="font-medium text-primary underline"
          onClick={() => void load()}
        >
          Try again
        </button>
      </p>
    );
  }

  const left = Math.max(0, overview.limit - overview.used);
  const open = overview.gate === 'open';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-body font-semibold text-foreground">
          {overview.used} of {overview.limit} places used · {left} left
        </p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {open
            ? 'Gmail connect is open to everyone, so nobody has to ask. This list is kept for the record.'
            : 'Google lets only listed accounts connect while the consent screen is in Testing, and the list holds 100. People ask here first, so nobody is sent to a Google page that blocks them.'}
        </p>
        {!open && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-body-sm text-foreground">
            <li>Copy the address.</li>
            <li>
              In Google Cloud open Google Auth Platform, then Audience, then Test users, and add it.
            </li>
            <li>Press Mark as added here. The person is emailed and can connect.</li>
          </ol>
        )}
      </section>

      <section>
        <h3 className="text-body font-semibold text-foreground">
          Waiting · {overview.pending.length}
        </h3>
        {overview.pending.length === 0 ? (
          <p className="mt-2 text-body-sm text-muted-foreground">Nobody is waiting.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview.pending.map((row) => {
              const key = row.user_email || row.google_email || '';
              return (
                <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="break-all text-body font-medium text-foreground">
                      {row.google_email}
                    </p>
                    <p className="break-all text-body-sm text-muted-foreground">
                      Account {row.user_email}
                      {when(row.requested_at) ? ` · asked ${when(row.requested_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={BTN}
                      onClick={() => copy(row.google_email || '')}
                    >
                      Copy address
                    </button>
                    <button
                      type="button"
                      className={PRIMARY}
                      disabled={busy === key || left === 0}
                      title={
                        left === 0
                          ? 'All places are used. Google will not accept another address.'
                          : 'Press this after adding the address at Google'
                      }
                      onClick={() => void approve({ user_email: row.user_email || undefined }, key)}
                    >
                      {busy === key ? 'Saving...' : 'Mark as added'}
                    </button>
                    <button
                      type="button"
                      className={BTN}
                      disabled={busy === key}
                      onClick={() => void remove(row)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-body font-semibold text-foreground">
          Record an address you already added
        </h3>
        <p className="mt-1 text-body-sm text-muted-foreground">
          For someone who is on Google's list but has not asked here. They are let straight through.
        </p>
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const address = early.trim();
            if (!address) return;
            void approve({ google_email: address }, address).then(() => setEarly(''));
          }}
        >
          <input
            type="email"
            required
            value={early}
            onChange={(event) => setEarly(event.target.value)}
            aria-label="Google address already added"
            placeholder="name@gmail.com"
            className="h-9 min-w-0 flex-1 basis-56 rounded-lg border border-input bg-background px-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
          />
          <button type="submit" className={BTN} disabled={!early.trim() || busy === early.trim()}>
            Record address
          </button>
        </form>
      </section>

      <section>
        <h3 className="text-body font-semibold text-foreground">
          Added · {overview.approved.length}
        </h3>
        {overview.approved.length === 0 ? (
          <p className="mt-2 text-body-sm text-muted-foreground">
            No address has been recorded yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview.approved.map((row) => (
              <li
                key={`${row.user_email}|${row.google_email}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="break-all text-body text-foreground">{row.google_email}</p>
                  <p className="break-all text-body-sm text-muted-foreground">
                    {row.user_email ? `Account ${row.user_email}` : 'Nobody has claimed it yet'}
                    {row.connected ? ' · Gmail connected' : ' · not connected yet'}
                  </p>
                </div>
                <button
                  type="button"
                  className={BTN}
                  disabled={busy === (row.user_email || row.google_email)}
                  title="Take this entry off the list here. It stays on Google's list until you remove it there."
                  onClick={() => void remove(row)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {overview.connected_without_a_record.length > 0 && (
          <p className="mt-3 text-body-sm text-muted-foreground">
            Connected before this list existed, and counted above:{' '}
            {overview.connected_without_a_record.join(', ')}.
          </p>
        )}
      </section>
    </div>
  );
}
