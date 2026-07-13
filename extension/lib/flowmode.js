/* Aspirely Apply Assistant — Flow Mode helpers.
 *
 * Flow Mode is the hands-free assist layer: when enabled, content.js detects an
 * application form automatically, fills it, and — once a step has NOTHING left
 * that only the user can answer — clicks the site's own Next / Continue button
 * to advance a multi-step wizard (Workday et al). It NEVER clicks Submit /
 * Apply / Finish: the final submit stays the user's click (or the separately
 * triple-gated opt-in auto-submit in lib/autosubmit.js).
 *
 * This module owns the three primitives content.js composes:
 *   getSettings / onChange — the two popup toggles (chrome.storage.local):
 *       jp_flow_autofill    — auto-fill forms on detection (default ON)
 *       jp_flow_autoadvance — auto-click Next when a step is complete (default ON)
 *     Storage errors fail SAFE: both report OFF, so Flow Mode goes manual-only.
 *   findNextButton — locate a step-advance button. Adapter hints first
 *     (adapter.nextSelectors), then a conservative generic text scan. Any button
 *     whose text smells like submit/apply/sign-in is HARD-blocked.
 *   countBlockers — how many things on this step only the user can do:
 *     required-but-empty inputs/selects/radios/files, custom required comboboxes
 *     still on "Select One", visible validation errors. While > 0, content.js
 *     waits (and re-checks on DOM changes) instead of advancing.
 *
 * Exposed on self.JPFlow (isolated world only).
 */
