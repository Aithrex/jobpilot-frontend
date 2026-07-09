/* JobPilot Apply Assistant — on-page orchestrator.
 *
 * "Fill, Review, One Tap": autofill empty form fields from the user's résumé
 * profile (via the ATS adapter + resolver engine), then surface a shadow-DOM
 * Review Card so the user checks every value and drafts open-ended answers —
 * before making the ONE tap that is always theirs: the employer's Submit button.
 *
 * Engine pieces (all loaded before this file — see manifest content_scripts):
 *   config.js        → self.JOBPILOT_CONFIG
 *   lib/redact.js    → self.JPRedact
 *   lib/ratelimit.js → self.JPRateLimit
 *   adapters/*.js    → self.__JP_ADAPTERS  (+ adapters/index.js → self.JPAdapters)
 *   lib/resolver.js  → self.JPResolver
 *   lib/reviewcard.js→ self.JPReviewCard
 *
 * This script NEVER submits: no element.click() on submit buttons, no
 * form.submit(), no synthetic submit/Enter dispatch. It only writes field
 * values and drafts answers, all reviewable and reversible by the user.
 */
(function () {
  if (window.__jobpilotInjected) return;
  window.__jobpilotInjected = true;

  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Track the last text field the user touched (clicking our panel steals focus).
  let lastField = null;
  document.addEventListener(
    "focusin",
    (e) => {
      const el = e.target;
      if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el.type || "text") === "text") || el.isContentEditable)) {
        lastField = el;
      }
    },
    true
  );

  // Kept local for the focus-based Draft flow (below). The autofill path uses
  // JPResolver.setValue.
  function setNativeValue(el, value) {
    try {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    } catch (_) {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function questionFor(el) {
    if (!el) return "";
    if (el.getAttribute && el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
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
      if (lab && lab.innerText.trim() && lab.innerText.trim().length < 400) return lab.innerText.trim();
      node = node.parentElement;
      hops++;
    }
    return (el.placeholder || "").trim();
  }

  // Detect (but never solve/bypass) common bot-check widgets so we can hand
  // control back to the user instead of tripping detection.
  function detectCaptcha() {
    const selectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="challenges.cloudflare.com"]',
      'iframe[title*="captcha" i]',
      ".g-recaptcha",
      ".h-captcha",
      ".cf-turnstile",
      "[data-sitekey]",
      "#cf-challenge-running",
    ];
    for (const s of selectors) {
      try {
        if (document.querySelector(s)) return true;
      } catch (_) {}
    }
    return false;
  }

  function noteForConfidence(conf) {
    if (conf === "medium") return "Guessed from the field label — double-check.";
    if (conf === "low") return "AI-matched — double-check.";
    return "";
  }

  function safeEssays(adapter) {
    try {
      return (adapter && typeof adapter.essayQuestions === "function" && adapter.essayQuestions()) || [];
    } catch (_) {
      return [];
    }
  }

  // ---- panel UI (unchanged launcher; the Review Card is the isolated overlay) ----
  const root = document.createElement("div");
  root.id = "jobpilot-ext-root";
  root.innerHTML = `
    <button id="jp-launch" class="jp-launch" title="JobPilot Apply Assistant">JP</button>
    <div id="jp-panel" class="jp-panel" hidden>
      <div class="jp-head"><span class="jp-title">JobPilot Apply</span><button id="jp-close" class="jp-x" aria-label="Close">&times;</button></div>
      <div id="jp-status" class="jp-status">Checking…</div>
      <button id="jp-autofill" class="jp-btn jp-primary">Autofill this form</button>
      <button id="jp-draft" class="jp-btn">Draft an answer</button>
      <div id="jp-variants" class="jp-variants"></div>
      <div class="jp-foot">You review &amp; submit — JobPilot never submits for you.</div>
    </div>`;
  document.documentElement.appendChild(root);
  const q = (sel) => root.querySelector(sel);
  const panel = q("#jp-panel");

  q("#jp-launch").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) refreshStatus();
  });
  q("#jp-close").addEventListener("click", () => (panel.hidden = true));

  function flash(msg) {
    const s = q("#jp-status");
    s.textContent = msg;
    clearTimeout(s._t);
    s._t = setTimeout(() => refreshStatus(), 2600);
  }

  async function refreshStatus() {
    const st = await send({ type: "GET_STATUS" });
    const s = q("#jp-status");
    const hasToken = st && st.hasToken;
    q("#jp-autofill").disabled = !hasToken;
    q("#jp-draft").disabled = !hasToken;
    if (hasToken) {
      const nm = st.profile && st.profile.personal && st.profile.personal.name;
      s.textContent = nm ? `Connected · ${nm}` : "Connected";
    } else {
      s.innerHTML = "";
      s.append("Not signed in. Open the ");
      const a = document.createElement("a");
      a.href = JOBPILOT_CONFIG.WEB_APP_ORIGIN;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "JobPilot app";
      s.append(a, ", sign in, then reopen.");
    }
  }

  // ---- Autofill: resolve → fill (with jitter) → Review Card ----
  q("#jp-autofill").addEventListener("click", async () => {
    if (!self.JPResolver || !self.JPReviewCard || !self.JPRateLimit || !self.JPAdapters) {
      flash("Engine not ready — reload the page and try again.");
      return;
    }

    // Client-side rate limit (anti spray-and-pray).
    const gate = await self.JPRateLimit.check();
    if (!gate.allowed) {
      flash(gate.reason || "Rate limit reached — take a break.");
      return;
    }

    // Profile (sync on demand).
    let r = await send({ type: "GET_PROFILE" });
    if (!r || !r.profile) {
      flash("Syncing your profile…");
      r = await send({ type: "SYNC_PROFILE" });
    }
    if (!r || !r.profile) {
      flash((r && r.error) || "Couldn't load your profile");
      return;
    }
    const profile = r.profile;

    const captcha = detectCaptcha();
    const adapter = self.JPAdapters.detect(location.href, document);
    flash(adapter && adapter.id !== "generic" ? `Reading ${adapter.id} form…` : "Reading this form…");

    let plan = [];
    let sensitive = [];
    try {
      const out = await self.JPResolver.resolve(profile, adapter, {});
      plan = out.plan || [];
      sensitive = out.sensitive || [];
    } catch (e) {
      flash("Couldn't read this form.");
      return;
    }

    const rows = [];
    const elById = new Map();
    const usedEls = new Set();
    let idc = 0;

    // Fill each planned field with a small humanizing delay.
    for (const item of plan) {
      await sleep(self.JPRateLimit.jitter(40, 160));
      const ok = self.JPResolver.setValue(item.el, item.value);
      if (!ok) continue;
      const id = "f" + idc++;
      elById.set(id, item.el);
      usedEls.add(item.el);
      rows.push({
        id,
        kind: "field",
        label: item.label,
        value: item.value,
        confidence: item.confidence,
        note: noteForConfidence(item.confidence),
      });
    }

    // Sensitive fields — surfaced, never auto-answered.
    for (const s of sensitive) {
      usedEls.add(s.el);
      rows.push({
        id: "s" + idc++,
        kind: "sensitive",
        label: s.label,
        note: "We never auto-answer eligibility, EEO, pay or DOB questions — that's yours.",
      });
    }

    // Open-ended questions — offer a résumé-grounded draft (user edits & submits).
    const essayById = new Map();
    for (const eq of safeEssays(adapter)) {
      if (!eq || !eq.el || usedEls.has(eq.el)) continue;
      const id = "e" + idc++;
      essayById.set(id, eq);
      usedEls.add(eq.el);
      rows.push({ id, kind: "essay", label: eq.label || "Open-ended question" });
    }

    if (plan.length) await self.JPRateLimit.record();

    const cardApi = self.JPReviewCard.open(rows, {
      captcha,
      onEdit: (id, val) => {
        const target = elById.get(id) || (essayById.get(id) && essayById.get(id).el);
        if (target) self.JPResolver.setValue(target, val);
      },
      onDraft: async (id) => {
        const eq = essayById.get(id);
        if (!eq) return;
        const res = await send({ type: "GENERATE_ANSWER", payload: { question: eq.label } });
        if (!res || !res.ok || !res.data || !Array.isArray(res.data.variants) || !res.data.variants.length) {
          cardApi.setRow(id, { note: (res && res.data && (res.data.message || res.data.error)) || "Couldn't draft — try the panel's Draft button." });
          return;
        }
        const first = res.data.variants[0];
        const ans = (first && (first.answer || (typeof first === "string" ? first : ""))) || "";
        if (!ans) {
          cardApi.setRow(id, { note: "No answer returned — try again." });
          return;
        }
        self.JPResolver.setValue(eq.el, ans);
        elById.set(id, eq.el); // now inline-editable through onEdit
        cardApi.setRow(id, { kind: "field", value: ans, confidence: "low", note: "AI draft inserted — make it yours before submitting." });
      },
    });

    if (captcha) flash("CAPTCHA detected — you solve it & submit.");
    else flash(plan.length ? `Filled ${plan.length} field${plan.length === 1 ? "" : "s"} — review below` : "Nothing to autofill — see review");
  });

  // ---- Draft an answer (focus-based; preserves the original flow) ----
  q("#jp-draft").addEventListener("click", async () => {
    const field = lastField && document.contains(lastField) ? lastField : null;
    if (!field) return flash("Click into a question box first, then Draft.");
    const question = questionFor(field);
    if (!question) return flash("Couldn't read the question — try another box.");
    const box = q("#jp-variants");
    box.innerHTML = `<div class="jp-loading">Drafting from your résumé…</div>`;
    const res = await send({ type: "GENERATE_ANSWER", payload: { question } });
    box.innerHTML = "";
    if (!res || !res.ok || !res.data || !Array.isArray(res.data.variants)) {
      const err = document.createElement("div");
      err.className = "jp-err";
      err.textContent = (res && res.data && (res.data.message || res.data.error)) || "Couldn't draft an answer.";
      box.appendChild(err);
      return;
    }
    res.data.variants.forEach((v) => {
      const ans = (v && (v.answer || (typeof v === "string" ? v : ""))) || "";
      if (!ans) return;
      const card = document.createElement("button");
      card.className = "jp-variant";
      card.textContent = ans.length > 240 ? ans.slice(0, 240) + "…" : ans;
      card.title = "Insert this answer";
      card.addEventListener("click", () => {
        if (field.isContentEditable) field.textContent = ans;
        else setNativeValue(field, ans);
        box.innerHTML = "";
        flash("Inserted — edit it to make it yours.");
      });
      box.appendChild(card);
    });
  });

  refreshStatus();
})();
