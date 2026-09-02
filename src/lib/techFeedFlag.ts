/**
 * Tech feed feature flag.
 *
 * The unified feed ships dark. Three switches, in priority order:
 *
 * 1. The `?techfeed=1` / `?techfeed=0` URL parameter - a staged rollout driven
 *    by LINK. Reading it WRITES the localStorage override below, so the choice
 *    survives the rest of the session and every later navigation; that is what
 *    makes "send this link to the beta cohort" work with no rebuild, and
 *    `?techfeed=0` an equally shareable rollback.
 * 2. localStorage `aspirely.techFeed.enabled` - a per-browser override so the
 *    feed can be turned on for a demo, or turned OFF as an instant rollback,
 *    with no deploy. "1"/"true"/"on" enables, "0"/"false"/"off" disables.
 * 3. Build-time `VITE_TECH_FEED` - the fleet-wide default, same vocabulary.
 *
 * Unset in all three places means OFF: the three legacy fan-out tabs keep
 * rendering exactly as they do today.
 */

export const TECH_FEED_OVERRIDE_KEY = 'aspirely.techFeed.enabled';

/** The URL parameter that drives a staged rollout. */
export const TECH_FEED_URL_PARAM = 'techfeed';

const TRUTHY = new Set(['1', 'true', 'on', 'yes']);
const FALSY = new Set(['0', 'false', 'off', 'no']);

function parse(raw: string | null | undefined): boolean | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim().toLowerCase();
  if (value === '') return null;
  if (TRUTHY.has(value)) return true;
  if (FALSY.has(value)) return false;
  return null;
}

/**
 * Read `?techfeed=...` and, when it says something, persist it as the
 * per-browser override.
 *
 * Returns the parsed value, or null when the parameter is absent or
 * unreadable - an unrecognised value is NOT treated as "off", because a typo
 * in a rollout link must not silently roll anyone back.
 */
export function applyTechFeedUrlOverride(search?: string): boolean | null {
  let raw: string | null = null;
  try {
    const query = search ?? (typeof window === 'undefined' ? '' : window.location.search);
    raw = new URLSearchParams(query).get(TECH_FEED_URL_PARAM);
  } catch {
    return null;
  }
  const parsed = parse(raw);
  if (parsed === null) return null;
  setTechFeedOverride(parsed);
  return parsed;
}

/** The single gate. Read once at mount so the answer cannot change mid-render. */
export function isTechFeedEnabled(): boolean {
  const fromUrl = applyTechFeedUrlOverride();
  if (fromUrl !== null) return fromUrl;

  let override: boolean | null = null;
  try {
    override =
      typeof window === 'undefined' ? null : parse(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY));
  } catch {
    /* private mode - fall through to the build flag */
  }
  if (override !== null) return override;

  return parse(import.meta.env.VITE_TECH_FEED as string | undefined) ?? false;
}

/**
 * Set (or clear, with `null`) the per-browser override. Clearing hands control
 * back to `VITE_TECH_FEED`.
 */
export function setTechFeedOverride(enabled: boolean | null): void {
  try {
    if (enabled === null) window.localStorage.removeItem(TECH_FEED_OVERRIDE_KEY);
    else window.localStorage.setItem(TECH_FEED_OVERRIDE_KEY, enabled ? '1' : '0');
  } catch {
    /* private mode - the override simply does not stick */
  }
}
