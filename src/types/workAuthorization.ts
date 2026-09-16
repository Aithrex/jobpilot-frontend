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
 * The window a sponsorship count actually covers.
 *
 * This block exists because the field carrying the count is called
 * `approvals_5y` and the service that serves it advertises a five-year
 * window, while the stored data is ONE fiscal year (FY2026, from the USCIS
 * Employer Data Hub). The payload knows: it sets `service_claim_mismatch`.
 *
 * The client therefore never says "in the last 5 years" because a field is
 * named `_5y`. It says the window this block reports, and if this block
 * reports no window at all the signal is not rendered - a count with no
 * vintage is not interpretable, and publishing it would be the exact claim
 * the mandated framing exists to prevent.
 *
 * @contract PROVISIONAL - `sponsorship_signals.data_window`.
 */
export interface SponsorshipDataWindow {
  /**
   * The window as the backend would write it, e.g. "FY2026". This is what the
   * sentence renders, verbatim, when it is present.
   */
  label?: string | null;
  start_fiscal_year?: number | null;
  end_fiscal_year?: number | null;
  /** How many years the data actually spans. 1 for a single fiscal year. */
  years?: number | null;
  /**
   * True when the SERVICE advertises a wider window than the data covers.
   * Surfaced in the detail panel, in words - a known inconsistency the reader
   * is told about rather than one the UI papers over.
   */
  service_claim_mismatch?: boolean;
}

/**
 * The employer H-1B sponsorship signal, with its MANDATED framing.
 *
 * The sentence is always of the form
 *
 *     "Sponsored N people in similar roles in <the window the data covers>"
 *
 * shown with `source` and its vintage. It is a count of past filings, not a
 * forecast, not a probability, and not immigration advice. `disclaimer` is
 * written by the backend and is rendered VERBATIM - it is the sentence that
 * makes the number safe to publish, so the client never paraphrases it and
 * never drops it.
 *
 * The period is taken from `data_window`, NEVER from the name of the field
 * carrying the count. `approvals_5y` currently holds one fiscal year; a UI
 * that trusted the field name would publish a five-fold overstatement of the
 * evidence in the most consequential sentence this product says.
 *
 * When there is no data the whole component renders NOTHING. Not "0", not
 * "unknown odds", not a grey placeholder: an absence of filings in a public
 * dataset is not evidence that an employer does not sponsor, and rendering it
 * as a zero would tell the user something we do not know. The same is true
 * when there is a count but no window to date it against.
 *
 * @contract `TechFeedJob.employer_sponsorship`, and the same block on
 * `GET /api/jobs/sponsorship`.
 */
/**
 * Which of THREE answers a sponsorship lookup got. They are different facts
 * and they must not look alike on screen.
 *
 *  - `signal`        - the employer is in the filing data with counts. The
 *    mandated sentence is rendered;
 *  - `census_absent` - the employer IS in the dataset and provably filed no
 *    H-1B petitions in the covered period. That is a FACT and a useful one to
 *    an international candidate (458 employers, 12,753 active postings -
 *    Northrop Grumman, SpaceX, Anduril). It is rendered as what the record
 *    shows FOR THAT PERIOD, never as "this employer does not sponsor";
 *  - `no_data`       - no row at all: an aggregator, or a name we could not
 *    match. We make NO claim. Renders as nothing - not zero, not "unknown",
 *    and above all not as `census_absent`. Conflating the two would tell
 *    somebody an employer does not sponsor when all that happened is that our
 *    name matching failed.
 *
 * @contract PROVISIONAL - mirrors `sponsorship_service.lookup_status(name)`.
 * Absent is read as `signal` when counts are present and `no_data` otherwise,
 * so an older payload cannot accidentally produce a "filed nothing" claim.
 */
export type SponsorshipLookupStatus = 'signal' | 'census_absent' | 'no_data';

