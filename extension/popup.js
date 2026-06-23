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

refresh();
