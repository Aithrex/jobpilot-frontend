/**
 * capabilities.ts - the ONE authoritative registry of what Aspirely can
 * actually do for a user today, and what it cannot yet.
 *
 * Why this file exists
 * --------------------
 * "Coming soon" used to be a string typed by hand into whichever component
 * needed it (nav badges, the beta lab, the notifications tab, the landing
 * hero). That guarantees drift: a capability ships and three surfaces keep
 * calling it upcoming, or - far worse - a surface calls something available
 * that cannot actually run. Marketing status is now DATA, declared once here,
 * and every surface reads it.
 *
 * `lib/entitlements.ts` is deliberately NOT the home for this. That file is a
 * declared mirror of the backend's paid-plan contract; it answers "has this
 * user paid for X". This file answers the different question "does X exist for
 * anyone yet". Mixing them would drift the mirror.
 *
 * Evidence discipline
 * -------------------
 * Every status below was verified against both repos on 2026-07-20 (see
 * `evidence`). The rule applied throughout: **code existing is not
 * availability**. A capability is only `available` if its backend route is
 * registered AND edge-routed AND reachable by a normal user in the DEFAULT
 * shell without a flag being flipped. Anything gated behind an unset env var,
 * an unpublished extension, or missing credentials is NOT available, however
 * complete its code is.
 */

/**
 * Lifecycle status, ordered from most to least real.
 *
 * These are deliberately distinct rather than one catch-all "coming soon":
 * Auto Apply (code-complete, dark in prod) and web push (no client half
 * written at all) are not the same kind of unfinished, and flattening them
 * into one badge would be its own small lie.
 */
export type CapabilityStatus =
  | 'available' // Live for normal users right now, no flag required.
  | 'beta' // Live, reachable, but explicitly labelled unfinished.
  | 'early-access' // Live only for a named cohort. Use ONLY if that cohort truly exists.
  | 'coming-soon' // Actively being built; substantial machinery already exists.
  | 'planned'; // Intended, but materially unbuilt. Weaker promise than coming-soon.

/** User-facing text for each status. Never rendered as colour alone. */
export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  available: 'Available',
  beta: 'Beta',
  'early-access': 'Early access',
  'coming-soon': 'Coming soon',
  planned: 'Planned',
};

/** True when the capability can actually be used today. */
export function isLive(status: CapabilityStatus): boolean {
  return status === 'available' || status === 'beta' || status === 'early-access';
}

export interface Capability {
  id: string;
  /** Short product name as users should see it. */
  name: string;
  status: CapabilityStatus;
  /** One truthful sentence. For unavailable capabilities this must describe
   *  the intent without implying it works today. */
  blurb: string;
  /** Why this status - repo evidence, for the next person who edits this. */
  evidence: string;
}

/**
 * ── AVAILABLE NOW ────────────────────────────────────────────────
 * From resume to matched and tailored.
 */
export const MATCH: Capability = {
  id: 'match',
  name: 'Match',
  status: 'available',
  blurb: 'Upload a resume and see up to 5 genuinely best-fit openings, with the reason for each.',
  evidence:
    'guest_jobs_max=5 server-enforced (platform_config_service.py:39; guest_service.py:870,969,1397). Live behind GUEST_ONBOARDING_ENABLED=true (lambda.tf:93).',
};

export const TAILOR: Capability = {
  id: 'tailor',
  name: 'Tailor',
  status: 'available',
  blurb:
    'Rewrite your resume for one chosen role, with IntegrityGuard holding every fact in place.',
  evidence:
    'Guest: guest_tailor_limit=1 LIFETIME per subject (platform_config_service.py:32), atomic reserve at guest_service.py:555-600. Free signed-in: 5/UTC day default (usage_service.py:25-29, entitlements_service.py:83).',
};

export const TRACK: Capability = {
  id: 'track',
  name: 'Track',
  status: 'available',
  blurb: 'Keep every application, status and follow-up in one pipeline.',
  evidence:
    'tailoring_records-backed (pipeline_intel_service.py:9-11); routes resume.py:796,1059,2048+; "applications" is a _CORE free entitlement (entitlements_service.py:158); shipped in the DEFAULT shell at /app/apply (App.tsx:134, nav.config.ts:37).',
};

