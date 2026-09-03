import type { Job, WorkdayJob, WorkdayRecency } from '@/types/jobs';

/**
 * Shared career-portal helpers used by the combined Job Opportunities feed.
 * (The per-catalog CareerPortals panel keeps its own copies intentionally  - 
 * this module exists so the combined feed can merge/normalize without
 * reaching into that component.)
 */

/**
 * Recency windows are CUMULATIVE calendar-day buckets in the VIEWER's
 * timezone (the client sends tz_offset_minutes with every scan; the backend
 * computes days_ago against the user's local today). Labels spell that out:
 * the old "1 day" read as "exactly one day ago" while it actually meant
 * "today + yesterday" - the source of the Today-vs-1-day confusion.
 */
export const RECENCY_OPTIONS: Array<{ key: WorkdayRecency; label: string; maxDays: number }> = [
  { key: 'today', label: 'Today', maxDays: 0 },
  { key: '24h', label: 'Since yesterday', maxDays: 1 },
  { key: '3d', label: '3 days', maxDays: 3 },
  { key: '7d', label: '7 days', maxDays: 7 },
  { key: '30d', label: '30 days', maxDays: 30 },
];

const STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);
const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'washington, d.c.': 'DC', 'district of columbia': 'DC',
};

/** The four choices the seniority filter offers, plus 'any'. */
export type SeniorityView = 'any' | 'intern' | 'entry' | 'mid' | 'senior';

/** Backend band (`fit_score.LEVELS`) -> the view it belongs under.
 *
 *  The backend stores seven bands; this filter offers four. Without this map
 *  `seniorityOf(j) === view` silently hides every `staff`, `director` and
 *  `executive` posting under EVERY non-"any" choice, because none of those
 *  three is a choice - the rows do not fail the filter so much as fall
 *  through the floor. */
const VIEW_OF_BAND: Record<string, SeniorityView> = {
  intern: 'intern',
  entry: 'entry',
  mid: 'mid',
  senior: 'senior',
  staff: 'senior',
  director: 'senior',
  executive: 'senior',
};

/** Title-based seniority, mirroring the backend classifier - a fallback for
 *  streamed rows that don't carry the field yet, so seniority filtering works
 *  mid-scan.
 *
 *  Returns a BAND, or 'unknown'. Unmarked titles are 'unknown', never 'mid':
 *  "Software Engineer", "Data Analyst" and "Registered Nurse" state no level,
 *  which is most of the market, and calling them mid asserts a level the
 *  employer never wrote and hides them from every other view. That is the same
 *  rule `job_inventory_service.seniority_of` documents on the server.
 *
 *  The pattern list mirrors `fit_score.title_level`, including the two
 *  corrections that mattered most there: `manager` / `lead` are NOT senior
 *  markers ("Lead Cashier", "Restaurant Shift Manager"), and the early-career
 *  vocabulary covers how large employers really title a graduate pipeline. */
export function seniorityOf(j: WorkdayJob): string {
  if (j.seniority) return j.seniority;
  const t = (j.title || '').toLowerCase();
  if (/\b(intern|internship|co-?op|summer analyst)\b/.test(t)) return 'intern';
  if (/\b(chief|vp|svp|evp|vice president|head of|president)\b/.test(t)) return 'executive';
  if (/\b(director|principal|distinguished|fellow)\b/.test(t)) return 'director';
  if (/\b(staff|architect)\b/.test(t) && !/\bstaff (nurse|accountant|pharmacist|technician)\b/.test(t))
    return 'staff';
  if (/\b(senior|sr\.?|iii|iv|[34])\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|associate|assistant|entry[- ]?level|new ?grad(uate)?|recent graduate|university grad(uate)?|campus (hire|recruit)|early[- ]career|rotational|trainee|apprentice|graduate|fresher|level ?[12]|i{1,2}|[12])\b/.test(t))
    return 'entry';
  if (/\b(manager|supervisor|lead|foreman)\b/.test(t)) return 'mid';
  return 'unknown';
}

/** Does this posting belong in the chosen seniority view?
 *
 *  'unknown' ALWAYS passes. Most postings state no level, so treating unknown
 *  as "fails the filter" would hide the majority of the market behind a
 *  distinction the employer never drew - the same reason the server ORs
 *  unknown into every seniority query rather than filtering it out. */
export function matchesSeniority(j: WorkdayJob, view: string): boolean {
  if (!view || view === 'any') return true;
  const band = seniorityOf(j);
  if (!band || band === 'unknown') return true;
  return (VIEW_OF_BAND[band] ?? 'mid') === view;
}

