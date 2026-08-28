import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Check,
  Factory,
  Loader2,
  Radar,
  RefreshCw,
  Rocket,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ChipsInput } from '@/components/job-search/ChipsInput';
import { JOB_FEED_GRID_CLASS, JobCard, JOB_CARD_CLASS } from '@/components/job-search/JobCard';
import { useAutoSync } from '@/hooks/useAutoSync';
import { JOB_TITLES_CAP, useJobTitles } from '@/hooks/useJobTitles';
import { apiService } from '@/lib/api';
import { jobTitleOf, matchesSeniority, sortJobsByMode, isAppliedPipelineStatus } from '@/lib/careerJobs';
// (job listings are free & auth-only - no entitlement/upgrade wiring here)
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PillSwitch } from '@/components/ui/pill-switch';
import type {
  CareerPortalVariant,
  Job,
  WorkdayCatalog,
  WorkdayJob,
  WorkdayJobsProgress,
  WorkdayJobsResult,
  WorkdayRecency,
} from '@/types/jobs';

// The engine reports posting age at day granularity ("Posted Today" /
// "Posted N Days Ago"), so windows are CUMULATIVE calendar-day buckets in
// the VIEWER's timezone (tz_offset_minutes rides every scan): "Since
// yesterday" = today + yesterday. "custom" lets the user pick any 0-30 days.
const RECENCY_OPTIONS: Array<{ key: WorkdayRecency; label: string; maxDays: number }> = [
  { key: 'today', label: 'Today', maxDays: 0 },
  { key: '24h', label: 'Since yesterday', maxDays: 1 },
  { key: '3d', label: '3 days', maxDays: 3 },
  { key: '7d', label: '7 days', maxDays: 7 },
  { key: '30d', label: '30 days', maxDays: 30 },
];

type RecencyChoice = WorkdayRecency | 'custom';

const SENIORITY_OPTIONS = [
  { key: 'any', label: 'Any seniority' },
  { key: 'intern', label: 'Intern' },
  { key: 'entry', label: 'Entry / Junior' },
  { key: 'mid', label: 'Mid-level' },
  { key: 'senior', label: 'Senior+' },
] as const;

const MIN_SCORE_OPTIONS = [0, 40, 60, 80] as const;

// Background refresh cadence - the listing quietly re-syncs on this interval
// for every logged-in user without a manual refresh (visibility-aware; see useAutoSync).
const AUTO_SYNC_MS = 30 * 60 * 1000;

// The backend returns up to 1500 scored roles - paginate so wide windows
// never mount a thousand JobCards at once.
const PAGE_SIZE = 24;

const STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
]);
const STATE_NAMES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'washington, d.c.': 'DC',
  'district of columbia': 'DC',
};

/** Bucket a posted location string into a dropdown key (state code,
 *  Remote, Multiple, US-wide, Other). */
function locationKeyOf(job: WorkdayJob): string {
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

const INDUSTRY_LABELS: Record<string, string> = {
  fintech: 'Fintech',
  healthtech: 'Healthtech',
  banking: 'Banking',
  ecommerce_retail: 'Ecommerce / Retail',
  insurance: 'Insurance',
  tech: 'Tech',
  manufacturing_automotive: 'Manufacturing / Auto',
  pharma: 'Pharma',
  telecom: 'Telecom',
  consulting: 'Consulting',
  energy: 'Energy',
  media: 'Media',
  aerospace_defense: 'Aerospace / Defense',
  gaming: 'Gaming',
  education: 'Education',
  government: 'Government',
  nonprofit: 'Nonprofit',
  hospitality: 'Hospitality',
  travel: 'Travel',
  real_estate: 'Real Estate',
  other: 'Other',
};

// The MNC catalog (/api/jobs/mnc) groups companies by SECTOR, a different
// taxonomy from the Workday / career-pages industry keys - so it gets its
// own label map (note `fintech` / `consulting` collide across taxonomies
// with different display names).
const MNC_SECTOR_LABELS: Record<string, string> = {
  big_tech: 'Big Tech / FAANG+',
  semiconductors: 'Semiconductors',
  enterprise_software: 'Enterprise Software',
  fintech: 'Fintech & Payments',
  finance_banking: 'Banking & Finance',
  healthcare_pharma: 'Healthcare & Pharma',
  consulting: 'Consulting',
  retail_consumer: 'Retail & Consumer',
  automotive_aerospace: 'Automotive & Aerospace',
  media_entertainment: 'Media & Entertainment',
};

// Per-variant FILTER setup persists per browser so reopening the tab restores
// industries, recency and the rest instantly. Role TITLES are deliberately not
// here: they are one shared set (see `useJobTitles`) so editing them in
// Opportunities or any Career-portal variant is visible everywhere at once.
const PREFS_KEYS: Record<CareerPortalVariant, string> = {
  workday: 'workday_jobs_prefs_v1',
  careers: 'career_pages_prefs_v1',
  mncs: 'mnc_jobs_prefs_v1',
};

interface WorkdayPrefs {
  /** Legacy: titles used to be stored per variant. Read only, for the
   *  one-time migration into the shared store; never written again. */
  titles?: string[];
  industries?: string[];
  location?: string;
  remoteOnly?: boolean;
  recency?: RecencyChoice;
  customDays?: number;
  seniorityFilter?: string;
  minScore?: number;
  hideUnrealistic?: boolean;
  sortBy?: 'score' | 'newest';
  groupByCompany?: boolean;
  sponsorFilter?: 'all' | 'friendly' | 'proven';
}

function loadPrefs(key: string): WorkdayPrefs {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as WorkdayPrefs) : {};
  } catch {
    return {};
  }
}

