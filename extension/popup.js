const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));
const $ = (id) => document.getElementById(id);

$("openapp").href = JOBPILOT_CONFIG.WEB_APP_ORIGIN;

async function refresh() {
  const st = await send({ type: "GET_STATUS" });
  const connected = st && st.hasToken;
  $("dot").classList.toggle("on", !!connected);
  if (connected) {
    const nm = st.profile && st.profile.personal && st.profile.personal.name;
    const hasResume = st.profile && st.profile.has_resume;
    $("status").textContent = nm
      ? `Connected as ${nm}${hasResume ? "" : " · upload a résumé in the app for best results"}`
      : "Connected. Sync your profile to start.";
    $("manual").classList.remove("hide");
  } else {
    $("status").textContent = "Not connected. Open the app and sign in — your token auto-syncs.";
    $("manual").classList.remove("hide");
  }
}

$("sync").addEventListener("click", async () => {
  $("status").textContent = "Syncing…";
  const r = await send({ type: "SYNC_PROFILE" });
  if (r && r.ok) {
    const nm = r.profile && r.profile.personal && r.profile.personal.name;
    $("status").textContent = nm ? `Synced — ${nm}` : "Synced your profile.";
    $("dot").classList.add("on");
  } else {
    $("status").textContent = (r && r.error) || "Sync failed — make sure you're signed in.";
  }
});

$("save").addEventListener("click", async () => {
  const token = $("token").value.trim();
  if (!token) return;
  await send({ type: "SET_TOKEN", token });
  $("token").value = "";
  $("status").textContent = "Token saved.";
  refresh();
});

$("clear").addEventListener("click", async () => {
  await send({ type: "CLEAR" });
  refresh();
});

/* Auto-submit local kill switch. Stored in chrome.storage.local under
 * `jp_autosubmit_local`; defaults OFF (review-only). This is the always-available
 * local control that disables auto-submit regardless of the server's opt-in
 * state. The content script only ever auto-submits when this is explicitly on
 * AND the server settings endpoint reports the user opted in. */
async function loadKill() {
  try {
    const bag = await chrome.storage.local.get("jp_autosubmit_local");
    $("autosubmit").checked = bag.jp_autosubmit_local === true;
  } catch (_) {
    $("autosubmit").checked = false;
  }
}

$("autosubmit").addEventListener("change", async () => {
  const on = !!$("autosubmit").checked;
  try {
    await chrome.storage.local.set({ jp_autosubmit_local: on });
    $("killdesc").textContent = on
      ? "On for this device. JobPilot may auto-submit only applications you approved in the app — after a countdown you can cancel. Never touches CAPTCHAs."
      : "Off = review-only (default). When on, JobPilot may auto-submit only applications you approved in the app — after a countdown you can cancel. Never touches CAPTCHAs.";
  } catch (_) {
    /* storage unavailable — auto-submit stays off (fail safe) */
  }
});

loadKill();
refresh();
