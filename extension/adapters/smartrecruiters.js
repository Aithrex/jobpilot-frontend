/* ATS adapter: SmartRecruiters (jobs.smartrecruiters.com, careers.smartrecruiters.com,
 * *.smartrecruiters.com). Lighter map — identity core + semantic fallback. */
(function () {
  "use strict";

  const adapter = {
    id: "smartrecruiters",

    match(url, dom) {
      try {
        if (/(?:^|\.)smartrecruiters\.com$/i.test(new URL(url).hostname)) return true;
      } catch (_) {}
      const d = dom || document;
      return !!(
        d.querySelector('[data-test="application-form"], form[action*="smartrecruiters"]') ||
        d.querySelector('input[name="firstName"], input[name="lastName"]')
      );
    },

    fields() {
      return [
        { selector: 'input[name="firstName"], #firstName, input[autocomplete="given-name"]', canonical: "first_name", kind: "text" },
        { selector: 'input[name="lastName"], #lastName, input[autocomplete="family-name"]', canonical: "last_name", kind: "text" },
        { selector: 'input[name="email"], #email, input[type="email"]', canonical: "email", kind: "email" },
        { selector: 'input[name="phoneNumber"], #phoneNumber, input[type="tel"]', canonical: "phone", kind: "tel" },
        { selector: 'input[name="location"], input[aria-label*="location" i]', canonical: "location", kind: "text" },
        { selector: 'input[name="linkedinProfileUrl"], input[aria-label*="linkedin" i]', canonical: "linkedin", kind: "url" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector('[data-test="application-form"], form') || document;
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
