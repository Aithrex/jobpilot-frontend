/**
 * Privacy rights contract. Backend: the auth blueprint (`/api/auth/*`).
 *
 * Source of truth: docs/plans/2026-11-11-us-launch-compliance-and-redesign.md,
 * "Backend contract". Failures are 400/403/429 (never 401); success payloads
 * are flat. Every endpoint may 404 while the backend change is rolling out,
 * and each caller degrades instead of erroring.
 */

/** The four email lists. Mirrors the existing notification-preference store. */
export interface PrivacyEmailLists {
  job_alerts: boolean;
  digests: boolean;
  product_updates: boolean;
  marketing: boolean;
}

export type EmailListKey = keyof PrivacyEmailLists;

export const EMAIL_LIST_KEYS: readonly EmailListKey[] = [
  'job_alerts',
  'digests',
  'product_updates',
  'marketing',
];

/** GET /api/auth/privacy and the echo of PUT /api/auth/privacy. */
export interface PrivacyState {
  /** Always true: Aspirely does not sell or share personal information. */
  sale_share_opt_out: boolean;
  /** Recorded server-side when a request arrives with `Sec-GPC: 1`. */
  gpc: { detected: boolean; last_seen_at: string | null };
  sensitive: {
    immigration_status: { consented: boolean; consented_at: string | null };
  };
  email: PrivacyEmailLists;
  terms: { version: string | null; accepted_at: string | null };
  age_confirmed: boolean;
}

/** PUT /api/auth/privacy body. Every field is optional (partial update). */
export interface PrivacyUpdate {
  /** `false` erases stored visa and immigration fields and stops their use in matching. */
  immigration_status_consent?: boolean;
  email?: Partial<PrivacyEmailLists>;
  accept_terms_version?: string;
  age_confirmed?: boolean;
}

/** GET /api/auth/email/unsubscribe?t= : which list the token is scoped to. */
export interface UnsubscribeInfo {
  list: string;
}

/** POST /api/auth/email/unsubscribe?t= */
export interface UnsubscribeResult {
  unsubscribed: boolean;
  list: string;
}

/** Result of GET /api/auth/account/export, downloaded as a Blob. */
export interface AccountExportResult {
  data?: Blob;
  /** Server-provided filename, `aspirely-data-export-YYYY-MM-DD.json`. */
  filename?: string;
  error?: string;
  status?: number;
  /** Seconds until another export is allowed (429 `rate_limited`). */
  retryAfter?: number;
}

/** DELETE /api/auth/account (existing endpoint). */
export interface AccountDeletionResult {
  deleted: boolean;
  job_id?: string;
  message?: string;
}

/** `400 {error:"age_requirement"}` from POST /api/auth/register. */
export const AGE_REQUIREMENT_ERROR = 'age_requirement';

/** Signup consent captured by the clickwrap. */
export interface SignupConsent {
  age_confirmed: boolean;
  terms_version: string;
}

/** Narrow an unknown value into a PrivacyState, tolerating missing branches. */
export function normalizePrivacyState(raw: unknown): PrivacyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const gpc = obj(r.gpc);
  const imm = obj(obj(r.sensitive).immigration_status);
  const email = obj(r.email);
  const terms = obj(r.terms);
  return {
    sale_share_opt_out: r.sale_share_opt_out !== false,
    gpc: { detected: gpc.detected === true, last_seen_at: str(gpc.last_seen_at) },
    sensitive: {
      immigration_status: {
        consented: imm.consented === true,
        consented_at: str(imm.consented_at),
      },
    },
    email: {
      job_alerts: email.job_alerts === true,
      digests: email.digests === true,
      product_updates: email.product_updates === true,
      marketing: email.marketing === true,
    },
    terms: { version: str(terms.version), accepted_at: str(terms.accepted_at) },
    age_confirmed: r.age_confirmed === true,
  };
}
