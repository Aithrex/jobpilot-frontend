/* ATS adapter: generic fallback. Used when no specific ATS is detected. It
 * provides NO deterministic selector map — every field goes through the
 * resolver's label/aria/placeholder semantic pass (and, if the operator has
 * enabled it, the redaction-gated LLM disambiguation last resort). Its match()
 * always returns true, but the registry only ever falls back to it after every
 * specific adapter has declined (see adapters/index.js). */
(function () {
  "use strict";

  const adapter = {
    id: "generic",

    match() {
      return true;
    },

    fields() {
      return [];
    },

    essayQuestions() {
      const out = [];
      document.querySelectorAll("textarea").forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        // Skip our own review-card / panel textareas defensively.
        if (el.closest("#jobpilot-ext-root")) return;
        const label = (el.getAttribute("aria-label") || el.placeholder || "").trim();
        out.push({ selector: null, el, label: label || `Open-ended question ${i + 1}` });
      });
      return out;
    },
  };

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
