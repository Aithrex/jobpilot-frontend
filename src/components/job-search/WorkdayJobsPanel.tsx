import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, Factory, Loader2, Lock, MapPin, RefreshCw, Rocket,
  Search, ShieldAlert, SlidersHorizontal, Sparkles, Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ChipsInput } from '@/components/job-search/ChipsInput';
import { JobCard } from '@/components/job-search/JobCard';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  CareerPortalVariant, Job, WorkdayCatalog, WorkdayJob, WorkdayJobsProgress,
  WorkdayJobsResult, WorkdayRecency,
} from '@/types/jobs';

// The engine reports posting age at day granularity ("Posted Today" /
// "Posted N Days Ago"), so windows are calendar-day based: "1 day" =
// today + yesterday. "custom" lets the user pick any 0-30 day window.
const RECENCY_OPTIONS: Array<{ key: WorkdayRecency; label: string; maxDays: number }> = [
  { key: 'today', label: 'Today', maxDays: 0 },
  { key: '24h', label: '1 day', maxDays: 1 },
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

/** Title-based seniority, mirroring the backend classifier — used as a
 *  fallback for streamed provisional rows that don't carry the field yet,
 *  so the seniority filter works mid-scan too. */
function seniorityOf(j: WorkdayJob): string {
  if (j.seniority) return j.seniority;
  const t = (j.title || '').toLowerCase();
  if (/\b(intern|internship|co-?op)\b/.test(t)) return 'intern';
  if (/\b(senior|sr\.?|staff|principal|lead|architect|director|manager|head|vp|iii|iv)\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|associate|entry|new grad|graduate|early career|i|1)\b/.test(t)) return 'entry';
  return 'mid';
}

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
// taxonomy from the Workday / career-pages industry keys — so it gets its
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

// Panel setup persists per browser so reopening the tab restores titles and
// filters instantly — the resume fetch only refreshes the Reset defaults.
// The Workday, career-pages and MNC variants each keep their own saved setup.
const PREFS_KEYS: Record<CareerPortalVariant, string> = {
  workday: 'workday_jobs_prefs_v1',
  careers: 'career_pages_prefs_v1',
  mncs: 'mnc_jobs_prefs_v1',
};

