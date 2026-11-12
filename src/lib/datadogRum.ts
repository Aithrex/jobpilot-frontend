/**
 * Datadog Browser RUM: performance and error monitoring, with browser to API
 * trace stitching (browser, then nginx and the Flask API on the Oracle box).
 *
 * Initialized once at app boot from main.tsx. No-ops when env vars are missing,
 * which keeps local dev and preview builds quiet (no events shipped, no errors).
 *
 * Privacy (disclosed in the Privacy Policy, "Cookies" and "Global Privacy
 * Control"):
 *  - A browser that sends Global Privacy Control (`navigator.globalPrivacyControl
 *    === true`) never loads RUM at all. Aspirely sells and shares nothing, so
 *    GPC changes nothing there; honoring it here goes one step further.
 *  - Session Replay is off (`sessionReplaySampleRate: 0`).
 *  - `defaultPrivacyLevel: "mask-user-input"` masks form input.
 *
 * Config notes:
 *  - clientToken is a public write-only token, safe to ship in the bundle.
 *  - allowedTracingUrls injects x-datadog-* + traceparent headers into fetch/XHR
 *    calls to the same-origin /api so backend spans link to the RUM session.
 */
import { datadogRum } from "@datadog/browser-rum";

import { browserSendsGpc } from "./legal";

let initialized = false;

export function initDatadogRum(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  // Global Privacy Control: do not load monitoring for this browser.
  if (browserSendsGpc()) return;

  const applicationId = import.meta.env.VITE_DD_RUM_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DD_RUM_CLIENT_TOKEN;
  const site = import.meta.env.VITE_DD_RUM_SITE ?? "datadoghq.com";
  const env = import.meta.env.VITE_DD_RUM_ENV ?? "prod";
  const version = import.meta.env.VITE_DD_RUM_VERSION ?? "unknown";

  if (!applicationId || !clientToken) {
    // Local dev or build without the secrets: stay silent.
    return;
  }

  datadogRum.init({
    applicationId,
    clientToken,
    site,
    service: "jobpilot-frontend",
    env,
    version,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 0,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
    allowedTracingUrls: [
      // Stitch RUM session to backend APM trace for any API call to our own
      // origin (the app talks to same-origin /api in production).
      (url) => url.startsWith(window.location.origin + "/api"),
    ],
    traceSampleRate: 100,
    // Send both Datadog headers and the W3C standard so any upstream is happy.
    traceContextInjection: "all",
  });

  initialized = true;
}

export { datadogRum };
