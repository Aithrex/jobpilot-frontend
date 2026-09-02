/**
 * Product telemetry for the tech feed. Batched, best-effort, and carrying no
 * identity by construction.
 *
 * What is sent
 * ------------
 * Event names from a closed set, and dimensions that are filter KEYS, bucket
 * labels and vendor slugs. Never a filter VALUE, never a job id, never a
 * query string. "Somebody filtered by company" is a product fact; "somebody
 * filtered by Stripe" is that person's job hunt, and this file is where the
 * difference is enforced on the way out. The server enforces it again on the
 * way in - two independent checks, because a client is easy to change.
 *
 * Why batched
 * -----------
 * Card impressions are the highest-volume event in the product and the least
 * urgent. Sending one request per card would put the feed's most-scrolled
 * sessions at the top of the request log for no reason. Events accumulate for
 * `FLUSH_MS` or `MAX_BATCH` and go up in one call; the queue is also flushed
 * on `pagehide` so a session that ends mid-window is not lost.
 *
 * Why it can never break anything
 * --------------------------------
 * Every path is `void`-returning and swallows its own errors. Telemetry that
 * can fail a user action is worse than no telemetry.
 */
import { apiService } from '@/lib/api';
import type { TechFeedFilters, TechFeedTelemetryItem } from '@/types/techFeed';

const FLUSH_MS = 4000;
const MAX_BATCH = 25;
/** Above this the queue is dropped rather than grown. A tab left open for a
 *  week must not accumulate a megabyte of pending events. */
const MAX_QUEUE = 200;

let queue: TechFeedTelemetryItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenerBound = false;

function bindFlushOnHide(): void {
  if (listenerBound || typeof window === 'undefined') return;
  listenerBound = true;
  window.addEventListener('pagehide', () => void flushTechFeedTelemetry());
}

export function flushTechFeedTelemetry(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  try {
    // `void` covers a REJECTED promise. It does not cover a transport that
    // throws SYNCHRONOUSLY - a mocked client, an interceptor, a
    // `TypeError` from a missing method after a bad merge - and that would
    // propagate straight into whatever user action happened to trigger the
    // flush. "Telemetry never surfaces" has to hold for both.
    void apiService.recordTechFeedTelemetry(batch);
  } catch {
    /* the batch is dropped; a lost metric is not a lost user action */
  }
  if (queue.length) schedule();
}

function schedule(): void {
  bindFlushOnHide();
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushTechFeedTelemetry();
  }, FLUSH_MS);
}

export function trackTechFeed(item: TechFeedTelemetryItem): void {
  try {
    if (queue.length >= MAX_QUEUE) return;
    queue.push(item);
    if (queue.length >= MAX_BATCH) {
      flushTechFeedTelemetry();
      return;
    }
    schedule();
  } catch {
    /* telemetry never surfaces */
  }
}

/** Test seam. Drops anything queued without sending it. */
export function resetTechFeedTelemetry(): void {
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

// ── Dimension helpers ────────────────────────────────────────────

/**
 * Which filters are SET. Keys only.
 *
 * Derived from the filter object rather than hand-listed, so a filter added
 * to `TechFeedFilters` is measured without anyone remembering to add it here
 * — and a filter's VALUE cannot leak, because only the key is ever read.
 */
export function activeFilterKeys(filters: TechFeedFilters): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) keys.push(toSnake(key));
      continue;
    }
    if (typeof value === 'boolean') {
      if (value) keys.push(toSnake(key));
      continue;
    }
    if (typeof value === 'number') {
      keys.push(toSnake(key));
      continue;
    }
    // A string filter that is still at its default ('any', 'relevance') is
    // not a filter the user applied.
    if (value === 'any' || value === 'relevance') continue;
    keys.push(toSnake(key));
  }
  return keys.sort();
}

function toSnake(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Bucketed, never exact: a result count of 1 on a narrow filter set is
 *  closer to an identifier than to a metric. */
export function resultBucket(total: number): string {
  if (total <= 0) return '0';
  if (total < 10) return '1-9';
  if (total < 50) return '10-49';
  return '50+';
}

// ── Named events ─────────────────────────────────────────────────

export function trackSearch(filters: TechFeedFilters, total: number): void {
  const filterKeys = activeFilterKeys(filters);
  trackTechFeed({
    event: 'search',
    dimensions: {
      filter_keys: filterKeys,
      result_bucket: resultBucket(total),
      sort: filters.sort,
      employer_scope: filters.employerScope,
    },
  });
  if (total <= 0) {
    trackTechFeed({
      event: 'zero_result',
      dimensions: {
        filter_keys: filterKeys,
        employer_scope: filters.employerScope,
      },
    });
  }
}

export function trackZeroResultReason(reason: string): void {
  trackTechFeed({ event: 'zero_result', dimensions: { reason } });
}

export function trackFilterApplied(keys: string[]): void {
  if (!keys.length) return;
  trackTechFeed({ event: 'filter_applied', dimensions: { filter_keys: keys } });
}

export function trackCardImpressions(count: number, page: number): void {
  if (count <= 0) return;
  trackTechFeed({ event: 'card_impression', count, dimensions: { page } });
}

export function trackCardEngagement(
  kind: 'card_open' | 'card_apply_click' | 'card_save',
  ats?: string | null,
): void {
  trackTechFeed({ event: kind, dimensions: ats ? { ats } : undefined });
}

export function trackSourceFailure(ats: string, reason: string): void {
  trackTechFeed({ event: 'source_failure', dimensions: { ats, reason } });
}
