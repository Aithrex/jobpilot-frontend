/* ATS adapter: Workday (*.myworkdayjobs.com).
 * Workday is a heavily-virtualized multi-step wizard; the reliable hooks are
 * its data-automation-id attributes. We map the "My Information" step's core
 * identity fields. Workday renders the form step-by-step, so on any given view
 * only a subset of these will be present — the resolver simply skips absent
 * selectors. */
(function () {
  "use strict";

  const adapter = {
    id: "workday",

    match(url, dom) {
      try {
        if (/(?:^|\.)myworkdayjobs\.com$/i.test(new URL(url).hostname)) return true;
      } catch (_) {}
      const d = dom || document;
      return !!d.querySelector('[data-automation-id="legalNameSection_firstName"], [data-automation-id="jobPostingHeader"], [data-automation-id="applyFlowPage"]');
    },

    fields() {
      return [
        { selector: '[data-automation-id="legalNameSection_firstName"]', canonical: "first_name", kind: "text" },
        { selector: '[data-automation-id="legalNameSection_lastName"]', canonical: "last_name", kind: "text" },
        { selector: '[data-automation-id="preferredNameSection_firstName"]', canonical: "first_name", kind: "text" },
        { selector: '[data-automation-id="email"], [data-automation-id="contactInformation_email"], input[type="email"]', canonical: "email", kind: "email" },
        { selector: '[data-automation-id="phone-number"], [data-automation-id="phoneNumber"]', canonical: "phone", kind: "tel" },
        { selector: '[data-automation-id="addressSection_city"]', canonical: "city", kind: "text" },
        { selector: '[data-automation-id="linkedinQuestion"] input, input[aria-label*="LinkedIn" i]', canonical: "linkedin", kind: "url" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector('[data-automation-id="applyFlowPage"], form') || document;
      scope.querySelectorAll('textarea, [data-automation-id="multiSelectContainer"] textarea').forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        let label = (el.getAttribute("aria-label") || el.placeholder || "").trim();
        if (!label) {
          const wrap = el.closest('[data-automation-id]');
          const lab = wrap && wrap.querySelector('label, [data-automation-id="richText"]');
          if (lab) label = (lab.innerText || "").trim();
        }
        out.push({ selector: null, el, label: label || `Question ${i + 1}` });
      });
      return out;
    },
  };

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
