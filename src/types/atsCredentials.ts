/**
 * Employer (ATS) logins JobPilot manages on the user's behalf.
 *
 * Backend contract: `jobpilot-backend/shared/python/services/ats_credential_service.py`
 * + the routes in `services/jobs/blueprints/apply.py` (`/api/apply/credentials*`).
 *
 * TWO things are deliberately true of this shape:
 *   1. The LIST never contains a password. Metadata only - `has_password` says a
 *      secret exists, and revealing it is a separate, re-authenticated,
 *      rate-limited POST that the backend audits before it decrypts anything.
 *   2. Workday is a SHARED-password vendor: one password per user across every
 *      Workday employer (`scope: "shared"`). A row created before that rule
 *      keeps its own password (`legacy_per_tenant: true`) because the employer's
 *      side already has that exact value - so the UI must not claim those are
 *      the shared one.
 */

export type AtsCredentialScope = "shared" | "tenant";

export interface AtsCredential {
  /** Vendor: "workday" | "greenhouse" | ... */
  ats_family: string;
  /** The employer's slot at that vendor ("acme"). "" = the shared record. */
  tenant: string;
  /** The login we registered - the user's managed private alias. */
  username: string;
  /** A password is stored (possibly on the shared record this row points at). */
  has_password: boolean;
  scope: AtsCredentialScope;
  /** True for a Workday row that predates the one-password rule. */
  legacy_per_tenant: boolean;
  /** Employer display name, when we knew it at provisioning time. */
  company: string;
  /** HTTPS employer portal link (query stripped server-side). "" when unknown. */
  login_url: string;
  created_at: string | null;
  updated_at: string | null;
  last_used_at: string | null;
  rotation_count: number;
  reset_count: number;
  pending_ats_reset: boolean;
}

/** The single, audited plaintext egress. Never cached, never persisted. */
export interface AtsCredentialSecret {
  username: string;
  password: string;
}
