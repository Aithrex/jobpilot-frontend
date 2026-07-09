/* Aspirely Apply Assistant — field resolution engine.
 *
 * Turns the current page + the user's ApplicationProfile into a concrete fill
 * plan, in a strict resolution order:
 *
 *   1. Deterministic — the active ATS adapter's selector→canonical map.
 *   2. Semantic     — label / aria-label / placeholder / name / id matching.
 *   3. LLM last-resort — ONLY if the operator enabled it in config AND the page
 *      snippet has been PII-redacted (lib/redact.js) before leaving the browser.
 *
 * Safety rails baked in:
 *   - Only EMPTY, editable inputs are ever written (never overwrites the user).
 *   - Sensitive / EEO / work-authorization / salary / DOB fields are NEVER
 *     auto-answered — they're surfaced for the user to answer themselves.
 *   - Selects and radios are not auto-selected (too easy to mis-answer); they
 *     fall through to the user.
 *
 * Exposed on self.JPResolver (isolated world only): { resolve, setValue,
 * canonicalValue }.
 */
(function () {
  "use strict";

  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

  // ------------------------------------------------------------------
  // Profile → value
  // ------------------------------------------------------------------
  function splitName(name) {
    const s = String(name || "").trim().split(/\s+/);
    return { first: s[0] || "", last: s.length > 1 ? s.slice(1).join(" ") : "" };
  }

  function cityOf(location) {
    if (!location) return "";
    return String(location).split(",")[0].trim();
  }

  function canonicalValue(canonical, profile) {
    if (!profile || typeof profile !== "object") return null;
    const p = profile.personal || {};
    const l = profile.links || {};
    const nm = splitName(p.name);
    const exp = Array.isArray(profile.experience) ? profile.experience : [];
    const map = {
      first_name: nm.first,
      last_name: nm.last,
      full_name: p.name,
      preferred_name: nm.first,
      email: p.email,
      phone: p.phone,
      location: p.location,
      city: cityOf(p.location),
      linkedin: l.linkedin,
      github: l.github,
      portfolio: l.portfolio,
      website: l.portfolio,
      org: (exp[0] && exp[0].company) || "",
    };
    const v = map[canonical];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }

  const PRETTY = {
    first_name: "First name",
    last_name: "Last name",
    full_name: "Full name",
    preferred_name: "Preferred name",
    email: "Email",
    phone: "Phone",
    location: "Location",
    city: "City",
    linkedin: "LinkedIn",
    github: "GitHub",
    portfolio: "Portfolio / website",
    website: "Website",
    org: "Current company",
  };
  const pretty = (c) => PRETTY[c] || c;

  // ------------------------------------------------------------------
  // Semantic matching
  // ------------------------------------------------------------------
  // Fields we must NEVER auto-answer — legal eligibility, demographics, pay.
  const SENSITIVE_RE =
    /gender|\bsex\b|\brace\b|ethnic|hispanic|latino|veteran|disab|sexual orientation|pronoun|sponsor|authoriz(?:ed|ation)?\s+to\s+work|work authorization|require.*visa|legally.*(?:work|authorized)|citizen|salary|compensation|desired pay|expected pay|\bssn\b|social security|date of birth|birth\s*date|\bdob\b/i;

  const SEMANTIC_RULES = [
    [/first.?name|given.?name|legal.?first/, "first_name"],
    [/last.?name|surname|family.?name|legal.?last/, "last_name"],
    [/full.?name|^name$|your.?name|legal.?name|preferred.?name/, "full_name"],
    [/e-?mail/, "email"],
    [/phone|mobile|telephone|^tel$/, "phone"],
    [/linkedin/, "linkedin"],
    [/github/, "github"],
    [/portfolio|personal.?(web)?site|website|^url$/, "portfolio"],
    [/city|current.?location|^location$|town/, "location"],
    [/current.?(company|employer)|^company$|organization|employer/, "org"],
  ];

  function matchSemantic(text) {
    for (const [re, canonical] of SEMANTIC_RULES) {
      if (re.test(text)) return canonical;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // DOM helpers
  // ------------------------------------------------------------------
  function inOwnUi(el) {
    try {
      return !!el.closest("#jobpilot-ext-root");
    } catch (_) {
      return false;
    }
  }

  function isEditableInput(el) {
    if (!el || inOwnUi(el)) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "INPUT") {
      const type = (el.type || "text").toLowerCase();
      return !["hidden", "password", "file", "submit", "button", "checkbox", "radio", "image", "reset", "range", "color"].includes(type);
    }
    if (el.isContentEditable) return true;
    return false;
  }

  function isEmpty(el) {
    if (el.disabled || el.readOnly) return false;
    const v = el.isContentEditable ? el.textContent : el.value;
    return !(v && String(v).trim());
  }

  function fieldText(el) {
    const parts = [el.name, el.id, el.getAttribute("autocomplete"), el.getAttribute("aria-label"), el.placeholder, el.type];
    if (el.id) {
      try {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab) parts.push(lab.innerText);
      } catch (_) {}
    }
    if (el.labels && el.labels.length) parts.push(el.labels[0].innerText);
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function humanLabel(el) {
    if (!el) return "";
    const aria = el.getAttribute && el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    if (el.id) {
      try {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab && lab.innerText.trim()) return lab.innerText.trim();
      } catch (_) {}
    }
    if (el.labels && el.labels.length && el.labels[0].innerText.trim()) return el.labels[0].innerText.trim();
    let node = el.parentElement;
    let hops = 0;
    while (node && hops < 4) {
      const lab = node.querySelector("label, legend");
      if (lab && lab.innerText.trim() && lab.innerText.trim().length < 200) return lab.innerText.trim();
      node = node.parentElement;
      hops++;
    }
    return (el.placeholder || el.name || "").trim();
  }

  function kindOf(el) {
    if (el.tagName === "TEXTAREA") return "textarea";
    if (el.tagName === "SELECT") return "select";
    if (el.isContentEditable) return "richtext";
    return (el.type || "text").toLowerCase();
  }

  function candidateInputs() {
    const nodes = document.querySelectorAll("input, textarea");
    const out = [];
    nodes.forEach((el) => {
      if (isEditableInput(el) && isEmpty(el)) out.push(el);
    });
    return out;
  }

  function firstFillable(selector, used) {
    if (!selector) return null;
    let nodes;
    try {
      nodes = document.querySelectorAll(selector);
    } catch (_) {
      return null;
    }
    for (const el of nodes) {
      if (used.has(el)) continue;
      if (isEditableInput(el) && isEmpty(el)) return el;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Writing a value (text / textarea / contenteditable). Fires the events
  // frameworks (React/Vue/Angular) listen for. Never touches selects/radios.
  // ------------------------------------------------------------------
  function setValue(el, value) {
    if (!el) return false;
    const val = String(value == null ? "" : value);
    try {
      if (el.isContentEditable) {
        el.textContent = val;
      } else {
        const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) desc.set.call(el, val);
        else el.value = val;
      }
    } catch (_) {
      try {
        el.value = val;
      } catch (_) {
        return false;
      }
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // ------------------------------------------------------------------
  // LLM last-resort disambiguation — OFF unless the operator opts in AND a
  // backend field-map endpoint is configured. The page snippet is redacted
  // client-side (lib/redact.js) before it ever crosses the message boundary.
  // ------------------------------------------------------------------
  function llmEnabled() {
    const cfg = self.JOBPILOT_CONFIG || {};
    return !!(cfg.LLM_FIELD_DISAMBIGUATION && cfg.FIELD_MAP_PATH);
  }

  const LLM_CANDIDATES = ["first_name", "last_name", "full_name", "email", "phone", "location", "linkedin", "github", "portfolio", "org"];

  async function llmDisambiguate(el, profile) {
    const label = humanLabel(el);
    if (!label || label.length < 2) return null;
    const snippet = [label, el.getAttribute("aria-label"), el.placeholder, el.name].filter(Boolean).join(" · ");
    const redactor = self.JPRedact;
    const redacted = redactor ? redactor.redact(snippet, profile) : "";
    // Refuse to send anything that still smells like PII.
    if (!redacted || (redactor && !redactor.looksClean(redacted))) return null;
    let res;
    try {
      res = await send({ type: "DISAMBIGUATE_FIELD", payload: { label: redacted, candidates: LLM_CANDIDATES } });
    } catch (_) {
      return null;
    }
    if (!res || !res.ok || !res.data) return null;
    const c = res.data.canonical;
    return LLM_CANDIDATES.includes(c) ? c : null;
  }

  // ------------------------------------------------------------------
  // Main: build the fill plan (does NOT write to the page — the caller does,
  // with humanizing jitter, so the review card and the DOM stay in sync).
  // ------------------------------------------------------------------
  async function resolve(profile, adapter, opts) {
    const options = opts || {};
    const used = new Set();
    const plan = []; // { el, canonical, label, value, confidence, source, kind }
    const sensitive = []; // { el, label } — surfaced, never auto-filled

    // 1) Deterministic adapter map
    let fields = [];
    try {
      fields = (adapter && typeof adapter.fields === "function" && adapter.fields()) || [];
    } catch (_) {
      fields = [];
    }
    for (const f of fields) {
      if (!f || !f.selector || !f.canonical) continue;
      const el = firstFillable(f.selector, used);
      if (!el) continue;
      used.add(el);
      const value = canonicalValue(f.canonical, profile);
      if (!value) continue; // known field, but we have nothing to put there — skip
      plan.push({
        el,
        canonical: f.canonical,
        label: humanLabel(el) || pretty(f.canonical),
        value,
        confidence: "high",
        source: "adapter",
        kind: f.kind || kindOf(el),
      });
    }

    // 2) Semantic pass
    for (const el of candidateInputs()) {
      if (used.has(el)) continue;
      const text = fieldText(el);
      if (!text) continue;
      if (SENSITIVE_RE.test(text)) {
        used.add(el);
        sensitive.push({ el, label: humanLabel(el) || "Sensitive question" });
        continue;
      }
      const canonical = matchSemantic(text);
      if (!canonical) continue;
      used.add(el);
      const value = canonicalValue(canonical, profile);
      if (!value) continue;
      plan.push({
        el,
        canonical,
        label: humanLabel(el) || pretty(canonical),
        value,
        confidence: "medium",
        source: "semantic",
        kind: kindOf(el),
      });
    }

    // 3) LLM last resort (gated + redacted)
    if (llmEnabled() && options.allowLlm !== false) {
      for (const el of candidateInputs()) {
        if (used.has(el)) continue;
        const text = fieldText(el);
        if (text && SENSITIVE_RE.test(text)) {
          used.add(el);
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const canonical = await llmDisambiguate(el, profile);
        if (!canonical) continue;
        used.add(el);
        const value = canonicalValue(canonical, profile);
        if (!value) continue;
        plan.push({
          el,
          canonical,
          label: humanLabel(el) || pretty(canonical),
          value,
          confidence: "low",
          source: "llm",
          kind: kindOf(el),
        });
      }
    }

    return { plan, sensitive };
  }

  self.JPResolver = { resolve, setValue, canonicalValue };
})();
