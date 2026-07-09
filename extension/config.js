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
 *
 * LLM_FIELD_DISAMBIGUATION : opt-in, OFF by default. When true (and FIELD_MAP_PATH
 *                  is set), the resolver may, as a LAST resort, ask the backend to
 *                  map an unrecognized field label to a canonical field. The page
 *                  snippet is PII-redacted (lib/redact.js) before it ever leaves the
 *                  browser. This needs a backend endpoint that does NOT exist yet
 *                  (define the contract with backend-engineer first); leave OFF
 *                  until it does, or field disambiguation silently no-ops.
 * FIELD_MAP_PATH : backend path (relative to API_BASE) for the above, e.g.
 *                  "/apply/field-map". Only used when LLM_FIELD_DISAMBIGUATION.
 */
const JOBPILOT_CONFIG = {
  API_BASE: "http://localhost:5000/api",
  WEB_APP_ORIGIN: "http://localhost:5173",
  LLM_FIELD_DISAMBIGUATION: false,
  FIELD_MAP_PATH: "/apply/field-map",
};

// Make it reachable from the service worker (importScripts) and content scripts.
if (typeof self !== "undefined") self.JOBPILOT_CONFIG = JOBPILOT_CONFIG;
