/* Aspirely Apply Assistant — on-page orchestrator.
 *
 * "Fill, Review, One Tap" — now with FLOW MODE (hands-free assist, default ON):
 * the moment an application form is detected (page load or a wizard step change,
 * e.g. Workday's multi-step flow), the extension autofills it from the user's
 * résumé profile, shows a compact status HUD, and — once the step has nothing
 * left that only the user can answer (required selects, EEO questions, uploads,
 * essays) — clicks the site's own Next / Continue after a short cancellable
 * countdown. It NEVER clicks Submit / Apply: the final submit is always the
 * user's click, except the separately triple-gated opt-in auto-submit path.
 *
 * Engine pieces (all loaded before this file — see manifest content_scripts):
 *   config.js         → self.JOBPILOT_CONFIG
 *   lib/redact.js     → self.JPRedact
 *   lib/ratelimit.js  → self.JPRateLimit
 *   lib/widgets.js    → self.JPWidgets (ATS widget machinery, ported from ApplyPilot)
 *   adapters/*.js     → self.__JP_ADAPTERS  (+ adapters/index.js → self.JPAdapters)
 *   lib/resolver.js   → self.JPResolver
 *   lib/reviewcard.js → self.JPReviewCard
 *   lib/autosubmit.js → self.JPAutoSubmit
 *   lib/flowmode.js   → self.JPFlow (settings, next-button finder, step blockers)
 *
 * Frames: the script runs in all_frames (embedded Greenhouse et al render the
 * form in an iframe — a fix validated in ApplyPilot). Subframes FILL silently;
 * all UI (panel, HUD, Review Card), auto-advance and auto-submit live in the
 * top frame only.
 *
 * Safety unchanged from the manual era:
 *   - Only empty fields are written; sensitive/EEO/salary/DOB are never
 *     answered — except work-authorization prompts, and only from the visa
 *     profile the user explicitly declared in the app (flagged for review).
 *   - Auto-advance clicks ONLY allowlisted Next/Continue text (hard blocklist on
 *     submit/apply/…), at most twice per step, never past visible validation
 *     errors or a CAPTCHA, and every countdown is cancellable.
 *   - Auto-submit keeps its three gates (opt-in + approved record + no CAPTCHA).
 */
