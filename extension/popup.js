/* Aspirely popup controller — vanilla JS, no deps.
 *
 * Two states, one primary action:
 *   • Not connected → primary button OPENS the app (sign in there; the token
 *     auto-syncs back via tokensync.js). Manual JWT paste lives under "Advanced".
 *   • Connected     → primary button re-SYNCS the résumé profile.
 * Auth expiry is graceful: a 401 clears the token in the service worker, so the
 * next status read simply shows "signed out" — the popup never spins on a dead
 * token, and error messages are friendly (never a raw fetch error). */
const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));
const $ = (id) => document.getElementById(id);

const APP = (self.JOBPILOT_CONFIG && JOBPILOT_CONFIG.WEB_APP_ORIGIN) || "#";
$("openapp").href = APP;

let connected = false;

// Turn a proxy result into a calm, human message (never a raw exception string).
function friendlyError(r) {
  if (!r) return "Something went wrong — try again.";
  if (r.status === 0) return "Can't reach Aspirely — check the backend is running.";
  if (r.status === 401) return "Session expired — open Aspirely and sign in again.";
  const msg = r.data && (r.data.message || r.data.error);
  if (r.status === 403) return msg || "Not allowed — check your plan in the app.";
  if (r.status === 429) return msg || "Daily limit reached — try again later.";
  return (typeof msg === "string" && msg) || r.error || "Sync failed — make sure you're signed in.";
}

function setPrimary(label, primary) {
  const b = $("primary");
  b.textContent = label;
  b.classList.toggle("primary", primary !== false);
}

async function refresh() {
  const st = await send({ type: "GET_STATUS" });
  connected = !!(st && st.hasToken);
  $("dot").classList.toggle("on", connected);

  if (connected) {
    const nm = st.profile && st.profile.personal && st.profile.personal.name;
    const hasResume = st.profile && st.profile.has_resume;
    $("statustext").textContent = nm
      ? `Connected as ${nm}${hasResume === false ? " · add a résumé in the app for best results" : ""}`
      : "Connected. Sync your profile to start.";
    setPrimary("Sync my profile", false);
  } else {
    $("statustext").textContent = "Not signed in — open the app and sign in; your token auto-syncs.";
    setPrimary("Open Aspirely to sign in", true);
  }
}

// Primary button: sync when connected, otherwise open the app to sign in.
$("primary").addEventListener("click", async () => {
  if (!connected) {
    try { chrome.tabs.create({ url: APP }); } catch (_) { window.open(APP, "_blank", "noopener"); }
    return;
  }
  const btn = $("primary");
  btn.disabled = true;
  $("statustext").textContent = "Syncing your profile…";
  const r = await send({ type: "SYNC_PROFILE" });
  btn.disabled = false;
  if (r && r.ok) {
    const nm = r.profile && r.profile.personal && r.profile.personal.name;
    $("statustext").textContent = nm ? `Synced — ${nm}` : "Synced your profile.";
    $("dot").classList.add("on");
  } else {
    $("statustext").textContent = friendlyError(r);
    // A cleared token (401) means we're now disconnected — reflect it.
    if (r && r.status === 401) refresh();
  }
});

$("save").addEventListener("click", async () => {
  const token = $("token").value.trim();
  if (!token) return;
  await send({ type: "SET_TOKEN", token });
  $("token").value = "";
  $("adv").open = false;
  await refresh();
  if (connected) {
    $("statustext").textContent = "Token saved. Syncing…";
    const r = await send({ type: "SYNC_PROFILE" });
    $("statustext").textContent = r && r.ok
      ? "Connected. Ready to autofill."
      : friendlyError(r);
  }
});

$("clear").addEventListener("click", async () => {
  await send({ type: "CLEAR" });
  $("token").value = "";
  refresh();
});

/* Auto-submit local kill switch. Stored in chrome.storage.local under
 * `jp_autosubmit_local`; defaults OFF (review-only). This is the always-available
 * local control that disables auto-submit regardless of the server's opt-in
 * state. The content script only ever auto-submits when this is explicitly on
 * AND the server settings endpoint reports the user opted in. */
const KILL_ON = "On for this device. Aspirely may auto-submit only applications you approved in the app — after a countdown you can cancel. Never touches CAPTCHAs.";
const KILL_OFF = "Off = review-only (default). When on, Aspirely may auto-submit only applications you approved in the app — after a countdown you can cancel. Never touches CAPTCHAs.";

async function loadKill() {
  try {
    const bag = await chrome.storage.local.get("jp_autosubmit_local");
    const on = bag.jp_autosubmit_local === true;
    $("autosubmit").checked = on;
    $("killdesc").textContent = on ? KILL_ON : KILL_OFF;
  } catch (_) {
    $("autosubmit").checked = false;
    $("killdesc").textContent = KILL_OFF;
  }
}

$("autosubmit").addEventListener("change", async () => {
  const on = !!$("autosubmit").checked;
  try {
    await chrome.storage.local.set({ jp_autosubmit_local: on });
    $("killdesc").textContent = on ? KILL_ON : KILL_OFF;
  } catch (_) {
    // storage unavailable — auto-submit stays off (fail safe); reflect that in the UI.
    $("autosubmit").checked = false;
    $("killdesc").textContent = KILL_OFF;
  }
});

loadKill();
refresh();
