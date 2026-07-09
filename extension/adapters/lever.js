/* ATS adapter: Lever (jobs.lever.co/<company>/<id>/apply).
 * Lever uses stable name attributes, including bracketed URL fields
 * (urls[LinkedIn], urls[GitHub], urls[Portfolio]) — highly deterministic. */
(function () {
  "use strict";

  const adapter = {
    id: "lever",

    match(url, dom) {
      try {
        if (/(?:^|\.)lever\.co$/i.test(new URL(url).hostname)) return true;
      } catch (_) {}
      const d = dom || document;
      return !!(
        d.querySelector('form[action*="lever"], .application-form, .postings-btn-wrapper') ||
        d.querySelector('input[name="urls[LinkedIn]"], input[name="urls[GitHub]"]')
      );
    },

    fields() {
      return [
        { selector: 'input[name="name"], input[autocomplete="name"]', canonical: "full_name", kind: "text" },
        { selector: 'input[name="email"], input[type="email"]', canonical: "email", kind: "email" },
        { selector: 'input[name="phone"], input[type="tel"]', canonical: "phone", kind: "tel" },
        { selector: 'input[name="org"]', canonical: "org", kind: "text" },
        { selector: 'input[name="location"], #location-input', canonical: "location", kind: "text" },
        { selector: 'input[name="urls[LinkedIn]"]', canonical: "linkedin", kind: "url" },
        { selector: 'input[name="urls[GitHub]"]', canonical: "github", kind: "url" },
        { selector: 'input[name="urls[Portfolio]"], input[name="urls[Other]"]', canonical: "portfolio", kind: "url" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector(".application-form, form") || document;
      scope.querySelectorAll("textarea").forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        let label = (el.getAttribute("aria-label") || el.placeholder || "").trim();
        if (!label) {
          const card = el.closest(".application-question, .application-additional, li, div");
          const lab = card && card.querySelector("label, .application-label, .text");
          if (lab) label = (lab.innerText || "").trim();
        }
        out.push({ selector: null, el, label: label || `Additional question ${i + 1}` });
      });
      return out;
    },
  };

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