(function () {
  if (window.__jobpilotInjected) return;
  window.__jobpilotInjected = true;

  const IS_TOP = window === window.top;

  // Context-invalidated-safe messaging (an extension reload orphans injected
  // scripts; chrome.* then throws on every call — fail to null instead).
  const send = (msg) =>
    new Promise((res) => {
      try {
        if (!chrome.runtime || !chrome.runtime.id) return res(null);
        chrome.runtime.sendMessage(msg, (r) => {
          void chrome.runtime.lastError; // swallow "receiving end does not exist"
          res(r);
        });
      } catch (_) {
        res(null);
      }
    });
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

  function inOwnUi(el) {
    try {
      return !!(el && el.closest && (el.closest("#jobpilot-ext-root") || el.closest("[data-jobpilot-autosubmit]") || el.closest("[data-jobpilot-reviewcard]")));
    } catch (_) {
      return false;
    }
  }

  // ---- UI (top frame only — subframes fill silently, no chrome of their own) ----
  let flash = () => {};
  let hudShow = () => {};
  let hudHide = () => {};

  // Flow state shared between the UI (top frame) and the controller (all frames).
  let sessionPaused = false;
  let sessionStopped = false; // hard stop (rate limit) — no more auto work this page

  if (IS_TOP) {
    const root = document.createElement("div");
    root.id = "jobpilot-ext-root";
    root.innerHTML = `
      <button id="jp-launch" class="jp-launch" title="Aspirely Apply Assistant">A</button>
      <div id="jp-panel" class="jp-panel" hidden>
        <div class="jp-head"><span class="jp-title">Aspirely</span><button id="jp-close" class="jp-x" aria-label="Close">&times;</button></div>
        <div id="jp-status" class="jp-status">Checking…</div>
        <button id="jp-autofill" class="jp-btn jp-primary">Autofill this form</button>
        <button id="jp-draft" class="jp-btn">Draft an answer</button>
        <div id="jp-variants" class="jp-variants"></div>
        <div class="jp-foot">You review &amp; submit — Aspirely never submits for you.</div>
      </div>
      <div id="jp-hud" class="jp-hud" hidden role="status" aria-live="polite">
        <div class="jp-hud-top">
          <span class="jp-hud-mark">A</span>
          <span id="jp-hud-text" class="jp-hud-text">Aspirely</span>
          <button id="jp-hud-hide" class="jp-hud-x" aria-label="Hide">&times;</button>
        </div>
        <div id="jp-hud-bar" class="jp-hud-bar" hidden><div id="jp-hud-fill" class="jp-hud-fill"></div></div>
        <div class="jp-hud-actions">
          <button id="jp-hud-cancel" class="jp-hud-btn jp-hud-danger" hidden>Cancel</button>
          <button id="jp-hud-review" class="jp-hud-btn" hidden>Review fills</button>
          <button id="jp-hud-pause" class="jp-hud-btn">Pause auto</button>
        </div>
      </div>`;
    document.documentElement.appendChild(root);
    const q = (sel) => root.querySelector(sel);
    const panel = q("#jp-panel");

    q("#jp-launch").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) refreshStatus();
    });
    q("#jp-close").addEventListener("click", () => (panel.hidden = true));

    flash = (msg) => {
      const s = q("#jp-status");
      s.textContent = msg;
      clearTimeout(s._t);
      s._t = setTimeout(() => refreshStatus(), 2600);
    };

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
        a.textContent = "Aspirely app";
        s.append(a, ", sign in, then reopen.");
      }
    }

    // HUD — the calm, compact Flow Mode status card.
    const hudEl = q("#jp-hud");
    const hudText = q("#jp-hud-text");
    const hudBar = q("#jp-hud-bar");
    const hudFill = q("#jp-hud-fill");
    const hudCancel = q("#jp-hud-cancel");
    const hudReview = q("#jp-hud-review");
    const hudPause = q("#jp-hud-pause");
    let hudHideTimer = null;
    let hudCancelFn = null;

    q("#jp-hud-hide").addEventListener("click", () => hudHide());
    hudCancel.addEventListener("click", () => {
      const fn = hudCancelFn;
      hudCancelFn = null;
      if (fn) fn();
    });
    hudReview.addEventListener("click", () => showReviewCard());
    hudPause.addEventListener("click", () => {
      sessionPaused = !sessionPaused;
      hudPause.textContent = sessionPaused ? "Resume auto" : "Pause auto";
      if (sessionPaused) {
        hudShow("Auto mode paused on this page — the panel button still works.", { sticky: true });
      } else {
        hudShow("Auto mode resumed.");
        scheduleEvaluate(300);
      }
    });

    hudShow = (text, opts) => {
      const o = opts || {};
      clearTimeout(hudHideTimer);
      hudEl.hidden = false;
      hudText.textContent = text;
      if (typeof o.progress === "number") {
        hudBar.hidden = false;
        hudFill.style.width = Math.max(0, Math.min(100, o.progress)) + "%";
      } else {
        hudBar.hidden = true;
      }
      hudCancelFn = typeof o.onCancel === "function" ? o.onCancel : null;
      hudCancel.hidden = !hudCancelFn;
      hudReview.hidden = !o.review;
      if (!o.sticky) hudHideTimer = setTimeout(() => hudHide(), o.ttl || 7000);
    };

    hudHide = () => {
      clearTimeout(hudHideTimer);
      hudEl.hidden = true;
      hudCancelFn = null;
    };

    // ---- Manual autofill (panel button) — same flow as always ----
    q("#jp-autofill").addEventListener("click", async () => {
      const gate = await (self.JPRateLimit ? self.JPRateLimit.check() : { allowed: false, reason: "Engine not ready." });
      if (!gate.allowed) {
        flash(gate.reason || "Rate limit reached — take a break.");
        return;
      }

      const result = await performFill({ auto: false });
      if (result.status !== "ok") {
        flash(result.message);
        return;
      }
      if (result.filled) await self.JPRateLimit.record();

      if (await maybeAutoSubmit(result)) return;

      showReviewCard();
      if (result.captcha) flash("CAPTCHA detected — you solve it & submit.");
      else flash(result.filled ? `Filled ${result.filled} field${result.filled === 1 ? "" : "s"} — review below` : "Nothing to autofill — see review");
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
  }

  // ------------------------------------------------------------------
  // Shared fill engine — used by BOTH the manual panel button and Flow Mode.
  // Resolves the page against the profile, writes plain inputs (with jitter —
  // tighter in auto mode for speed), then hands the adapter's postFill the
  // widgets that aren't plain inputs (dropdowns, typeaheads, per-row fields —
  // lib/widgets.js). Remembers the rows so the Review Card can open any time.
  // ------------------------------------------------------------------
  let lastRows = [];
  let lastElById = new Map();
  let lastEssayById = new Map();
  let lastAdapter = null;
  let cardApi = null;
  let syncTriedThisSession = false;

  // Cheap pre-check: does this page have unchosen prompt widgets our adapter
  // could deep-fill (e.g. Workday "Select One" buttons)?
  function hasWidgetWork(adapter) {
    if (!adapter || typeof adapter.postFill !== "function" || !self.JPWidgets) return false;
    const btns = document.querySelectorAll("button");
    for (const b of btns) {
      if (inOwnUi(b)) continue;
      if (/^(select one|select response|choose one)$/i.test((b.textContent || "").trim()) && self.JPWidgets.isVisible(b)) return true;
    }
    return false;
  }

  async function performFill(opts) {
    const auto = !!(opts && opts.auto);
    if (!self.JPResolver || !self.JPReviewCard || !self.JPRateLimit || !self.JPAdapters) {
      return { status: "error", message: "Engine not ready — reload the page and try again." };
    }

    // Profile (sync on demand — once per session in auto mode).
    let r = await send({ type: "GET_PROFILE" });
    if ((!r || !r.profile) && (!auto || !syncTriedThisSession)) {
      syncTriedThisSession = true;
      if (!auto) flash("Syncing your profile…");
      r = await send({ type: "SYNC_PROFILE" });
    }
    if (!r || !r.profile) {
      return { status: "error", message: (r && r.error) || "Couldn't load your profile" };
    }
    const profile = r.profile;

    const captcha = detectCaptcha();
    const adapter = self.JPAdapters.detect(location.href, document);
    lastAdapter = adapter;
    if (!auto) flash(adapter && adapter.id !== "generic" ? `Reading ${adapter.id} form…` : "Reading this form…");

    let plan = [];
    let sensitive = [];
    try {
      const out = await self.JPResolver.resolve(profile, adapter, {});
      plan = out.plan || [];
      sensitive = out.sensitive || [];
    } catch (e) {
      return { status: "error", message: "Couldn't read this form." };
    }

    const rows = [];
    const elById = new Map();
    const usedEls = new Set();
    let idc = 0;
    let filled = 0;

    // Fill each planned field with a small humanizing delay (fast lane in auto).
    for (const item of plan) {
      await sleep(auto ? self.JPRateLimit.jitter(15, 60) : self.JPRateLimit.jitter(40, 160));
      const ok = self.JPResolver.setValue(item.el, item.value);
      if (!ok) continue;
      filled++;
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
      if (auto) hudShow(`Filling this form… ${filled}/${plan.length}`, { progress: (filled / plan.length) * 100, sticky: true });
    }

    // ATS deep fill — widgets that aren't plain inputs (prompt dropdowns,
    // type-to-search lists, per-row education/experience). The machinery lives
    // in lib/widgets.js (ported from ApplyPilot); which fields get which values
    // is the adapter's postFill.
    if (adapter && typeof adapter.postFill === "function" && self.JPWidgets) {
      if (auto && hasWidgetWork(adapter)) hudShow("Filling dropdowns & lists — a few seconds…", { sticky: true });
      let extra = [];
      try {
        extra = (await adapter.postFill(profile)) || [];
      } catch (_) {
        extra = [];
      }
      for (const ex of extra) {
        if (!ex || !ex.value) continue;
        filled++;
        const id = "w" + idc++;
        if (ex.el) {
          elById.set(id, ex.el);
          usedEls.add(ex.el);
        }
        rows.push({
          id,
          kind: "field",
          label: ex.label || "Form field",
          value: ex.value,
          confidence: ex.confidence || "medium",
          note: ex.note || "Set directly on the form — change it there if needed.",
        });
      }
    }

    // Sensitive fields — surfaced, never auto-answered.
    for (const s of sensitive) {
      if (usedEls.has(s.el)) continue;
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

    lastRows = rows;
    lastElById = elById;
    lastEssayById = essayById;

    return { status: "ok", plan, rows, captcha, adapter, filled, sensitiveCount: sensitive.length, essayCount: essayById.size };
  }

  const reviewHandlers = {
    onEdit: (id, val) => {
      const target = lastElById.get(id) || (lastEssayById.get(id) && lastEssayById.get(id).el);
      if (target) self.JPResolver.setValue(target, val);
    },
    onDraft: async (id) => {
      const eq = lastEssayById.get(id);
      if (!eq || !cardApi) return;
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
      lastElById.set(id, eq.el); // now inline-editable through onEdit
      cardApi.setRow(id, { kind: "field", value: ans, confidence: "low", note: "AI draft inserted — make it yours before submitting." });
    },
  };

  function showReviewCard() {
    if (!IS_TOP) return;
    if (!lastRows.length) {
      flash("Nothing filled yet on this step.");
      return;
    }
    cardApi = self.JPReviewCard.open(lastRows, { captcha: detectCaptcha(), onEdit: reviewHandlers.onEdit, onDraft: reviewHandlers.onDraft });
  }

  // ------------------------------------------------------------------
  // Opt-in auto-submit branch — shared by manual + Flow Mode (top frame only).
  // All three gates (opt-in, approved record for THIS page, no CAPTCHA) are
  // evaluated inside JPAutoSubmit; any failure returns false → caller falls back.
  // Returns true if a submit countdown was started.
  // ------------------------------------------------------------------
  async function maybeAutoSubmit(result) {
    if (!IS_TOP) return false;
    const hasOpenEssays = result.rows.some((r) => r.kind === "essay");
    if (result.captcha || hasOpenEssays || !self.JPAutoSubmit) return false;
    let evalRes;
    try {
      evalRes = await self.JPAutoSubmit.evaluate({ url: location.href, adapter: result.adapter, captcha: result.captcha });
    } catch (_) {
      return false;
    }
    if (!evalRes || !evalRes.ok) return false;

    flash("Approved application — starting a 5s countdown you can cancel…");
    self.JPAutoSubmit.runCountdown({
      seconds: 5,
      record: evalRes.record,
      onCancel: () => {
        showReviewCard();
        flash("Auto-submit cancelled — review & submit yourself.");
      },
      onSubmit: async () => {
        let res;
        try {
          res = await self.JPAutoSubmit.performSubmit(evalRes);
        } catch (_) {
          res = { ok: false, message: "Auto-submit failed — review & submit yourself." };
        }
        if (!res || !res.ok) {
          showReviewCard();
          flash((res && res.message) || "Couldn't auto-submit — review & submit yourself.");
        } else {
          flash("Submitted — Aspirely clicked this site's Submit for your approved application.");
          hudShow("Submitted — this approved application is done. 🎉");
        }
      },
    });
    return true;
  }

  // ==================================================================
  // FLOW MODE — the hands-free controller.
  //
  // Lifecycle per evaluation (debounced off DOM mutations / URL changes):
  //   1. settings + sign-in + rate-limit gates
  //   2. if the step has empty matched fields or unchosen widgets → fill them
  //   3. if the fully-gated auto-submit is eligible → its own countdown path
  //   4. else, if auto-advance is on and countBlockers() === 0 → cancellable
  //      3s countdown → click the step's Next/Continue (never Submit) → the
  //      observer picks up the new step and the cycle repeats
  //   5. if blockers remain → HUD tells the user exactly how many fields need
  //      them; each change they make re-evaluates, so the advance happens the
  //      moment the step is complete.
  // Subframes run steps 1–2 only (fill silently); UI/advance/submit are top-frame.
  // ==================================================================
  let evaluating = false;
  let countdownActive = false;
  let evalTimer = null;
  let lastUrl = location.href;
  let signinNudged = false;
  const advanceAttempts = new Map(); // stepKey → count (max 2: one may fail validation)
  const cancelledSteps = new Set(); // user cancelled auto-continue for these steps
  const recordedApps = new Set(); // rate-limit: one fill event per application, not per step

  function appKey() {
    // host + the first path segments ≈ one application (Workday keeps the same
    // posting path across wizard steps).
    return location.hostname + location.pathname.split("/").slice(0, 4).join("/");
  }

  function hasEmptyCandidates() {
    const nodes = document.querySelectorAll("input, textarea");
    for (const el of nodes) {
      if (inOwnUi(el)) continue;
      const tag = el.tagName;
      if (tag === "INPUT") {
        const type = (el.type || "text").toLowerCase();
        if (["hidden", "password", "file", "submit", "button", "checkbox", "radio", "image", "reset", "range", "color"].includes(type)) continue;
      }
      if (el.disabled || el.readOnly) continue;
      if (!(el.value && String(el.value).trim())) return true;
    }
    return false;
  }

  function scheduleEvaluate(delay) {
    if (sessionStopped) return;
    clearTimeout(evalTimer);
    evalTimer = setTimeout(evaluateFlow, typeof delay === "number" ? delay : 700);
  }

  async function evaluateFlow() {
    if (evaluating || countdownActive || sessionPaused || sessionStopped) return;
    if (!self.JPFlow || !self.JPResolver || !self.JPAdapters || !self.JPRateLimit) return;
    const settings = await self.JPFlow.getSettings();
    if (!settings.autofill) return;

    evaluating = true;
    try {
      // Signed in?
      const st = await send({ type: "GET_STATUS" });
      if (!st || !st.hasToken) {
        if (IS_TOP && !signinNudged) {
          signinNudged = true;
          hudShow("Sign in to Aspirely (toolbar icon) to auto-fill applications.", { ttl: 9000 });
        }
        return;
      }

      // ---- Fill pass ----
      const adapterNow = self.JPAdapters.detect(location.href, document);
      let result = null;
      if (hasEmptyCandidates() || hasWidgetWork(adapterNow)) {
        const gate = await self.JPRateLimit.check();
        if (!gate.allowed) {
          sessionStopped = true;
          hudShow(gate.reason || "Rate limit reached — auto mode is off for now.", { sticky: true });
          return;
        }
        result = await performFill({ auto: true });
        if (result.status !== "ok") return; // quiet in auto mode (panel has the manual path)
        if (result.filled > 0) {
          const app = appKey();
          if (!recordedApps.has(app)) {
            recordedApps.add(app);
            await self.JPRateLimit.record();
          }
          hudShow(`Filled ${result.filled} field${result.filled === 1 ? "" : "s"} on this step.`, { review: true });
        }
        // The fully-gated opt-in auto-submit takes precedence over advancing.
        if (await maybeAutoSubmit(result)) {
          countdownActive = true; // its overlay owns the page; observer resumes after
          setTimeout(() => (countdownActive = false), 8000);
          return;
        }
      }

      // ---- Advance pass (top frame only) ----
      if (!IS_TOP || !settings.autoadvance) return;
      // Only advance inside a real apply flow: a recognized ATS adapter, or a
      // generic page we have actually filled — never a random "Continue" button
      // on a listing page or consent banner.
      const knownAts = !!(adapterNow && adapterNow.id && adapterNow.id !== "generic");
      if (!knownAts && !recordedApps.has(appKey())) return;
      const key = self.JPFlow.stepKey();
      if (cancelledSteps.has(key)) return;
      if ((advanceAttempts.get(key) || 0) >= 2) return;
      if (detectCaptcha()) {
        if (result && result.filled) hudShow("CAPTCHA on this page — finish and submit yourself.", { review: true });
        return;
      }
      const blockers = self.JPFlow.countBlockers();
      if (blockers > 0) {
        const filledNote = result && result.filled ? `Filled ${result.filled} · ` : "";
        hudShow(`${filledNote}${blockers} required item${blockers === 1 ? "" : "s"} need${blockers === 1 ? "s" : ""} you — I'll continue once done.`, {
          review: !!lastRows.length,
          ttl: 10000,
        });
        return; // every user edit re-triggers evaluate; we advance the moment it's clean
      }
      const btn = self.JPFlow.findNextButton(adapterNow);
      if (!btn) return;

      runAdvanceCountdown(btn, key);
    } finally {
      evaluating = false;
    }
  }

  function runAdvanceCountdown(btn, key) {
    countdownActive = true;
    let remaining = 3;
    let settled = false;
    let intervalId = null;

    const cancel = () => {
      if (settled) return;
      settled = true;
      clearInterval(intervalId);
      countdownActive = false;
      cancelledSteps.add(key);
      hudShow("Auto-continue cancelled — click Next yourself when ready.", { review: !!lastRows.length });
    };

    const tick = () => hudShow(`Step complete — continuing in ${remaining}s`, { sticky: true, onCancel: cancel, progress: ((3 - remaining) / 3) * 100 });
    tick();

    intervalId = setInterval(() => {
      if (settled) return;
      remaining -= 1;
      if (remaining > 0) {
        tick();
        return;
      }
      settled = true;
      clearInterval(intervalId);

      // Last-moment re-verify: the button is still there, still safe, and the
      // step is still clean (the user may have cleared a field mid-countdown).
      const stillSafe = document.contains(btn) && self.JPFlow.isVisible(btn) && !btn.disabled && self.JPFlow.countBlockers() === 0 && !detectCaptcha();
      countdownActive = false;
      if (!stillSafe) {
        hudShow("Held on — this step changed. Finish it and I'll continue.", { review: !!lastRows.length });
        scheduleEvaluate(900);
        return;
      }
      advanceAttempts.set(key, (advanceAttempts.get(key) || 0) + 1);
      try {
        btn.click();
      } catch (_) {
        hudShow("Couldn't click Next — click it yourself.", { review: !!lastRows.length });
        return;
      }
      hudShow("Moving to the next step…", { sticky: true, ttl: 6000 });
      scheduleEvaluate(1400); // the observer also fires as the new step renders
    }, 1000);
  }

  // ---- Step / SPA change detection ----
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (inOwnUi(m.target)) continue;
      scheduleEvaluate();
      return;
    }
  });
  try {
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
  } catch (_) {}

  window.addEventListener("popstate", () => scheduleEvaluate(400));
  window.addEventListener("hashchange", () => scheduleEvaluate(400));
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleEvaluate(400);
    }
  }, 800);

  // React to popup toggle changes without a reload.
  if (self.JPFlow) {
    self.JPFlow.onChange((s) => {
      if (s.autofill) scheduleEvaluate(300);
      else hudHide();
    });
  }

  scheduleEvaluate(900); // first pass once the page settles
})();
