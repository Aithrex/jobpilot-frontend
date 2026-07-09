/* Aspirely Apply Assistant — OPT-IN auto-submit path.
 *
 * The shipped default is, and stays, the never-submit Review Card: the extension
 * fills every field and the USER clicks the site's own Submit. This module adds a
 * single, tightly-gated exception: when a user has explicitly opted in AND the
 * backend has an *approved*, eligible record for THIS exact application AND there
 * is no CAPTCHA on the page, the extension may — after a visible countdown the
 * user can cancel — click the site's real Submit button once.
 *
 * THREE independent gates (all must pass; any failure ⇒ Review Card):
 *   1. Opt-in    — server settings endpoint says the user is opted in, AND the
 *                  local kill switch (chrome.storage.local `jp_autosubmit_local`)
 *                  is explicitly ON. It defaults OFF (review-only), so auto-submit
 *                  needs BOTH a server opt-in and a local opt-in.
 *   2. Approval  — an `approved`, unexpired record in the server's pending list
 *                  whose URL matches this page (host + path, strict).
 *   3. No CAPTCHA— the page has no bot-check widget (detect-only; we NEVER solve
 *                  or bypass one — if present we hand back to the Review Card).
 *
 * Double-submit safety:
 *   - An in-memory `submittedIds` set guards against a second click in this page.
 *   - A persisted done-set (chrome.storage.local `jp_autosubmit_done`) is written
 *     BEFORE the click, so a reload / re-run can never auto-submit the same
 *     application twice; such records are treated as ineligible thereafter.
 *   - The countdown has a single `settled` latch so cancel and completion can't
 *     both fire.
 *
 * This module NEVER solves a CAPTCHA and NEVER auto-submits without a matching
 * approved record. It clicks the site's own Submit button — nothing more.
 *
 * Exposed on self.JPAutoSubmit (isolated world only):
 *   { evaluate, runCountdown, performSubmit }
 */
