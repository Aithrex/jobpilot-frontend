/* Runs on the Aspirely web app origin. Reads the JWT the web app stored in
 * localStorage (key: auth_token) and hands it to the extension's service
 * worker, so the user never has to copy/paste a token. Re-checks on focus in
 * case they just logged in. */
(function () {
  function sync() {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) chrome.runtime.sendMessage({ type: "SET_TOKEN", token });
    } catch (_) { /* ignore */ }
  }
  sync();
  window.addEventListener("focus", sync);
})();