export interface EmployerSponsorshipSignal {
  /** Which of the three answers this is. See `SponsorshipLookupStatus`. */
  status?: SponsorshipLookupStatus;
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
   * Approvals for roles comparable to THIS posting, over `data_window`.
   * This is the number the sentence counts. Null or absent means we have no
   * similar-role data and the component renders nothing.
   *
   * @contract the store calls this `approvals_5y`. The name is wrong for the
   * data behind it and must not be read as a five-year claim - see
   * `SponsorshipDataWindow`.
   */
  similar_role_approvals?: number | null;
  /** What "similar roles" resolved to, so the claim is checkable. */
  similar_role_label?: string | null;
  /** All approvals for the employer over the same window. Context only. */
  total_approvals?: number | null;
  /**
   * Denials over the same window (`denials_5y`).
   *
   * Received and typed so the contract is complete, and deliberately NOT
   * rendered: an approval/denial ratio is read as odds, and this product does
   * not tell anyone their odds.
   */
  denials?: number | null;
  /** The window the counts actually cover. The period in the sentence. */
  data_window?: SponsorshipDataWindow | null;
  /**
   * The PERIOD the data covers, as a string: "FY2026".
   *
   * Rendered AS-IS and never parsed as a date. It used to carry an ISO
   * datetime that was actually our import time, which made one-year-old
   * government data look like it had been measured this morning. If a date is
   * ever wanted, `data_imported_at` is the honest field for it.
   */
  data_vintage?: string | null;
  /**
   * When WE fetched the dataset (ISO 8601). This is provenance about us, not
   * about the data's period, and it is never used as the vintage.
   */
  data_imported_at?: string | null;
  /** e.g. "USCIS H-1B Employer Data Hub". Always rendered beside the count. */
  source?: string | null;
  source_url?: string | null;
  /** NAICS code for the employer, as filed. Context for the detail panel. */
  naics?: string | null;
  /** Where the filings were located, as filed. */
  location?: string | null;
  /** Rendered verbatim. Never rewritten, never summarized, never omitted. */
  disclaimer?: string | null;
}

/**
 * The period phrase for the sentence, or null when the payload cannot date
 * its own count.
 *
 * Order of trust: the window's own label, then a year span we can write, then
 * the free-text vintage. The field NAME is never consulted.
 */
export function sponsorshipPeriodLabel(
  signal: EmployerSponsorshipSignal | null | undefined,
): string | null {
  if (!signal) return null;
  const window = signal.data_window;

  const label = window?.label?.trim();
  if (label) return label;

  const start = window?.start_fiscal_year;
  const end = window?.end_fiscal_year;
  if (typeof start === 'number' && typeof end === 'number') {
    return start === end ? `FY${start}` : `FY${start}-FY${end}`;
  }

  const years = window?.years;
  if (typeof years === 'number' && Number.isFinite(years) && years > 0) {
    return years === 1 ? 'the last year' : `the last ${Math.round(years)} years`;
  }

  const vintage = signal.data_vintage?.trim();
  return vintage || null;
}

/**
 * Which of the three answers this payload represents, resolved defensively.
 *
 * A payload with no `status` is read as `signal` when it carries counts and
 * `no_data` otherwise. `census_absent` is NEVER inferred: claiming an
 * employer filed nothing is a statement about them, and it is only ever made
 * because the server said so.
 */
export function sponsorshipLookupStatus(
  signal: EmployerSponsorshipSignal | null | undefined,
): SponsorshipLookupStatus {
  if (!signal) return 'no_data';
  if (signal.status === 'census_absent') return 'census_absent';
  if (signal.status === 'signal' || signal.status === 'no_data') return signal.status;
  const count = signal.similar_role_approvals;
  return typeof count === 'number' && Number.isFinite(count) && count > 0 ? 'signal' : 'no_data';
}

/**
 * Is there enough here to say the sentence?
 *
 * Three conditions: the lookup found a signal, the count is positive, and
 * there is a window to date it against. A count with no vintage is not
 * publishable under the framing this signal is bound by, so it renders as
 * nothing rather than as a bare number.
 */
export function hasSponsorshipEvidence(
  signal: EmployerSponsorshipSignal | null | undefined,
): signal is EmployerSponsorshipSignal {
  if (!signal || sponsorshipLookupStatus(signal) !== 'signal') return false;
  const count = signal.similar_role_approvals;
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return false;
  return sponsorshipPeriodLabel(signal) !== null;
}

/**
 * Can we say "filed no H-1B petitions in <period>"?
 *
 * Requires the server's explicit `census_absent` AND a period to bound the
 * claim. "Filed nothing" with no period attached is a claim about all of
 * history, which is not what the dataset supports.
 */
export function hasCensusAbsentEvidence(
  signal: EmployerSponsorshipSignal | null | undefined,
): signal is EmployerSponsorshipSignal {
  if (!signal || sponsorshipLookupStatus(signal) !== 'census_absent') return false;
  return sponsorshipPeriodLabel(signal) !== null;
}

/**
 * Will the badge render anything at all?
 *
 * Callers use this to decide whether to emit a list item around it, so a
 * `no_data` payload does not leave an empty row on the card.
 */
export function isSponsorshipSignalRenderable(
  signal: EmployerSponsorshipSignal | null | undefined,
): boolean {
  return hasSponsorshipEvidence(signal) || hasCensusAbsentEvidence(signal);
}
