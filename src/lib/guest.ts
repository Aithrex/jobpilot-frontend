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
 * - feature flag: VITE_GUEST_ONBOARDING mirrors the backend flag resolution
 *   (unset → ON in dev, OFF in prod) PLUS a session-scoped runtime kill marker
 *   set when the backend answers 503/404 (feature disabled / edge route not
 *   deployed) so prod safely falls back to the login-first landing.
 */

import { apiService } from "@/lib/api";

export const GUEST_ID_KEY = "guest_id";
/** Shared with AuthGate's login/register context — see AuthGate.tsx readContext(). */
const FINGERPRINT_KEY = "portfolio_fingerprint_hash";
const RUNTIME_DISABLED_KEY = "guest_onboarding_unavailable";

// ── Feature flag ─────────────────────────────────────────────────

/** Build-time flag: VITE_GUEST_ONBOARDING set → truthy-parse; unset → dev-only. */
export function isGuestOnboardingBuildEnabled(): boolean {
  const raw = import.meta.env.VITE_GUEST_ONBOARDING as string | undefined;
  if (raw !== undefined && raw !== "") {
    return raw !== "false" && raw !== "0" && raw !== "off";
  }
  // Mirrors backend GUEST_ONBOARDING_ENABLED: unset → ON in dev, OFF in prod.
  return !!import.meta.env.DEV;
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
    } catch {
      /* claim is best-effort; the server-side claimed guard keeps it safe */
    } finally {
      claimInFlight = null;
    }
  })();
  return claimInFlight;
}
