/**
 * Cards the user keeps scrolling past on the For-you board.
 *
 * A card that sat on the first page of three separate visits without the user
 * opening, saving, hiding or applying to it has been looked at and passed
 * over. Best match then moves it after the rest of its band (never below a
 * lower band - see `sortJobsByMode`), so the board stops showing the same
 * first page every morning.
 *
 * Client-side only, by design: this is a per-browser habit, not a profile
 * fact, and nothing about it is sent to the server. Every storage access is
 * wrapped, because a full or blocked storage must never break the board.
 *
 * A "visit" is one page session (sessionStorage), so remounting the board or
 * paging back to page one in the same session counts once.
 */

export const BOARD_IMPRESSIONS_KEY = 'aspirely.board.impressions.v1';
const VISIT_KEY = 'aspirely.board.impressions.visit.v1';

/** Visits shown without action before a card moves down its band. */
export const PASSED_OVER_VISITS = 3;
/** The store keeps at most this many cards (the most recently shown). */
export const MAX_IMPRESSION_IDS = 3000;
/** Entries not shown for this long are dropped. */
export const IMPRESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface ImpressionEntry {
  /** Visits this card was on the first rendered page. */
  n: number;
  /** Epoch ms it was last counted. */
  t: number;
}

export type ImpressionStore = Record<string, ImpressionEntry>;

function isEntry(v: unknown): v is ImpressionEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return typeof e.n === 'number' && Number.isFinite(e.n) && typeof e.t === 'number' && Number.isFinite(e.t);
}

/** Drop stale and malformed entries, then keep the most recently shown. */
function prune(store: ImpressionStore, now: number): ImpressionStore {
  const live = Object.entries(store).filter(
    ([id, e]) => !!id && isEntry(e) && now - e.t <= IMPRESSION_TTL_MS,
  );
  if (live.length > MAX_IMPRESSION_IDS) {
    live.sort((a, b) => b[1].t - a[1].t);
    live.length = MAX_IMPRESSION_IDS;
  }
  return Object.fromEntries(live);
}

function read(now: number): ImpressionStore {
  try {
    const raw = window.localStorage.getItem(BOARD_IMPRESSIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return prune(parsed as ImpressionStore, now);
  } catch {
    return {};
  }
}

function write(store: ImpressionStore): void {
  try {
    window.localStorage.setItem(BOARD_IMPRESSIONS_KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked: the board just does not learn this visit */
  }
}

/** The store as it stood when this visit began, pruned. */
export function loadImpressions(now = Date.now()): ImpressionStore {
  return read(now);
}

/** Has this card been passed over often enough to move down its band? */
export function isPassedOverIn(store: ImpressionStore, jobId: string): boolean {
  return (store[jobId]?.n ?? 0) >= PASSED_OVER_VISITS;
}

/** Memory fallback for a browser that blocks sessionStorage. */
let visitCountedInMemory = false;

function visitAlreadyCounted(): boolean {
  try {
    return window.sessionStorage.getItem(VISIT_KEY) === '1';
  } catch {
    return visitCountedInMemory;
  }
}

function markVisitCounted(): void {
  visitCountedInMemory = true;
  try {
    window.sessionStorage.setItem(VISIT_KEY, '1');
  } catch {
    /* falls back to the in-memory flag */
  }
}

/**
 * Count one visit for the cards on the FIRST rendered page. Runs once per
 * visit; later calls in the same session are no-ops and return false.
 * `acted` ids (already saved, applied, ...) are cleared instead of counted.
 */
export function recordFirstPageImpressions(
  jobIds: readonly string[],
  opts: { acted?: (jobId: string) => boolean; now?: number } = {},
): boolean {
  if (!jobIds.length || visitAlreadyCounted()) return false;
  const now = opts.now ?? Date.now();
  const store = read(now);
  for (const id of new Set(jobIds)) {
    if (!id) continue;
    if (opts.acted?.(id)) {
      delete store[id];
      continue;
    }
    store[id] = { n: (store[id]?.n ?? 0) + 1, t: now };
  }
  write(prune(store, now));
  markVisitCounted();
  return true;
}

/** The user acted on this card (opened, saved, hid, applied): forget it. */
export function clearImpression(jobId: string): void {
  if (!jobId) return;
  const store = read(Date.now());
  if (!(jobId in store)) return;
  delete store[jobId];
  write(store);
}
