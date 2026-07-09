/* JobPilot Apply Assistant — PII redaction.
 *
 * Used ONLY on the last-resort LLM field-disambiguation path (lib/resolver.js),
 * and ONLY before a page snippet ever leaves the browser. Everything here runs
 * in the content script's ISOLATED world; nothing is exposed to the host page.
 *
 * Strategy: two passes.
 *   1) Value-based — scrub the user's own known profile values (name, email,
 *      phone, links, location) so their real data can never be shipped even if a
 *      generic pattern misses it.
 *   2) Pattern-based — scrub anything that merely looks like PII (emails, phone
 *      numbers, URLs, long digit runs / SSN-like, street addresses).
 *
 * We only ever send the RESULT of this to the network, and only when the
 * operator has explicitly enabled LLM disambiguation (off by default).
 */
(function () {
  "use strict";

  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const URL_RE = /\bhttps?:\/\/[^\s"'<>()]+/gi;
  const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
  const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
  const LONGNUM_RE = /\b\d{6,}\b/g;
  const STREET_RE = /\b\d{1,6}\s+[A-Za-z0-9.\s]{2,40}\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b/gi;

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Collect the user's own values from the profile so we can scrub them by value.
  function profileValues(profile) {
    const out = [];
    if (!profile || typeof profile !== "object") return out;
    const p = profile.personal || {};
    const l = profile.links || {};
    for (const v of [p.name, p.email, p.phone, p.location, l.linkedin, l.github, l.portfolio]) {
      if (typeof v === "string" && v.trim().length >= 3) out.push(v.trim());
    }
    // Also scrub individual name tokens (first / last) which appear standalone.
    if (typeof p.name === "string") {
      for (const tok of p.name.trim().split(/\s+/)) {
        if (tok.length >= 2) out.push(tok);
      }
    }
    // Longest first so partial values don't leave fragments behind.
    return out.sort((a, b) => b.length - a.length);
  }

  /**
   * Redact a free-text snippet. `profile` is optional; when present its own
   * values are scrubbed by exact (case-insensitive) match in addition to the
   * generic pattern sweep.
   * @returns {string}
   */
  function redact(text, profile) {
    if (typeof text !== "string" || !text) return "";
    let out = text;

    for (const val of profileValues(profile)) {
      try {
        out = out.replace(new RegExp(escapeRe(val), "gi"), "[REDACTED]");
      } catch (_) {
        /* pathological value — skip, the pattern sweep still covers it */
      }
    }

    out = out
      .replace(EMAIL_RE, "[EMAIL]")
      .replace(URL_RE, "[URL]")
      .replace(SSN_RE, "[ID]")
      .replace(STREET_RE, "[ADDRESS]")
      .replace(PHONE_RE, "[PHONE]")
      .replace(LONGNUM_RE, "[NUM]");

    // Clamp so we never ship an oversized snippet.
    return out.slice(0, 1200);
  }

  /** True if the (already-scrubbed) string still contains obvious PII. Used as a
   *  belt-and-suspenders guard before anything is sent. */
  function looksClean(text) {
    if (typeof text !== "string") return false;
    return !(EMAIL_RE.test(text) || PHONE_RE.test(text) || SSN_RE.test(text));
  }

  self.JPRedact = { redact, looksClean };
})();
