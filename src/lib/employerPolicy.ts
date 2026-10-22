/**
 * Reading the direct-employer policy blocks (contract `employer-policy-1.0.0`).
 *
 * Every function here is a GUARD first: the blocks arrive from a backend that
 * may predate them, may send a value outside the enum, or may send half a
 * block. Nothing in a component reads a block field directly - it reads the
 * label these functions derive, so an unexpected value degrades to the honest
 * "we do not know" wording instead of to something confident and wrong.
 *
 * Two rules this module exists to keep:
 *  1. UNKNOWN IS NEVER DIRECT. Only `kind === "operating"` earns the words
 *     "Direct employer". A missing, invalid or `unknown` kind on a row that
 *     carries the block reads "Employer type unverified".
 *  2. NO WARNINGS IS NOT VERIFIED. `trust.state === "no_warnings_found"` is
 *     the absence of evidence from an automated check. It renders as nothing,
 *     or at most as "No warning signs found (automated check)".
 *
 * The client never filters by policy. The server enforces the user's
 * exclusions and reports what it removed in `policy.excluded_counts`; this
 * module only turns those numbers into words.
 */
import type {
  Availability,
  AvailabilityMethod,
  AvailabilityState,
  EmployerBusinessKind,
  EmployerExclusionKey,
  EmployerExclusions,
  EmployerPolicyPreset,
  EmployerPolicyRowFields,
  EmployerPreferences,
  EmployerProfile,
  PolicyBlock,
  PostingProfile,
  PostingPurpose,
  PostingRelationship,
  TrustBlock,
  TrustState,
  TrustWarning,
} from '@/types/employerPolicy';

// ── Enumerations (closed sets, used by the guards) ───────────────

const BUSINESS_KINDS: readonly EmployerBusinessKind[] = [
  'operating',
  'staffing',
  'consultancy',
  'talent_marketplace',
  'mixed',
  'unknown',
];
const RELATIONSHIPS: readonly PostingRelationship[] = [
  'own_role',
  'named_client',
  'undisclosed_client',
  'freelance_task',
  'unknown',
];
const PURPOSES: readonly PostingPurpose[] = [
  'requisition',
  'talent_community',
  'resume_collection',
  'unknown',
];
const AVAILABILITY_STATES: readonly AvailabilityState[] = [
  'verified_open',
  'closed',
  'unverifiable',
  'unknown',
];
const AVAILABILITY_METHODS: readonly AvailabilityMethod[] = [
  'listing_seen',
  'liveness_probe',
  'detail_fetch',
  'none',
];
const TRUST_STATES: readonly TrustState[] = [
  'no_warnings_found',
  'warnings',
  'ownership_conflict',
  'suspected_fraud',
];
const PRESETS: readonly EmployerPolicyPreset[] = ['strict_direct', 'custom', 'off'];

/** The seven exclusions, in the order every surface lists them. */
export const EXCLUSION_KEYS: readonly EmployerExclusionKey[] = [
  'staffing',
  'consultancy',
  'client_placement',
  'talent_marketplace',
  'task_gig',
  'talent_community',
  'unknown_business_model',
];

