/* ATS adapter: Ashby (jobs.ashbyhq.com/<company>/... and *.ashbyhq.com).
 * Ashby is a React app. Core identity inputs carry _systemfield_* names; most
 * other fields are label-driven, so the resolver's semantic pass carries the
 * long tail. We map the deterministic core here. */
(function () {
  "use strict";

  const adapter = {
    id: "ashby",

    match(url, dom) {
      try {
        if (/(?:^|\.)ashbyhq\.com$/i.test(new URL(url).hostname)) return true;
      } catch (_) {}
      const d = dom || document;
      return !!(
        d.querySelector('[class*="ashby-application-form"], form[class*="ashby"]') ||
        d.querySelector('input[name="_systemfield_name"], input[name="_systemfield_email"]')
      );
    },

    fields() {
      return [
        { selector: 'input[name="_systemfield_name"], input[aria-label="Name" i]', canonical: "full_name", kind: "text" },
        { selector: 'input[name="_systemfield_email"], input[type="email"], input[aria-label*="email" i]', canonical: "email", kind: "email" },
        { selector: 'input[name="_systemfield_phone"], input[type="tel"], input[aria-label*="phone" i]', canonical: "phone", kind: "tel" },
        { selector: 'input[aria-label*="linkedin" i], input[name*="linkedin" i]', canonical: "linkedin", kind: "url" },
        { selector: 'input[aria-label*="github" i], input[name*="github" i]', canonical: "github", kind: "url" },
        { selector: 'input[aria-label*="website" i], input[aria-label*="portfolio" i], input[name*="website" i]', canonical: "portfolio", kind: "url" },
        { selector: 'input[aria-label*="location" i], input[name*="location" i]', canonical: "location", kind: "text" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector('[class*="ashby-application-form"], form') || document;
      scope.querySelectorAll("textarea").forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        let label = (el.getAttribute("aria-label") || el.placeholder || "").trim();
        if (!label) {
          const entry = el.closest('[class*="_fieldEntry"], [class*="field"], div');
          const lab = entry && entry.querySelector("label, [class*='_label']");
          if (lab) label = (lab.innerText || "").trim();
        }
        out.push({ selector: null, el, label: label || `Question ${i + 1}` });
      });
      return out;
    },
  };

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