(function () {
  "use strict";

  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

  const HOST_ATTR = "data-jobpilot-autosubmit";
  const LOCAL_KEY = "jp_autosubmit_local"; // kill switch (true/undefined = allowed, false = killed)
  const DONE_KEY = "jp_autosubmit_done"; // { [applicationId]: epochMs }

  // In-page guard: an application id we have already begun submitting on this page.
  const submittedIds = new Set();

  // ------------------------------------------------------------------
  // CAPTCHA — detect only. Kept independent of content.js's own detector so the
  // no-CAPTCHA gate is enforced twice, by two code paths (belt & suspenders).
  // We NEVER interact with these widgets.
  // ------------------------------------------------------------------
  const CAPTCHA_SELECTORS = [
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
  function hasCaptcha() {
    for (const s of CAPTCHA_SELECTORS) {
      try {
        if (document.querySelector(s)) return true;
      } catch (_) {}
    }
    return false;
  }

  // ------------------------------------------------------------------
  // DOM helpers
  // ------------------------------------------------------------------
  function inOwnUi(el) {
    try {
      return !!(el.closest("#jobpilot-ext-root") || el.closest(`[${HOST_ATTR}]`) || el.closest("[data-jobpilot-reviewcard]"));
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
  // Submit-button location. Per-ATS selectors first (most reliable), then a
  // conservative generic scan that only accepts a SINGLE unambiguous candidate.
  // If we can't confidently identify one button, we return null and the caller
  // falls back to the Review Card — never a guessed click.
  // ------------------------------------------------------------------
  const SUBMIT_SELECTORS = {
    greenhouse: ['#submit_app', 'button#submit_app', 'input[type="submit"][value*="Submit" i]', 'button[type="submit"]'],
    lever: ['button.postings-btn[type="submit"]', 'button[data-qa="btn-submit-resume"]', 'button[type="submit"]'],
    ashby: ['button[type="submit"]'],
    // Workday is a multi-step wizard — only the final, explicitly-named submit control.
    workday: ['button[data-automation-id="wd-CommandButton_uic_submitButton"]', 'button[data-automation-id*="submit" i]'],
    workable: ['button[data-ui="submit-application"]', 'button[type="submit"]'],
    smartrecruiters: ['#submitButton', 'button[type="submit"]'],
    generic: [],
  };

  const POSITIVE = /\b(submit|apply now|send application)\b/i;
  const NEGATIVE = /\b(save|next|continue|back|previous|cancel|draft|upload|attach|add|remove|edit|sign\s?in|log\s?in|search|withdraw)\b/i;

  function acceptText(t) {
    if (!t) return false;
    if (NEGATIVE.test(t) && !POSITIVE.test(t)) return false;
    return true;
  }

  function findSubmitButton(adapter) {
    const id = (adapter && adapter.id) || "generic";

    // 1) Deterministic, per-ATS selectors — first visible, enabled, non-negative.
    for (const sel of SUBMIT_SELECTORS[id] || []) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch (_) {
        continue;
      }
      for (const el of nodes) {
        if (inOwnUi(el) || !isVisible(el)) continue;
        if (!acceptText(textOf(el))) continue;
        return el;
      }
    }

    // 2) Generic scan — require POSITIVE text AND a single clear candidate.
    const candidates = [];
    let nodes;
    try {
      nodes = document.querySelectorAll('button, input[type="submit"], [role="button"]');
    } catch (_) {
      nodes = [];
    }
    nodes.forEach((el) => {
      if (inOwnUi(el) || !isVisible(el)) return;
      const t = textOf(el);
      if (!t || !POSITIVE.test(t) || (NEGATIVE.test(t) && !POSITIVE.test(t))) return;
      candidates.push(el);
    });
    if (candidates.length === 1) return candidates[0];

    // Tie-break: an exactly-"Submit"/"Submit application" control.
    const exact = candidates.filter((el) => /^\s*submit(\s+(?:my\s+)?application)?\s*$/i.test(textOf(el)));
    if (exact.length === 1) return exact[0];

    return null; // ambiguous ⇒ caller shows the Review Card
  }

  // ------------------------------------------------------------------
  // Kill switch + persisted done-set (content-script direct storage access, same
  // pattern as lib/ratelimit.js). Storage errors fail SAFE (auto-submit off).
  // ------------------------------------------------------------------
  async function localEnabled() {
    try {
      const bag = await chrome.storage.local.get(LOCAL_KEY);
      // Default OFF (review-only): auto-submit requires an EXPLICIT local opt-in
      // via the popup toggle, on top of the server opt-in. The toggle is also the
      // always-available kill switch — flipping it off disables auto-submit here
      // regardless of server state.
      return bag[LOCAL_KEY] === true;
    } catch (_) {
      return false; // storage unavailable ⇒ do not auto-submit
    }
  }

  async function isDone(appId) {
    try {
      const bag = await chrome.storage.local.get(DONE_KEY);
      const map = bag[DONE_KEY] || {};
      return !!map[appId];
    } catch (_) {
      return true; // can't verify ⇒ treat as done (never re-submit)
    }
  }

  async function markDone(appId) {
    try {
      const bag = await chrome.storage.local.get(DONE_KEY);
      const map = bag[DONE_KEY] || {};
      map[appId] = Date.now();
      await chrome.storage.local.set({ [DONE_KEY]: map });
    } catch (_) {
      /* best effort; the in-memory submittedIds set still guards this page */
    }
  }

  // ------------------------------------------------------------------
  // Pending-record matching. The backend returns applications that are already
  // past their undo window and unexpired; we still match STRICTLY to this page
  // (host + path) and re-check expiry, so we can never submit a different job.
  // ------------------------------------------------------------------
  function normUrl(u) {
    try {
      const x = new URL(u, location.href);
      return (x.hostname + x.pathname).replace(/\/+$/, "").toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function normList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.pending)) return data.pending;
    if (data && Array.isArray(data.applications)) return data.applications;
    return [];
  }

  function recordId(r) {
    return (r && (r.application_id || r.applicationId || r.id || r._id)) || null;
  }

  function isExpired(r) {
    const exp = r && (r.expires_at || r.expiresAt || r.expiry);
    if (!exp) return false;
    const t = Date.parse(exp);
    if (isNaN(t)) return false;
    return t <= Date.now();
  }

  function matchRecord(list, url, adapter) {
    const cur = normUrl(url);
    if (!cur) return null;
    for (const r of list) {
      if (!r || typeof r !== "object") continue;
      // Optional ATS guard: if the record names an ATS, it must match this page's.
      if (r.ats && adapter && adapter.id && String(r.ats).toLowerCase() !== String(adapter.id).toLowerCase()) continue;
      const cands = [r.url, r.apply_url, r.application_url, r.job_url, r.posting_url, r.href].filter((v) => typeof v === "string" && v);
      for (const c of cands) {
        if (normUrl(c) === cur) return r;
      }
    }
    return null;
  }

  function no(reason) {
    return { ok: false, reason };
  }

  // ------------------------------------------------------------------
  // evaluate — the gate. Returns { ok:false, reason } for every non-eligible
  // case (caller falls back to the Review Card), or a submit context on success.
  // ------------------------------------------------------------------
  async function evaluate(ctx) {
    const url = (ctx && ctx.url) || location.href;
    const adapter = ctx && ctx.adapter;
    try {
      // Gate 3 (CAPTCHA) — checked here and again at click time.
      if (ctx && ctx.captcha) return no("captcha");
      if (hasCaptcha()) return no("captcha");

      // Gate 1a — local kill switch.
      if (!(await localEnabled())) return no("kill_switch");

      // Gate 1b — server opt-in / master flag. 404 or non-true ⇒ behave as today.
      const s = await send({ type: "AUTOSUBMIT_SETTINGS" });
      if (!s || !s.ok || !s.data || s.data.enabled !== true) return no("disabled");

      // Gate 2 — an approved, matching, unexpired, not-yet-submitted record.
      const p = await send({ type: "AUTOSUBMIT_PENDING" });
      if (!p || !p.ok || !p.data) return no("no_pending");
      const record = matchRecord(normList(p.data), url, adapter);
      if (!record) return no("no_match");
      if (record.status && String(record.status).toLowerCase() !== "approved") return no("not_approved");
      // Honor the backend's own eligibility verdict: the pending contract marks each
      // record `eligible` (records still inside their undo window arrive in `waiting`,
      // not `pending`). If the server says a record is not eligible, we defer — the
      // Review Card is the fallback. Absent flag ⇒ trust status + expiry below.
      if (record.eligible === false) return no("not_eligible");
      if (isExpired(record)) return no("expired");
      const appId = recordId(record);
      if (!appId) return no("no_id");
      if (submittedIds.has(appId) || (await isDone(appId))) return no("already_submitted");

      // A confidently-identified Submit button must exist.
      const button = findSubmitButton(adapter);
      if (!button) return no("no_submit_button");

      return { ok: true, record, appId, button, adapter, url };
    } catch (_) {
      return no("error");
    }
  }

  // ------------------------------------------------------------------
  // performSubmit — clicks the site's real Submit button ONCE, then reports.
  // Idempotent and defensive: re-checks CAPTCHA and the button at the last moment,
  // persists the done marker BEFORE clicking, and never clicks twice.
  // ------------------------------------------------------------------
  async function performSubmit(ev) {
    if (!ev || !ev.ok) return { ok: false, message: "Not eligible." };
    const appId = ev.appId;
    const adapter = ev.adapter;
    const url = ev.url || location.href;
    if (!appId) return { ok: false, message: "Missing application id." };

    // In-memory double-click guard — claim the id up front.
    if (submittedIds.has(appId)) return { ok: false, message: "Already submitting this application." };
    submittedIds.add(appId);

    // Last-moment CAPTCHA re-check — if one appeared, hand back to the user.
    if (hasCaptcha()) {
      submittedIds.delete(appId);
      return { ok: false, message: "A CAPTCHA appeared — solve it and submit yourself." };
    }

    // Re-verify the button (the DOM may have changed during the countdown).
    let btn = ev.button;
    if (!btn || !document.contains(btn) || !isVisible(btn) || btn.disabled) {
      btn = findSubmitButton(adapter);
    }
    if (!btn) {
      submittedIds.delete(appId);
      return { ok: false, message: "Couldn't find the site's Submit button — submit it yourself." };
    }

    // Persist the done marker BEFORE clicking, so a reload can't double-submit.
    await markDone(appId);

    try {
      btn.click();
    } catch (_) {
      return { ok: false, message: "Submit click failed — please submit yourself." };
    }

    // Report — best effort, idempotent on the backend.
    try {
      await send({
        type: "AUTOSUBMIT_MARK",
        payload: {
          application_id: appId,
          url,
          ats: (adapter && adapter.id) || "generic",
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
      });
    } catch (_) {
      /* the click already happened; a failed report must not trigger a re-click */
    }

    return { ok: true };
  }

  // ------------------------------------------------------------------
  // runCountdown — a prominent, isolated (closed shadow-DOM) overlay with a big
  // Cancel button. onSubmit fires ONLY when the countdown completes uncancelled.
  // A single `settled` latch guarantees cancel and completion can't both run.
  // ------------------------------------------------------------------
  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .jp-backdrop {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(9, 9, 11, .55); backdrop-filter: saturate(120%) blur(1px);
      display: flex; align-items: center; justify-content: center;
    }
    .jp-cd {
      width: 380px; max-width: calc(100vw - 32px);
      background: #ffffff; color: #18181b; border: 1px solid #e4e4e7; border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,.35); padding: 22px 22px 18px; text-align: center;
    }
    .jp-cd-ttl { font-weight: 800; font-size: 16px; margin: 0 0 2px; }
    .jp-cd-sub { font-size: 12px; color: #71717a; margin: 0 0 14px; line-height: 1.4; }
    .jp-cd-num {
      font-size: 54px; font-weight: 800; line-height: 1; margin: 6px 0 4px;
      background: linear-gradient(135deg, #6366f1, #4f46e5); -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .jp-cd-hint { font-size: 12px; color: #a1a1aa; margin: 0 0 16px; }
    .jp-cd-cancel {
      display: block; width: 100%; padding: 13px 16px; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 800; cursor: pointer; color: #fff;
      background: linear-gradient(135deg, #e11d48, #be123c);
      box-shadow: 0 8px 20px rgba(190,18,60,.35);
    }
    .jp-cd-cancel:hover { filter: brightness(1.05); }
    .jp-cd-cancel:focus { outline: 3px solid #fda4af; outline-offset: 2px; }
    .jp-cd-foot { font-size: 11px; color: #a1a1aa; margin: 12px 0 0; line-height: 1.4; }
    @media (prefers-color-scheme: dark) {
      .jp-cd { background: #18181b; color: #fafafa; border-color: #3f3f46; }
      .jp-cd-sub { color: #a1a1aa; }
    }
  `;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function runCountdown(opts) {
    const o = opts || {};
    const seconds = Math.max(2, Math.min(30, Number(o.seconds) || 5));
    const record = o.record || {};
    let remaining = seconds;
    let settled = false;
    let intervalId = null;
    let timeoutId = null;

    // Tear down any stray instance.
    document.querySelectorAll(`[${HOST_ATTR}]`).forEach((n) => n.remove());

    const host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const backdrop = el("div", "jp-backdrop");
    const card = el("div", "jp-cd");
    card.setAttribute("role", "alertdialog");
    card.setAttribute("aria-label", "Aspirely is about to submit this approved application");

    card.appendChild(el("p", "jp-cd-ttl", "Auto-submitting this approved application"));

    const who = [record.title || record.job_title, record.company || record.company_name].filter(Boolean).join(" · ");
    card.appendChild(el("p", "jp-cd-sub", who ? `${who}` : "You approved this application for auto-submit. It will submit when the countdown ends."));

    const numEl = el("div", "jp-cd-num", String(remaining));
    numEl.setAttribute("aria-live", "assertive");
    card.appendChild(numEl);
    card.appendChild(el("p", "jp-cd-hint", "seconds until Aspirely clicks the site's Submit"));

    const cancelBtn = el("button", "jp-cd-cancel", "Cancel — let me review");
    cancelBtn.type = "button";
    card.appendChild(cancelBtn);

    card.appendChild(el("p", "jp-cd-foot", "Cancel any time to return to the Review Card. Aspirely only ever clicks the site's own Submit — never a CAPTCHA."));

    backdrop.appendChild(card);
    shadow.appendChild(backdrop);
    document.documentElement.appendChild(host);

    function cleanup() {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      intervalId = timeoutId = null;
      document.removeEventListener("keydown", onKey, true);
      try {
        host.remove();
      } catch (_) {}
    }

    function settle(action) {
      if (settled) return; // single latch — cancel and completion are mutually exclusive
      settled = true;
      cleanup();
      if (action === "submit") {
        if (typeof o.onSubmit === "function") o.onSubmit();
      } else if (typeof o.onCancel === "function") {
        o.onCancel();
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        settle("cancel");
      }
    }

    document.addEventListener("keydown", onKey, true);
    cancelBtn.addEventListener("click", () => settle("cancel"));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) settle("cancel"); // clicking the dimmed area cancels
    });

    intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        settle("submit");
        return;
      }
      numEl.textContent = String(remaining);
    }, 1000);
    // Absolute backstop in case interval ticks drift or are throttled.
    timeoutId = setTimeout(() => settle("submit"), (seconds + 0.4) * 1000);

    setTimeout(() => {
      try {
        cancelBtn.focus();
      } catch (_) {}
    }, 0);

    return { cancel: () => settle("cancel") };
  }

  self.JPAutoSubmit = { evaluate, runCountdown, performSubmit };
})();