/** The six business-model exclusions the "Direct employers only" preset turns on. */
export const STRICT_DIRECT_KEYS: readonly EmployerExclusionKey[] = EXCLUSION_KEYS.filter(
  (key) => key !== 'unknown_business_model',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// ── Guards: wire value -> typed block or null ────────────────────

/**
 * The employer block, or null when the row does not carry one.
 *
 * A block that IS present but whose kind is missing or outside the enum is
 * kept with `kind: "unknown"`: the server told us it classified this employer
 * and we could not read the answer, which is "unverified", not "absent".
 */
export function employerProfileOf(row: EmployerPolicyRowFields | null | undefined): EmployerProfile | null {
  const raw: unknown = row?.employer_profile;
  if (!isRecord(raw)) return null;
  return {
    kind: oneOf(raw.kind, BUSINESS_KINDS) ?? 'unknown',
    confidence: finiteNumber(raw.confidence),
    basis: nonEmptyString(raw.basis),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.filter(isRecord).map((e) => ({
          kind: String(e.kind ?? ''),
          value: String(e.value ?? ''),
          source: typeof e.source === 'string' ? e.source : undefined,
        }))
      : [],
    version: nonEmptyString(raw.version),
    classified_at: nonEmptyString(raw.classified_at),
  };
}

export function postingProfileOf(row: EmployerPolicyRowFields | null | undefined): PostingProfile | null {
  const raw: unknown = row?.posting_profile;
  if (!isRecord(raw)) return null;
  return {
    relationship: oneOf(raw.relationship, RELATIONSHIPS) ?? 'unknown',
    purpose: oneOf(raw.purpose, PURPOSES) ?? 'unknown',
    evidence: Array.isArray(raw.evidence) ? raw.evidence.filter((e): e is string => typeof e === 'string') : [],
    version: nonEmptyString(raw.version),
  };
}

export function availabilityOf(row: EmployerPolicyRowFields | null | undefined): Availability | null {
  const raw: unknown = row?.availability;
  if (!isRecord(raw)) return null;
  return {
    state: oneOf(raw.state, AVAILABILITY_STATES) ?? 'unknown',
    method: oneOf(raw.method, AVAILABILITY_METHODS) ?? 'none',
    verified_at: nonEmptyString(raw.verified_at),
    age_hours: finiteNumber(raw.age_hours),
  };
}

/**
 * The trust block, or null. An unrecognised state is dropped rather than
 * guessed: guessing "no warnings" would hide a warning, and guessing
 * "warnings" would invent one.
 */
export function trustOf(row: EmployerPolicyRowFields | null | undefined): TrustBlock | null {
  const raw: unknown = row?.trust;
  if (!isRecord(raw)) return null;
  const state = oneOf(raw.state, TRUST_STATES);
  if (!state) return null;
  const warnings: TrustWarning[] = Array.isArray(raw.warnings)
    ? raw.warnings.filter(isRecord).map((w) => ({
        code: String(w.code ?? ''),
        evidence: String(w.evidence ?? ''),
        source: typeof w.source === 'string' ? w.source : undefined,
      }))
    : [];
  return { state, warnings, version: nonEmptyString(raw.version) };
}

/** True when the row carries ANY of the new blocks - the gate for rendering them at all. */
export function hasEmployerPolicyFields(row: EmployerPolicyRowFields | null | undefined): boolean {
  return Boolean(
    employerProfileOf(row) || postingProfileOf(row) || availabilityOf(row) || trustOf(row),
  );
}

// ── Labels ───────────────────────────────────────────────────────

export type ExplanationTone = 'positive' | 'neutral' | 'caution' | 'danger' | 'muted';

export interface EmployerCategory {
  kind: EmployerBusinessKind;
  label: string;
  tone: ExplanationTone;
  /** One line on what the label rests on, for a tooltip / screen reader. */
  basis: string | null;
}

const KIND_LABEL: Record<EmployerBusinessKind, string> = {
  operating: 'Direct employer',
  staffing: 'Staffing agency',
  consultancy: 'Consultancy',
  talent_marketplace: 'Talent marketplace',
  mixed: 'Mixed business',
  unknown: 'Employer type unverified',
};

const KIND_TONE: Record<EmployerBusinessKind, ExplanationTone> = {
  operating: 'positive',
  staffing: 'neutral',
  consultancy: 'neutral',
  talent_marketplace: 'neutral',
  mixed: 'neutral',
  unknown: 'muted',
};

const BASIS_LABEL: Record<string, string> = {
  owner_override: 'reviewed by our team',
  research_register: 'our research register',
  registry_category: 'the employer registry category',
  naics: 'the industry code',
  name_rule: 'a company-name rule (weakest evidence)',
};

/** The employer category, or null when the row carries no employer block. */
export function employerCategoryOf(row: EmployerPolicyRowFields | null | undefined): EmployerCategory | null {
  const profile = employerProfileOf(row);
  if (!profile) return null;
  const basisText = profile.basis ? BASIS_LABEL[profile.basis] : undefined;
  let basis: string | null = null;
  if (profile.kind === 'unknown') {
    basis = "We could not establish whether this company hires for itself or for clients.";
  } else if (profile.kind === 'mixed') {
    basis = 'This company runs more than one kind of business; check the posting for which part is hiring.';
  } else if (basisText) {
    basis = `Classified from ${basisText}.`;
  }
  return { kind: profile.kind, label: KIND_LABEL[profile.kind], tone: KIND_TONE[profile.kind], basis };
}

/**
 * What this posting IS, when it is not simply the employer's own opening.
 * Returns the labels to show; empty when there is nothing worth saying.
 */
export function postingRelationshipLabels(row: EmployerPolicyRowFields | null | undefined): string[] {
  const profile = postingProfileOf(row);
  if (!profile) return [];
  const out: string[] = [];
  if (profile.relationship === 'named_client') out.push('Client placement');
  else if (profile.relationship === 'undisclosed_client') out.push('Client placement (client not named)');
  else if (profile.relationship === 'freelance_task') out.push('Task/gig contract');
  if (profile.purpose === 'talent_community') out.push('Talent community');
  else if (profile.purpose === 'resume_collection') out.push('General application, not a specific opening');
  return out;
}

/** "3h ago" from an ISO stamp, falling back to a server-computed age in hours. */
export function relativeAge(
  iso: string | null | undefined,
  ageHours: number | null | undefined,
  now: number = Date.now(),
): string | null {
  let minutes: number | null = null;
  const stamp = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isNaN(stamp)) minutes = Math.floor((now - stamp) / 60_000);
  else if (typeof ageHours === 'number' && Number.isFinite(ageHours)) minutes = Math.round(ageHours * 60);
  if (minutes === null) return null;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export interface AvailabilityLine {
  state: AvailabilityState;
  text: string;
  tone: ExplanationTone;
}

/**
 * Availability with its time AND its method. `unverifiable` (a block, a rate
 * limit, a timeout) is never worded as closed.
 *
 * `onEmployerBoard` says whether the listing we saw it on is the employer's
 * own board; without that, "seen on the employer's board" would be a claim
 * about an aggregator.
 */
export function availabilityLineOf(
  row: EmployerPolicyRowFields | null | undefined,
  opts: { now?: number; onEmployerBoard?: boolean } = {},
): AvailabilityLine | null {
  const availability = availabilityOf(row);
  if (!availability) return null;
  const age = relativeAge(availability.verified_at, availability.age_hours, opts.now);
  const when = age ? ` ${age}` : '';
  switch (availability.state) {
    case 'verified_open': {
      let text: string;
      if (availability.method === 'listing_seen') {
        text = `${opts.onEmployerBoard ? "Seen on employer's board" : 'Seen on the source board'}${when}`;
      } else if (availability.method === 'liveness_probe') {
        text = `Checked open${when}`;
      } else if (availability.method === 'detail_fetch') {
        text = `Posting page read${when}`;
      } else {
        text = age ? `Listed as open, ${age}` : 'Listed as open';
      }
      return { state: 'verified_open', text, tone: 'positive' };
    }
    case 'closed':
      return {
        state: 'closed',
        text: age ? `Closed or expired - checked ${age}` : 'Closed or expired',
        tone: 'danger',
      };
    case 'unverifiable':
      return {
        state: 'unverifiable',
        text: age ? `Couldn't verify (blocked) - ${age}` : "Couldn't verify (blocked)",
        tone: 'caution',
      };
    default:
      return { state: 'unknown', text: 'Not yet checked whether this is still open', tone: 'muted' };
  }
}

export interface TrustLine {
  state: TrustState;
  title: string;
  /** The server's evidence, verbatim. Never paraphrased into a stronger claim. */
  items: string[];
  tone: ExplanationTone;
}

const TRUST_TITLE: Record<Exclude<TrustState, 'no_warnings_found'>, string> = {
  warnings: 'Warning signs found',
  ownership_conflict: "We couldn't confirm this board belongs to the employer",
  suspected_fraud: 'Suspected fraud - do not share money or bank details',
};

/**
 * The trust line, ONLY when there is something to warn about.
 *
 * `no_warnings_found` returns null by default; with `showClean` it returns the
 * one wording this product allows for it. It is never "Verified".
 */
export function trustLineOf(
  row: EmployerPolicyRowFields | null | undefined,
  opts: { showClean?: boolean } = {},
): TrustLine | null {
  const trust = trustOf(row);
  if (!trust) return null;
  if (trust.state === 'no_warnings_found') {
    return opts.showClean
      ? { state: trust.state, title: 'No warning signs found (automated check)', items: [], tone: 'muted' }
      : null;
  }
  return {
    state: trust.state,
    title: TRUST_TITLE[trust.state],
    items: trust.warnings.map((w) => w.evidence.trim()).filter(Boolean),
    tone: trust.state === 'warnings' ? 'caution' : 'danger',
  };
}

/** Hostname without `www.`, or null for a missing / unparseable / non-http URL. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/**
 * Where the application actually goes: the canonical apply URL the server
 * resolved, then the row's own apply link, then the original posting URL.
 */
export function applicationDestinationHost(
  row: EmployerPolicyRowFields & { apply_link?: string | null; apply_url?: string | null },
): string | null {
  return (
    hostOf(row.canonical_apply_url) ??
    hostOf(row.apply_link) ??
    hostOf(row.apply_url) ??
    hostOf(row.original_job_url)
  );
}

// ── Policy block (served lists) ──────────────────────────────────

function cleanCount(value: unknown): number {
  const n = finiteNumber(value);
  return n !== null && n > 0 ? Math.floor(n) : 0;
}

/** The list's policy block, or null for an older backend. */
export function policyOf(raw: unknown): PolicyBlock | null {
  if (!isRecord(raw)) return null;
  const counts: Partial<Record<EmployerExclusionKey, number>> = {};
  if (isRecord(raw.excluded_counts)) {
    for (const key of EXCLUSION_KEYS) counts[key] = cleanCount(raw.excluded_counts[key]);
  }
  const exclude: Partial<EmployerExclusions> = {};
  if (isRecord(raw.exclude)) {
    for (const key of EXCLUSION_KEYS) {
      if (typeof raw.exclude[key] === 'boolean') exclude[key] = raw.exclude[key] as boolean;
    }
  }
  return {
    preset: oneOf(raw.preset, PRESETS) ?? undefined,
    exclude,
    excluded_counts: counts,
    unverified_shown: cleanCount(raw.unverified_shown),
  };
}

/**
 * Several lists' policy blocks as one (the For-you feed merges three catalog
 * scans). Counts are summed across catalogs. The shown rows are deduplicated
 * client-side but excluded rows never reach the client, so one posting that
 * two catalogs both excluded is counted in each - a known over-count, kept
 * rather than guessed away.
 */
export function mergePolicies(blocks: Array<PolicyBlock | null | undefined>): PolicyBlock | null {
  const present = blocks.map((b) => policyOf(b)).filter((b): b is PolicyBlock => b !== null);
  if (!present.length) return null;
  const counts: Partial<Record<EmployerExclusionKey, number>> = {};
  for (const key of EXCLUSION_KEYS) {
    counts[key] = present.reduce((sum, b) => sum + (b.excluded_counts?.[key] ?? 0), 0);
  }
  return {
    preset: present[0].preset,
    exclude: present[0].exclude,
    excluded_counts: counts,
    unverified_shown: present.reduce((sum, b) => sum + (b.unverified_shown ?? 0), 0),
  };
}

const COUNT_NOUN: Record<EmployerExclusionKey, string> = {
  staffing: 'staffing',
  consultancy: 'consultancy',
  client_placement: 'client placement',
  talent_marketplace: 'talent marketplace',
  task_gig: 'task/gig',
  talent_community: 'talent community',
  unknown_business_model: 'unverified employer',
};

export interface ExcludedBreakdown {
  total: number;
  parts: Array<{ key: EmployerExclusionKey; count: number; noun: string }>;
  /** "12 staffing, 5 consultancy, 3 talent marketplace" */
  text: string;
}

export function excludedBreakdown(policy: PolicyBlock | null | undefined): ExcludedBreakdown {
  const parts = EXCLUSION_KEYS.map((key) => ({
    key,
    count: cleanCount(policy?.excluded_counts?.[key]),
    noun: COUNT_NOUN[key],
  })).filter((p) => p.count > 0);
  return {
    total: parts.reduce((sum, p) => sum + p.count, 0),
    parts,
    text: parts.map((p) => `${p.count} ${p.noun}`).join(', '),
  };
}

// ── Preferences ──────────────────────────────────────────────────

export const EXCLUSION_LABEL: Record<EmployerExclusionKey, { label: string; hint: string }> = {
  staffing: {
    label: 'Staffing agencies',
    hint: 'Recruiting and staffing firms posting on behalf of others.',
  },
  consultancy: {
    label: 'Consultancies and outsourcing',
    hint: 'IT services and outsourcing firms. Their own internal roles are kept separately below.',
  },
  client_placement: {
    label: 'Third-party client placements',
    hint: 'Roles placed at a client company, named or not.',
  },
  talent_marketplace: {
    label: 'Talent marketplaces and reposts',
    hint: 'Marketplaces and boards that re-post other employers\' jobs.',
  },
  task_gig: {
    label: 'Task and gig work',
    hint: 'Freelance tasks and per-task contracts.',
  },
  talent_community: {
    label: 'Talent communities and general applications',
    hint: 'Evergreen pools that collect resumes rather than fill one opening.',
  },
  unknown_business_model: {
    label: "Hide employers we couldn't verify",
    hint: 'Off: they are shown and marked "Employer type unverified". On: they are hidden and counted.',
  },
};

function exclusions(fill: (key: EmployerExclusionKey) => boolean): EmployerExclusions {
  return Object.fromEntries(EXCLUSION_KEYS.map((key) => [key, fill(key)])) as EmployerExclusions;
}

/** The documented default for a user who never chose (C5). */
export const STRICT_DIRECT_DEFAULT: EmployerPreferences = {
  preset: 'strict_direct',
  exclude: exclusions((key) => key !== 'unknown_business_model'),
  set_by: 'default',
};

/**
 * The preset an exclusion set amounts to. "Direct employers only" is the six
 * business-model exclusions; "Hide employers we couldn't verify" is an
 * independent toggle on top of either.
 */
export function presetFor(exclude: EmployerExclusions): EmployerPolicyPreset {
  if (STRICT_DIRECT_KEYS.every((key) => exclude[key])) return 'strict_direct';
  if (EXCLUSION_KEYS.every((key) => !exclude[key])) return 'off';
  return 'custom';
}

/** Server preferences, or null when the payload is unreadable. A missing key is NOT excluded. */
export function preferencesOf(raw: unknown): EmployerPreferences | null {
  if (!isRecord(raw) || !isRecord(raw.exclude)) return null;
  const source = raw.exclude;
  const exclude = exclusions((key) => source[key] === true);
  const setBy = raw.set_by === 'user' || raw.set_by === 'default' ? raw.set_by : undefined;
  return {
    preset: oneOf(raw.preset, PRESETS) ?? presetFor(exclude),
    exclude,
    set_by: setBy,
    version: nonEmptyString(raw.version) ?? undefined,
  };
}

export function withExclusion(
  prefs: EmployerPreferences,
  key: EmployerExclusionKey,
  value: boolean,
): EmployerPreferences {
  const exclude = { ...prefs.exclude, [key]: value };
  return { ...prefs, exclude, preset: presetFor(exclude), set_by: 'user' };
}

/** Turn the "Direct employers only" preset on or off. The unverified toggle is left alone. */
export function withStrictDirect(prefs: EmployerPreferences, on: boolean): EmployerPreferences {
  const exclude = { ...prefs.exclude };
  for (const key of STRICT_DIRECT_KEYS) exclude[key] = on;
  return { ...prefs, exclude, preset: presetFor(exclude), set_by: 'user' };
}

export function activeExclusionKeys(prefs: EmployerPreferences | null | undefined): EmployerExclusionKey[] {
  if (!prefs) return [];
  return EXCLUSION_KEYS.filter((key) => prefs.exclude[key]);
}

/** Short summary for a trigger button: what is on, in words. */
export function preferencesSummary(prefs: EmployerPreferences | null | undefined): string {
  if (!prefs) return 'Employer types';
  const active = activeExclusionKeys(prefs);
  const hidesUnknown = prefs.exclude.unknown_business_model;
  if (presetFor(prefs.exclude) === 'strict_direct') {
    return hidesUnknown ? 'Direct employers only, verified' : 'Direct employers only';
  }
  if (!active.length) return 'All employer types';
  return `${active.length} employer type${active.length === 1 ? '' : 's'} hidden`;
}
