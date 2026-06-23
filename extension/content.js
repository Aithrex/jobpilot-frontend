/* JobPilot Apply Assistant — on-page panel.
 * Autofill empty form fields from the user's résumé profile, and draft
 * résumé-grounded answers to open-ended questions. Never submits anything.
 */
(function () {
  if (window.__jobpilotInjected) return;
  window.__jobpilotInjected = true;

  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

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

  function autofill(profile) {
    if (!profile || !profile.personal) return 0;
    const p = profile.personal;
    const l = profile.links || {};
    const name = (p.name || "").trim();
    const sp = name.split(/\s+/);
    const first = sp[0] || "";
    const last = sp.length > 1 ? sp.slice(1).join(" ") : "";
    const rules = [
      [/first.?name|given.?name|legal.?first/, first],
      [/last.?name|surname|family.?name|legal.?last/, last],
      [/full.?name|^name$|your.?name|legal.?name|preferred.?name/, name],
      [/e-?mail/, p.email],
      [/phone|mobile|telephone|^tel$/, p.phone],
      [/linkedin/, l.linkedin],
      [/github/, l.github],
      [/portfolio|personal.?(web)?site|website|^url$/, l.portfolio],
      [/city|current.?location|^location$|town/, p.location],
    ];
    let filled = 0;
    document.querySelectorAll("input, textarea").forEach((el) => {
      const type = (el.type || "").toLowerCase();
      if (["hidden", "password", "file", "submit", "button", "checkbox", "radio"].includes(type)) return;
      if (el.disabled || el.readOnly) return;
      if (el.value && el.value.trim()) return; // never overwrite what the user typed
      const t = fieldText(el);
      if (!t) return;
      for (const [re, val] of rules) {
        if (val && re.test(t)) {
          setNativeValue(el, String(val));
          filled++;
          break;
        }
      }
    });
    return filled;
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

  // ---- panel UI ----
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
    const prev = s.dataset.base || s.textContent;
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

  q("#jp-autofill").addEventListener("click", async () => {
    let r = await send({ type: "GET_PROFILE" });
    if (!r || !r.profile) {
      flash("Syncing your profile…");
      r = await send({ type: "SYNC_PROFILE" });
    }
    if (!r || !r.profile) {
      flash((r && r.error) || "Couldn't load your profile");
      return;
    }
    const n = autofill(r.profile);
    flash(n ? `Filled ${n} field${n === 1 ? "" : "s"} — review before submitting` : "No matching empty fields found");
  });

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
