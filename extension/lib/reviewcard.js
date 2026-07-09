/* JobPilot Apply Assistant — Review Card (shadow-DOM overlay).
 *
 * After an autofill, this lists every field we touched, its value, and a
 * per-field confidence, plus the questions we deliberately left for the user.
 * It is the "Review" in "Fill, Review, One Tap" — the One Tap is always the
 * user's own click on the employer's Submit button.
 *
 * ISOLATION (hard requirement):
 *   - Rendered into a CLOSED shadow root, so the host page cannot read or
 *     modify its contents via `hostEl.shadowRoot` (which is null for closed).
 *   - All styles live INSIDE the shadow root; `:host { all: initial }` blocks
 *     inheritance from the page. No styles leak out, none leak in.
 *   - Every reference (shadow root, row map, API) stays in this IIFE's closure /
 *     on the isolated-world global. Nothing is attached to the page's `window`.
 *   - Key events are stopped at the card boundary so the host page's shortcuts
 *     can't observe what the user types here.
 *
 * NEVER-SUBMIT: this component only edits fields and drafts answers. It has no
 * code path that clicks Submit, calls form.submit(), or dispatches a submit
 * event. The footer says so, permanently.
 *
 * Exposed on self.JPReviewCard (isolated world): { open }.
 */
(function () {
  "use strict";

  const HOST_ATTR = "data-jobpilot-reviewcard";

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .jp-card {
      position: fixed; top: 16px; right: 16px; z-index: 2147483647;
      width: 360px; max-width: calc(100vw - 32px); max-height: 82vh; display: flex; flex-direction: column;
      background: #ffffff; color: #18181b; border: 1px solid #e4e4e7; border-radius: 14px;
      box-shadow: 0 18px 48px rgba(0,0,0,.22); overflow: hidden;
    }
    .jp-hd { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #f1f1f4; }
    .jp-ttl { font-weight: 800; font-size: 13px; }
    .jp-x { border: none; background: none; font-size: 20px; line-height: 1; cursor: pointer; color: #71717a; padding: 0 4px; }
    .jp-x:hover { color: #18181b; }
    .jp-sub { padding: 8px 14px; font-size: 11px; color: #a1a1aa; }
    .jp-alert { margin: 8px 12px 0; padding: 8px 10px; border-radius: 8px; font-size: 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .jp-list { overflow: auto; padding: 6px 12px 4px; }
    .jp-row { padding: 8px 0; border-bottom: 1px solid #f4f4f5; }
    .jp-row:last-child { border-bottom: none; }
    .jp-row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .jp-lbl { font-size: 12px; font-weight: 600; color: #3f3f46; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .jp-badge { flex: none; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
    .jp-ok { background: #dcfce7; color: #166534; }
    .jp-warn { background: #fef3c7; color: #92400e; }
    .jp-bad { background: #fee2e2; color: #991b1b; }
    .jp-val {
      width: 100%; padding: 7px 9px; border: 1px solid #e4e4e7; border-radius: 8px;
      font-size: 13px; color: #18181b; background: #fff;
    }
    .jp-val:focus { outline: 2px solid #a78bfa; outline-offset: 0; border-color: #a78bfa; }
    .jp-val[data-conf="medium"], .jp-val[data-conf="low"] { border-color: #fcd34d; background: #fffbeb; }
    .jp-hint { font-size: 11px; color: #a1a1aa; margin-top: 4px; }
    .jp-draft { margin-top: 4px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid #e4e4e7; border-radius: 8px; background: #faf5ff; color: #6d28d9; }
    .jp-draft:hover:not(:disabled) { border-color: #7c3aed; }
    .jp-draft:disabled { opacity: .6; cursor: default; }
    .jp-empty { font-size: 12px; color: #71717a; padding: 10px 2px; }
    .jp-ft { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-top: 1px solid #f1f1f4; }
    .jp-note { font-size: 11px; color: #a1a1aa; line-height: 1.35; }
    .jp-done { flex: none; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
      border: none; border-radius: 8px; color: #fff; background: linear-gradient(135deg, #7c3aed, #4f46e5); }
    @media (prefers-color-scheme: dark) {
      .jp-card { background: #18181b; color: #fafafa; border-color: #3f3f46; }
      .jp-hd, .jp-ft { border-color: #27272a; }
      .jp-row { border-color: #27272a; }
      .jp-lbl { color: #d4d4d8; }
      .jp-val { background: #27272a; color: #fafafa; border-color: #3f3f46; }
      .jp-val[data-conf="medium"], .jp-val[data-conf="low"] { background: #2a2412; border-color: #a16207; }
      .jp-draft { background: #2e1065; color: #ddd6fe; border-color: #4c1d95; }
    }
  `;

  function badgeFor(row) {
    if (row.kind === "essay") return { cls: "jp-bad", text: "Needs you" };
    if (row.kind === "sensitive") return { cls: "jp-warn", text: "Answer yourself" };
    switch (row.confidence) {
      case "high": return { cls: "jp-ok", text: "Filled" };
      case "medium": return { cls: "jp-warn", text: "Verify" };
      case "low": return { cls: "jp-warn", text: "AI · verify" };
      default: return { cls: "jp-bad", text: "Do it yourself" };
    }
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /**
   * @param {Array<{id,label,value,confidence,kind,note}>} rows
   * @param {{onEdit?:Function,onDraft?:Function,onClose?:Function,captcha?:boolean}} handlers
   * @returns {{close:Function, setRow:Function}}
   */
  function open(rows, handlers) {
    const h = handlers || {};

    // Tear down any previous instance.
    document.querySelectorAll(`[${HOST_ATTR}]`).forEach((n) => n.remove());

    const host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "");
    // Closed root: host.shadowRoot is null to the page; internals unreachable.
    const shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const card = el("div", "jp-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "JobPilot — review your autofill");
    card.tabIndex = -1;

    // Header
    const hd = el("div", "jp-hd");
    hd.appendChild(el("span", "jp-ttl", "Review before you submit"));
    const xBtn = el("button", "jp-x", "×");
    xBtn.setAttribute("aria-label", "Close review");
    hd.appendChild(xBtn);
    card.appendChild(hd);

    const filledCount = rows.filter((r) => r.kind === "field").length;
    card.appendChild(el("div", "jp-sub", `${filledCount} field${filledCount === 1 ? "" : "s"} filled · edit any value inline`));

    if (h.captcha) {
      card.appendChild(
        el(
          "div",
          "jp-alert",
          "A CAPTCHA / bot check is on this page. JobPilot won't touch it — solve it and submit yourself."
        )
      );
    }

    const list = el("div", "jp-list");
    list.setAttribute("role", "list");
    card.appendChild(list);

    const rowRefs = new Map(); // id -> { root, input, badge, hint }

    if (!rows.length) {
      list.appendChild(el("div", "jp-empty", "No matching empty fields found on this page."));
    }

    for (const row of rows) {
      const rootEl = el("div", "jp-row");
      rootEl.setAttribute("role", "listitem");
      rootEl.dataset.id = String(row.id);

      const top = el("div", "jp-row-top");
      const lbl = el("label", "jp-lbl", row.label || "Field");
      const badgeInfo = badgeFor(row);
      const badge = el("span", `jp-badge ${badgeInfo.cls}`, badgeInfo.text);
      top.appendChild(lbl);
      top.appendChild(badge);
      rootEl.appendChild(top);

      let input = null;
      if (row.kind === "field") {
        input = el("input", "jp-val");
        input.type = "text";
        input.value = row.value == null ? "" : String(row.value);
        input.dataset.conf = row.confidence || "high";
        const lblId = `jp-l-${row.id}`;
        lbl.id = lblId;
        input.setAttribute("aria-labelledby", lblId);
        input.addEventListener("input", () => {
          if (typeof h.onEdit === "function") h.onEdit(row.id, input.value);
        });
        rootEl.appendChild(input);
      }

      if (row.kind === "essay") {
        const draftBtn = el("button", "jp-draft", "Draft an answer");
        draftBtn.type = "button";
        draftBtn.addEventListener("click", async () => {
          if (typeof h.onDraft !== "function") return;
          draftBtn.disabled = true;
          draftBtn.textContent = "Drafting…";
          try {
            await h.onDraft(row.id);
          } finally {
            draftBtn.disabled = false;
            draftBtn.textContent = "Draft another";
          }
        });
        rootEl.appendChild(draftBtn);
      }

      if (row.note) rootEl.appendChild(el("div", "jp-hint", row.note));

      list.appendChild(rootEl);
      rowRefs.set(String(row.id), { root: rootEl, input, badge, lbl });
    }

    // Footer
    const ft = el("div", "jp-ft");
    ft.appendChild(el("span", "jp-note", "You submit — JobPilot never clicks Submit for you."));
    const doneBtn = el("button", "jp-done", "Done");
    doneBtn.type = "button";
    ft.appendChild(doneBtn);
    card.appendChild(ft);

    shadow.appendChild(card);
    document.documentElement.appendChild(host);

    // ---- keyboard: isolation + navigation ----
    function focusables() {
      return Array.from(shadow.querySelectorAll("input, textarea, button")).filter((n) => !n.disabled);
    }
    function move(dir) {
      const items = focusables();
      const idx = items.indexOf(shadow.activeElement);
      const next = items[(idx + dir + items.length) % items.length];
      if (next) next.focus();
    }
    card.addEventListener("keydown", (ev) => {
      // Keep keystrokes inside the card away from the host page.
      ev.stopPropagation();
      if (ev.key === "Escape") {
        ev.preventDefault();
        close();
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        move(1);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        move(-1);
      }
    });
    card.addEventListener("keyup", (ev) => ev.stopPropagation());
    card.addEventListener("keypress", (ev) => ev.stopPropagation());

    function close() {
      try {
        host.remove();
      } catch (_) {}
      if (typeof h.onClose === "function") h.onClose();
    }

    xBtn.addEventListener("click", close);
    doneBtn.addEventListener("click", close);

    // Focus the card (then first control) so keyboard users land inside it.
    setTimeout(() => {
      const first = focusables()[0];
      (first || card).focus();
    }, 0);

    // Public API (isolated world only).
    function setRow(id, patch) {
      const ref = rowRefs.get(String(id));
      if (!ref || !patch) return;
      if (patch.kind === "field" && !ref.input) {
        // Upgrade an essay row into an editable field row after a draft insert.
        const input = el("input", "jp-val");
        input.type = "text";
        input.value = patch.value == null ? "" : String(patch.value);
        input.dataset.conf = patch.confidence || "low";
        input.addEventListener("input", () => {
          if (typeof h.onEdit === "function") h.onEdit(id, input.value);
        });
        // Replace the draft button (if present) with the input.
        const btn = ref.root.querySelector(".jp-draft");
        ref.root.insertBefore(input, btn || null);
        ref.input = input;
      }
      if (ref.input && patch.value != null) ref.input.value = String(patch.value);
      if (patch.confidence && ref.input) ref.input.dataset.conf = patch.confidence;
      if (patch.confidence || patch.kind) {
        const info = badgeFor({ kind: patch.kind || "field", confidence: patch.confidence });
        ref.badge.className = `jp-badge ${info.cls}`;
        ref.badge.textContent = info.text;
      }
      if (patch.note) {
        let hint = ref.root.querySelector(".jp-hint");
        if (!hint) {
          hint = el("div", "jp-hint");
          ref.root.appendChild(hint);
        }
        hint.textContent = patch.note;
      }
    }

    return { close, setRow };
  }

  self.JPReviewCard = { open };
})();
