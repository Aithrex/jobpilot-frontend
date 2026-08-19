import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { Job, SavedJob, JobSearchFilters, JobSearchOptions, BatchSearchResponse, VisaFlags, VisaFilters } from '@/types/jobs';

/**
 * Client-side visa pre-filter - lets a toggle re-shape the visible list
 * instantly, before the authoritative backend refetch lands. Lenient by
 * design: it only removes jobs whose flags DEFINITIVELY contradict a toggle
 * (explicit false / clearance true), so unknown/older payloads stay visible.
 */
export function passesVisaFilters(job: Job, vf?: VisaFilters): boolean {
  if (!vf) return true;
  const f: VisaFlags | undefined = job.visa_flags;
  const isFalse = (k: keyof VisaFlags) => f?.[k]?.value === false;
  if (vf.sponsors_h1b && isFalse('sponsors_h1b') && !job.h1b_sponsor) return false;
  if (vf.cap_exempt && isFalse('cap_exempt')) return false;
  if (vf.accepts_cpt && isFalse('accepts_cpt')) return false;
  if (vf.no_citizenship_requirement && isFalse('no_citizenship_requirement')) return false;
  if (vf.exclude_clearance && f?.clearance_required?.value === true) return false;
  return true;
}

const DEFAULT_QUERIES = [
  'software engineer new grad entry level h1b sponsor',
  'cloud engineer entry level contract h1b sponsor',
  'devops engineer entry level new grad',
  'SRE entry level new grad',
  'platform engineer entry level contract',
  'full stack developer entry level h1b sponsor',
];

export const COMPANY_CHIPS = [
  'Amazon', 'Google', 'Meta', 'Apple', 'Netflix', 'Microsoft',
  'Walmart', 'TikTok', 'Lucid', 'Qualcomm', 'Thermo Fisher', 'PayPal',
  'State Farm', 'Deloitte', 'TCS', 'Infosys',
];

export const DEFAULT_FILTERS: JobSearchFilters = {
  query: 'software engineer new grad entry level h1b sponsor',
  location: 'United States',
  date_posted: 'today',
  remote_only: false,
  employment_type: '',
  h1b_only: false,
  visa_or_contract: true,
  experience_level: 'entry',
  source: 'all',
  include_company_careers: true,
  use_resume_recommendations: true,
  visa_filters: {},
};

const PENDING_APPLY_KEY = 'aspirely.pending-apply-confirm';

export interface BatchMeta {
  queries_executed: number;
  cache_hits: number;
  errors: string[];
  sources?: Record<string, number>;
  raw_sources?: Record<string, number>;
  filtered_reasons?: Record<string, number>;
  selected_sources?: string[];
  skipped_sources?: Record<string, string>;
  pending?: string[];
  streaming?: boolean;
  cache_bypassed?: boolean;
}