interface WorkdayPrefs {
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

// The backend returns up to 1500 scored roles — render incrementally so
// wide windows don't mount a thousand JobCards at once.
const PAGE_SIZE = 90;

/** Normalize a portal row into the `Job` shape `JobCard` renders. Portal rows
 *  carry a discrete sponsorship band, not the `SponsorshipSignal` object —
 *  we surface the honest signal via visa flags (evidence-backed) and a
 *  panel-level note instead of fabricating filing numbers. */
function toJob(j: WorkdayJob, fallbackSource: string): Job {
  return {
    ...j,
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

/** Pill button inside a segmented control. */
function Seg({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-background text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

interface WorkdayJobsPanelProps {
  isJobSaved: (jobId: string) => boolean;
  getJobStatus: (jobId: string) => string | null;
  saveJob: (job: Job) => void | Promise<unknown>;
  unsaveJob: (jobId: string) => void | Promise<unknown>;
  quickApply: (job: Job) => void | Promise<unknown>;
  /** 'workday' (default) scans the Workday tenant catalog; 'careers' scans
   *  companies' own career sites (Greenhouse/Lever/Ashby/…); 'mncs' scans a
   *  curated FAANG+ / Fortune-500 MNC board catalog grouped by sector. Same
   *  engine, filters and scoring — different catalog, endpoints and saved
   *  setup. */
  variant?: CareerPortalVariant;
}

export function WorkdayJobsPanel({
  isJobSaved, getJobStatus, saveJob, unsaveJob, quickApply,
  variant = 'workday',
}: WorkdayJobsPanelProps) {
  const isCareers = variant === 'careers';
  const isMncs = variant === 'mncs';
  const industryLabels = isMncs ? MNC_SECTOR_LABELS : INDUSTRY_LABELS;
  const prefsKey = PREFS_KEYS[variant];
  const upgrade = useUpgrade();
  // ── Controls (hydrated from saved prefs so nothing reloads every visit) ──
  const [prefs] = useState<WorkdayPrefs>(() => loadPrefs(prefsKey));
  const [titles, setTitles] = useState<string[]>(prefs.titles ?? []);
  const [industries, setIndustries] = useState<string[]>(prefs.industries ?? []);
  const [location, setLocation] = useState(prefs.location ?? '');
  const [remoteOnly, setRemoteOnly] = useState(prefs.remoteOnly ?? false);
  const [recency, setRecency] = useState<RecencyChoice>(prefs.recency ?? '3d');
  const [customDays, setCustomDays] = useState(prefs.customDays ?? 2);
  const [groupByCompany, setGroupByCompany] = useState(prefs.groupByCompany ?? false);
  const [seniorityFilter, setSeniorityFilter] = useState<string>(prefs.seniorityFilter ?? 'any');
  const [minScore, setMinScore] = useState<number>(prefs.minScore ?? 0);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  // Frank mode: rows the feasibility engine marks "skip" (core-stack
  // mismatch, big experience gap, clearance) are hidden by default.
  const [hideUnrealistic, setHideUnrealistic] = useState(prefs.hideUnrealistic ?? true);
  const [sortBy, setSortBy] = useState<'score' | 'newest'>(prefs.sortBy ?? 'score');
  // International default: hide JDs that explicitly decline sponsorship.
  // 'proven' additionally requires the company to have a real H-1B filing
  // record; 'unknown' companies stay visible in 'friendly' (no evidence
  // either way is not a refusal).
  const [sponsorFilter, setSponsorFilter] =
    useState<'all' | 'friendly' | 'proven'>(prefs.sponsorFilter ?? 'friendly');
  // Mobile-only disclosure for the second filter row (always open on sm+).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = `career-portals-filters-${variant}`;

  // Persist the setup on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(prefsKey, JSON.stringify({
        titles, industries, location, remoteOnly, recency, customDays,
        seniorityFilter, minScore, hideUnrealistic, sortBy, groupByCompany,
        sponsorFilter,
      } satisfies WorkdayPrefs));
    } catch {
      /* storage full/unavailable — non-fatal */
    }
  }, [prefsKey, titles, industries, location, remoteOnly, recency, customDays,
      seniorityFilter, minScore, hideUnrealistic, sortBy, groupByCompany,
      sponsorFilter]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Data ────────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<WorkdayCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [result, setResult] = useState<WorkdayJobsResult | null>(null);
  const [progress, setProgress] = useState<WorkdayJobsProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const [resumeTitles, setResumeTitles] = useState<string[]>([]);
  const [needsAutoSuggest, setNeedsAutoSuggest] = useState(false);

