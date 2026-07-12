/**
 * Craft cross-surface handoffs — one typed source of truth.
 *
 * The Tailor tool can be launched from two other surfaces, each with its own
 * (previously ad-hoc) storage + signalling mechanism. This module consolidates
 * both, plus the short-lived JD text cache, so the coordination lives in one
 * testable place instead of being duplicated across ResumeParser, BatchTailor,
 * and DailyPipelinePanel.
 *
 *   1. Daily Pipeline → Tailor (same-tab): the pipeline writes a
 *      `pending_tailor_job` payload to sessionStorage and dispatches a
 *      `portfolio:navigate-to-tailor` window event. The Tailor surface may
 *      already be mounted when this fires, so it listens for the event AND
 *      reads once on mount (a deep-link can land before the writer runs).
 *
 *   2. Batch Tailor → Tailor (new tab): "Edit ↗" opens a new tab at
 *      `?tab=tailor&load_batch=<jobId>`; the payload rides in localStorage
 *      (each tab has its own sessionStorage, so session storage can't cross
 *      the tab boundary — localStorage can).
 *
 * All reads are one-shot: the payload is removed as it's consumed so a refresh
 * doesn't replay a stale handoff.
 */
import type { JDAnalysis, TailoredFullResume } from '../types/resume';

/* ── Keys & the cross-surface event name ─────────────────────────────────── */

const PENDING_TAILOR_JOB_KEY = 'pending_tailor_job';
const BATCH_HANDOFF_PREFIX = 'batch_handoff_';
const JD_CACHE_PREFIX = 'jd_cache:';
/** Fired by a producer so an already-mounted Tailor surface re-reads the payload. */
export const NAVIGATE_TO_TAILOR_EVENT = 'portfolio:navigate-to-tailor';
/** JD cache entries older than this are ignored (and treated as absent). */
const JD_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

/* ── Payload shapes ──────────────────────────────────────────────────────── */

/** Daily-Pipeline → Tailor payload (sessionStorage, same-tab). */
export interface PendingTailorJob {
  job_id: string;
  jd_text: string;
  jd_fetch_failed?: boolean;
  title?: string;
  company?: string;
  url?: string;
}

/** Batch → Tailor payload (localStorage, cross-tab). */
export interface BatchHandoff {
  tailored_resume: TailoredFullResume;
  jd_analysis: JDAnalysis;
  title?: string;
  source_url?: string;
}

/* ── Safe JSON storage helpers (storage can throw: quota, privacy mode) ──── */

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privacy mode — handoff is best-effort */
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ── Daily Pipeline → Tailor ─────────────────────────────────────────────── */

/** Producer: stage a pending tailor job and wake any mounted Tailor surface. */
export function stagePendingTailorJob(job: PendingTailorJob): void {
  writeJson(sessionStorage, PENDING_TAILOR_JOB_KEY, job);
  try {
    window.dispatchEvent(new CustomEvent(NAVIGATE_TO_TAILOR_EVENT));
  } catch {
    /* SSR / no window — ignore */
  }
}

/** Consumer: read-and-clear the staged tailor job (one-shot). */
export function consumePendingTailorJob(): PendingTailorJob | null {
  const payload = readJson<PendingTailorJob>(sessionStorage, PENDING_TAILOR_JOB_KEY);
  if (payload) remove(sessionStorage, PENDING_TAILOR_JOB_KEY);
  return payload && payload.job_id ? payload : null;
}

/**
 * Subscribe to navigate-to-tailor events. Returns an unsubscribe fn. The
 * callback is deferred a tick so a producer that dispatches immediately after
 * writing sessionStorage is guaranteed to have landed the write first.
 */
export function onNavigateToTailor(cb: () => void): () => void {
  const handler = () => window.setTimeout(cb, 0);
  window.addEventListener(NAVIGATE_TO_TAILOR_EVENT, handler);
  return () => window.removeEventListener(NAVIGATE_TO_TAILOR_EVENT, handler);
}

/* ── Batch → Tailor (new tab) ────────────────────────────────────────────── */

/** Producer: stash a batch result and return the URL that opens it in Tailor. */
export function stageBatchHandoff(jobId: string, payload: BatchHandoff): string {
  writeJson(localStorage, `${BATCH_HANDOFF_PREFIX}${jobId}`, payload);
  return `${window.location.origin}/?tab=tailor&load_batch=${encodeURIComponent(jobId)}`;
}

/** Read the `load_batch` id from the current URL, if present. */
export function readBatchHandoffIdFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('load_batch');
  } catch {
    return null;
  }
}

/** Consumer: read-and-clear a staged batch handoff by id (one-shot). */
export function consumeBatchHandoff(jobId: string): BatchHandoff | null {
  const key = `${BATCH_HANDOFF_PREFIX}${jobId}`;
  const payload = readJson<BatchHandoff>(localStorage, key);
  if (payload) remove(localStorage, key);
  return payload && payload.tailored_resume && payload.jd_analysis ? payload : null;
}

/** Strip `?load_batch=…` from the address bar so a refresh doesn't replay it. */
export function clearBatchHandoffFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('load_batch');
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ignore */
  }
}

/* ── Short-lived JD text cache (keyed by posting URL) ─────────────────────── */

/** Cache fetched JD text so a retry/handoff can recover it without re-scraping. */
export function cacheJdText(url: string, text: string): void {
  if (!url || !text) return;
  writeJson(sessionStorage, `${JD_CACHE_PREFIX}${url}`, { text, at: Date.now() });
}

/** Read cached JD text for a URL, or null if absent/expired. */
export function readCachedJdText(url: string): string | null {
  const obj = readJson<{ text: string; at: number }>(
    sessionStorage,
    `${JD_CACHE_PREFIX}${url}`,
  );
  if (!obj?.text) return null;
  if (Date.now() - obj.at >= JD_CACHE_TTL_MS) return null;
  return obj.text;
}
