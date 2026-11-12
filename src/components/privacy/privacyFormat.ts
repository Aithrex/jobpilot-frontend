/** Small pure helpers for the privacy surfaces. No React here. */

import type { EmailListKey } from '@/types/privacy';

/** "in about 20 minutes" or "after 4:30 PM" (with the weekday when not today). */
export function formatRetryAfter(seconds: number, now: Date = new Date()): string {
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  const at = new Date(now.getTime() + seconds * 1000);
  const sameDay = at.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat('en-US', {
    ...(sameDay ? {} : { weekday: 'long' }),
    hour: 'numeric',
    minute: '2-digit',
  }).format(at);
  return `after ${time}`;
}

/** "Nov 11, 2026", or null for a missing or unparseable timestamp. */
export function formatPrivacyDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
}

/** Hand a Blob to the browser as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Display copy for each email list. Keys mirror the backend contract. */
export const EMAIL_LIST_COPY: Record<EmailListKey, { label: string; description: string }> = {
  job_alerts: {
    label: 'Job alerts',
    description: 'New strong matches and alerts for your saved searches.',
  },
  digests: {
    label: 'Digests',
    description: 'Your morning job digest and evening summary.',
  },
  product_updates: {
    label: 'Product updates',
    description: 'Occasional news about Aspirely features.',
  },
  marketing: {
    label: 'Marketing',
    description: 'Promotional email from Aspirely.',
  },
};

/** A list name from an unsubscribe token, in words. Unknown lists read as-is. */
export function emailListLabel(list: string | null | undefined): string {
  if (!list) return 'this email list';
  const known = EMAIL_LIST_COPY[list as EmailListKey];
  if (known) return known.label;
  return list.replace(/[_-]+/g, ' ').trim() || 'this email list';
}
