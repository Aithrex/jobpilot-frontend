/* Aspirely extension config — defaults are PRODUCTION (aspirely.me) so a store
 * install works out of the box.
 *
 * API_BASE       : the backend's /api base (no trailing slash).
 *                    Prod → https://aspirely.me/api  (CloudFront → API Gateway,
 *                    same-origin /api — see jobpilot-frontend/infra)
 *                    Dev  → http://localhost:5000/api
 * WEB_APP_ORIGIN : where the web app runs (the token-sync script reads the JWT
 *                  from its localStorage).
 *                    Prod → https://aspirely.me · Dev → http://localhost:5173
 *                  Both prod and localhost origins are declared in manifest.json
 *                  (host_permissions + the tokensync content-script matches), so
 *                  switching environments only means editing THIS file.
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
  API_BASE: "https://aspirely.me/api",
  WEB_APP_ORIGIN: "https://aspirely.me",
  LLM_FIELD_DISAMBIGUATION: false,
  FIELD_MAP_PATH: "/apply/field-map",
};

// Make it reachable from the service worker (importScripts) and content scripts.
if (typeof self !== "undefined") self.JOBPILOT_CONFIG = JOBPILOT_CONFIG;
