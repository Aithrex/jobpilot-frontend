import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, X, XCircle, Download } from 'lucide-react';
import { apiService } from '@/lib/api';
import { isTrimmedOutcome, resumeTrimDescription } from '@/lib/resumeLayoutSpec';
import { toast } from 'sonner';
import type { TailoredFullResume, JDAnalysis, ATSScores } from '@/types/resume';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyUsage, DailyUsage } from '@/hooks/useDailyUsage';
import { DailyUsageBadge } from '@/components/quota/DailyUsageBadge';
import { QuotaLimitDialog } from '@/components/quota/QuotaLimitDialog';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { useFeedback } from '@/components/feedback/FeedbackWidget';
import { buildCoverLetterFilename } from '@/lib/filename';
import { stageBatchHandoff } from '@/lib/craftHandoff';

interface JDEntry {
  id: string;
  title: string;
  text: string;
  /** Set when handed off from Daily Pipeline with a failed JD scrape so the
   * UI can render a clear "paste below" prompt instead of a generic empty
   * textarea. Purely informational - submission validation is text-length. */
  fetchFailed?: boolean;
  /** Original posting URL when handed off from the pipeline - surfaced so
   * the user can click through and copy the JD from the source. */
  sourceUrl?: string;
  /** Daily-pipeline record id. When present the backend wires the resulting
   * tailoring_record back to the saved_job (status → applied, streak++) so
   * the batch flow shows up in Applications / Tailored / My Resumes the same
   * way a single-row Tailor does. */
  sourceJobId?: string;
}

const BATCH_TAILOR_MAX = 25;

type ExtraStatus = 'idle' | 'generating' | 'done' | 'failed';

interface BatchJob {
  id: string;
  jobId: string;
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: {
    tailored_resume: TailoredFullResume;
    jd_analysis: JDAnalysis;
    record_id?: string;
    source_job_id?: string;
    base_selection?: import('@/types/resume').BaseResumeSelection;
  };
  error?: string;
  /** Original posting URL when handed off from the Daily Pipeline. */
  sourceUrl?: string;
  /** Daily Pipeline saved_job id linked to this batch entry (passed through
   *  from the handoff). Server-side sync flips this saved_job's status when
   *  the user confirms applied via the batch prompt. */
  sourceJobId?: string;
  /** Lazy-generated cover letter - only kicks off on user click. */
  coverLetter?: { status: ExtraStatus; text?: string; error?: string };
  /** Lazy-generated ATS scores - same pattern. */
  atsScores?: { status: ExtraStatus; data?: ATSScores; error?: string };
  /** Local mirror of application.status - toggled by the I applied / Not
   *  yet / Dismiss prompt. Starts undefined until the user picks one. */
  applicationStatus?: 'interested' | 'applied' | 'dismissed';
  /** True while a PATCH is in flight from one of the three buttons. */
  confirming?: boolean;
}

let idCounter = 0;
const nextId = () => `jd-${++idCounter}`;

// Persistence - keyed per user so two accounts on the same browser never
// see each other's in-flight batch. The legacy global key is migrated
// to the current user on first read so nobody loses a running batch
// during the rollout.
const BATCH_STORAGE_PREFIX = 'batch_tailor_jobs_v1';
const LEGACY_BATCH_KEY = 'batch_tailor_jobs_v1';
const BATCH_TTL_MS = 6 * 60 * 60 * 1000; // 6h - after that, results are stale
function batchStorageKey(userEmail: string | null | undefined): string {
  const slug = (userEmail || '').trim().toLowerCase() || 'anonymous';
  return `${BATCH_STORAGE_PREFIX}:${slug}`;
}

