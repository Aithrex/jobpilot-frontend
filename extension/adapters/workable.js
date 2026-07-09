/* ATS adapter: Workable (apply.workable.com, *.workable.com). Lighter map —
 * identity core + semantic fallback for the rest. */
(function () {
  "use strict";

  const adapter = {
    id: "workable",

    match(url, dom) {
      try {
        if (/(?:^|\.)workable\.com$/i.test(new URL(url).hostname)) return true;
      } catch (_) {}
      const d = dom || document;
      return !!(
        d.querySelector('[data-ui="application-form"], form[action*="workable"]') ||
        d.querySelector('input[name="firstname"], input[name="lastname"]')
      );
    },

    fields() {
      return [
        { selector: 'input[name="firstname"], #firstname, input[autocomplete="given-name"]', canonical: "first_name", kind: "text" },
        { selector: 'input[name="lastname"], #lastname, input[autocomplete="family-name"]', canonical: "last_name", kind: "text" },
        { selector: 'input[name="email"], #email, input[type="email"]', canonical: "email", kind: "email" },
        { selector: 'input[name="phone"], #phone, input[type="tel"]', canonical: "phone", kind: "tel" },
        { selector: 'input[name="address"], input[aria-label*="location" i], #address', canonical: "location", kind: "text" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector('[data-ui="application-form"], form') || document;
      scope.querySelectorAll("textarea").forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        const label = (el.getAttribute("aria-label") || el.placeholder || "").trim();
        out.push({ selector: null, el, label: label || `Question ${i + 1}` });
      });
      return out;
    },
  };

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
