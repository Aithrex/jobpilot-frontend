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

    // Flow Mode hint: Workday's wizard footer button ("Next" / "Save and
    // Continue"). lib/flowmode.js still text-verifies against its submit
    // blocklist, so the FINAL step's "Submit" button is never clicked here.
    nextSelectors: [
      'button[data-automation-id="bottom-navigation-next-button"]',
      'button[data-automation-id="pageFooterNextButton"]',
    ],

    // Deep fill for the Workday widgets that aren't plain inputs — prompt
    // dropdowns, type-to-search lists, per-row education/experience fields.
    // Interaction machinery in lib/widgets.js, ported from ApplyPilot where it
    // was validated against real tenants. Returns review rows for everything it
    // set. Only ever fills from profile data; EEO/demographic prompts stay
    // untouched (no such data in the profile — surfaced for the user instead).
    async postFill(profile) {
      const W = self.JPWidgets;
      if (!W || !profile) return [];
      const rows = [];
      const edu = Array.isArray(profile.education) ? profile.education : [];
      const exp = Array.isArray(profile.experience) ? profile.experience : [];
      const skills = (profile.skills && Array.isArray(profile.skills.flat) && profile.skills.flat) || [];

      // 1. Prompt dropdowns keyed by stable data-automation-id.
      const prompts = [
        // Workday requires a device type next to the phone; Mobile is the safe default.
        {
          aid: "phone-device-type",
          want: profile.personal && profile.personal.phone ? "Mobile" : "",
          label: "Phone device type",
          note: "Defaulted to Mobile — change on the form if that's wrong.",
        },
        {
          aid: "degree",
          want: ((edu.find((e) => e && e.degree && String(e.degree).trim()) || {}).degree || "").trim(),
          label: "Degree",
          note: "Picked from your résumé's first degree — verify on the form.",
        },
      ];
      for (const p of prompts) {
        if (!p.want) continue;
        const control = document.querySelector(`button[data-automation-id="${p.aid}"], [data-automation-id="${p.aid}"] button`);
        if (!control || !W.isVisible(control) || W.alreadyChosen(control)) continue;
        if (await W.selectFromPrompt(control, p.want)) {
          rows.push({ label: p.label, value: p.want, confidence: "medium", note: p.note });
        }
      }

      // 2. Type-to-search fields (located by label — these inputs have empty aids).
      //    Skills = one box, many terms. School / Field of Study = one per row.
      const typed = [];
      typed.push(...(await W.typeaheadByLabel(/add skills|(^|\b)skills?(\b|$)/i, (i) => (i === 0 ? skills.slice(0, 12) : []))));
      typed.push(...(await W.typeaheadByLabel(/field of study/i, (i) => [(edu[i] && edu[i].fieldOfStudy) || ""])));
      typed.push(...(await W.typeaheadByLabel(/school|university/i, (i) => [(edu[i] && edu[i].institution) || ""])));
      for (const t of typed) {
        rows.push({ label: t.label || "Search field", value: t.value, confidence: "medium", note: "Committed via the search list — verify the selection." });
      }

      // 3. Per-row plain text (label-based, matched by DOM order): each education
      //    card's GPA, each job's location/title/company.
      const textFills = [
        ...W.fillTextByLabel(/\bgpa\b|\bcgpa\b|grade point|grade average|overall result|final grade/i, edu.map((e) => e && e.gpa)),
        ...W.fillTextByLabel(/\blocation\b/i, exp.map((e) => e && e.location)),
        ...W.fillTextByLabel(/^job title$|^title$/i, exp.map((e) => e && e.title)),
        ...W.fillTextByLabel(/^company$|^employer$/i, exp.map((e) => e && e.company)),
      ];
      for (const f of textFills) {
        rows.push({ el: f.el, label: f.label, value: f.value, confidence: "medium", note: "" });
      }

      // 4. Work-authorization screening prompts — answered ONLY from the visa
      //    profile the user explicitly declared in the Aspirely app (never a
      //    guessed default), and flagged low-confidence for review. All other
      //    screening/EEO prompts remain the user's to answer.
      const wa = profile.work_authorization || {};
      const answerFor = (q) => {
        if (/authorized to work|legally.*(work|authorized)/i.test(q)) {
          if (wa.authorized_us === true) return "Yes";
          if (wa.authorized_us === false) return "No";
          return "";
        }
        if (/sponsorship|immigration filing|work permit|permanent residency|require .*(visa|immigration)/i.test(q)) {
          const future = /future|will you/i.test(q);
          const v = future ? wa.requires_sponsorship_future : wa.requires_sponsorship_now;
          const fallback = future ? wa.requires_sponsorship_now : wa.requires_sponsorship_future;
          const use = typeof v === "boolean" ? v : typeof fallback === "boolean" ? fallback : null;
          return use === null ? "" : use ? "Yes" : "No";
        }
        return "";
      };
      const placeholder = /^(select one|select response|select|choose|choose one)$/i;
      const buttons = Array.from(document.querySelectorAll("button")).filter((b) => W.isVisible(b) && placeholder.test((b.textContent || "").trim()));
      for (const btn of buttons) {
        const question = W.getLabelText(btn);
        const answer = answerFor(question || "");
        if (!answer) continue;
        if (await W.selectFromPrompt(btn, answer)) {
          rows.push({
            label: question.slice(0, 120),
            value: answer,
            confidence: "low",
            note: "From the visa profile you set in Aspirely — double-check before submitting.",
          });
        }
      }

      return rows;
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