/** Bucket a posted location string into a dropdown key. */
export function locationKeyOf(job: WorkdayJob): string {
  const loc = (job.location || '').trim();
  if (job.is_remote || /remote/i.test(loc)) return 'Remote';
  if (/location/i.test(loc)) return 'Multiple';
  const codeMatch = loc.toUpperCase().match(/(?:^|[\s,\-(])([A-Z]{2})(?:$|[\s,\-.)])/);
  if (codeMatch && STATE_CODES.has(codeMatch[1])) return codeMatch[1];
  const lower = loc.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name)) return code;
  }
  if (lower.includes('united states') || lower.includes('usa')) return 'US-wide';
  return loc ? 'Other' : 'US-wide';
}

/** Boundary defense: some source rows carry the role under `job_title` or
 *  `role` instead of `title`. Resolve to the first NON-EMPTY trimmed value
 *  (an empty-string title counts as missing) - backend also normalizes
 *  server-side; this is belt-and-braces. */
export function jobTitleOf(j: Pick<WorkdayJob, 'title' | 'job_title' | 'role'>): string {
  for (const t of [j.title, j.job_title, j.role]) {
    if (typeof t === 'string' && t.trim()) return t.trim();
  }
  return '';
}

/** Normalize a portal row into the `Job` shape `JobCard` renders. Portal rows
 *  carry a discrete sponsorship band (not the SponsorshipSignal object) - we
 *  surface the honest signal via visa flags instead of fabricating numbers. */
export function toJob(j: WorkdayJob, fallbackSource: string): Job {
  return {
    ...j,
    title: jobTitleOf(j),
    logo: j.logo ?? '',
    description: j.description ?? '',
    salary: j.salary ?? '',
    employment_type: j.employment_type ?? '',
    h1b_sponsor: j.h1b_sponsor ?? false,
    match_score: j.match_score ?? 0,
    matched_skills: j.matched_skills ?? [],
    missing_skills: j.missing_skills ?? [],
    source: j.source ?? j.ats ?? fallbackSource,
    sponsorship: null,
    visa_flags: j.sponsorship === 'likely'
      ? {
          sponsors_h1b: {
            value: true,
            evidence: j.sponsor_note
              || 'Recent H-1B filings appear in public disclosure data. A track record, not a guarantee.',
          },
        }
      : undefined,
  };
}

