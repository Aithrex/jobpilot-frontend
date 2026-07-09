/* Aspirely Apply Assistant — ATS adapter registry.
 *
 * Each adapter file (adapters/<ats>.js) runs as its own IIFE and pushes itself
 * onto the shared `self.__JP_ADAPTERS` array. This file exposes the detection
 * entry point on `self.JPAdapters`. (Manifest-declared content scripts can't be
 * ES modules, so we share via the isolated-world global — same pattern as
 * config.js. Nothing here leaks to the host page's `window`.)
 *
 * detect(url, dom): try every specific adapter's match(url, dom) in registration
 * order; return the first that claims the page. If none claim it, fall back to
 * the generic semantic adapter. Adapter faults are swallowed so one bad adapter
 * can never break detection.
 */
(function () {
  "use strict";

  function all() {
    return Array.isArray(self.__JP_ADAPTERS) ? self.__JP_ADAPTERS.slice() : [];
  }

  function detect(url, dom) {
    const list = all();
    const u = url || (typeof location !== "undefined" ? location.href : "");
    const d = dom || (typeof document !== "undefined" ? document : null);

    for (const a of list) {
      if (!a || a.id === "generic" || typeof a.match !== "function") continue;
      try {
        if (a.match(u, d)) return a;
      } catch (_) {
        /* skip a faulting adapter */
      }
    }
    return list.find((a) => a && a.id === "generic") || null;
  }

  self.JPAdapters = { detect, all };
})();