/** "3m ago" / "just now" - coarse, since the display re-renders each second. */
function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

/** Seconds → "27:00" countdown. */
function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Windowed page numbers around the current page (max 5 shown). */
function pageWindow(page: number, count: number): number[] {
  const span = Math.min(5, count);
  let start = Math.max(1, page - 2);
  const end = Math.min(count, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Normalize a portal row into the `Job` shape `JobCard` renders. Portal rows
 *  carry a discrete sponsorship band, not the `SponsorshipSignal` object  -
 *  we surface the honest signal via visa flags (evidence-backed) and a
 *  panel-level note instead of fabricating filing numbers. */
function toJob(j: WorkdayJob, fallbackSource: string): Job {
  return {
    ...j,
    // Boundary defense: some rows carry the role under job_title/role.
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
    visa_flags:
      j.sponsorship === 'likely'
        ? {
            sponsors_h1b: {
              value: true,
              evidence:
                j.sponsor_note ||
                'Recent H-1B filings appear in public disclosure data. A track record, not a guarantee.',
            },
          }
        : undefined,
  };
}

interface WorkdayJobsPanelProps {
  isJobSaved: (jobId: string) => boolean;
  getJobStatus: (jobId: string) => string | null;
  saveJob: (job: Job) => void | Promise<unknown>;
  unsaveJob: (jobId: string) => void | Promise<unknown>;
  quickApply: (job: Job) => void | Promise<unknown>;
  isApplyConfirmPending?: (jobId: string) => boolean;
  confirmApplied?: (jobId: string) => void | Promise<unknown>;
  dismissApplyConfirm?: (jobId: string) => void;
  beginApplyWithTailor?: (job: Job) => void | Promise<unknown>;
  markAlreadyApplied?: (job: Job) => void | Promise<unknown>;
  autoApply?: (job: Job) => void | Promise<unknown>;
  autoApplyingId?: string | null;
  /** 'workday' (default) scans the Workday tenant catalog; 'careers' scans
   *  companies' own career sites (Greenhouse/Lever/Ashby/...); 'mncs' scans a
   *  curated FAANG+ / Fortune-500 MNC board catalog grouped by sector. Same
   *  engine, filters and scoring - different catalog, endpoints and saved
   *  setup. */
  variant?: CareerPortalVariant;
  /** Whether this variant is the one currently on screen. Only the visible
   *  variant auto-loads and background-syncs, so switching tabs never fans a
   *  scan out across all three catalogs at once. Defaults to true. */
  active?: boolean;
}

export function WorkdayJobsPanel({
  isJobSaved,
  getJobStatus,
  saveJob,
  unsaveJob,
  quickApply,
  isApplyConfirmPending,
  confirmApplied,
  dismissApplyConfirm,
  beginApplyWithTailor,
  markAlreadyApplied,
  autoApply,
  autoApplyingId,
  variant = 'workday',
  active = true,
}: WorkdayJobsPanelProps) {
  const isCareers = variant === 'careers';
  const isMncs = variant === 'mncs';
  const industryLabels = isMncs ? MNC_SECTOR_LABELS : INDUSTRY_LABELS;
  const prefsKey = PREFS_KEYS[variant];
  const reduceMotion = useReducedMotion();

  // Job listings are free for every logged-in user - the scan endpoints are
  // auth-only, never entitlement-gated. So auto-load + background sync run for
  // everyone signed in; there is no premium wall here.

  // ── Controls (hydrated from saved prefs so nothing reloads every visit) ──
  const [prefs] = useState<WorkdayPrefs>(() => loadPrefs(prefsKey));
  // Role titles are SHARED across all three variants and the Opportunities
  // feed: one hydration, one saved set, one cap. Editing them here is visible
  // in Opportunities immediately, and vice versa.
  const {
    titles,
    setTitles,
    resumeTitles,
    ready: titlesReady,
    smartSuggestTitles,
    suggesting,
  } = useJobTitles();
  const [industries, setIndustries] = useState<string[]>(prefs.industries ?? []);
  const [location, setLocation] = useState(prefs.location ?? '');
  const [remoteOnly, setRemoteOnly] = useState(prefs.remoteOnly ?? false);
  const [recency, setRecency] = useState<RecencyChoice>(prefs.recency ?? 'today');
  const [customDays, setCustomDays] = useState(prefs.customDays ?? 2);
  const [groupByCompany, setGroupByCompany] = useState(prefs.groupByCompany ?? false);
  const [seniorityFilter, setSeniorityFilter] = useState<string>(prefs.seniorityFilter ?? 'any');
  const [minScore, setMinScore] = useState<number>(prefs.minScore ?? 0);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  // Frank mode: rows the feasibility engine marks "skip" (core-stack
  // mismatch, big experience gap, clearance) are hidden by default.
  const [hideUnrealistic, setHideUnrealistic] = useState(prefs.hideUnrealistic ?? true);
  const [sortBy, setSortBy] = useState<'score' | 'newest'>(prefs.sortBy ?? 'newest');
  // International default: hide JDs that explicitly decline sponsorship.
  // 'proven' additionally requires the company to have a real H-1B filing
  // record; 'unknown' companies stay visible in 'friendly' (no evidence
  // either way is not a refusal).
  const [sponsorFilter, setSponsorFilter] = useState<'all' | 'friendly' | 'proven'>(
    prefs.sponsorFilter ?? 'friendly',
  );
  const [showApplied, setShowApplied] = useState(false);
  // Heavy search setup (role titles / industries / location) is collapsed by
  // default - results stream in on their own, so the "companies search bar"
  // stays out of the way until the user wants to retune it.
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // Mobile-only disclosure for the quick-filter row (always open on sm+).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = `career-portals-filters-${variant}`;

  // Persist the setup on every change. Titles are excluded on purpose: the
  // shared store persists those once, for every surface.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        prefsKey,
        JSON.stringify({
          industries,
          location,
          remoteOnly,
          recency,
          customDays,
          seniorityFilter,
          minScore,
          hideUnrealistic,
          sortBy,
          groupByCompany,
          sponsorFilter,
        } satisfies WorkdayPrefs),
      );
    } catch {
      /* storage full/unavailable - non-fatal */
    }
  }, [
    prefsKey,
    industries,
    location,
    remoteOnly,
    recency,
    customDays,
    seniorityFilter,
    minScore,
    hideUnrealistic,
    sortBy,
    groupByCompany,
    sponsorFilter,
  ]);

  const pageStorageKey = `career-portals-page:${variant}`;
  const [page, setPage] = useState(() => {
    try {
      const n = Number(sessionStorage.getItem(pageStorageKey) || '1');
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(pageStorageKey, String(page));
    } catch {
      /* ignore */
    }
  }, [page, pageStorageKey]);

  // ── Data ────────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<WorkdayCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [result, setResult] = useState<WorkdayJobsResult | null>(null);
  const [progress, setProgress] = useState<WorkdayJobsProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Titles the most recent scan actually used - mirrors Job feed titlesPending. */
  const [lastScanTitles, setLastScanTitles] = useState<string[] | null>(null);

  // Catalog metadata (industry chips), once on mount. The resume seed and the
  // thin-resume title synth used to run here too - they now live in the shared
  // `useJobTitles` store, so mounting several panels fires them exactly once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      const cat = await (isMncs
        ? apiService.getMncCatalog()
        : isCareers
          ? apiService.getCareerPagesCatalog()
          : apiService.getWorkdayCatalog());
      if (cancelled) return;
      setCatalogLoading(false);
      if (cat.data) setCatalog(cat.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isCareers, isMncs]);

  const runSearch = useCallback(
    async (forceRefresh = false) => {
      const titlesSnapshot = titles;
      if (titlesSnapshot.length === 0) return;
      setLastScanTitles(titlesSnapshot);
      setLoading(true);
      setError(null);
      setProgress(null);
      const search = isMncs
        ? apiService.searchMncJobs.bind(apiService)
        : isCareers
          ? apiService.searchCareerPagesJobs.bind(apiService)
          : apiService.searchWorkdayJobs.bind(apiService);
      const resp = await search(
        {
          titles: titlesSnapshot,
          industries,
          location,
          remote_only: remoteOnly,
          force_refresh: forceRefresh,
        },
        (partial) => {
          if (partial?.progress) setProgress(partial.progress);
          // Matches stream in company-by-company - render them immediately
          // while the scan keeps running (final payload replaces this slice).
          if (partial?.jobs?.length) {
            setResult((prev) => ({
              ok: true,
              generated_at: prev?.generated_at ?? '',
              jobs: partial.jobs,
              total: partial.total ?? partial.jobs.length,
              window_counts: prev?.window_counts ?? { today: 0, d1: 0, d3: 0, d7: 0, d30: 0 },
              query_terms: partial.query_terms ?? prev?.query_terms ?? [],
              tenants_total: partial.progress?.tenants_total ?? prev?.tenants_total ?? 0,
              tenants_done: partial.progress?.tenants_done ?? 0,
              tenants_with_results: prev?.tenants_with_results ?? 0,
              industries_available: prev?.industries_available ?? [],
              cache_hit: false,
              errors: [],
              streaming: true,
            }));
          }
        },
      );
      setLoading(false);
      setProgress(null);
      if (resp.error) {
        // Listings are free & auth-only. A 429 here is IP rate-limiting, not a
        // paywall - surface it as a transient "slow down" rather than an upgrade.
        if (resp.status === 429) {
          setError('You are searching very fast. Give it a few seconds and sync again.');
        } else {
          setError(resp.error);
        }
        return;
      }
      if (resp.data) setResult(resp.data);
    },
    [titles, industries, location, remoteOnly, isCareers, isMncs],
  );

  // ── Auto-sync: every logged-in user gets an initial auto-load + a quiet
  //  30-min background refresh of the visible variant. ──────────────────
  // Waits on the shared title set so the first scan never runs against the
  // pre-hydration empty seed.
  const setupReady = !catalogLoading && titlesReady && !suggesting;
  const autoSync = useAutoSync({
    enabled: active && setupReady,
    intervalMs: AUTO_SYNC_MS,
    isBusy: loading,
    onSync: (force) => runSearch(force),
  });
  const { lastSyncedAt, secondsUntilNext, autoArmed, sync } = autoSync;

  const toggleIndustry = (key: string) => {
    setIndustries((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // ── Client-side recency filtering (the backend always returns the full
  //  30-day window, so switching Today ↔ 30d never refetches). ───────────
  const maxDays =
    recency === 'custom'
      ? Math.min(30, Math.max(0, customDays))
      : (RECENCY_OPTIONS.find((o) => o.key === recency)?.maxDays ?? 3);

  const recencyJobs = useMemo(() => {
    const all = result?.jobs ?? [];
    return all.filter((j) => j.days_ago != null && j.days_ago <= maxDays);
  }, [result, maxDays]);

  // Location dropdown options derived from the recency window's postings.
  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of recencyJobs) {
      const k = locationKeyOf(j);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [recencyJobs]);

  const skippedCount = useMemo(
    () => recencyJobs.filter((j) => j.tailor_feasibility === 'skip').length,
    [recencyJobs],
  );
  const hasFeasibility = useMemo(
    () => recencyJobs.some((j) => j.tailor_feasibility),
    [recencyJobs],
  );

  const refusedCount = useMemo(
    () => recencyJobs.filter((j) => j.sponsorship === 'refused').length,
    [recencyJobs],
  );

  const visibleJobs = useMemo(() => {
    const isApplied = (j: (typeof recencyJobs)[number]) =>
      isAppliedPipelineStatus(getJobStatus(j.job_id));
    let out = recencyJobs;
    if (seniorityFilter !== 'any') out = out.filter((j) => matchesSeniority(j, seniorityFilter));
    if (minScore > 0) out = out.filter((j) => (j.match_score ?? 0) >= minScore);
    if (locationFilter !== 'all') out = out.filter((j) => locationKeyOf(j) === locationFilter);
    if (hideUnrealistic && hasFeasibility) out = out.filter((j) => j.tailor_feasibility !== 'skip');
    if (sponsorFilter === 'friendly') out = out.filter((j) => j.sponsorship !== 'refused');
    else if (sponsorFilter === 'proven') out = out.filter((j) => j.sponsorship === 'likely');
    if (!showApplied) out = out.filter((j) => !isApplied(j));
    return sortJobsByMode(out, sortBy, { isApplied });
  }, [
    recencyJobs,
    seniorityFilter,
    minScore,
    locationFilter,
    hideUnrealistic,
    hasFeasibility,
    sortBy,
    sponsorFilter,
    showApplied,
    getJobStatus,
  ]);

  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  // Clamp the page whenever the visible set changes shape (stream, filters).
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);
  // Reset to page 1 only when filters change — not on remount after Tailor.
  const filterResetReady = useRef(false);
  useEffect(() => {
    if (!filterResetReady.current) {
      filterResetReady.current = true;
      return;
    }
    setPage(1);
  }, [
    recency,
    customDays,
    seniorityFilter,
    minScore,
    locationFilter,
    hideUnrealistic,
    sortBy,
    sponsorFilter,
    showApplied,
  ]);

  const pagedJobs = useMemo(
    () => visibleJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleJobs, page],
  );

  const recencyCounts = useMemo(() => {
    const all = result?.jobs ?? [];
    const counts: Record<WorkdayRecency, number> = {
      today: 0,
      '24h': 0,
      '3d': 0,
      '7d': 0,
      '30d': 0,
    };
    for (const j of all) {
      if (j.days_ago == null) continue;
      for (const opt of RECENCY_OPTIONS) {
        if (j.days_ago <= opt.maxDays) counts[opt.key] += 1;
      }
    }
    return counts;
  }, [result]);

  const grouped = useMemo(() => {
    if (!groupByCompany) return null;
    const map = new Map<string, WorkdayJob[]>();
    for (const j of pagedJobs) {
      const list = map.get(j.company) ?? [];
      list.push(j);
      map.set(j.company, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [groupByCompany, pagedJobs]);

  const catalogTotal = catalog?.total ?? 0;
  const selectedTenantCount = useMemo(() => {
    if (!catalog) return 0;
    if (!industries.length) return catalog.total;
    return catalog.industries
      .filter((i) => industries.includes(i.key))
      .reduce((n, i) => n + i.count, 0);
  }, [catalog, industries]);

  const fallbackSource = isMncs ? 'mnc' : isCareers ? 'career page' : 'workday';
  const catalogNoun = isMncs
    ? 'MNC & Big Tech career boards'
    : isCareers
      ? 'company career pages'
      : 'Workday career sites';
  const searchVerb = isMncs
    ? 'Search MNC boards'
    : isCareers
      ? 'Search career sites'
      : 'Search Workday';

  // Motion - a card fades/rises in with a positional stagger. Because React
  // keys are stable (job_id), already-mounted cards never replay when the
  // streaming slice updates; only freshly-arrived rows animate.
  const cardMotion = (index: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: {
            duration: 0.34,
            ease: [0.22, 1, 0.36, 1] as const,
            delay: Math.min(index * 0.035, 0.35),
          },
        };

  /** One grid cell: honest sponsorship / feasibility notes above the card. */
  const renderJob = (job: WorkdayJob, index: number) => (
    <motion.div
      key={job.job_id}
      layout={!reduceMotion}
      {...cardMotion(index)}
      className="flex flex-col gap-1.5"
    >
      {job.sponsorship === 'refused' && (
        <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-destructive">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            This posting states it won't sponsor a visa
            {job.sponsor_note ? `: ${job.sponsor_note}` : '.'}
          </span>
        </p>
      )}
      {job.tailor_feasibility === 'skip' && (
        <p className="flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-foreground/80">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" aria-hidden />
          <span>
            Off-target for your resume
            {job.feasibility_reason ? `: ${job.feasibility_reason}` : '.'}
          </span>
        </p>
      )}
      <JobCard
        job={toJob(job, fallbackSource)}
        saved={isJobSaved(job.job_id)}
        jobStatus={getJobStatus(job.job_id)}
        onSave={() => saveJob(toJob(job, fallbackSource))}
        onUnsave={() => unsaveJob(job.job_id)}
        onQuickApply={() => quickApply(toJob(job, fallbackSource))}
        applyConfirmPending={isApplyConfirmPending?.(job.job_id)}
        onConfirmApplied={confirmApplied ? () => void confirmApplied(job.job_id) : undefined}
        onConfirmNotYet={dismissApplyConfirm ? () => dismissApplyConfirm(job.job_id) : undefined}
        onApplyWithTailor={beginApplyWithTailor ? () => beginApplyWithTailor(toJob(job, fallbackSource)) : undefined}
        onAlreadyApplied={markAlreadyApplied ? () => markAlreadyApplied(toJob(job, fallbackSource)) : undefined}
        onAutoApply={autoApply ? () => autoApply(toJob(job, fallbackSource)) : undefined}
        autoApplying={autoApplyingId === job.job_id}
      />
    </motion.div>
  );

  const streaming = !!result?.streaming;
  const roleCount = visibleJobs.length;
  const titlesPending = useMemo(() => {
    if (!result || lastScanTitles == null) return false;
    const a = new Set(titles.map((t) => t.toLowerCase()));
    const b = new Set(lastScanTitles.map((t) => t.toLowerCase()));
    if (a.size !== b.size) return true;
    for (const t of a) if (!b.has(t)) return true;
    return false;
  }, [result, lastScanTitles, titles]);

  return (
    <div className="space-y-5">
      {/* ── Live-sync command bar ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 liquid-glass p-4 shadow-soft sm:p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Radar className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-semibold text-foreground">Live listings</h3>
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary"
                >
                  <Sparkles className="h-2.5 w-2.5" aria-hidden /> Auto-sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Scanning {catalogNoun} only. Merged across all sources lives in For you.
              </p>
              <p className="truncate text-xs text-muted-foreground" aria-live="polite">
                {loading ? (
                  progress ? (
                    `Scanning ${progress.tenants_done} of ${progress.tenants_total} companies · ${roleCount} roles so far`
                  ) : (
                    'Starting scan...'
                  )
                ) : lastSyncedAt ? (
                  <>
                    Updated {formatAgo(lastSyncedAt)} · {roleCount} roles
                    {secondsUntilNext != null && (
                      <span className="ml-1 tabular-nums text-primary/80">
                        · next sync {formatCountdown(secondsUntilNext)}
                      </span>
                    )}
                    {titlesPending && (
                      <span className="ml-1.5 font-medium text-warning">
                        Title changes need Search.
                      </span>
                    )}
                  </>
                ) : (
                  `Syncing ${catalogNoun} straight to your feed...`
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync(true)}
              disabled={loading}
              className="gap-1.5"
              title="Re-scan every company now"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
              {loading ? 'Syncing...' : 'Sync now'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCustomizeOpen(true)}
              aria-expanded={customizeOpen}
              aria-controls={`career-portals-setup-${variant}`}
              className="h-9 gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Customize
            </Button>
          </div>
        </div>

        {/* Live progress rail while a scan runs */}
        <AnimatePresence initial={false}>
          {loading && (
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1, height: 'auto' }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="relative mt-3 overflow-hidden"
            >
              <Progress
                value={
                  progress ? (progress.tenants_done / Math.max(1, progress.tenants_total)) * 100 : 8
                }
                className="h-1.5"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {progress?.phase === 'details'
                  ? 'Fetching full descriptions for top matches. Refining skill scores...'
                  : 'Querying company career APIs directly. No scraping, no credits. Matches stream in below.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Customize opens as a right drawer - same pattern as Job feed. */}
      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent
          side="right"
          overlayClassName="bg-black/40"
          id={`career-portals-setup-${variant}`}
          className="liquid-glass flex w-full flex-col gap-0 overflow-hidden rounded-l-2xl border-l p-0 sm:max-w-md"
        >
          <SheetHeader className="space-y-3 border-b border-border/50 px-6 pb-4 pt-5 text-left">
            <div className="pr-8">
              <p className="overline">Career Portals</p>
              <SheetTitle className="mt-1 font-display text-xl font-semibold tracking-tight">
                Live listings
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">
                Tune titles, industries, and location for {catalogNoun}. Titles stay shared with Job
                feed.
              </SheetDescription>
            </div>
            {loading && (
              <Progress
                value={
                  progress ? (progress.tenants_done / Math.max(1, progress.tenants_total)) * 100 : 8
                }
                className="h-1"
              />
            )}
          </SheetHeader>

          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
            <section>
              <p className="overline mb-2">Titles</p>
              <ChipsInput
                values={titles}
                onChange={setTitles}
                maxItems={JOB_TITLES_CAP}
                placeholder="e.g. Backend Engineer, Data Engineer..."
                defaultValues={
                  resumeTitles.length ? resumeTitles.slice(0, JOB_TITLES_CAP) : undefined
                }
                accentClass="border-border bg-muted/60 text-foreground"
                helperText={`The first 4 core title families drive the ${isMncs ? 'MNC board scan' : isCareers ? 'career-site scan' : 'Workday search'}; every title participates in ranking. One shared set: these titles also drive Job feed (For you) and the other career portals.`}
                emptyState="Add a role title, or upload a resume to prefill."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void smartSuggestTitles()}
                disabled={suggesting}
                className="mt-2 h-8 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {suggesting ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-3 w-3" aria-hidden />
                )}
                {suggesting ? 'Analyzing resume...' : 'Suggest from resume'}
              </Button>
              {titlesPending && (
                <p className="mt-2 text-[11px] font-medium text-warning">
                  Titles changed - Search to apply
                </p>
              )}
            </section>

            <section>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Factory className="h-3.5 w-3.5" aria-hidden />
                Industries
                <span className="font-normal">
                  ·{' '}
                  {industries.length
                    ? `${selectedTenantCount} companies selected`
                    : `all ${catalogTotal} companies`}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(catalog?.industries ?? []).map((ind) => {
                  const isActive = industries.includes(ind.key);
                  return (
                    <button
                      key={ind.key}
                      type="button"
                      onClick={() => toggleIndustry(ind.key)}
                      aria-pressed={isActive}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary',
                      )}
                    >
                      {industryLabels[ind.key] ?? ind.key}
                      <span className="ml-1 tabular-nums opacity-60">{ind.count}</span>
                    </button>
                  );
                })}
                {catalogLoading &&
                  !catalog &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20 rounded-full" />
                  ))}
                {!catalogLoading && !catalog && (
                  <span className="text-xs text-muted-foreground">
                    Couldn't load the company catalog. Search still works across all companies.
                  </span>
                )}
              </div>
            </section>

            <section>
              <p className="overline mb-2">Location</p>
              <Input
                id={`portal-location-${variant}`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Anywhere in the US, e.g. Texas, Austin, Remote"
                className="h-10"
              />
              <label className="mt-3 flex h-10 cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-background/55 px-3 text-sm font-medium text-foreground">
                Remote only
                <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
              </label>
            </section>
          </div>

          <SheetFooter className="flex-row items-center gap-2 border-t border-border/50 px-6 py-3 sm:space-x-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync(true)}
              disabled={loading}
              className="mr-auto h-9 gap-1.5"
              title="Re-scan every company now"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
              Sync
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void sync(false);
                setCustomizeOpen(false);
              }}
              disabled={loading || titles.length === 0}
              className="h-9 min-w-[5.5rem] gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden />
              )}
              {loading ? 'Scanning...' : searchVerb}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Error / gate states ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">The scan didn't complete.</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => sync(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Streaming skeleton (scan running, nothing streamed yet) ── */}
      {loading && !result && (
        <div className={JOB_FEED_GRID_CLASS} aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn('space-y-2.5 p-3.5', JOB_CARD_CLASS)}>
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Recency segmented control - filters the cached 30-day set
  client-side, so switching windows is instant. */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <PillSwitch
                aria-label="Posting recency"
                layoutId="workday-recency-pill"
                value={recency}
                onValueChange={setRecency}
                options={[
                  ...RECENCY_OPTIONS.map((opt) => ({
                    value: opt.key as RecencyChoice,
                    label: (
                      <>
                        {opt.label}
                        <span className="tabular-nums opacity-60">{recencyCounts[opt.key]}</span>
                      </>
                    ),
                  })),
                  { value: 'custom' as RecencyChoice, label: 'Custom' },
                ]}
              />
              {recency === 'custom' && (
                <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    aria-label="Custom recency window in days"
                    className="h-8 w-16 text-xs"
                  />
                  days
                </label>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Switch checked={groupByCompany} onCheckedChange={setGroupByCompany} />
                Group by company
              </label>
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary"
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                <span className="tabular-nums">{visibleJobs.length}</span> roles
              </Badge>
            </div>
          </div>

          {/* Second filter row: seniority / min score / location / realism /
  sponsorship / sort. Collapses behind a disclosure on mobile. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            className="gap-1.5 sm:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </Button>
          <div
            id={filtersId}
            className={cn(
              'flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide rounded-xl border border-border/60 bg-card/60 p-2 backdrop-blur-sm',
              filtersOpen ? 'flex' : 'hidden sm:flex',
            )}
          >
            <select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Seniority filter"
            >
              {SENIORITY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>

            <PillSwitch
              aria-label="Minimum match score"
              layoutId="workday-score-pill"
              value={String(minScore)}
              onValueChange={(v) => setMinScore(Number(v))}
              options={MIN_SCORE_OPTIONS.map((n) => ({
                value: String(n),
                label: n === 0 ? 'Any score' : `${n}+`,
              }))}
            />

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-8 max-w-[190px] rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Location filter"
            >
              <option value="all">All locations</option>
              {locationOptions.map(([key, count]) => (
                <option key={key} value={key}>
                  {key} ({count})
                </option>
              ))}
            </select>

            {hasFeasibility && (
              <label
                className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                title="Hides roles the feasibility check marks as not honestly tailorable. Off-stack JDs (e.g. .NET for a Python resume), 5+ year experience gaps, clearance requirements."
              >
                <Switch checked={hideUnrealistic} onCheckedChange={setHideUnrealistic} />
                Hide off-target ({skippedCount})
              </label>
            )}

            <div
              title={`Sponsorship filter for international candidates. "Sponsor-friendly" hides postings whose description explicitly declines visa sponsorship (${refusedCount} here); "Proven sponsors" additionally keeps only companies with recent H-1B filings in public disclosure data. A track record, not a promise.`}
            >
            <PillSwitch
              aria-label="Sponsorship filter"
              layoutId="workday-sponsor-pill"
              value={sponsorFilter}
              onValueChange={setSponsorFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'friendly', label: 'Sponsor-friendly' },
                { value: 'proven', label: 'Proven sponsors' },
              ]}
            />
            </div>

            <PillSwitch
              aria-label="Applied roles visibility"
              layoutId="workday-applied-pill"
              value={showApplied ? 'all' : 'open'}
              onValueChange={(v) => setShowApplied(v === 'all')}
              options={[
                { value: 'open', label: 'Open', title: 'Hide roles you already applied to' },
                {
                  value: 'all',
                  label: 'Incl. applied',
                  title: 'Show applied roles at the bottom of the list',
                },
              ]}
            />

            <PillSwitch
              className="sm:ml-auto"
              aria-label="Sort jobs"
              layoutId="workday-sort-pill"
              value={sortBy}
              onValueChange={setSortBy}
              options={[
                { value: 'newest', label: 'Newest' },
                { value: 'score', label: 'Best match' },
              ]}
            />
          </div>

          {result.resume_skill_count === 0 && !streaming && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground/85">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span>
                No parsed resume found for this account. Match scores, skill overlap and
                tailor-feasibility need one. Upload your resume in the Tailor tab, then re-run the
                search.
              </span>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {streaming ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />
                Streaming: {result.tenants_done} of {result.tenants_total} companies scanned, best
                matches so far below
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-primary" aria-hidden />
                Matched {result.tenants_with_results} of {result.tenants_total} companies
                {result.cache_hit ? ' · served from cache' : ''}
                {autoArmed && lastSyncedAt ? ` · auto-synced ${formatAgo(lastSyncedAt)}` : ''}
                {result.query_terms.length ? ` · searched: ${result.query_terms.join(', ')}` : ''}
                {result.errors.length > 0 ? ` · ${result.errors.length} source warnings` : ''}
              </>
            )}
          </p>

          {visibleJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden />
              <p>No postings in this window.</p>
              {maxDays < 30 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRecency('30d')}
                >
                  Widen to 30 days. The full set is already loaded
                </Button>
              ) : (
                <p className="mx-auto mt-1 max-w-sm text-xs">
                  Try adding broader titles or clearing the industry filter.
                </p>
              )}
            </div>
          ) : grouped ? (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {grouped.map(([company, jobs], gi) => (
                  <motion.div
                    key={company}
                    layout={!reduceMotion}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                      delay: Math.min(gi * 0.05, 0.3),
                    }}
                    className="space-y-3"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-primary" aria-hidden />
                      {company}
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {jobs.length}
                      </Badge>
                      {jobs[0]?.industry && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {industryLabels[jobs[0].industry] ?? jobs[0].industry}
                        </span>
                      )}
                      {(isCareers || isMncs) && jobs[0]?.ats && (
                        <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {jobs[0].ats}
                        </span>
                      )}
                    </h3>
                    <div className={JOB_FEED_GRID_CLASS}>
                      {jobs.map((j, i) => renderJob(j, i))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div layout={!reduceMotion} className={JOB_FEED_GRID_CLASS}>
              <AnimatePresence initial={false}>
                {pagedJobs.map((j, i) => renderJob(j, i))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Pagination ── */}
          {pageCount > 1 && (
            <nav
              className="flex flex-wrap items-center justify-center gap-1.5 pt-2"
              aria-label="Job results pages"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                Prev
              </Button>
              {pageWindow(page, pageCount)[0] > 1 && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              {pageWindow(page, pageCount).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={cn(
                    'h-8 min-w-8 rounded-md px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    n === page
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {n}
                </button>
              ))}
              {pageWindow(page, pageCount).slice(-1)[0] < pageCount && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="gap-1"
              >
                Next
              </Button>
              <span className="ml-2 text-[11px] text-muted-foreground">
                Page {page} of {pageCount}
              </span>
            </nav>
          )}
        </div>
      )}

      {/* ── Pre-search invitation (no result yet, not loading) ── */}
      {!result && !loading && (
        <div className="mesh-accent rounded-2xl border border-dashed border-primary/30 py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">
            {`Getting your live feed of ${catalogNoun} ready...`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {isMncs
              ? "A curated FAANG+ / Fortune-500 MNC universe: Big Tech, semiconductors, banking, consulting and more, queried straight from each company's official board and ranked by fit against your resume."
              : isCareers
                ? 'The non-Workday universe: companies hosting jobs on their own career pages via Greenhouse, Lever, Ashby, SmartRecruiters, Workable and Recruitee. Public JSON APIs; nothing scraped.'
                : "Most large enterprises hire through Workday. This queries each company's public careers API directly. Fast, free, and fresh."}{' '}
            Defaults to roles posted in the last 3 days; the full 30-day window loads in one scan.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => sync(false)}>
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            {searchVerb}
          </Button>
        </div>
      )}
    </div>
  );
}