  // Catalog metadata (industry chips) + resume titles prefill, once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      const [cat, resume] = await Promise.all([
        isMncs
          ? apiService.getMncCatalog()
          : isCareers
            ? apiService.getCareerPagesCatalog()
            : apiService.getWorkdayCatalog(),
        apiService.getResume(),
      ]);
      if (cancelled) return;
      setCatalogLoading(false);
      if (cat.data) setCatalog(cat.data);
      const fromResume = resume.data?.resume?.job_titles ?? [];
      if (fromResume.length) {
        setResumeTitles(fromResume);
        // Prefill with ALL resume titles — but never clobber a saved or
        // user-edited set (saved prefs make prev non-empty on revisit).
        setTitles((prev) => (prev.length ? prev : fromResume.slice(0, 40)));
      }
      // Parsed resumes often carry only 1-2 (messy) past titles — a weak
      // search seed. Auto-run the smart synthesizer ONCE to build a proper
      // title set; the result persists via saved prefs afterwards.
      if (!prefs.titles?.length && fromResume.length < 4) {
        setNeedsAutoSuggest(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCareers, isMncs, prefs]);

  const runSearch = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setGated(false);
    setProgress(null);
    const search = isMncs
      ? apiService.searchMncJobs.bind(apiService)
      : isCareers
        ? apiService.searchCareerPagesJobs.bind(apiService)
        : apiService.searchWorkdayJobs.bind(apiService);
    const resp = await search(
      {
        titles,
        industries,
        location,
        remote_only: remoteOnly,
        force_refresh: forceRefresh,
      },
      (partial) => {
        if (partial?.progress) setProgress(partial.progress);
        // Matches stream in company-by-company — render them immediately
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
      if (resp.status === 403 || resp.status === 429) {
        setGated(true);
        upgrade.open({
          feature: 'career_portals',
          title: 'Unlock direct career-portal search',
          description: 'Search live openings straight from company career portals. Fresh postings, scored against your resume.',
        });
      } else if (resp.error) {
        setError(resp.error);
      }
      return;
    }
    if (resp.data) setResult(resp.data);
  }, [titles, industries, location, remoteOnly, isCareers, isMncs, upgrade]);

  // Smart-suggest resume-derived titles (same LLM synthesizer the Daily
  // Pipeline's Smart Filters use).
  const smartSuggest = useCallback(async () => {
    setSuggesting(true);
    const resp = await apiService.suggestPipelineFilters();
    setSuggesting(false);
    const suggested = resp.data?.suggestions?.workday_titles ?? [];
    if (suggested.length) {
      setTitles((prev) => {
        const seen = new Set(prev.map((t) => t.toLowerCase()));
        return [...prev, ...suggested.filter((t) => !seen.has(t.toLowerCase()))].slice(0, 40);
      });
    }
  }, []);

  // Fires once when the parsed resume's own titles were too thin to search.
  useEffect(() => {
    if (needsAutoSuggest && !suggesting) {
      setNeedsAutoSuggest(false);
      void smartSuggest();
    }
  }, [needsAutoSuggest, suggesting, smartSuggest]);

  const toggleIndustry = (key: string) => {
    setIndustries((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // ── Client-side recency filtering (the backend always returns the full
  //    30-day window, so switching Today ↔ 30d never refetches). ───────────
  const maxDays = recency === 'custom'
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
    let out = recencyJobs;
    if (seniorityFilter !== 'any') out = out.filter((j) => seniorityOf(j) === seniorityFilter);
    if (minScore > 0) out = out.filter((j) => (j.match_score ?? 0) >= minScore);
    if (locationFilter !== 'all') out = out.filter((j) => locationKeyOf(j) === locationFilter);
    if (hideUnrealistic && hasFeasibility) out = out.filter((j) => j.tailor_feasibility !== 'skip');
    if (sponsorFilter === 'friendly') out = out.filter((j) => j.sponsorship !== 'refused');
    else if (sponsorFilter === 'proven') out = out.filter((j) => j.sponsorship === 'likely');
    if (sortBy === 'newest') {
      out = [...out].sort((a, b) =>
        (a.days_ago ?? 99) - (b.days_ago ?? 99) || (b.match_score ?? 0) - (a.match_score ?? 0));
    }
    return out;
  }, [recencyJobs, seniorityFilter, minScore, locationFilter, hideUnrealistic, hasFeasibility, sortBy, sponsorFilter]);

  // Reset incremental rendering whenever the visible set changes shape.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [recency, customDays, groupByCompany, result, seniorityFilter, minScore, locationFilter, hideUnrealistic, sortBy, sponsorFilter]);
  const renderedJobs = useMemo(
    () => visibleJobs.slice(0, visibleCount),
    [visibleJobs, visibleCount],
  );
  const hasMore = visibleJobs.length > renderedJobs.length;

  const recencyCounts = useMemo(() => {
    const all = result?.jobs ?? [];
    const counts: Record<WorkdayRecency, number> = { today: 0, '24h': 0, '3d': 0, '7d': 0, '30d': 0 };
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
    for (const j of renderedJobs) {
      const list = map.get(j.company) ?? [];
      list.push(j);
      map.set(j.company, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [groupByCompany, renderedJobs]);

  const catalogTotal = catalog?.total ?? 0;
  const selectedTenantCount = useMemo(() => {
    if (!catalog) return 0;
    if (!industries.length) return catalog.total;
    return catalog.industries
      .filter((i) => industries.includes(i.key))
      .reduce((n, i) => n + i.count, 0);
  }, [catalog, industries]);

  const fallbackSource = isMncs ? 'mnc' : isCareers ? 'career page' : 'workday';

  /** One grid cell: honest sponsorship / feasibility notes above the card. */
  const renderJob = (job: WorkdayJob) => (
    <div key={job.job_id} className="flex flex-col gap-1.5">
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
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Controls panel ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Role titles
              <span className="font-normal">· prefilled from your resume</span>
            </p>
            <ChipsInput
              values={titles}
              onChange={setTitles}
              maxItems={40}
              placeholder="e.g. Backend Engineer, Data Engineer…"
              defaultValues={resumeTitles.length ? resumeTitles.slice(0, 40) : undefined}
              accentClass="border-primary/30 bg-primary/10 text-primary"
              helperText={`The first 4 core title families drive the ${isMncs ? 'MNC board scan' : isCareers ? 'career-site scan' : 'Workday search'}; every title participates in ranking. Your set is saved automatically.`}
              emptyState="Add a role title, or upload a resume to prefill."
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={smartSuggest}
              disabled={suggesting}
              className="mt-1 gap-1 px-2 text-[11px] text-primary"
            >
              {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              {suggesting ? 'Analyzing resume…' : 'Smart-suggest titles from resume'}
            </Button>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Factory className="h-3.5 w-3.5" aria-hidden />
              Industries
              <span className="font-normal">
                · {industries.length ? `${selectedTenantCount} companies selected` : `all ${catalogTotal} companies`}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.industries ?? []).map((ind) => {
                const active = industries.includes(ind.key);
                return (
                  <button
                    key={ind.key}
                    type="button"
                    onClick={() => toggleIndustry(ind.key)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary',
                    )}
                  >
                    {industryLabels[ind.key] ?? ind.key}
                    <span className="ml-1 tabular-nums opacity-60">{ind.count}</span>
                  </button>
                );
              })}
              {catalogLoading && !catalog && (
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))
              )}
              {!catalogLoading && !catalog && (
                <span className="text-xs text-muted-foreground">
                  Couldn't load the company catalog. Search still works across all companies.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor={`portal-location-${variant}`}
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Location
              </label>
              <Input
                id={`portal-location-${variant}`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Anywhere in the US, e.g. Texas, Austin, Remote"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
              <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
              Remote only
            </label>
            <div className="flex gap-2 pb-0.5">
              <Button
                onClick={() => void runSearch(false)}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {loading ? 'Scanning…' : isMncs ? 'Search MNC boards' : isCareers ? 'Search career sites' : 'Search Workday'}
              </Button>
              {result && (
                <Button
                  variant="outline"
                  onClick={() => void runSearch(true)}
                  disabled={loading}
                  title="Bypass the cached result and re-scan every company"
                  className="gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3" role="status">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />
                  {progress?.phase === 'details'
                    ? 'Fetching full descriptions for top matches. Refining skill scores…'
                    : progress
                      ? `Scanned ${progress.tenants_done} of ${progress.tenants_total} companies, ${progress.jobs_found} postings so far (matches stream in below)`
                      : isMncs
                        ? 'Querying curated FAANG+ / Fortune-500 MNC career boards directly. No scraping, no credits.'
                        : isCareers
                          ? 'Querying company career pages directly: Greenhouse, Lever, Ashby and more. No scraping, no credits.'
                          : 'Querying Workday career sites directly. No scraping, no credits.'}
                </span>
              </div>
              <Progress
                value={progress ? (progress.tenants_done / Math.max(1, progress.tenants_total)) * 100 : 8}
                className="h-1.5"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="font-medium">The scan didn't complete.</p>
                <p className="text-xs opacity-80">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void runSearch(false)}>
                Retry
              </Button>
            </div>
          )}

          {gated && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-foreground">Direct portal search is a premium feature</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to scan company career portals with resume-scored results.
                </p>
              </div>
              <Button size="sm" onClick={() => upgrade.open({ feature: 'career_portals' })}>
                See plans
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Streaming skeleton (scan running, nothing streamed yet) ── */}
      {loading && !result && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Recency segmented control — filters the cached 30-day set
                client-side, so switching windows is instant. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
                {RECENCY_OPTIONS.map((opt) => (
                  <Seg key={opt.key} active={recency === opt.key} onClick={() => setRecency(opt.key)}>
                    {opt.label}
                    <span className="ml-1 tabular-nums opacity-60">{recencyCounts[opt.key]}</span>
                  </Seg>
                ))}
                <Seg active={recency === 'custom'} onClick={() => setRecency('custom')}>
                  Custom
                </Seg>
              </div>
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
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
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
            className={cn('flex-wrap items-center gap-2', filtersOpen ? 'flex' : 'hidden sm:flex')}
          >
            <select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Seniority filter"
            >
              {SENIORITY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>

            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {MIN_SCORE_OPTIONS.map((n) => (
                <Seg key={n} active={minScore === n} onClick={() => setMinScore(n)}>
                  {n === 0 ? 'Any score' : `${n}+`}
                </Seg>
              ))}
            </div>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-8 max-w-[190px] rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Location filter"
            >
              <option value="all">All locations</option>
              {locationOptions.map(([key, count]) => (
                <option key={key} value={key}>{key} ({count})</option>
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
              className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
              title={`Sponsorship filter for international candidates. "Sponsor-friendly" hides postings whose description explicitly declines visa sponsorship (${refusedCount} here); "Proven sponsors" additionally keeps only companies with recent H-1B filings in public disclosure data. A track record, not a promise.`}
            >
              {([['all', 'All'], ['friendly', 'Sponsor-friendly'], ['proven', 'Proven sponsors']] as const).map(([key, label]) => (
                <Seg key={key} active={sponsorFilter === key} onClick={() => setSponsorFilter(key)}>
                  {label}
                </Seg>
              ))}
            </div>

            <div className="sm:ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(['score', 'newest'] as const).map((s) => (
                <Seg key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
                  {s === 'score' ? 'Best match' : 'Newest'}
                </Seg>
              ))}
            </div>
          </div>

          {result.resume_skill_count === 0 && !result.streaming && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground/85">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span>
                No parsed resume found for this account. Match scores, skill overlap and
                tailor-feasibility need one. Upload your resume in the Tailor tab, then re-run the search.
              </span>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {result.streaming
              ? `Streaming: ${result.tenants_done} of ${result.tenants_total} companies scanned, best matches so far below`
              : <>Matched {result.tenants_with_results} of {result.tenants_total} companies
                {result.cache_hit ? ' · served from cache. Refresh to re-scan' : ''}
                {result.query_terms.length ? ` · searched: ${result.query_terms.join(', ')}` : ''}
                {result.errors.length > 0 ? ` · ${result.errors.length} source warnings` : ''}</>}
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
              {grouped.map(([company, jobs]) => (
                <div key={company} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden />
                    {company}
                    <Badge variant="outline" className="text-[10px] tabular-nums">{jobs.length}</Badge>
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
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {jobs.map(renderJob)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {renderedJobs.map(renderJob)}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="gap-1.5"
              >
                Show more ({visibleJobs.length - renderedJobs.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Pre-search invitation ── */}
      {!result && !loading && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">
            Search {catalogTotal ? `${catalogTotal} ` : ''}{isMncs ? 'MNC & Big Tech career boards' : isCareers ? 'company career pages' : 'Workday career sites'} directly
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {isMncs
              ? 'A curated FAANG+ / Fortune-500 MNC universe: Big Tech, semiconductors, banking, consulting and more, queried straight from each company’s official board and ranked by fit against your resume.'
              : isCareers
                ? 'The non-Workday universe: companies hosting jobs on their own career pages via Greenhouse, Lever, Ashby, SmartRecruiters, Workable and Recruitee. Public JSON APIs; nothing scraped.'
                : "Most large enterprises hire through Workday. This queries each company's public careers API directly. Fast, free, and fresh."}{' '}
            Defaults to roles posted in the last 3 days; the full 30-day window loads in one scan.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => void runSearch(false)}
          >
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            {isMncs ? 'Search MNC boards' : isCareers ? 'Search career sites' : 'Search Workday'}
          </Button>
        </div>
      )}
    </div>
  );
}
