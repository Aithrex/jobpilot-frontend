/* Aspirely Apply Assistant — ATS widget interaction machinery.
 *
 * Ported from ApplyPilot (github.com/Siddardha-23/applypilot), where every
 * technique here was validated against real Workday tenants and fixed ad-hoc
 * over many live applications. The hard-won lessons preserved verbatim:
 *
 *   - realClick: Workday's React option rows commit on mousedown/mouseup — a
 *     bare .click() often does nothing and the menu just closes. Dispatch the
 *     full pointer+mouse sequence, and NEVER also call el.click() after it
 *     (that double-selects, e.g. duplicate skill pills).
 *   - typeaheadInto: type-to-search lists (Skills, Field of Study, School)
 *     render tenant-specific suggestion markup, so don't gate on finding a
 *     specific option element — type, wait for the fetch, real-click the row if
 *     one renders, else commit the highlighted match with Enter; if the input
 *     still shows the raw query, retry once.
 *   - inputsByLabel: real tenants identify School / GPA / Location / Job Title
 *     inputs by their LABEL, not a data-automation-id (the input's aid is often
 *     empty) — locate by visible label text, match to profile rows by DOM order.
 *   - Never override anything already chosen/typed (Workday pre-fills from the
 *     candidate account).
 *
 * Exposed on self.JPWidgets (isolated world only). Pure machinery — which
 * fields get which values is the adapter's job (adapters/<ats>.js postFill).
 */
