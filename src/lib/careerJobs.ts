import type { Job, WorkdayJob, WorkdayRecency } from '@/types/jobs';

/**
 * Shared career-portal helpers used by the combined Job Opportunities feed.
 * (The per-catalog CareerPortals panel keeps its own copies intentionally —
 * this module exists so the combined feed can merge/normalize without
 * reaching into that component.)
 */

/**
 * Recency windows are CUMULATIVE calendar-day buckets in the VIEWER's
 * timezone (the client sends tz_offset_minutes with every scan; the backend
 * computes days_ago against the user's local today). Labels spell that out:
 * the old "1 day" read as "exactly one day ago" while it actually meant
 * "today + yesterday" — the source of the Today-vs-1-day confusion.
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

/** Title-based seniority, mirroring the backend classifier — a fallback for
 *  streamed rows that don't carry the field yet, so seniority filtering works
 *  mid-scan. */
export function seniorityOf(j: WorkdayJob): string {
  if (j.seniority) return j.seniority;
  const t = (j.title || '').toLowerCase();
  if (/\b(intern|internship|co-?op)\b/.test(t)) return 'intern';
  if (/\b(senior|sr\.?|staff|principal|lead|architect|director|manager|head|vp|iii|iv)\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|associate|entry|new grad|graduate|early career|i|1)\b/.test(t)) return 'entry';
  return 'mid';
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
 *  (an empty-string title counts as missing) — backend also normalizes
 *  server-side; this is belt-and-braces. */
export function jobTitleOf(j: Pick<WorkdayJob, 'title' | 'job_title' | 'role'>): string {
  for (const t of [j.title, j.job_title, j.role]) {
    if (typeof t === 'string' && t.trim()) return t.trim();
  }
  return '';
}

/** Normalize a portal row into the `Job` shape `JobCard` renders. Portal rows
 *  carry a discrete sponsorship band (not the SponsorshipSignal object) — we
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

/** A merged row is "better" if it carries a full description, else the higher
 *  match score — so cross-catalog duplicates keep the richest copy. */
function isBetter(candidate: WorkdayJob, current: WorkdayJob): boolean {
  const cDesc = (candidate.description || '').length;
  const curDesc = (current.description || '').length;
  if ((cDesc > 200) !== (curDesc > 200)) return cDesc > curDesc;
  return (candidate.match_score ?? 0) > (current.match_score ?? 0);
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
  return [...map.values()].sort(
    (a, b) => (b.match_score ?? 0) - (a.match_score ?? 0) || (a.days_ago ?? 99) - (b.days_ago ?? 99),
  );
}
