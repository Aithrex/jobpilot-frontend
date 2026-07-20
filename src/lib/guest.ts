/**
 * Guest onboarding identity plumbing.
 *
 * - `guest_id`: a persistent uuid stored in localStorage. It is a capability
 *   token for the backend guest session (spec: docs/specs/guest-onboarding.md
 *   in jobpilot-backend) — generated client-side, echoed back by the backend
 *   on /resume/guest/onboard.
 * - fingerprint hash: a small, stable, canvas-free device hash (UA + language
 *   + timezone + screen dims), sha256'd via SubtleCrypto. Persisted under the
 *   SAME localStorage key AuthGate already reads for register/login context
 *   (`portfolio_fingerprint_hash`) so the existing auth flows start sending it
 *   too. No external fingerprint libs by design.
 * - feature flag: VITE_GUEST_ONBOARDING is an explicit frontend kill switch
 *   ("false"/"0"/"off" → hard OFF). Unset means "let the frontend probe the
 *   backend" — the backend's own 503/404 (feature disabled / edge route not
 *   deployed) is the authoritative runtime fallback, recorded in a
 *   session-scoped kill marker so the page falls back to the account-first
 *   upload CTA without re-probing every render.
 */

import { toast } from "sonner";
import { apiService } from "@/lib/api";

export const GUEST_ID_KEY = "guest_id";
/** Server-issued anti-abuse device token (spec v2) — NOT a capability. */
export const GUEST_DEVICE_TOKEN_KEY = "guest_device_token";
/** Shared with AuthGate's login/register context — see AuthGate.tsx readContext(). */
const FINGERPRINT_KEY = "portfolio_fingerprint_hash";
const RUNTIME_DISABLED_KEY = "guest_onboarding_unavailable";

// ── Feature flag ─────────────────────────────────────────────────

/**
 * Build-time flag: "false"/"0"/"off" is the explicit kill switch; any other
 * set value is ON. UNSET (or empty) is ON in every mode — a production build
 * must probe the backend rather than silently hide a backend-enabled feature;
 * the backend's 503/404 remains the authoritative runtime fallback.
 */
export function isGuestOnboardingBuildEnabled(): boolean {
  const raw = import.meta.env.VITE_GUEST_ONBOARDING as string | undefined;
  if (raw !== undefined && raw !== "") {
    return raw !== "false" && raw !== "0" && raw !== "off";
  }
  return true;
}

/**
 * Called when a guest endpoint answers 503 (backend flag off) or 404 (edge
 * route not deployed yet) — disables /start for the rest of this tab session
 * so the root route falls back to the existing login-first landing.
 */
export function markGuestOnboardingUnavailable(): void {
  try {
    sessionStorage.setItem(RUNTIME_DISABLED_KEY, "1");
  } catch {
    /* private mode — worst case we re-probe on next navigation */
  }
}

/** The single gate the router + /start page check. */
export function isGuestOnboardingEnabled(): boolean {
  if (!isGuestOnboardingBuildEnabled()) return false;
  try {
    return sessionStorage.getItem(RUNTIME_DISABLED_KEY) !== "1";
  } catch {
    return true;
  }
}

// ── guest_id ─────────────────────────────────────────────────────

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — guest flow degrades to per-request ids */
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-v4 fallback for older WebViews.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getGuestId(): string | null {
  return safeGet(GUEST_ID_KEY);
}

/** Persist the backend-confirmed guest_id (from /resume/guest/onboard). */
export function setGuestId(guestId: string): void {
  safeSet(GUEST_ID_KEY, guestId);
}

export function ensureGuestId(): string {
  const existing = getGuestId();
  if (existing) return existing;
  const fresh = uuid();
  safeSet(GUEST_ID_KEY, fresh);
  return fresh;
}

export function clearGuestId(): void {
  try {
    if (typeof window !== "undefined") localStorage.removeItem(GUEST_ID_KEY);
  } catch {
    /* ignore */
  }
}

// ── Server-issued device token (spec v2) ─────────────────────────
//
// `POST /resume/guest/onboard` returns an opaque `device_token` the server
// stores only as a sha256 hash. It is a first-party anti-abuse signal (keeps
// the single free tailor fair across re-uploads), NOT a capability — it
// grants no access to anything. Persist it and echo it on
// session/matches/tailor calls. Deliberately NOT cleared on claim: it is a
// durable device signal, not session state.

export function getDeviceToken(): string | null {
  return safeGet(GUEST_DEVICE_TOKEN_KEY);
}

/** Persist the server-issued device token (from /resume/guest/onboard). */
export function setDeviceToken(token: string): void {
  safeSet(GUEST_DEVICE_TOKEN_KEY, token);
}

// ── Device fingerprint hash ──────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** FNV-1a fallback for non-secure contexts where SubtleCrypto is unavailable. */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fp1-${h.toString(16).padStart(8, "0")}-${input.length.toString(16)}`;
}

function fingerprintSource(): string {
  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timeZone = "";
  }
  const parts = [
    navigator.userAgent || "",
    navigator.language || "",
    timeZone,
    typeof screen !== "undefined"
      ? `${screen.width}x${screen.height}x${screen.colorDepth}`
      : "",
    String(navigator.hardwareConcurrency ?? ""),
    String(navigator.maxTouchPoints ?? ""),
  ];
  return parts.join("|");
}

let fingerprintPromise: Promise<string> | null = null;

/**
 * Stable device fingerprint hash — cached in localStorage under the key the
 * existing auth flows already read, so register/login send it automatically.
 */
export function getFingerprintHash(): Promise<string> {
  const cached = safeGet(FINGERPRINT_KEY);
  if (cached) return Promise.resolve(cached);
  if (fingerprintPromise) return fingerprintPromise;
  fingerprintPromise = (async () => {
    const source = fingerprintSource();
    let hash: string;
    try {
      hash = await sha256Hex(source);
    } catch {
      hash = fnv1aHex(source);
    }
    safeSet(FINGERPRINT_KEY, hash);
    return hash;
  })();
  return fingerprintPromise;
}

// ── Claim (guest → account) ──────────────────────────────────────

let claimInFlight: Promise<void> | null = null;

/**
 * If a guest session exists, claim it into the freshly-authenticated account.
 * Called from AuthContext right after ANY successful login / token hydration.
 * Idempotent server-side; clears guest_id on success (or 404 = unknown/expired
 * session, no point retrying). Never throws — auth must never fail on claim.
 */
export function claimGuestIfPresent(): Promise<void> {
  if (claimInFlight) return claimInFlight;
  claimInFlight = (async () => {
    try {
      const guestId = getGuestId();
      if (!guestId) return;
      const resp = await apiService.guestClaim(guestId);
      if (!resp.error || resp.status === 404) {
        clearGuestId();
      }
      // v2 response carries transfer + day-1 usage counters — surface a
      // one-line confirmation when the claim actually moved work over.
      // Best-effort only: any toast problem must never affect auth.
      const result = resp.data;
      if (result?.claimed && !result.already_claimed) {
        const moved =
          !!result.resume_imported ||
          (result.records_transferred ?? 0) > 0 ||
          (result.tailors_carried ?? 0) > 0;
        if (moved) {
          const used = result.daily_tailors_used;
          const limit = result.daily_tailors_limit;
          toast.success(
            typeof used === "number" && typeof limit === "number"
              ? `Your guest work is saved to your account. ${used} of ${limit} free tailors used today.`
              : "Your guest work is saved to your account.",
          );
        }
      }
    } catch {
      /* claim is best-effort; the server-side claimed guard keeps it safe */
    } finally {
      claimInFlight = null;
    }
  })();
  return claimInFlight;
}
