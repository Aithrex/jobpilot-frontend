/**
 * Tech feed feature flag.
 *
 * The unified feed ships dark. Two switches, in priority order:
 *
 * 1. localStorage `aspirely.techFeed.enabled` - a per-browser override so the
 *    feed can be turned on for a demo, or turned OFF as an instant rollback,
 *    with no deploy. "1"/"true"/"on" enables, "0"/"false"/"off" disables.
 * 2. Build-time `VITE_TECH_FEED` - the fleet-wide default, same vocabulary.
 *
 * Unset in both places means OFF: the three legacy fan-out tabs keep rendering
 * exactly as they do today.
 */

export const TECH_FEED_OVERRIDE_KEY = 'aspirely.techFeed.enabled';

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

/** The single gate. Read once at mount so the answer cannot change mid-render. */
export function isTechFeedEnabled(): boolean {
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