(function () {
  "use strict";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function clean(s) {
    return String(s || "").replace(/[*]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&");
  }

  function isVisible(el) {
    if (!el) return false;
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch (_) {
      return false;
    }
  }

  // Best human-readable label/question for a field — several strategies in
  // priority order (ATSes structure labels very differently).
  function getLabelText(el) {
    if (!el) return "";
    const ariaLabel = el.getAttribute && el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return clean(ariaLabel);

    const labelledBy = el.getAttribute && el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => {
          const n = document.getElementById(id);
          return (n && n.textContent) || "";
        })
        .join(" ");
      if (text.trim()) return clean(text);
    }

    if (el.id) {
      try {
        const forLabel = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
        if (forLabel && forLabel.textContent && forLabel.textContent.trim()) return clean(forLabel.textContent);
      } catch (_) {}
    }

    const wrapping = el.closest && el.closest("label");
    if (wrapping && wrapping.textContent && wrapping.textContent.trim()) return clean(wrapping.textContent);

    // Workday & friends: a labelled container ancestor with its own label node.
    const group = el.closest && el.closest('[data-automation-id], [class*="field"], [class*="question"], [role="group"]');
    if (group) {
      const labelNode = group.querySelector('label, [class*="label"], [data-automation-id*="label"], legend');
      if (labelNode && labelNode.textContent && labelNode.textContent.trim()) return clean(labelNode.textContent);
    }

    const placeholder = el.getAttribute && el.getAttribute("placeholder");
    if (placeholder && placeholder.trim()) return clean(placeholder);
    return clean((el.getAttribute && el.getAttribute("name")) || el.id || "");
  }

  function setNativeValue(el, value) {
    const proto =
      el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    let done = false;
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, value);
        done = true;
      }
    } catch (_) {}
    if (!done) el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Select an option the way a real user does (see header note).
  function realClick(el) {
    const init = { bubbles: true, cancelable: true };
    try {
      if (typeof PointerEvent !== "undefined") el.dispatchEvent(new PointerEvent("pointerdown", init));
    } catch (_) {}
    el.dispatchEvent(new MouseEvent("mousedown", init));
    try {
      if (typeof PointerEvent !== "undefined") el.dispatchEvent(new PointerEvent("pointerup", init));
    } catch (_) {}
    el.dispatchEvent(new MouseEvent("mouseup", init));
    el.dispatchEvent(new MouseEvent("click", init));
    // NOTE: do NOT also call el.click() — that double-selects.
  }

  function dispatchEnter(el) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    }
  }

  // Workday renders options under several markups depending on widget + tenant.
  const OPTION_SELECTOR = [
    '[data-automation-id="promptOption"]',
    '[data-automation-id="promptLeafNode"]',
    '[data-automation-id*="menuItem"]',
    '[role="option"]',
    'li[role="option"]',
    '[data-automation-id="activeListContainer"] li',
    '[data-automation-id="activeListContainer"] [role="option"]',
    'ul[role="listbox"] li',
  ].join(", ");

  // Exact text first, then option-contains-want, then want-contains-option
  // (so profile "Black" matches the option "Black or African American").
  function findOption(want) {
    const target = norm(want);
    const opts = Array.from(document.querySelectorAll(OPTION_SELECTOR)).filter(isVisible);
    if (!opts.length) return null;
    const texts = opts.map((o) => ({ el: o, t: norm(o.textContent || "") }));
    const exact = texts.find((o) => o.t === target);
    if (exact) return exact.el;
    const contains = texts.find((o) => o.t.includes(target) && target.length >= 2);
    if (contains) return contains.el;
    const contained = texts.find((o) => target.includes(o.t) && o.t.length >= 2);
    return contained ? contained.el : null;
  }

  async function pollForOption(want, attempts, interval) {
    const tries = attempts || 12;
    const gap = interval || 120;
    for (let i = 0; i < tries; i++) {
      await sleep(gap);
      const opt = findOption(want);
      if (opt) return opt;
    }
    return null;
  }

  // Workday opens a searchable prompt and focuses a small filter input; find it.
  function promptSearchInput() {
    const active = document.activeElement;
    if (active && active.tagName === "INPUT" && isVisible(active)) return active;
    const el = document.querySelector('[data-automation-id="searchBox"], input[data-automation-id="textInputBox"], [role="combobox"] input');
    return el && isVisible(el) ? el : null;
  }

  // A prompt button shows placeholder text until something is chosen.
  function alreadyChosen(control) {
    const text = norm(control.textContent || "");
    if (!text) return false;
    return !/^(select one|select|choose|select response)$/.test(text);
  }

  async function selectFromPrompt(control, want) {
    try {
      control.scrollIntoView({ block: "center" });
    } catch (_) {}
    realClick(control);
    // 1. Simple dropdown: a matching option renders → real-click it.
    let opt = await pollForOption(want, 10, 130);
    if (opt) {
      realClick(opt);
      await sleep(150);
      return true;
    }
    // 2. Searchable prompt: type to filter, then real-click (or commit via Enter).
    const search = promptSearchInput();
    if (search) {
      search.focus();
      setNativeValue(search, want);
      opt = await pollForOption(want, 16, 150);
      if (opt) {
        realClick(opt);
        await sleep(200);
        return true;
      }
      dispatchEnter(search);
      await sleep(400);
      return true;
    }
    // Nothing worked — close the popup so we don't leave it open.
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  function inputsByLabel(re) {
    return Array.from(document.querySelectorAll("input")).filter((el) => isVisible(el) && re.test(getLabelText(el)));
  }

  // Fill plain text inputs found by label, matched to `values` by DOM order (the
  // i-th "GPA"/"Location" input gets the i-th education/experience entry).
  // Returns the entries actually written, for the caller's review rows.
  function fillTextByLabel(re, values) {
    const out = [];
    inputsByLabel(re).forEach((el, i) => {
      if (el.value.trim()) return; // never override
      const v = String(values[i] || "").trim();
      if (!v) return;
      setNativeValue(el, v);
      out.push({ el, label: getLabelText(el), value: v });
    });
    return out;
  }

  // Type-to-search into one input (see header note on the commit strategy).
  async function typeaheadInto(input, values) {
    const out = [];
    const container = input.closest("[data-automation-id]");
    const preExisting = norm(((container && container.textContent) || "").replace(input.value || "", ""));
    for (const raw of values) {
      const want = String(raw || "").trim();
      if (!want || preExisting.includes(norm(want))) continue;
      input.focus();
      setNativeValue(input, want); // dispatches input → the ATS fetches matches
      const opt = await pollForOption(want, 22, 150);
      if (opt) {
        realClick(opt);
        await sleep(450);
      } else {
        dispatchEnter(input);
        await sleep(450);
      }
      // Still showing the typed query → one more try, then move on.
      if (norm(input.value) === norm(want)) {
        const again = findOption(want);
        if (again) realClick(again);
        else dispatchEnter(input);
        await sleep(400);
      }
      out.push({ el: input, label: getLabelText(input), value: want });
    }
    return out;
  }

  // Type-to-search inputs found by label; valuesFor(i) returns the terms for the
  // i-th matching input (Skills = one input with many terms; School / Field of
  // Study = one input per education row).
  async function typeaheadByLabel(re, valuesFor) {
    const inputs = inputsByLabel(re);
    const out = [];
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].value.trim()) continue;
      const filled = await typeaheadInto(inputs[i], valuesFor(i));
      out.push(...filled);
    }
    return out;
  }

  // Try to set a native <select> to an option matching `value` (exact → contains).
  function setSelectByText(el, value) {
    const v = norm(value);
    let chosen = Array.from(el.options).find((o) => norm(o.text) === v);
    if (!chosen) chosen = Array.from(el.options).find((o) => norm(o.text).includes(v));
    if (!chosen) return false;
    setNativeValue(el, chosen.value);
    return true;
  }

  self.JPWidgets = {
    isVisible,
    getLabelText,
    setNativeValue,
    realClick,
    dispatchEnter,
    findOption,
    pollForOption,
    alreadyChosen,
    selectFromPrompt,
    inputsByLabel,
    fillTextByLabel,
    typeaheadInto,
    typeaheadByLabel,
    setSelectByText,
  };
})();