export const EMAIL_UPDATES: Capability = {
  id: 'email-updates',
  name: 'Email updates',
  status: 'available',
  blurb: 'Opt in to a morning or evening digest of new matches and pipeline movement.',
  evidence:
    'The ONLY channel that delivers. ZeptoMail transport (email_service.py:124-160), ZEPTOMAIL_TOKEN present in SSM map (ssm_config.py:128), EMAIL_PROVIDER=zeptomail in prod (lambda.tf:42). Digest scheduler live (schedulers.tf:14; scheduled_jobs.py:295-298). Both digest events default OFF = genuinely opt-in.',
};

/**
 * ── COMING NEXT ──────────────────────────────────────────────────
 * From matched to applied. NOTHING here may be presented as usable.
 */
export const AUTO_APPLY: Capability = {
  id: 'auto-apply',
  name: 'Auto Apply',
  status: 'beta',
  blurb:
    'Manual, Auto, or Auto Aggressive — queue any job, tailor or plain resume, and Aspirely prepares or submits within your daily quota.',
  evidence:
    'Ledger queue (/api/apply/queue), modes (copilot/approval/aggressive), tailor toggle, entitlements auto_apply on all tiers + auto_submit meter. Per-job Auto Apply CTA on job cards. Admin entitlement_overrides for plan/limits/features. Executor still tenant-dependent (Workday account/OTP walls); Greenhouse/Lever/Ashby cleaner.',
};

export const WHATSAPP: Capability = {
  id: 'whatsapp',
  name: 'WhatsApp alerts and approvals',
  status: 'coming-soon',
  blurb: 'Opt in to receive match alerts, application updates and approval requests in WhatsApp.',
  evidence:
    'Concept only. Meta Cloud API request is shaped (channels.py:116-185) but WHATSAPP_ENABLED / PHONE_NUMBER_ID / ACCESS_TOKEN exist in NO config surface - absent from .env.example, lambda.tf and the SSM map, so it cannot be switched on. Consent fns start/confirm/revoke (service.py:292-347) have zero callers and no route, and the FE captures no phone number, so it would deliver to nobody. Inbound approval webhook does not exist at all - no hub.challenge, no X-Hub-Signature-256, no edge prefix (variables.tf:81-96). MANUAL_STEPS.md:30 states send+receive is NOT built.',
};

export const SMS: Capability = {
  id: 'sms',
  name: 'SMS alerts',
  status: 'planned',
  blurb: 'The same alerts over SMS, for people who prefer it.',
  evidence:
    'Concept only, weaker than WhatsApp. Twilio request shaped (channels.py:191-241); TWILIO_ENABLED/SID/token/from-number absent everywhere; blocked by the same missing consent routes. Deliberately "planned", not "coming soon" - no work is in flight.',
};

export const PUSH: Capability = {
  id: 'push',
  name: 'Web and mobile push',
  status: 'planned',
  blurb: 'Push notifications on desktop and mobile.',
  evidence:
    'The largest gap. Backend half is real (channels.py:247-293, pywebpush in requirements, SSRF allowlist at service.py:255-278) but the FRONTEND half is entirely unwritten - zero serviceWorker / PushManager / requestPermission / VAPID anywhere in src/, no sw.js, no manifest, and types/notifications.ts has no subscription field. Needs a whole client feature, not a credential.',
};

/** Everything the landing may speak about, in one list. */
export const CAPABILITIES: Capability[] = [
  MATCH,
  TAILOR,
  TRACK,
  EMAIL_UPDATES,
  AUTO_APPLY,
  WHATSAPP,
  SMS,
  PUSH,
];

export function capabilityById(id: string): Capability | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}

/**
 * The in-window "Coming next" dock. It lists ONLY capabilities that are not
 * live yet - the shipped ones (Match, Tailor, Track) are already demonstrated
 * by the illustrative workflow directly above it, so repeating them here under
 * a "Coming next" label was both redundant and untrue. Frosted, with a visible
 * status badge; never illuminated, because nothing in this list works today.
 */
export const DOCK_CAPABILITIES: Capability[] = [AUTO_APPLY, WHATSAPP];

/** The two roadmap features that get a full concept preview. */
export const ROADMAP_FEATURED: Capability[] = [AUTO_APPLY, WHATSAPP];

/** Secondary roadmap items, listed with their own (weaker) statuses. */
export const ROADMAP_SECONDARY: Capability[] = [SMS, PUSH];

/**
 * There is no waitlist. `POST /api/billing/upgrade` is a stub and no
 * capability-interest table exists, so no surface may claim a user "joined"
 * anything. Account creation is the only real, persisted signal we can offer.
 */
export const NO_WAITLIST_CTA = 'Create a free account to hear when it launches.';
