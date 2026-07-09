/* ATS adapter: Greenhouse (boards.greenhouse.io, job-boards.greenhouse.io, and
 * embedded #grnhse_app iframes). Registers itself on the shared adapter registry
 * (self.__JP_ADAPTERS) — see adapters/index.js. Content scripts can't use ES
 * module exports, so we use the same global-attach pattern as config.js.
 *
 * Common adapter shape:
 *   { id, match(url, dom) -> bool,
 *     fields() -> [{ selector, canonical, kind }],
 *     essayQuestions() -> [{ selector, label }] }
 *
 * `selector` may match several nodes; the resolver takes the first fillable,
 * empty one. `canonical` is a field key resolved to a profile value in
 * lib/resolver.js. We deliberately do NOT map sensitive/EEO/work-auth fields —
 * those are surfaced for the user to answer themselves.
 */
(function () {
  "use strict";

  const adapter = {
    id: "greenhouse",

    match(url, dom) {
      const host = /(?:^|\.)greenhouse\.io$/i;
      try {
        if (host.test(new URL(url).hostname)) return true;
      } catch (_) {
        /* fall through to DOM signature */
      }
      const d = dom || document;
      return !!(
        d.querySelector("#grnhse_app, #application_form, #main_fields") ||
        d.querySelector('form[action*="greenhouse"]') ||
        (d.querySelector("#first_name") && d.querySelector("#last_name") && d.querySelector("#email"))
      );
    },

    fields() {
      return [
        { selector: '#first_name, input[name="first_name"], input[autocomplete="given-name"]', canonical: "first_name", kind: "text" },
        { selector: '#last_name, input[name="last_name"], input[autocomplete="family-name"]', canonical: "last_name", kind: "text" },
        { selector: '#email, input[name="email"], input[type="email"], input[autocomplete="email"]', canonical: "email", kind: "email" },
        { selector: '#phone, input[name="phone"], input[type="tel"], input[autocomplete="tel"]', canonical: "phone", kind: "tel" },
        // Greenhouse location is an autocomplete text box; write the string, user confirms the suggestion.
        { selector: '#job_application_location, input[name="job_application[location]"], input#location, input[autocomplete="address-level2"]', canonical: "location", kind: "text" },
      ];
    },

    essayQuestions() {
      const out = [];
      const scope = document.querySelector("#application_form, #grnhse_app, form") || document;
      scope.querySelectorAll("textarea").forEach((el, i) => {
        if (el.disabled || el.readOnly) return;
        out.push({ selector: null, el, label: labelFor(el) || `Open-ended question ${i + 1}` });
      });
      return out;
    },
  };

  function labelFor(el) {
    if (!el) return "";
    if (el.getAttribute && el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
    if (el.id) {
      try {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab && lab.innerText.trim()) return lab.innerText.trim();
      } catch (_) {}
    }
    if (el.labels && el.labels.length) return (el.labels[0].innerText || "").trim();
    return "";
  }

  (self.__JP_ADAPTERS = self.__JP_ADAPTERS || []).push(adapter);
})();
