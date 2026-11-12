/**
 * legal.ts: the one place the public legal surface reads its facts from.
 *
 * Every page that prints a version, a date, an age, a company name or a
 * contact address imports it from here, so the Privacy Policy, the Terms, the
 * signup clickwrap, the terms update notice and security.txt cannot disagree.
 *
 * Values marked OWNER-SUPPLIED are decisions or facts only the product owner
 * (with counsel) can provide. Until they are filled in, the UI omits the line
 * that would print them rather than rendering a placeholder to the public.
 */

/** Sent as `terms_version` at signup and as `accept_terms_version` on accept. */
export const TERMS_VERSION = '2026-11-11';

/** The Privacy Policy revision this build ships. */
export const PRIVACY_VERSION = '2026-11-11';

/** Printed as "Last updated: ..." on every legal page. */
export const LAST_UPDATED = 'November 11, 2026';

/** Minimum age to hold an account. Mirrors the backend `MINIMUM_AGE` (default 18). */
export const MINIMUM_AGE = 18;

/** Public brand. Never "JobPilot" in user-facing copy. */
export const BRAND_NAME = 'Aspirely';

/**
 * OWNER-SUPPLIED: the legal entity that operates Aspirely. "Aithrex" is the
 * name the site already prints in its footer and Terms; confirm the exact
 * registered name (and entity type) before launch.
 */
export const COMPANY_LEGAL_NAME = 'Aithrex';

/**
 * OWNER-SUPPLIED: the postal address required by CAN-SPAM and printed in the
 * policy's contact section. `null` hides the line. Keep it identical to the
 * backend `COMPANY_POSTAL_ADDRESS` setting.
 */
export const COMPANY_POSTAL_ADDRESS: string | null = null;

/**
 * OWNER-SUPPLIED: the state whose law governs the Terms. `null` renders the
 * neutral wording "the state in which {COMPANY_LEGAL_NAME} is organized".
 */
export const GOVERNING_LAW_STATE: string | null = null;

/** The general contact the previous policy already published. */
export const CONTACT_EMAIL = 'harshith@aithrex.tech';

/** OWNER-SUPPLIED aliases. Each must exist and be monitored before launch. */
export const PRIVACY_EMAIL = 'privacy@aspirely.me';
export const SECURITY_EMAIL = 'security@aspirely.me';
export const ACCESSIBILITY_EMAIL = 'accessibility@aspirely.me';

/**
 * OWNER-SUPPLIED: how quickly an accessibility report gets a human reply.
 * Printed on /accessibility. Change it only to a number the team can keep.
 */
export const ACCESSIBILITY_RESPONSE_BUSINESS_DAYS = 5;

/** Canonical public URLs, shared with security.txt and the legal pages. */
export const SITE_ORIGIN = 'https://aspirely.me';

export const LEGAL_ROUTES = {
  privacy: '/privacy',
  terms: '/terms',
  choices: '/privacy/choices',
  accessibility: '/accessibility',
  licenses: '/licenses',
  trust: '/trust',
  unsubscribe: '/unsubscribe',
  /** Where the in-app privacy controls live (Settings, Profile section). */
  settingsPrivacy: '/app/settings/profile#privacy',
  settingsDelete: '/app/settings/profile#delete-account',
} as const;

/** Footer and trust-center link set, in display order. */
export const LEGAL_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: LEGAL_ROUTES.privacy, label: 'Privacy Policy' },
  { to: LEGAL_ROUTES.terms, label: 'Terms' },
  { to: LEGAL_ROUTES.choices, label: 'Your Privacy Choices' },
  { to: LEGAL_ROUTES.accessibility, label: 'Accessibility' },
  { to: LEGAL_ROUTES.licenses, label: 'Licenses' },
  { to: LEGAL_ROUTES.trust, label: 'Trust' },
];

/** Google's Limited Use policy, quoted by name in the Privacy Policy. */
export const GOOGLE_USER_DATA_POLICY_URL =
  'https://developers.google.com/terms/api-services-user-data-policy';

/** Google's published Vertex AI data governance statement (training, caching, abuse logging). */
export const VERTEX_DATA_GOVERNANCE_URL =
  'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance';

/** Where a person revokes Aspirely's Google access themselves. */
export const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions';

/**
 * True when the browser is sending a Global Privacy Control signal.
 * `navigator.globalPrivacyControl` is undefined in browsers that do not
 * implement GPC; only an explicit `true` counts.
 */
export function browserSendsGpc(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
