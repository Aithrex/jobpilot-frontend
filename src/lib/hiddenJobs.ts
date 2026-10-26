import { applyUrlKey } from '@/lib/careerJobs';

/**
 * "Hide" on a For-you card.
 *
 * Two changes from the original session-only list:
 *  - it lives in localStorage, so a hidden job stays hidden after the tab is
 *    closed (sessionStorage forgot it with the tab);
 *  - every entry is ALSO keyed by the posting's normalized application URL.
 *    A re-crawled or re-issued card can carry a new `job_id` for the same
 *    posting; keyed on the id alone, a hidden job came straight back. The URL
 *    is the posting's address, not a title match, so two openings with the
 *    same title are still two openings.
 *
 * Both kinds of key share one Set; URL keys carry a `url:` prefix so they can
 * never collide with an id.
 */
const HIDDEN_JOBS_KEY = 'aspirely.hidden-jobs.v2';
/** The old session-only key. Read once and folded in, so nothing hidden comes back. */
const LEGACY_SESSION_KEY = 'aspirely.hidden-jobs';
/** Oldest entries fall off past this, so the list cannot grow without bound. */
const MAX_ENTRIES = 2000;
const URL_PREFIX = 'url:';
export const HIDDEN_JOBS_CHANGED = 'jobs:hidden-changed';

function parseList(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function readKeys(): string[] {
  let keys: string[] = [];
  try {
    keys = parseList(window.localStorage.getItem(HIDDEN_JOBS_KEY));
  } catch {
    /* storage unavailable */
  }
  try {
    const legacy = parseList(window.sessionStorage.getItem(LEGACY_SESSION_KEY));
    for (const id of legacy) if (!keys.includes(id)) keys.push(id);
  } catch {
    /* storage unavailable */
  }
  return keys;
}

function writeKeys(keys: string[]) {
  try {
    window.localStorage.setItem(HIDDEN_JOBS_KEY, JSON.stringify(keys.slice(-MAX_ENTRIES)));
  } catch {
    /* private mode / quota: the hide still applies for this page view */
  }
}

/** The set a feed filters against. Holds job ids and `url:`-prefixed apply-URL keys. */
export function loadHiddenJobIds(): Set<string> {
  return new Set(readKeys());
}

/** Hide one posting by id and, when it has one, by its normalized apply URL. */
export function persistHiddenJobId(jobId: string, applyLink?: string | null): Set<string> {
  const keys = readKeys();
  const add = (key: string) => {
    if (key && !keys.includes(key)) keys.push(key);
  };
  add(jobId);
  const urlKey = applyUrlKey(applyLink);
  if (urlKey) add(`${URL_PREFIX}${urlKey}`);
  writeKeys(keys);
  window.dispatchEvent(new CustomEvent(HIDDEN_JOBS_CHANGED, { detail: keys }));
  return new Set(keys);
}

/** Is this posting hidden - by its id, or by the same application URL under another id? */
export function isHiddenJob(
  hidden: Set<string> | null | undefined,
  job: { job_id: string; apply_link?: string | null },
): boolean {
  if (!hidden?.size) return false;
  if (hidden.has(job.job_id)) return true;
  const urlKey = applyUrlKey(job.apply_link);
  return !!urlKey && hidden.has(`${URL_PREFIX}${urlKey}`);
}
