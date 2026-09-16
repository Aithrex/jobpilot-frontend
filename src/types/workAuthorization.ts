/**
 * Work authorization - the ONE place the client states what it needs from the
 * server about a person's right to work, and what the server tells it about a
 * posting's or an employer's sponsorship posture.
 *
 * Two different kinds of fact live in this file and they must never be mixed:
 *
 *  1. `WorkAuthorizationStatus` is something the USER told us about themselves.
 *     It is optional, it defaults to UNSET, it is editable forever, and it is
 *     never a gate on using the product. It exists so the feed can stop putting
 *     cleared-defense postings in front of a student who needs an H-1B - not so
 *     the product can decide what someone is allowed to apply for.
 *
 *  2. `EmployerSponsorshipSignal` / `SponsorshipStance` are facts about a
 *     POSTING or an EMPLOYER, read off a public filing or the posting text.
 *     They are never a prediction of this user's outcome and never advice.
 *
 * PROVISIONAL WIRE CONTRACT
 * -------------------------
 * The backend work is in flight. Everything in this file that is not yet
 * confirmed carries a `@contract` tag naming the field the client needs. The
 * transport for (1) is the EXISTING, already-deployed preferences endpoint
 * (`PUT /api/auth/preferences`, `GET /api/auth/profile` -> `preferences`), so
 * nothing here ships against an invented route. When the dedicated endpoint
 * under `/api/resume/*` lands, the change is confined to the two methods
 * `apiService.getWorkAuthorization` / `saveWorkAuthorization` in `lib/api.ts`.
 */

/**
 * The honest answer set. Six options plus the absence of an answer.
 *
 * `unset` is the DEFAULT and a real value: "we did not ask yet, or they chose
 * not to say" is different from every other answer and must not collapse into
 * "authorized". `prefer_not_to_say` is a deliberate refusal and is recorded as
 * such - it means "stop asking", not "unknown".
 *
 * @contract stored under the preferences key `work_authorization`, and mirrored
 * by the backend onto `visa_profiles` however it likes. The WIRE VALUES are
 * these exact snake_case strings.
 */
export type WorkAuthorizationStatus =
  | 'unset'
  | 'us_citizen'
  | 'permanent_resident'
  | 'need_sponsorship_now'
  | 'need_sponsorship_future'
  | 'authorized_other'
  | 'prefer_not_to_say';

export const WORK_AUTHORIZATION_VALUES: readonly WorkAuthorizationStatus[] = [
  'us_citizen',
  'permanent_resident',
  'need_sponsorship_now',
  'need_sponsorship_future',
  'authorized_other',
  'prefer_not_to_say',
];

export interface WorkAuthorizationOption {
  value: WorkAuthorizationStatus;
  label: string;
  /** One line of plain English. Never legal advice, never a promise. */
  detail: string;
}

/**
 * The option list, in the order it is offered.
 *
 * The copy is deliberately about FACTS the person already knows about
 * themselves. No option says what we will do with the answer in a way we
 * cannot keep, and "prefer not to say" is last, present, and costs nothing.
 */
export const WORK_AUTHORIZATION_OPTIONS: readonly WorkAuthorizationOption[] = [
  {
    value: 'us_citizen',
    label: 'US citizen',
    detail: 'No employer sponsorship needed, now or later.',
  },
  {
    value: 'permanent_resident',
    label: 'US permanent resident (green card)',
    detail: 'No employer sponsorship needed, now or later.',
  },
  {
    value: 'need_sponsorship_now',
    label: 'I will need visa sponsorship now',
    detail: 'You need an employer to sponsor you to start this job.',
  },
  {
    value: 'need_sponsorship_future',
    label: 'I am authorized now, but will need sponsorship later',
    detail: 'For example on OPT or CPT today, needing H-1B sponsorship afterwards.',
  },
  {
    value: 'authorized_other',
    label: 'Authorized to work, another basis',
    detail: 'For example TN, E-3, H-4 EAD, asylee, or authorization outside the US.',
  },
  {
    value: 'prefer_not_to_say',
    label: 'Prefer not to say',
    detail: 'We will not ask again and we will not guess.',
  },
];

/** True when the answer means "an employer has to sponsor me at some point". */
export function needsSponsorship(status: WorkAuthorizationStatus): boolean {
  return status === 'need_sponsorship_now' || status === 'need_sponsorship_future';
}

/** The narrow legacy boolean the backend already stores. `null` = no opinion. */
export function legacyNeedsSponsorshipFlag(status: WorkAuthorizationStatus): boolean | null {
  if (status === 'unset' || status === 'prefer_not_to_say') return null;
  return needsSponsorship(status);
}

