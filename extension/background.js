/* JobPilot Apply Assistant — service worker.
 * Holds the JWT (synced from the web app or pasted), and proxies the
 * apply.py endpoints so content scripts never touch the token directly.
 */
importScripts("config.js");
const API = JOBPILOT_CONFIG.API_BASE;

async function getToken() {
  const { jp_token } = await chrome.storage.local.get("jp_token");
  return jp_token || null;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(API + path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch (_) { /* non-JSON */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

/* Merge the user's saved vault (their manual edits) with fresh résumé-derived
 * fields — résumé wins on non-empty fields, but never clobbers a saved value
 * with an empty one. */
function mergeVault(saved, profile) {
  if (!saved) return profile || {};
  if (!profile) return saved || {};
  const out = JSON.parse(JSON.stringify(saved));
  for (const k of Object.keys(profile)) {
    const pv = profile[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      out[k] = { ...(out[k] || {}) };
      for (const kk of Object.keys(pv)) {
        const v = pv[kk];
        if (v === "" || v == null) continue; // keep saved value
        out[k][kk] = v;
      }
    } else if (Array.isArray(pv)) {
      out[k] = pv.length ? pv : (out[k] || []);
    } else if (pv !== "" && pv != null) {
      out[k] = pv;
    }
  }
  return out;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case "SET_TOKEN": {
          if (msg.token) await chrome.storage.local.set({ jp_token: msg.token });
          sendResponse({ ok: !!msg.token });
          break;
        }
        case "CLEAR": {
          await chrome.storage.local.remove(["jp_token", "jp_profile"]);
          sendResponse({ ok: true });
          break;
        }
        case "GET_STATUS": {
          const token = await getToken();
          const { jp_profile } = await chrome.storage.local.get("jp_profile");
          sendResponse({ ok: true, hasToken: !!token, profile: jp_profile || null });
          break;
        }
        case "SYNC_PROFILE": {
          const r = await apiFetch("/apply/profile");
          if (r.ok && r.data) {
            const merged = mergeVault(r.data.saved, r.data.profile);
            await chrome.storage.local.set({ jp_profile: merged });
            sendResponse({ ok: true, profile: merged });
          } else {
            sendResponse({ ok: false, status: r.status, error: (r.data && r.data.error) || "Sync failed" });
          }
          break;
        }
        case "GET_PROFILE": {
          const { jp_profile } = await chrome.storage.local.get("jp_profile");
          sendResponse({ ok: true, profile: jp_profile || null });
          break;
        }
        case "GENERATE_ANSWER": {
          const r = await apiFetch("/apply/answer", {
            method: "POST",
            body: JSON.stringify(msg.payload || {}),
          });
          sendResponse({ ok: r.ok, status: r.status, data: r.data });
          break;
        }
        default:
          sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // keep the message channel open for the async response
});