export function useJobSearch() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [filters, setFilters] = useState<JobSearchFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchMeta, setBatchMeta] = useState<BatchMeta | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [savingFilters, setSavingFilters] = useState(false);

  // --- Single-query search (manual) ---
  const searchJobs = useCallback(async (
    searchFilters?: JobSearchFilters,
    searchPage?: number,
    options?: JobSearchOptions,
  ) => {
    const f = searchFilters || filters;
    if (!f.query.trim()) return;

    setLoading(true);
    setError(null);
    setBatchMeta(null);
    setHasSearched(true);
    const p = searchPage || 1;

    const resp = await apiService.searchJobs(
      {
        q: f.query,
        page: p,
        location: f.location,
        date_posted: f.date_posted,
        remote: f.remote_only,
        type: f.employment_type,
        h1b_only: f.h1b_only,
        visa_or_contract: f.visa_or_contract,
        experience_level: f.experience_level,
        source: f.source,
        include_company_careers: f.include_company_careers,
        use_resume_recommendations: f.use_resume_recommendations,
        force_refresh: options?.forceRefresh,
        visa_filters: f.visa_filters,
      },
      (partial) => {
        let streamed = partial.jobs || [];
        if (f.h1b_only) streamed = streamed.filter(j => j.h1b_sponsor);
        setJobs(streamed);
        setLoading(false);
        setBatchMeta({
          queries_executed: 1,
          cache_hits: partial.cache_hits ?? 0,
          errors: partial.errors || [],
          sources: partial.sources,
          raw_sources: partial.raw_sources,
          filtered_reasons: partial.filtered_reasons,
          selected_sources: partial.selected_sources,
          skipped_sources: partial.skipped_sources,
          pending: (partial as any).pending,
          streaming: true,
          cache_bypassed: partial.cache_bypassed,
        });
      },
    );

    if (resp.error) {
      setError(resp.error);
      setLoading(false);
      return;
    }

    let results = resp.data?.jobs || [];
    if (f.h1b_only) {
      results = results.filter(j => j.h1b_sponsor);
    }

    setJobs(results);
    setPage(resp.data?.page || 1);
    setTotalPages(Math.max(1, resp.data?.total_pages || 1));
    const hasMeta = (resp.data?.errors?.length ?? 0) > 0
      || !!resp.data?.sources
      || !!resp.data?.raw_sources
      || !!resp.data?.selected_sources?.length
      || !!resp.data?.skipped_sources
      || (resp.data?.cache_hits ?? 0) > 0
      || !!resp.data?.cache_bypassed;
    setBatchMeta(hasMeta ? {
      queries_executed: 1,
      cache_hits: resp.data?.cache_hits ?? 0,
      errors: resp.data?.errors || [],
      sources: resp.data?.sources,
      raw_sources: resp.data?.raw_sources,
      filtered_reasons: resp.data?.filtered_reasons,
      selected_sources: resp.data?.selected_sources,
      skipped_sources: resp.data?.skipped_sources,
      cache_bypassed: resp.data?.cache_bypassed,
    } : null);
    setLoading(false);
  }, [filters]);

  // --- Batch search (multi-query) ---
  const batchSearch = useCallback(async (
    queries: string[] = DEFAULT_QUERIES,
    overrides?: Partial<JobSearchFilters>,
    options?: JobSearchOptions,
  ) => {
    setLoading(true);
    setError(null);
    setBatchMeta(null);
    setHasSearched(true);

    const f = { ...filters, ...overrides };
    const resp = await apiService.batchSearchJobs(
      {
        queries,
        location: f.location,
        date_posted: f.date_posted,
        remote: f.remote_only,
        type: f.employment_type,
        h1b_only: f.h1b_only,
        visa_or_contract: f.visa_or_contract,
        experience_level: f.experience_level,
        source: f.source,
        include_company_careers: f.include_company_careers,
        use_resume_recommendations: f.use_resume_recommendations,
        force_refresh: options?.forceRefresh,
        visa_filters: f.visa_filters,
      },
      (partial) => {
        let streamed = partial.jobs || [];
        if (f.h1b_only) streamed = streamed.filter(j => j.h1b_sponsor);
        setJobs(streamed);
        setLoading(false);
        setBatchMeta({
          queries_executed: partial.queries_executed ?? queries.length,
          cache_hits: partial.cache_hits ?? 0,
          errors: partial.errors || [],
          sources: partial.sources,
          raw_sources: partial.raw_sources,
          filtered_reasons: partial.filtered_reasons,
          selected_sources: partial.selected_sources,
          skipped_sources: partial.skipped_sources,
          pending: (partial as any).pending,
          streaming: true,
          cache_bypassed: partial.cache_bypassed,
        });
      },
    );

    if (resp.error) {
      setError(resp.error);
      setLoading(false);
      return;
    }

    const data = resp.data as BatchSearchResponse;
    let results = data.jobs || [];
    if (f.h1b_only) {
      results = results.filter(j => j.h1b_sponsor);
    }

    setJobs(results);
    setTotalPages(1);
    setPage(1);
    setBatchMeta({
      queries_executed: data.queries_executed,
      cache_hits: data.cache_hits,
      errors: data.errors || [],
      sources: data.sources,
      raw_sources: data.raw_sources,
      filtered_reasons: data.filtered_reasons,
      selected_sources: data.selected_sources,
      skipped_sources: data.skipped_sources,
      cache_bypassed: data.cache_bypassed,
    });
    setLoading(false);
  }, [filters]);

  // --- Saved filters ---
  const loadSavedFilters = useCallback(async () => {
    const resp = await apiService.getJobFilters();
    if (resp.data?.filters) {
      setFilters({ ...DEFAULT_FILTERS, ...resp.data.filters });
    }
    setFiltersLoaded(true);
    return resp;
  }, []);

  const saveFilters = useCallback(async (nextFilters?: JobSearchFilters) => {
    setSavingFilters(true);
    const resp = await apiService.saveJobFilters(nextFilters || filters);
    setSavingFilters(false);
    if (resp.data?.filters) {
      setFilters({ ...DEFAULT_FILTERS, ...resp.data.filters });
    }
    return resp;
  }, [filters]);

  // --- Saved jobs ---
  const loadSavedJobs = useCallback(async () => {
    const resp = await apiService.getSavedJobs();
    if (resp.data) {
      setSavedJobs(resp.data.jobs);
    }
  }, []);

  const saveJob = useCallback(async (job: Job) => {
    const resp = await apiService.saveJob(job);
    if (resp.data) {
      setSavedJobs(prev => [resp.data!.job, ...prev.filter(j => j.job_id !== job.job_id)]);
    }
    return resp;
  }, []);

  const unsaveJob = useCallback(async (jobId: string) => {
    const resp = await apiService.deleteSavedJob(jobId);
    if (!resp.error) {
      setSavedJobs(prev => prev.filter(j => j.job_id !== jobId));
    }
    return resp;
  }, []);

  const updateJobStatus = useCallback(async (jobId: string, status: string, notes?: string) => {
    const resp = await apiService.updateSavedJob(jobId, { status, notes });
    if (resp.data) {
      setSavedJobs(prev => prev.map(j => j.job_id === jobId ? resp.data!.job : j));
    }
    return resp;
  }, []);

  const [pendingApplyIds, setPendingApplyIds] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_APPLY_KEY);
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
      return new Set();
    }
  });
  const [applyConfirmJob, setApplyConfirmJob] = useState<Job | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(PENDING_APPLY_KEY, JSON.stringify([...pendingApplyIds]));
    } catch {
      /* private mode / quota */
    }
  }, [pendingApplyIds]);

  useEffect(() => {
    setPendingApplyIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (savedJobs.find((j) => j.job_id === id)?.status === 'applied') {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [savedJobs]);

  const isApplyConfirmPending = useCallback(
    (jobId: string) => pendingApplyIds.has(jobId),
    [pendingApplyIds],
  );

  const confirmApplied = useCallback(async (jobId: string) => {
    const resp = await updateJobStatus(jobId, 'applied');
    setPendingApplyIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    setApplyConfirmJob((job) => (job?.job_id === jobId ? null : job));
    if (resp.error) {
      toast.error('Could not mark as applied', { description: resp.error });
      return resp;
    }

    const posting = savedJobs.find((j) => j.job_id === jobId)?.job_data;
    const company = (posting?.company || '').trim().toLowerCase();
    const title = (posting?.title || '').trim().toLowerCase();
    try {
      const listed = await apiService.listTailoringRecords();
      const records = listed.data?.records || [];
      const matches = records.filter((r) => {
        if (r.source_job_id === jobId) return true;
        const rc = (r.jd_analysis?.company || '').trim().toLowerCase();
        const rt = (r.jd_analysis?.job_title || '').trim().toLowerCase();
        return Boolean(company && title && rc === company && rt === title);
      });
      await Promise.all(
        matches.map((r) =>
          apiService.updateApplication(r.record_id, {
            status: 'applied',
            batch_confirmation_pending: false,
          }),
        ),
      );
    } catch {
      /* saved_jobs write already succeeded; tracker sync is best-effort */
    }

    toast.success('Moved to Applied', {
      description: 'It’s in Apply → Tracker under Applied.',
    });
    return resp;
  }, [updateJobStatus, savedJobs]);

  const dismissApplyConfirm = useCallback((jobId: string) => {
    setPendingApplyIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    setApplyConfirmJob((job) => (job?.job_id === jobId ? null : job));
  }, []);

  const closeApplyConfirmDialog = useCallback(() => {
    setApplyConfirmJob(null);
  }, []);

  const isJobSaved = useCallback((jobId: string) => {
    return savedJobs.some(j => j.job_id === jobId);
  }, [savedJobs]);

  // Open the posting, keep the job where it is, then ask "Did you apply?"
  const quickApply = useCallback(async (job: Job) => {
    const url = job.apply_link
      || `https://www.google.com/search?q=${encodeURIComponent(`${job.title} ${job.company} apply`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const existing = savedJobs.find((j) => j.job_id === job.job_id);
    if (!existing) {
      const saved = await apiService.saveJob(job);
      if (saved.data) {
        setSavedJobs((prev) => [
          saved.data!.job,
          ...prev.filter((j) => j.job_id !== job.job_id),
        ]);
      }
    }
    if (existing?.status === 'applied') return;

    setPendingApplyIds((prev) => new Set(prev).add(job.job_id));
    setApplyConfirmJob(job);
  }, [savedJobs]);

  // --- Auto Apply: queue into ledger (prepare/gather/submit per user mode) ---
  const [autoApplyingId, setAutoApplyingId] = useState<string | null>(null);
  const autoApply = useCallback(async (job: Job) => {
    setAutoApplyingId(job.job_id);
    try {
      if (!savedJobs.some(j => j.job_id === job.job_id)) {
        await apiService.saveJob(job);
      }
      const ats = (job.source || '').toLowerCase().includes('workday')
        ? 'workday'
        : (job.source || '').toLowerCase().includes('greenhouse')
          ? 'greenhouse'
          : (job.source || '').toLowerCase().includes('lever')
            ? 'lever'
            : (job.source || '').toLowerCase().includes('ashby')
              ? 'ashby'
              : undefined;
      const resp = await apiService.queueAutoApply({
        company: job.company || 'Unknown',
        title: job.title || 'Role',
        jd_text: job.description || '',
        apply_url: job.apply_link || '',
        ats_family: ats,
        source: 'job_card',
        job_id: job.job_id,
        posting_job_id: job.job_id,
      });
      if (resp.error) {
        toast.error('Could not queue Auto Apply', { description: resp.error });
        return resp;
      }
      if (resp.data?.skipped) {
        toast.message('Already in your Auto Apply queue');
      } else {
        toast.success('Queued for Auto Apply', {
          description: 'Track progress under Apply → Auto-Apply. Mode controls whether we submit or wait for you.',
        });
      }
      return resp;
    } finally {
      setAutoApplyingId(null);
    }
  }, [savedJobs]);

  // --- Get saved status for a job ---
  const getJobStatus = useCallback((jobId: string): string | null => {
    const saved = savedJobs.find(j => j.job_id === jobId);
    return saved?.status || null;
  }, [savedJobs]);

  // Load saved jobs on mount
  useEffect(() => {
    loadSavedJobs();
    loadSavedFilters();
  }, [loadSavedJobs, loadSavedFilters]);

  return {
    jobs,
    savedJobs,
    filters,
    setFilters,
    page,
    totalPages,
    setPage,
    loading,
    error,
    filtersLoaded,
    savingFilters,
    searchJobs,
    batchSearch,
    saveFilters,
    loadSavedJobs,
    loadSavedFilters,
    saveJob,
    unsaveJob,
    updateJobStatus,
    isJobSaved,
    quickApply,
    isApplyConfirmPending,
    applyConfirmJob,
    confirmApplied,
    dismissApplyConfirm,
    closeApplyConfirmDialog,
    autoApply,
    autoApplyingId,
    getJobStatus,
    batchMeta,
    hasSearched,
  };
}