function readPersistedBatch(userEmail: string | null | undefined): BatchJob[] | null {
  const key = batchStorageKey(userEmail);
  try {
    let raw = localStorage.getItem(key);
    // One-time migration of the legacy global key to the current user.
    if (!raw && key !== LEGACY_BATCH_KEY) {
      const legacy = localStorage.getItem(LEGACY_BATCH_KEY);
      if (legacy) {
        try {
          localStorage.setItem(key, legacy);
          localStorage.removeItem(LEGACY_BATCH_KEY);
          raw = legacy;
        } catch { /* quota */ }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { jobs: BatchJob[]; savedAt: number };
    if (!parsed?.jobs || !Array.isArray(parsed.jobs)) return null;
    if (Date.now() - (parsed.savedAt || 0) > BATCH_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.jobs;
  } catch {
    return null;
  }
}

function writePersistedBatch(jobs: BatchJob[], userEmail: string | null | undefined): void {
  const key = batchStorageKey(userEmail);
  try {
    if (!jobs.length) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(
      key,
      JSON.stringify({ jobs, savedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode - ignore */
  }
}

export default function BatchTailor() {
  const { user } = useAuth();
  const userEmail = user?.email || null;
  const [jdEntries, setJdEntries] = useState<JDEntry[]>([{ id: nextId(), title: '', text: '' }]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>(() => readPersistedBatch(userEmail) ?? []);
  const [submitting, setSubmitting] = useState(false);
  /** Inline (non-quota) submission error - rendered under the actions row so
   *  the failure and its retry live next to the button that caused it. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { usage: dailyUsage, loading: usageLoading, refresh: refreshUsage, applyUsage } = useDailyUsage();
  const [quotaDialog, setQuotaDialog] = useState<(DailyUsage & { requested?: number }) | null>(null);
  const feedback = useFeedback();
  const upgrade = useUpgrade();

  // Persist on every batchJobs change so refresh / tab close survive.
  useEffect(() => {
    writePersistedBatch(batchJobs, userEmail);
  }, [batchJobs, userEmail]);

  // If the user switches accounts on the same tab (rare but real), reset
  // local state and re-hydrate from THAT user's key. Without this, the
  // previously-mounted state would persist into the new user's session.
  useEffect(() => {
    const fresh = readPersistedBatch(userEmail) ?? [];
    setBatchJobs(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const addEntry = useCallback(() => {
    if (jdEntries.length >= BATCH_TAILOR_MAX) return;
    setJdEntries(prev => [...prev, { id: nextId(), title: '', text: '' }]);
  }, [jdEntries.length]);

  // Receive a batch handoff from the Daily Pipeline. The pipeline pre-fetches
  // every selected job's JD (parallel, capped) and writes the result here.
  // Entries with fetchFailed=true land empty so the user can paste manually
  // before submitting the whole batch.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pending_batch_tailor_jobs');
      if (!raw) return;
      sessionStorage.removeItem('pending_batch_tailor_jobs');
      const parsed = JSON.parse(raw) as Array<{
        job_id: string;
        title: string;
        company: string;
        url: string;
        jd_text: string;
        jd_fetch_failed?: boolean;
      }>;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const incoming: JDEntry[] = parsed.slice(0, BATCH_TAILOR_MAX).map((j) => ({
        id: nextId(),
        title: [j.title, j.company].filter(Boolean).join(' @ ') || 'Job from pipeline',
        text: j.jd_text || '',
        fetchFailed: !!j.jd_fetch_failed,
        sourceUrl: j.url || undefined,
        sourceJobId: j.job_id || undefined,
      }));
      setJdEntries(incoming);
      const failedN = incoming.filter((e) => e.fetchFailed).length;
      if (failedN > 0) {
        toast.warning(
          `${incoming.length} jobs loaded. ${failedN} JD${failedN > 1 ? 's' : ''} need a manual paste before they can be tailored.`,
          { duration: 8000 },
        );
      } else {
        toast.success(`${incoming.length} jobs loaded from the Daily Pipeline. Hit "Tailor all" when you're ready.`);
      }
    } catch (e) {
      // Bad JSON or storage error - ignore, the empty default form still works.
    }
  }, []);

  const removeEntry = useCallback((id: string) => {
    setJdEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);
  }, []);

  const updateEntry = useCallback((id: string, field: 'title' | 'text', value: string) => {
    setJdEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }, []);

  const canSubmit = jdEntries.some(e => e.text.trim().length > 50);

  const handleSubmit = useCallback(async () => {
    const validEntries = jdEntries.filter(e => e.text.trim().length > 50);
    if (validEntries.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    const resp = await apiService.batchTailor(
      validEntries.map(e => ({
        text: e.text.trim(),
        title: e.title.trim() || `Job ${jdEntries.indexOf(e) + 1}`,
        source_job_id: e.sourceJobId,
      }))
    );
    setSubmitting(false);

    if (resp.error) {
      if (resp.status === 429 && (resp.errorPayload as any)?.error === 'daily_quota_exceeded') {
        const u = (resp.errorPayload as any).usage as DailyUsage & { requested?: number };
        applyUsage(u);
        setQuotaDialog({ ...u, requested: validEntries.length });
        return;
      }
      // Batch tailoring is a gated feature on the free tier - a 403
      // upgrade_required opens the plan chooser rather than surfacing a raw
      // error (safe no-op if we're mounted outside the UpgradeModalProvider).
      if (resp.status === 403) {
        upgrade.open({
          feature: 'batch_tailor',
          title: 'Unlock batch tailoring',
          description: 'Tailor your resume to many job descriptions in one run. Upgrade to enable batch tailoring.',
        });
        return;
      }
      setSubmitError(resp.error);
      toast.error("Couldn't submit the batch", { description: resp.error });
      return;
    }
    if (!resp.data?.jobs) return;
    refreshUsage();

    const jobs: BatchJob[] = resp.data.jobs.map((j, i) => ({
      id: validEntries[i].id,
      jobId: j.job_id,
      title: j.title || validEntries[i].title || `Job ${i + 1}`,
      status: 'processing' as const,
      sourceUrl: validEntries[i].sourceUrl,
      sourceJobId: validEntries[i].sourceJobId,
    }));
    setBatchJobs(jobs);
    toast.success(`${jobs.length} job${jobs.length > 1 ? 's' : ''} submitted`);
  }, [jdEntries]);

  const handleGenerateCoverLetter = useCallback(async (job: BatchJob) => {
    if (!job.result || job.coverLetter?.status === 'generating') return;
    setBatchJobs(prev => prev.map(j =>
      j.jobId === job.jobId ? { ...j, coverLetter: { status: 'generating' } } : j,
    ));
    const resp = await apiService.generateCoverLetter(
      job.result.tailored_resume,
      job.result.jd_analysis,
    );
    if (resp.error || !resp.data?.cover_letter) {
      setBatchJobs(prev => prev.map(j =>
        j.jobId === job.jobId
          ? { ...j, coverLetter: { status: 'failed', error: resp.error || 'Generation failed' } }
          : j,
      ));
      toast.error(`Cover letter failed for "${job.title}"`);
      return;
    }
    setBatchJobs(prev => prev.map(j =>
      j.jobId === job.jobId
        ? { ...j, coverLetter: { status: 'done', text: resp.data!.cover_letter } }
        : j,
    ));
    toast.success(`Cover letter ready for "${job.title}"`);
  }, []);

  const handleDownloadCoverLetter = useCallback((job: BatchJob) => {
    const txt = job.coverLetter?.text;
    if (!txt) return;
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = buildCoverLetterFilename(
      job.result?.tailored_resume?.contact?.name || '',
      job.result?.jd_analysis?.job_title || job.title || '',
      'txt',
    );
    a.click();
    URL.revokeObjectURL(u);
  }, []);

  // "Did you apply?" prompt - sets the tailoring_record's application
  // status to applied (or clears the prompt without changing it) AND
  // syncs the linked Daily Pipeline saved_job via the backend sync
  // helper. Single source of truth: PATCH on the record, backend handles
  // the saved_job propagation.
  const handleConfirmApplied = useCallback(async (job: BatchJob) => {
    const recordId = job.result?.record_id;
    if (!recordId || job.confirming) return;
    setBatchJobs((prev) => prev.map((j) =>
      j.jobId === job.jobId ? { ...j, confirming: true } : j,
    ));
    const r = await apiService.updateApplication(recordId, {
      status: 'applied',
      batch_confirmation_pending: false,
    });
    if (r.error) {
      toast.error(`Couldn't mark applied for "${job.title}"`);
      setBatchJobs((prev) => prev.map((j) =>
        j.jobId === job.jobId ? { ...j, confirming: false } : j,
      ));
      return;
    }
    setBatchJobs((prev) => prev.map((j) =>
      j.jobId === job.jobId
        ? { ...j, confirming: false, applicationStatus: 'applied' }
        : j,
    ));
    toast.success(`"${job.title}" marked as applied. Synced to Daily Pipeline.`);
  }, []);

  const handleConfirmNotYet = useCallback(async (job: BatchJob, label = 'Not yet') => {
    const recordId = job.result?.record_id;
    if (!recordId || job.confirming) return;
    setBatchJobs((prev) => prev.map((j) =>
      j.jobId === job.jobId ? { ...j, confirming: true } : j,
    ));
    const r = await apiService.updateApplication(recordId, {
      batch_confirmation_pending: false,
    });
    if (r.error) {
      toast.error(`Couldn't update "${job.title}"`);
      setBatchJobs((prev) => prev.map((j) =>
        j.jobId === job.jobId ? { ...j, confirming: false } : j,
      ));
      return;
    }
    setBatchJobs((prev) => prev.map((j) =>
      j.jobId === job.jobId
        ? { ...j, confirming: false, applicationStatus: 'dismissed' }
        : j,
    ));
    toast.message(`"${job.title}". Kept as Interested. ${label === 'Dismiss' ? 'Prompt dismissed.' : 'Confirm later from the kanban.'}`);
  }, []);

  const handleOpenInEditor = useCallback((job: BatchJob) => {
    if (!job.result) return;
    // Cross-tab handoff via localStorage (sessionStorage is per-tab so we
    // can't read it from the new window). stageBatchHandoff writes the payload
    // keyed by the batch job_id so a user can open multiple results in parallel
    // windows without collisions; the new tab reads it via consumeBatchHandoff.
    stageBatchHandoff(job.jobId, {
      tailored_resume: job.result.tailored_resume,
      jd_analysis: job.result.jd_analysis,
      title: job.title,
      source_url: job.sourceUrl || '',
    });
    // Open the app-shell Tailor route (not the legacy /?tab=tailor entry).
    const url = `${window.location.origin}/app/resume/tailor?load_batch=${encodeURIComponent(job.jobId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleGenerateAts = useCallback(async (job: BatchJob) => {
    if (!job.result || job.atsScores?.status === 'generating') return;
    setBatchJobs(prev => prev.map(j =>
      j.jobId === job.jobId ? { ...j, atsScores: { status: 'generating' } } : j,
    ));
    const resp = await apiService.fetchATSScores(
      job.result.tailored_resume,
      job.result.jd_analysis,
    );
    if (resp.error || !resp.data?.ats_scores) {
      setBatchJobs(prev => prev.map(j =>
        j.jobId === job.jobId
          ? { ...j, atsScores: { status: 'failed', error: resp.error || 'Scoring failed' } }
          : j,
      ));
      toast.error(`ATS score failed for "${job.title}"`);
      return;
    }
    setBatchJobs(prev => prev.map(j =>
      j.jobId === job.jobId
        ? { ...j, atsScores: { status: 'done', data: resp.data!.ats_scores } }
        : j,
    ));
  }, []);

  // Poll all active jobs
  useEffect(() => {
    const activeJobs = batchJobs.filter(j => j.status === 'processing' || j.status === 'queued');
    if (activeJobs.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const poll = async () => {
      for (const job of activeJobs) {
        try {
          const resp = await apiService.pollJobStatus<any>(job.jobId);
          if (!resp.data) continue;
          const { status } = resp.data;
          if (status === 'completed' && resp.data.result) {
            setBatchJobs(prev => prev.map(j =>
              j.jobId === job.jobId ? { ...j, status: 'completed', result: resp.data!.result } : j
            ));
            toast.success(`"${job.title}" completed`);
          } else if (status === 'failed') {
            setBatchJobs(prev => prev.map(j =>
              j.jobId === job.jobId ? { ...j, status: 'failed', error: resp.data!.error || 'Failed' } : j
            ));
          }
        } catch { /* ignore individual poll errors */ }
      }
    };

    pollRef.current = setInterval(poll, 3000);
    poll(); // immediate first poll
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [batchJobs]);

  const handleDownload = useCallback(async (job: BatchJob, fmt: 'pdf' | 'docx') => {
    if (!job.result) return;
    const r = await apiService.downloadTailoredResume(job.result.tailored_resume, job.result.jd_analysis, fmt);
    if (r.error) { toast.error('Download failed'); return; }
    if (r.data) {
      const u = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = u; a.download = r.filename || `resume.${fmt}`; a.click(); URL.revokeObjectURL(u);
      if (isTrimmedOutcome(r.outcome)) {
        toast.warning('Some content was trimmed to fit the page', {
          description: resumeTrimDescription(r.dropped?.length || 0),
        });
      } else {
        toast.success(`Downloaded ${fmt.toUpperCase()}`);
      }
    }
  }, []);

  const completedCount = batchJobs.filter(j => j.status === 'completed').length;
  const totalCount = batchJobs.length;
  const isRunning = batchJobs.some(j => j.status === 'processing' || j.status === 'queued');

  return (
    <div className="space-y-5">
      {/* Tab header - same editorial pattern as the other workspace tabs. */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Create · Batch Tailor</p>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Batch Tailor</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Add up to {BATCH_TAILOR_MAX} job descriptions and tailor your resume to each in one run.
          Every edit stays honest and traceable. You can also tick rows on the Daily Pipeline and send
          them here in one shot.
        </p>
      </div>

      {/* Input phase */}
      {batchJobs.length === 0 && (
        <>
          <div className="space-y-3">
            {jdEntries.map((entry, i) => (
              <div
                key={entry.id}
                className={`rounded-xl border overflow-hidden shadow-soft ${
                  entry.fetchFailed && !entry.text.trim()
                    ? 'border-warning/50 bg-warning/[0.06]'
                    : 'border-border bg-card'
                }`}
              >
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground">Job description {i + 1}</span>
                  <div className="flex items-center gap-2">
                    {entry.fetchFailed && !entry.text.trim() && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning">
                        ⚠ JD not auto-fetched. Paste below
                      </span>
                    )}
                    {entry.sourceUrl && (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary underline underline-offset-2 hover:text-primary/80"
                        title="Open the source posting in a new tab"
                      >
                        Open posting ↗
                      </a>
                    )}
                    {jdEntries.length > 1 && (
                      <button type="button" onClick={() => removeEntry(entry.id)}
                        aria-label={`Remove job description ${i + 1}`}
                        className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    placeholder="Job title (optional, e.g. Senior Cloud Engineer at AWS)"
                    value={entry.title}
                    onChange={e => updateEntry(entry.id, 'title', e.target.value)}
                  />
                  <textarea
                    className={`w-full px-3 py-2 rounded-lg bg-background border text-sm text-foreground placeholder:text-muted-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all ${
                      entry.fetchFailed && !entry.text.trim()
                        ? 'border-warning/60'
                        : 'border-input'
                    }`}
                    rows={4}
                    placeholder={
                      entry.fetchFailed && !entry.text.trim()
                        ? "Couldn't auto-fetch this posting. Open the source link above, copy the full JD, and paste it here."
                        : 'Paste the complete job description here...'
                    }
                    maxLength={15000}
                    value={entry.text}
                    onChange={e => updateEntry(entry.id, 'text', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {jdEntries.length < BATCH_TAILOR_MAX && (
              <button type="button" onClick={addEntry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary border border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200">
                <Plus className="w-4 h-4" />Add job description
              </button>
            )}
            <button type="button"
              onClick={() => {
                if (dailyUsage?.remaining === 0) {
                  setQuotaDialog(dailyUsage);
                  return;
                }
                handleSubmit();
              }}
              disabled={!canSubmit || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-soft disabled:shadow-none transition-all duration-200">
              {submitting ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />Submitting...</>
              ) : dailyUsage?.remaining === 0 ? (
                <>Daily limit reached. See options</>
              ) : (
                <>Tailor all ({jdEntries.filter(e => e.text.trim().length > 50).length})</>
              )}
            </button>
            <DailyUsageBadge usage={dailyUsage} loading={usageLoading} className="ml-auto" />
          </div>
          {submitError && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="min-w-0">Couldn't submit the batch: {submitError}</p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
              >
                Try again
              </button>
            </div>
          )}
          {dailyUsage?.remaining === 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-warning text-xs font-bold">!</span>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-warning">
                    Daily limit reached: {dailyUsage.limit} of {dailyUsage.limit} used
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Tailoring is capped at {dailyUsage.limit} per UTC day so the AI stays fast and
                    free for everyone. The counter resets at midnight UTC. Need more for an active
                    job-hunt push?
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuotaDialog(dailyUsage)}
                    className="mt-2 text-xs font-semibold text-warning underline underline-offset-2 hover:opacity-80"
                  >
                    Request more →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Results phase - live progress cards */}
      {batchJobs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-bold text-foreground">
                Batch results {isRunning && <span className="font-sans text-xs font-normal text-muted-foreground">({completedCount} of {totalCount} complete)</span>}
              </p>
              {isRunning && (
                <div
                  className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Batch tailoring progress"
                  aria-valuemin={0}
                  aria-valuemax={totalCount}
                  aria-valuenow={completedCount}
                >
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
                </div>
              )}
            </div>
            {!isRunning && (
              <button type="button" onClick={() => { setBatchJobs([]); setJdEntries([{ id: nextId(), title: '', text: '' }]); }}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                Start new batch
              </button>
            )}
          </div>

          <div className="space-y-2">
            {batchJobs.map(job => (
              <div key={job.jobId} className={`rounded-xl border px-5 py-4 transition-all ${
                job.status === 'completed' ? 'border-success/30 bg-success/[0.05]' :
                job.status === 'failed' ? 'border-destructive/30 bg-destructive/[0.05]' :
                'border-border bg-card'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {job.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                    {job.status === 'failed' && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                    {(job.status === 'processing' || job.status === 'queued') && (
                      <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" role="status" aria-label="Tailoring" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <p className={`text-xs ${job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {job.status === 'completed'
                          ? (job.result?.base_selection?.filename
                            ? `Ready · from ${job.result.base_selection.filename}`
                            : 'Ready')
                          : job.status === 'failed' ? (job.error || 'Tailoring failed. Start a new batch to try this role again.')
                          : job.status === 'processing' ? 'Tailoring...' : 'Queued'}
                      </p>
                    </div>
                  </div>
                  {job.status === 'completed' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.sourceUrl && (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-success bg-success/10 border border-success/30 hover:bg-success/15 transition-all"
                          title="Open the original posting to apply"
                        >
                          Apply ↗
                        </a>
                      )}
                      <button onClick={() => handleDownload(job, 'pdf')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-all">
                        <Download className="w-3.5 h-3.5" />PDF
                      </button>
                      <button onClick={() => handleDownload(job, 'docx')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground bg-muted border border-border hover:bg-muted/70 transition-all">
                        <Download className="w-3.5 h-3.5" />DOCX
                      </button>
                      <button
                        onClick={() => handleOpenInEditor(job)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-all"
                        title="Open the tailored resume in a new tab. Edit / regenerate without leaving this batch"
                      >
                        Edit ↗
                      </button>
                    </div>
                  )}
                </div>

                {/* Secondary actions: cover letter + ATS score (lazy - model
                    calls are expensive, so we only generate on click). Each
                    button stays compact until clicked, then expands inline. */}
                {job.status === 'completed' && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
                    {/* Cover letter */}
                    {(!job.coverLetter || job.coverLetter.status === 'idle') && (
                      <button
                        onClick={() => handleGenerateCoverLetter(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-all"
                      >
                        ✍ Cover letter
                      </button>
                    )}
                    {job.coverLetter?.status === 'generating' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-primary/5 border border-primary/20">
                        <span className="inline-block h-3 w-3 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
                        Writing cover letter...
                      </span>
                    )}
                    {job.coverLetter?.status === 'done' && (
                      <button
                        onClick={() => handleDownloadCoverLetter(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-success bg-success/10 border border-success/30 hover:bg-success/15 transition-all"
                        title="Download cover letter as .txt"
                      >
                        <Download className="w-3 h-3" /> Cover letter ready
                      </button>
                    )}
                    {job.coverLetter?.status === 'failed' && (
                      <button
                        onClick={() => handleGenerateCoverLetter(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/30 hover:bg-destructive/15 transition-all"
                      >
                        <X className="w-3 h-3" aria-hidden="true" /> Retry cover letter
                      </button>
                    )}

                    {/* ATS score */}
                    {(!job.atsScores || job.atsScores.status === 'idle') && (
                      <button
                        onClick={() => handleGenerateAts(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-all"
                      >
                        ⓘ Checklist
                      </button>
                    )}
                    {job.atsScores?.status === 'generating' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-primary/5 border border-primary/20">
                        <span className="inline-block h-3 w-3 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
                        Scoring...
                      </span>
                    )}
                    {job.atsScores?.status === 'done' && job.atsScores.data && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          (job.atsScores.data.overall ?? 0) >= 80
                            ? 'text-success bg-success/10 border-success/30'
                            : (job.atsScores.data.overall ?? 0) >= 60
                            ? 'text-warning bg-warning/10 border-warning/30'
                            : 'text-destructive bg-destructive/10 border-destructive/30'
                        }`}
                        title={`Checklist · keyword ${job.atsScores.data.keyword_match ?? '?'} · format ${job.atsScores.data.format_score ?? '?'}`}
                      >
                        Checklist {Math.round(job.atsScores.data.overall ?? 0)}
                      </span>
                    )}
                    {job.atsScores?.status === 'failed' && (
                      <button
                        onClick={() => handleGenerateAts(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/30 hover:bg-destructive/15 transition-all"
                      >
                        <X className="w-3 h-3" aria-hidden="true" /> Retry checklist
                      </button>
                    )}
                  </div>
                )}

                {job.status === 'completed' && job.result?.tailored_resume?.ats_keyword_audit?.required_missing?.length ? (
                  <p className="mt-2 text-[11px] leading-snug text-warning">
                    ⚠ {job.result.tailored_resume.ats_keyword_audit.required_missing.length} required JD keyword
                    {job.result.tailored_resume.ats_keyword_audit.required_missing.length === 1 ? '' : 's'} not in resume:{' '}
                    <span className="font-mono text-[10.5px]">
                      {job.result.tailored_resume.ats_keyword_audit.required_missing.slice(0, 6).join(', ')}
                      {job.result.tailored_resume.ats_keyword_audit.required_missing.length > 6 ? '...' : ''}
                    </span>
                  </p>
                ) : null}

                {/* Did-you-apply prompt - shown only while the batch row is
                    still pending confirmation. Three exits: applied (syncs
                    Daily Pipeline saved_job → applied + ticks streak), Not
                    yet (keeps as Interested for later confirm from kanban),
                    Dismiss (same as Not yet, just clears the prompt). */}
                {job.status === 'completed'
                  && job.result?.record_id
                  && !job.applicationStatus
                  && (
                  <div className="mt-3 rounded-lg border border-success/30 bg-success/[0.04] px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-success">
                        Did you apply to <b>{job.title}</b>?
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmApplied(job)}
                          disabled={job.confirming}
                          className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success hover:bg-success/25 disabled:opacity-60"
                        >
                          ✓ I applied
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmNotYet(job, 'Not yet')}
                          disabled={job.confirming}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-60"
                        >
                          Not yet
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmNotYet(job, 'Dismiss')}
                          disabled={job.confirming}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      "I applied" syncs the Daily Pipeline, your Applications board, and today's streak.
                    </p>
                  </div>
                )}
                {job.applicationStatus === 'applied' && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                    ✓ Marked applied. Synced everywhere
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <QuotaLimitDialog
        open={!!quotaDialog}
        onOpenChange={(o) => !o && setQuotaDialog(null)}
        usage={quotaDialog}
        onRequestMore={() =>
          feedback.open({
            type: 'quota_bump',
            prefill:
              "Hi, I tried to run a batch of " +
              `${quotaDialog?.requested ?? ''} tailors and hit my daily limit. ` +
              "Could you bump it? Quick context:\n\n",
          })
        }
      />
    </div>
  );
}