export function isWorkAuthorizationStatus(value: unknown): value is WorkAuthorizationStatus {
  return (
    value === 'unset' ||
    (typeof value === 'string' &&
      (WORK_AUTHORIZATION_VALUES as readonly string[]).includes(value))
  );
}

/**
 * What the server hands back about the signed-in person.
 *
 * @contract GET. Today this is read off `GET /api/auth/profile` ->
 * `preferences.work_authorization` (+ `preferences.work_authorization_updated_at`).
 * A dedicated `GET /api/resume/visa/work-authorization` returning this exact
 * object would be a drop-in replacement.
 */
export interface WorkAuthorizationPreference {
  status: WorkAuthorizationStatus;
  /** ISO 8601. Null until the user has answered at least once. */
  updated_at: string | null;
  /**
   * True when the value came back from the server rather than from this
   * browser. A preference we could not persist is shown as unsaved, never as
   * saved - a filter the user believes is set is worse than no filter.
   */
  persisted: boolean;
}

// ── Posting / employer sponsorship facts ─────────────────────────

/**
 * What the POSTING says about sponsorship.
 *
 *  - `offers`    - the posting or employer states sponsorship is available;
 *  - `refuses`   - the posting states it is NOT available ("must be authorized
 *    to work in the US without sponsorship now or in the future");
 *  - `unstated`  - it said nothing. The overwhelming majority. Silence is never
 *    read as either of the other two.
 *
 * @contract `TechFeedJob.sponsorship_stance`. Until it exists,
 * `lib/techFeedWorkAuth.ts` derives it from the legacy `sponsorship` string
 * against a CLOSED token list and falls back to `unstated`.
 */
export type SponsorshipStance = 'offers' | 'refuses' | 'unstated';

/**
 * The employer H-1B sponsorship signal, with its MANDATED framing.
 *
 * The only sentence this may ever produce is
 *
 *     "Sponsored N people in similar roles in the last 5 years"
 *
 * shown with `source` and `data_vintage`. It is a count of past filings, not a
 * forecast, not a probability, and not immigration advice. `disclaimer` is
 * written by the backend and is rendered VERBATIM - it is the sentence that
 * makes the number safe to publish, so the client never paraphrases it and
 * never drops it.
 *
 * When there is no data the whole component renders NOTHING. Not "0", not
 * "unknown odds", not a grey placeholder: an absence of filings in a public
 * dataset is not evidence that an employer does not sponsor, and rendering it
 * as a zero would tell the user something we do not know.
 *
 * @contract `TechFeedJob.employer_sponsorship`, and the same block on
 * `GET /api/jobs/sponsorship`.
 */
export interface EmployerSponsorshipSignal {
  /**
   * What the count is scoped to.
   *
   * `similar_roles` is the mandated framing and the default. `employer_wide`
   * exists only for the LEGACY `/api/jobs/sponsorship` payload, which is not
   * role-scoped: rather than let that number borrow the words "in similar
   * roles", which it has not earned, it renders its own sentence saying it
   * covers all roles. Same rules otherwise - past tense, sourced, dated, and
   * nothing at all without data.
   */
  scope?: 'similar_roles' | 'employer_wide';
  /** Canonical `emp_<12 hex>`. Used as a key only - NEVER rendered. */
  employer_id?: string;
  /** The display name. Rendered; ids are not. */
  employer_name?: string;
  /**
   * Approvals for roles comparable to THIS posting, over `period_years`.
   * This is the number the mandated sentence counts. Null or absent means we
   * have no similar-role data and the component renders nothing.
   */
  similar_role_approvals?: number | null;
  /** What "similar roles" resolved to, so the claim is checkable. */
  similar_role_label?: string | null;
  /** All approvals for the employer over the same window. Context only. */
  total_approvals?: number | null;
  /** The window the counts cover. Rendered as "the last N years". */
  period_years?: number | null;
  /** e.g. "FY2020-FY2024". Always rendered beside the count. */
  data_vintage?: string | null;
  /** e.g. "USCIS H-1B Employer Data Hub". Always rendered beside the count. */
  source?: string | null;
  source_url?: string | null;
  /** Rendered verbatim. Never rewritten, never summarized, never omitted. */
  disclaimer?: string | null;
}

/**
 * Is there enough here to say the mandated sentence?
 *
 * A signal with no positive similar-role count renders nothing at all.
 */
export function hasSponsorshipEvidence(
  signal: EmployerSponsorshipSignal | null | undefined,
): signal is EmployerSponsorshipSignal {
  if (!signal) return false;
  const count = signal.similar_role_approvals;
  return typeof count === 'number' && Number.isFinite(count) && count > 0;
}