const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Marketplace boards (Jobgether on Lever, ...) stay in the feed but pin last. */
export function isMarketplaceListing(job: WorkdayJob): boolean {
  if ((job.board_kind || '').toLowerCase() === 'marketplace') return true;
  const tenant = (job.tenant || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  return tenant === 'jobgether' || company === 'jobgether';
}

/** Pipeline statuses that mean the seeker already acted — hide from discovery
 *  by default; when shown, pin below still-open roles. `interested` stays
 *  visible (saved, not yet applied). */
const APPLIED_PIPELINE = new Set([
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export function isAppliedPipelineStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return APPLIED_PIPELINE.has(String(status).toLowerCase());
}

/** A merged row is "better" if it has the higher match score; description
 *  richness is only a tiebreaker. Preferring a long JD from one ATS over a
 *  higher-scored short row from another made Best match look broken across
 *  Workday / Careers / MNC duplicates. First-party employers always beat
 *  marketplace boards when scores would otherwise prefer Jobgether. */
function isBetter(candidate: WorkdayJob, current: WorkdayJob): boolean {
  const cMarket = isMarketplaceListing(candidate);
  const curMarket = isMarketplaceListing(current);
  if (cMarket !== curMarket) return !cMarket;
  const cScore = candidate.match_score ?? 0;
  const curScore = current.match_score ?? 0;
  if (cScore !== curScore) return cScore > curScore;
  return (candidate.description || '').length > (current.description || '').length;
}

export type SortJobsOptions = {
  /** When true for a row, that row sorts after all still-open roles. */
  isApplied?: (job: WorkdayJob) => boolean;
};

/** Stable Best match / Newest ordering for the merged multi-ATS feed.
 *  Tier order: open first-party → open marketplace → applied first-party →
 *  applied marketplace. */
export function sortJobsByMode(
  jobs: WorkdayJob[],
  sortBy: 'score' | 'newest',
  opts?: SortJobsOptions,
): WorkdayJob[] {
  const out = [...jobs];
  const appliedOf = opts?.isApplied ?? (() => false);
  // Tiers, most-reachable first. `sponsorship_demoted` is set by the server
  // only for a user who declared they need sponsorship, and only on rows the
  // employer is already known to sponsor rarely or to have refused - it is a
  // DEMOTION, never a filter, so the row stays one page down rather than
  // disappearing. Weighted above `applied` because a role you cannot take is
  // less use than one you already applied to.
  const pin = (j: WorkdayJob) =>
    (j.sponsorship_demoted ? 4 : 0) +
    (appliedOf(j) ? 2 : 0) +
    (isMarketplaceListing(j) ? 1 : 0);
  if (sortBy === 'newest') {
    out.sort(
      (a, b) =>
        pin(a) - pin(b) ||
        (a.days_ago ?? 99) - (b.days_ago ?? 99) ||
        (b.match_score ?? 0) - (a.match_score ?? 0),
    );
  } else {
    out.sort(
      (a, b) =>
        pin(a) - pin(b) ||
        (b.match_score ?? 0) - (a.match_score ?? 0) ||
        (a.days_ago ?? 99) - (b.days_ago ?? 99),
    );
  }
  return diversifyByBoard(out);
}

/** How many rows one board may hold per rendered page before the rest are
 *  pushed back. Ordering only - nothing is dropped. */
const BOARD_PAGE_CAP = 3;
/** The page size the feed renders at. */
const BOARD_PAGE_SIZE = 20;
/** Only the head is reordered; past this the list keeps pure sort order. */
const BOARD_DIVERSITY_DEPTH = 250;

/**
 * The board a row came from: `ats:tenant`, falling back to the company name.
 *
 * Deliberately NOT `company`. JPMorgan's Oracle instance serves three CX
 * sites under ONE tenant (`jpmc`) and stamps its postings with three
 * different names - "JPMorgan Chase", "NUTMEG CONTAINER CORPORATION" and
 * "CHASE FAMILY LIMITED PARTNERSHIP NO. 5". Those are legal entities, not
 * employers; keyed on the name they read as three companies. This is the same
 * key the tech feed's `_diversify_employers` uses, for the same measured
 * reason.
 */
function boardKey(j: WorkdayJob): string {
  const ats = (j.ats ?? '').trim().toLowerCase();
  const tenant = (j.tenant ?? '').trim().toLowerCase();
  return ats && tenant ? `${ats}:${tenant}` : (j.company ?? '').trim().toLowerCase();
}

/**
 * Reorder so one board cannot monopolise the first pages.
 *
 * The tech feed has had this since it shipped; these tab feeds never did, and
 * they are the surface most users are actually on. Measured live for one
 * account: 15 of the first 20 cards were JPMorgan's `jpmc` tenant under its
 * three names, and the first Amazon requisition - a genuine match, scored 84 -
 * sat at rank 47. The user reported it as "Amazon shows while the search runs,
 * then goes down when it completes", which is exactly what interleaving a
 * second source into a single-board-dominated list looks like.
 *
 * ORDERING only: `match_score` is untouched and nothing is removed, so a
 * board's fourth-best role lands on the next page rather than disappearing.
 * Stable - within a board, relative order is preserved exactly.
 */
export function diversifyByBoard(rows: WorkdayJob[]): WorkdayJob[] {
  if (rows.length <= BOARD_PAGE_SIZE) return rows;
  const head = rows.slice(0, BOARD_DIVERSITY_DEPTH);
  const tail = rows.slice(BOARD_DIVERSITY_DEPTH);

  const buckets = new Map<string, WorkdayJob[]>();
  for (const row of head) {
    const key = boardKey(row);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }

  const out: WorkdayJob[] = [];
  while (out.length < head.length) {
    let placed = 0;
    for (const bucket of buckets.values()) {
      if (!bucket.length || placed >= BOARD_PAGE_SIZE) continue;
      const take = Math.min(BOARD_PAGE_CAP, bucket.length, BOARD_PAGE_SIZE - placed);
      out.push(...bucket.splice(0, take));
      placed += take;
    }
    if (placed === 0) break; // nothing left to place - never loop forever
  }
  return [...out, ...tail];
}

/**
 * Merge + dedupe the streamed results of all three catalogs into one ranked
 * feed. Dedupe key is company+title+location (the same posting surfaces under
 * different `job_id`s across catalogs); falls back to `job_id` when those are
 * blank. Ranked by match score, then recency.
 */
export function mergeJobs(...lists: WorkdayJob[][]): WorkdayJob[] {
  const map = new Map<string, WorkdayJob>();
  for (const list of lists) {
    for (const j of list) {
      const composite = `${norm(j.company)}::${norm(jobTitleOf(j))}::${norm(j.location)}`;
      const key = composite === '::::' ? j.job_id : composite;
      const existing = map.get(key);
      if (!existing || isBetter(j, existing)) map.set(key, j);
    }
  }
  return sortJobsByMode([...map.values()], 'newest');
}