(function () {
  "use strict";

  const KEY_AUTOFILL = "jp_flow_autofill";
  const KEY_AUTOADVANCE = "jp_flow_autoadvance";

  async function getSettings() {
    try {
      const bag = await chrome.storage.local.get([KEY_AUTOFILL, KEY_AUTOADVANCE]);
      // Absent = ON (Flow Mode is the product default); only an explicit false disables.
      return {
        autofill: bag[KEY_AUTOFILL] !== false,
        autoadvance: bag[KEY_AUTOADVANCE] !== false,
      };
    } catch (_) {
      return { autofill: false, autoadvance: false }; // storage unavailable ⇒ manual only
    }
  }

  function onChange(cb) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes[KEY_AUTOFILL] || changes[KEY_AUTOADVANCE]) getSettings().then(cb);
      });
    } catch (_) {}
  }

  // ------------------------------------------------------------------
  // DOM helpers (same conventions as lib/autosubmit.js)
  // ------------------------------------------------------------------
  function inOwnUi(el) {
    try {
      return !!(
        el.closest("#jobpilot-ext-root") ||
        el.closest("[data-jobpilot-autosubmit]") ||
        el.closest("[data-jobpilot-reviewcard]")
      );
    } catch (_) {
      return false;
    }
  }

  function isVisible(el) {
    if (!el || el.disabled) return false;
    try {
      if (el.getAttribute && el.getAttribute("aria-hidden") === "true") return false;
      const rects = el.getClientRects();
      if (!rects || !rects.length) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") return false;
      if (parseFloat(st.opacity || "1") === 0) return false;
    } catch (_) {
      return false;
    }
    return true;
  }

  function textOf(el) {
    try {
      return (el.innerText || el.value || (el.getAttribute && el.getAttribute("aria-label")) || "").trim();
    } catch (_) {
      return "";
    }
  }

  // ------------------------------------------------------------------
  // Next-button location. The blocklist is the safety boundary: even an
  // adapter-hinted selector is rejected if its live text smells like a submit.
  // ------------------------------------------------------------------
  const NEXT_POSITIVE = /^\s*(?:next|continue|save\s*(?:and|&)\s*continue|next\s*step|continue\s*to\s*next\s*step|save\s*&?\s*next)\s*(?:→|›|>|»)?\s*$/i;
  const NEXT_BLOCK = /submit|apply|finish|complete|\bsend\b|sign\s?in|sign\s?up|log\s?in|register|create\s+account|back|previous|cancel|delete|remove|withdraw|upload|attach|search|dismiss|close/i;

  const NEXT_SELECTORS = {
    workday: [
      'button[data-automation-id="bottom-navigation-next-button"]',
      'button[data-automation-id="pageFooterNextButton"]',
    ],
    icims: ['#quick_apply_next', 'button[title="Next" i]'],
  };

  function acceptNextText(t) {
    return !!t && NEXT_POSITIVE.test(t) && !NEXT_BLOCK.test(t);
  }

  function findNextButton(adapter) {
    const id = (adapter && adapter.id) || "generic";
    const hinted = (adapter && Array.isArray(adapter.nextSelectors) && adapter.nextSelectors) || NEXT_SELECTORS[id] || [];

    // 1) Adapter-hinted selectors — still text-verified against the blocklist.
    for (const sel of hinted) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch (_) {
        continue;
      }
      for (const el of nodes) {
        if (inOwnUi(el) || !isVisible(el)) continue;
        const t = textOf(el);
        if (t && NEXT_BLOCK.test(t)) continue; // a hinted selector NEVER overrides the blocklist
        return el;
      }
    }

    // 2) Generic scan — positive text only, blocklist enforced. If several match
    //    (rare), take the LAST visible one: step footers render at the bottom.
    const candidates = [];
    let nodes;
    try {
      nodes = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a[role="button"]');
    } catch (_) {
      nodes = [];
    }
    nodes.forEach((el) => {
      if (inOwnUi(el) || !isVisible(el)) return;
      if (!acceptNextText(textOf(el))) return;
      candidates.push(el);
    });
    return candidates.length ? candidates[candidates.length - 1] : null;
  }

  // ------------------------------------------------------------------
  // Step blockers — anything only the user can resolve. While countBlockers()
  // is > 0, Flow Mode waits instead of advancing.
  // ------------------------------------------------------------------
  const UNCHOSEN_RE = /select\s*one|^\s*select\b|please\s+(?:select|choose)|^\s*choose\b|^\s*-+\s*$/i;

  function isRequired(el) {
    try {
      return !!(el.required || (el.getAttribute && el.getAttribute("aria-required") === "true"));
    } catch (_) {
      return false;
    }
  }

  function countBlockers() {
    let n = 0;
    const seenRadioGroups = new Set();

    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (inOwnUi(el) || !isVisible(el) || !isRequired(el)) return;
      if (el.tagName === "SELECT") {
        const opt = el.selectedOptions && el.selectedOptions[0];
        if (!el.value || (opt && UNCHOSEN_RE.test(opt.textContent || ""))) n++;
        return;
      }
      const type = (el.type || "text").toLowerCase();
      if (type === "file") {
        if (!el.files || !el.files.length) n++;
        return;
      }
      if (type === "checkbox") {
        if (!el.checked) n++;
        return;
      }
      if (type === "radio") {
        const name = el.name || "";
        if (!name || seenRadioGroups.has(name)) return;
        seenRadioGroups.add(name);
        try {
          if (!document.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`)) n++;
        } catch (_) {}
        return;
      }
      if (!el.value || !String(el.value).trim()) n++;
    });

    // Custom required widgets (Workday listbox buttons, ARIA comboboxes) still
    // showing a "Select One"-style placeholder.
    document.querySelectorAll('[aria-required="true"]').forEach((el) => {
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return; // counted above
      if (inOwnUi(el) || !isVisible(el)) return;
      const role = el.getAttribute("role") || "";
      const isWidget = role === "combobox" || role === "listbox" || role === "spinbutton" || el.getAttribute("aria-haspopup") === "listbox";
      if (!isWidget) return;
      const t = textOf(el);
      if (!t || UNCHOSEN_RE.test(t)) n++;
    });

    // Live validation errors: the site is telling the user something is wrong —
    // never advance over them.
    try {
      document.querySelectorAll('[data-automation-id="errorBanner"], [aria-invalid="true"]').forEach((el) => {
        if (!inOwnUi(el) && isVisible(el)) n++;
      });
    } catch (_) {}

    return n;
  }

  // A stable-enough identity for "the step the user is looking at" — used so
  // Flow Mode never auto-clicks the same step's Next more than a bounded number
  // of times.
  function stepKey() {
    let heading = "";
    try {
      const h = document.querySelector('[data-automation-id="progressBarActiveStep"], main h1, main h2, h1, h2');
      heading = (h && h.innerText && h.innerText.trim().slice(0, 80)) || "";
    } catch (_) {}
    return location.hostname + location.pathname + "|" + heading;
  }

  self.JPFlow = { getSettings, onChange, findNextButton, countBlockers, stepKey, isVisible };
})();
