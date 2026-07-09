/* Aspirely Apply Assistant — client-side rate limit + humanizing jitter.
 *
 * Guards against the extension being used for spray-and-pray: a hard cap of
 * 40 autofills / rolling hour and 150 / rolling day, plus small randomized
 * delays so fills don't land with robotic timing. This is a client-side
 * courtesy limit (not a security boundary — the backend still meters answer
 * generation); it exists to keep behavior human and low-signal.
 *
 * Storage: a single array of epoch-ms timestamps in chrome.storage.local under
 * `jp_fill_events`, pruned to the last 24h on every read.
 */
(function () {
  "use strict";

  const KEY = "jp_fill_events";
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;
  const MAX_PER_HOUR = 40;
  const MAX_PER_DAY = 150;

  function now() {
    return Date.now();
  }

  async function readEvents() {
    try {
      const bag = await chrome.storage.local.get(KEY);
      const arr = Array.isArray(bag[KEY]) ? bag[KEY] : [];
      const cutoff = now() - DAY_MS;
      // Prune to the last 24h and keep only finite numbers.
      return arr.filter((t) => typeof t === "number" && isFinite(t) && t >= cutoff);
    } catch (_) {
      return [];
    }
  }

  async function writeEvents(arr) {
    try {
      await chrome.storage.local.set({ [KEY]: arr });
    } catch (_) {
      /* storage full / unavailable — fail open on write, the read-side cap still applies */
    }
  }

  /**
   * Decide whether another autofill is allowed right now.
   * @returns {Promise<{allowed:boolean, reason?:string, retryAfterMs?:number,
   *                     hour:number, day:number}>}
   */
  async function check() {
    const events = await readEvents();
    const hourCutoff = now() - HOUR_MS;
    const dayCount = events.length;
    const hourCount = events.filter((t) => t >= hourCutoff).length;

    if (hourCount >= MAX_PER_HOUR) {
      const oldestInHour = events.filter((t) => t >= hourCutoff).sort((a, b) => a - b)[0];
      return {
        allowed: false,
        reason: `Hourly limit reached (${MAX_PER_HOUR}/hr). Slow, tailored applications convert — take a break.`,
        retryAfterMs: Math.max(0, oldestInHour + HOUR_MS - now()),
        hour: hourCount,
        day: dayCount,
      };
    }
    if (dayCount >= MAX_PER_DAY) {
      const oldest = events.slice().sort((a, b) => a - b)[0];
      return {
        allowed: false,
        reason: `Daily limit reached (${MAX_PER_DAY}/day). Resets rolling over the next 24h.`,
        retryAfterMs: Math.max(0, oldest + DAY_MS - now()),
        hour: hourCount,
        day: dayCount,
      };
    }
    return { allowed: true, hour: hourCount, day: dayCount };
  }

  /** Record that an autofill happened (call AFTER a successful fill). */
  async function record() {
    const events = await readEvents();
    events.push(now());
    await writeEvents(events);
  }

  /** Uniform random delay in [min, max] ms — used to space out field writes. */
  function jitter(min, max) {
    const lo = typeof min === "number" ? min : 40;
    const hi = typeof max === "number" ? max : 180;
    return Math.round(lo + Math.random() * Math.max(0, hi - lo));
  }

  self.JPRateLimit = { check, record, jitter, MAX_PER_HOUR, MAX_PER_DAY };
})();
