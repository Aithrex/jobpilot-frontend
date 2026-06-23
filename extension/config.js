/* JobPilot extension config — EDIT for your deployment.
 *
 * API_BASE       : your backend's /api base (no trailing slash).
 *                    Dev  → http://localhost:5000/api
 *                    Prod → https://<your-app-domain>/api
 *                  For prod you must ALSO add that origin to host_permissions
 *                  AND the web-app origin to the second content_scripts.matches
 *                  block in manifest.json (so the token auto-syncs there).
 * WEB_APP_ORIGIN : where the web app runs (the token-sync script reads the JWT
 *                  from its localStorage). Dev → http://localhost:5173
 */
const JOBPILOT_CONFIG = {
  API_BASE: "http://localhost:5000/api",
  WEB_APP_ORIGIN: "http://localhost:5173",
};

// Make it reachable from the service worker (importScripts) and content scripts.
if (typeof self !== "undefined") self.JOBPILOT_CONFIG = JOBPILOT_CONFIG;
