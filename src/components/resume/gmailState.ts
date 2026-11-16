/**
 * The Gmail connection as plain facts: which screen a status means, and the
 * machine code behind a failed call. Kept apart from the components so the
 * tracker row, Settings and the OAuth landing page all read one answer.
 */
import type { GmailState, GmailStatus } from '@/types/gmail';

/**
 * The screen a status asks for. The backend sends `state`; an older backend
 * (the two repos deploy separately) does not, so the same answer is worked
 * out from the fields it always sent.
 */
export function gmailStateOf(status: GmailStatus): GmailState {
  if (status.state) return status.state;
  if (!status.configured) return 'unavailable';
  if (!status.connected) return 'not_connected';
  if (status.needs_reconnect) return 'needs_reconnect';
  if (status.sync?.state === 'running') return 'syncing';
  if (status.has_more) return 'paused';
  if (!status.last_synced_at) return 'never_synced';
  return 'synced';
}

/** The `code` a Gmail endpoint attaches to a failure, if it sent one. */
export function gmailErrorCode(resp: { errorPayload?: Record<string, unknown> }): string | null {
  const code = resp.errorPayload?.code;
  return typeof code === 'string' && code ? code : null;
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'never';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** "Nov 22" for a date the user has to act by. Empty when unparseable. */
export function formatDay(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Start Google's consent screen. Returns an error sentence, or null once the browser is leaving. */
export async function startGmailConnect(
  getAuthUrl: () => Promise<{ data?: { auth_url: string }; error?: string }>,
): Promise<string | null> {
  const resp = await getAuthUrl();
  if (resp.error || !resp.data?.auth_url) {
    return 'Aspirely could not open the Google sign in screen. Nothing was connected. Try again in a moment.';
  }
  window.location.assign(resp.data.auth_url);
  return null;
}
