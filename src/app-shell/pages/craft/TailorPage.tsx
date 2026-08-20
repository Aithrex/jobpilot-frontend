/**
 * TailorPage - the flagship "Tailor" tool in the Craft section
 * (lazy-mounted at /app/resume/tailor by the app shell).
 *
 * Extracted from the ResumeParser monolith and rebuilt on the design system:
 * semantic tokens, shadcn primitives, a REAL backend-driven progress indicator
 * (see the phase state machine below - no more wall-clock guessing), unified
 * 403-upgrade + 429-quota gating, and visible failures (no silent catch{}).
 *
 * Orchestrator pattern (mirrors TodayPage): this component owns ALL state,
 * refs, and apiService calls; the `tailor/*` children are presentational and
 * receive typed slices + callbacks.
 */
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  FileText,
  FileDown,
  Sparkles,
  PencilLine,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService, VERSION_LIMIT_MESSAGE } from '@/lib/api';
import { useDailyUsage, type DailyUsage } from '@/hooks/useDailyUsage';
import { useFeedback } from '@/components/feedback/FeedbackWidget';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { QuotaLimitDialog } from '@/components/quota/QuotaLimitDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelError } from '@/app-shell/pages/today/primitives';
import { SmartFiltersInline } from '@/components/job-search/SmartFiltersInline';
import OnboardingHero from '@/components/resume/OnboardingHero';
import { buildCoverLetterFilename } from '@/lib/filename';
import {
  consumeBatchHandoff,
  readBatchHandoffIdFromUrl,
  clearBatchHandoffFromUrl,
  consumePendingTailorJob,
  onNavigateToTailor,
  cacheJdText,
  readCachedJdText,
} from '@/lib/craftHandoff';
import {
  clearActiveTailorSession,
  getActiveTailorSession,
  setActiveTailorSession,
} from '@/lib/activeTailorSession';
import type {
  TailoredFullResume,
  JDAnalysis,
  ATSScores,
  TailorPipelineResult,
  InspectorTabKey,
  PreviewMode,
  TailorPhase,
  VersionEntry,
} from './tailor/types';
import { PHASE_ORDER } from './tailor/types';
import type { ReviewDecision } from './tailor/types';
import { ReviewPanel } from './tailor/ReviewPanel';
import {
  replaceBulletText,
  removeBulletAt,
  addSkillToCategory,
  inferSkillCategory,
} from '@/lib/resumeMutations';
import { resolveAnchor } from '@/lib/reviewAnchors';
import { similarity, bestMatch } from '@/lib/textDiff';
import { ProgressStepper } from './tailor/ProgressStepper';
import { NudgeBar } from './tailor/NudgeBar';
import { ResumePreviewFrame } from './tailor/ResumePreviewFrame';
import { InspectorTabs } from './tailor/InspectorTabs';
import { JdInputPanel } from './tailor/JdInputPanel';
import { AtsScorePanel } from './tailor/AtsScorePanel';
import { RegeneratePanel } from './tailor/RegeneratePanel';
import { CoverLetterPanel } from './tailor/CoverLetterPanel';

const ResumeEditor = lazy(() => import('@/components/resume/ResumeEditor'));

export default function TailorPage() {
  const reduceMotion = useReducedMotion();
  const [hasResumes, setHasResumes] = useState<boolean | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [resumeLoadError, setResumeLoadError] = useState('');
  const [jdText, setJdText] = useState('');

  const { usage: dailyUsage, loading: usageLoading, refresh: refreshUsage, applyUsage } =
    useDailyUsage();
  const [quotaDialog, setQuotaDialog] = useState<
    (DailyUsage & { requested?: number }) | null
  >(null);
  const feedback = useFeedback();
  const upgrade = useUpgrade();

  const [pendingJobUrl, setPendingJobUrl] = useState('');
  const [retryingJdFetch, setRetryingJdFetch] = useState(false);

  // Real tailoring phase - null = idle. Driven by backend job status +
  // the honest progress markers the backend writes at each pipeline stage.
  const [phase, setPhase] = useState<TailorPhase | null>(null);
  const [tailorPct, setTailorPct] = useState<number | null>(null);
  const [tailorError, setTailorError] = useState('');
  const [result, setResult] = useState<TailorPipelineResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  // ATS scoring failed - surfaced beside the ATS panel with a manual retry
  // (scoring used to fail silently, leaving users staring at a spinnerless gap).
  const [atsError, setAtsError] = useState('');
  const [tailorElapsed, setTailorElapsed] = useState(0);

  // The parsed BASE resume (arrives with the tailor result) - powers the
  // Base preview segment, diff-vs-base, and "Restore original" in review.
  const [baseResume, setBaseResume] = useState<TailoredFullResume | null>(null);
  // Per-claim review decisions (keyed by structural address).
  const [reviewDecisions, setReviewDecisions] = useState<
    Record<string, ReviewDecision>
  >({});
  // The displayed ATS score no longer matches the edited resume.
  const [scoreStale, setScoreStale] = useState(false);

  const tailorAbortRef = useRef<AbortController | null>(null);
  const atsAbortRef = useRef<AbortController | null>(null);
  const tailorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordIdRef = useRef<string | null>(null);
  const pendingJobIdRef = useRef<string | null>(null);
  // Resume Platform v3: base rows are identified by resume_id (no s3_key).
  const activeResumeRef = useRef<{ filename: string; resume_id: string } | null>(null);
  const atsAutoTriggered = useRef(false);

  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);
  const [editing, setEditing] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const [regenFeedback, setRegenFeedback] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [previousResume, setPreviousResume] = useState<TailoredFullResume | null>(null);
  const [regenView, setRegenView] = useState<PreviewMode>('tailored');
  const regenAbortRef = useRef<AbortController | null>(null);

  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const coverLetterAbortRef = useRef<AbortController | null>(null);
  const coverLetterInFlightRef = useRef(false);
  const [coverLetterDownloading, setCoverLetterDownloading] = useState(false);

  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
  const [inspectorTab, setInspectorTab] = useState<InspectorTabKey>('jd');
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

  /* ── Handoffs (via the shared craftHandoff helper) ───────────────────────── */

  // Batch Tailor → Tailor (new tab): read a staged batch result and open it.
  useEffect(() => {
    const batchId = readBatchHandoffIdFromUrl();
    if (!batchId) return;
    const payload = consumeBatchHandoff(batchId);
    if (!payload) return;
    setResult({
      tailored_resume: payload.tailored_resume,
      jd_analysis: payload.jd_analysis,
    });
    setEditing(true);
    if (payload.title) {
      toast.success(`Loaded ${payload.title} from Batch Tailor. Edit and re-download.`);
    }
    clearBatchHandoffFromUrl();
  }, []);

  // Daily Pipeline → Tailor (same tab): consume a staged tailor job, both on
  // mount and whenever the navigate-to-tailor event fires.
  const applyPendingTailorJob = useCallback(() => {
    const job = consumePendingTailorJob();
    if (!job) return;
    pendingJobIdRef.current = job.job_id;
    if (job.jd_text) setJdText(job.jd_text);
    if (job.url) setPendingJobUrl(job.url);
    if (job.title || job.company) {
      toast.info(
        `Tailoring for ${job.title || ''}${job.company ? ' @ ' + job.company : ''}. We’ll ask if you applied when you return to Jobs`,
      );
    }
    if (job.jd_fetch_failed) {
      toast.warning(
        job.url
          ? `Couldn't auto-fetch this JD. Opening the posting in a new tab and pasting it works, OR click "Retry JD fetch" beside the textarea.`
          : "Couldn't auto-fetch this JD. Please copy-paste it from the posting into the box below.",
        { duration: 8000 },
      );
      if (job.url) {
        const cached = readCachedJdText(job.url);
        if (cached) {
          setJdText(cached);
          toast.success('JD recovered from session cache.');
          return;
        }
        apiService
          .fetchJobDescription(job.url)
          .then((r) => {
            if (r.data?.ok && r.data.jd_text) {
              setJdText(r.data.jd_text);
              cacheJdText(job.url!, r.data.jd_text);
              toast.success('JD auto-fetched on retry. Review and tailor.');
            }
          })
          .catch(() => {
            /* silent - user has the manual Retry button */
          });
      }
    } else if (job.jd_text && job.url) {
      cacheJdText(job.url, job.jd_text);
    }
  }, []);

  useEffect(() => {
    applyPendingTailorJob();
  }, [applyPendingTailorJob]);

  useEffect(() => onNavigateToTailor(applyPendingTailorJob), [applyPendingTailorJob]);

  /* ── Resume presence check ───────────────────────────────────────────────── */
  const checkResumes = useCallback(async () => {
    setLoadingCheck(true);
    setResumeLoadError('');
    const resp = await apiService.listBaseResumes();
    if (resp.data) {
      const baseVersions = resp.data.versions || [];
      const active = baseVersions.find((v) => v.is_active);
      if (active) {
        activeResumeRef.current = { filename: active.filename, resume_id: active.resume_id };
      }
      if (baseVersions.length > 0) {
        // Base files exist - /status re-parses from S3 if the parsed doc is
        // missing, but we show the tailor UI regardless.
        await apiService.getResumeStatus();
        setHasResumes(true);
      } else {
        setHasResumes(false);
      }
    } else {
      const isAuthError =
        (resp.error || '').toLowerCase().includes('session expired') ||
        (resp.error || '').includes('401');
      if (isAuthError) {
        setResumeLoadError('Your session expired. Please log in again.');
      } else {
        const s = await apiService.getResumeStatus();
        if (s.data) {
          setHasResumes(s.data.has_resume === true || s.data.has_base_file === true);
        } else {
          setResumeLoadError(
            s.error || resp.error || 'Unable to load your resumes right now.',
          );
        }
      }
    }
    setLoadingCheck(false);
  }, []);

  useEffect(() => {
    checkResumes();
  }, [checkResumes]);

  useEffect(
    () => () => {
      tailorAbortRef.current?.abort();
      atsAbortRef.current?.abort();
      regenAbortRef.current?.abort();
      coverLetterAbortRef.current?.abort();
      if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
    },
    [],
  );

  /* ── Record persistence (now surfaces failures) ──────────────────────────── */
  // Resume Platform v3: the tailor worker persists the record itself and
  // echoes record_id in the job result - echo it back so save-record settles
  // idempotently (attaches ats_scores + fires the streak, never duplicates).
  const saveRecord = useCallback(
    async (
      jdAnalysisData: JDAnalysis,
      tailoredResume: TailoredFullResume,
      jdRawText: string,
      atsScores?: ATSScores,
      workerRecordId?: string,
    ) => {
      try {
        const resp = await apiService.saveTailoringRecord({
          record_id: workerRecordId || recordIdRef.current || undefined,
          jd_text: jdRawText,
          jd_analysis: jdAnalysisData,
          tailored_resume: tailoredResume,
          ats_scores: atsScores || undefined,
          base_resume_filename: activeResumeRef.current?.filename || '',
          source_job_id: pendingJobIdRef.current || undefined,
        });
        if (resp.error) {
          // The worker-persisted record exists server-side even though the
          // settle failed - keep the id so downloads/regens still attach.
          if (workerRecordId) recordIdRef.current = workerRecordId;
          toast.error("Couldn't save this tailoring to your history", {
            description: resp.error,
          });
          return;
        }
        if (resp.data?.record_id) {
          const isNewRecord = !recordIdRef.current;
          recordIdRef.current = resp.data.record_id;
          if (isNewRecord) {
            window.dispatchEvent(new CustomEvent('resume:application-saved'));
          }
        }
      } catch {
        toast.error("Couldn't save this tailoring to your history");
      }
    },
    [],
  );

  const updateRecordATS = useCallback(async (atsScores: ATSScores) => {
    if (!recordIdRef.current) return;
    try {
      const resp = await apiService.saveTailoringRecord({
        record_id: recordIdRef.current,
        ats_scores: atsScores,
      });
      if (resp.error) {
        toast.error("Couldn't save the ATS score to your history");
      }
    } catch {
      toast.error("Couldn't save the ATS score to your history");
    }
  }, []);

  /* ── ATS scoring - shared by the auto-trigger and the manual retry ───────── */
  const runAtsScoring = useCallback(
    (res: TailorPipelineResult) => {
      const ctrl = new AbortController();
      atsAbortRef.current = ctrl;
      setAtsLoading(true);
      setAtsError('');
      apiService
        .fetchATSScores(res.tailored_resume, res.jd_analysis, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setAtsLoading(false);
          if (r.data?.ats_scores) {
            setResult((p) => (p ? { ...p, ats_scores: r.data!.ats_scores } : p));
            updateRecordATS(r.data.ats_scores);
            setScoreStale(false);
            // Flagged claims outrank the score: send the user to review
            // first when anything UNSUPPORTED is waiting on them.
            const unsupported =
              res.tailored_resume.verification?.counts.unsupported ?? 0;
            setInspectorTab(unsupported > 0 ? 'review' : 'ats');
          } else {
            setAtsError(r.error || "Couldn't score this resume against the JD.");
          }
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setAtsLoading(false);
          setAtsError('Network issue while scoring. Check your connection.');
        });
    },
    [updateRecordATS],
  );

  /* ── Auto-trigger ATS scoring once a tailored result lands ───────────────── */
  useEffect(() => {
    if (result && !result.ats_scores && !atsLoading && !atsAutoTriggered.current) {
      atsAutoTriggered.current = true;
      const t = setTimeout(() => runAtsScoring(result), 500);
      return () => clearTimeout(t);
    }
  }, [result, atsLoading, runAtsScoring]);

  /* ── The tailoring flow - real phase transitions, no fake timer ──────────── */
  const handleTailoring = useCallback(async () => {
    if (!jdText.trim()) return;
    tailorAbortRef.current?.abort();
    const ctrl = new AbortController();
    tailorAbortRef.current = ctrl;

    const prevSession = getActiveTailorSession();
    setActiveTailorSession({
      sourceJobId: pendingJobIdRef.current || prevSession?.sourceJobId || 'manual',
      title: prevSession?.title,
      company: prevSession?.company,
      backendJobId: prevSession?.backendJobId,
      status: 'running',
    });

    setPhase('submitting');
    setTailorPct(null);
    setTailorError('');
    setAtsError('');
    setResult(null);
    setTailorElapsed(0);
    tailorTimerRef.current = setInterval(() => setTailorElapsed((p) => p + 1), 1000);

    const cleanup = () => {
      if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
      tailorTimerRef.current = null;
      setPhase(null);
      setTailorPct(null);
      setTailorElapsed(0);
    };

    // Monotonic phase advance - polls can arrive out of order or skip fast
    // phases entirely; never step backwards, ignore unknown phase strings
    // (forward-compat with newer backends).
    const advancePhase = (next: TailorPhase) => {
      const order = PHASE_ORDER[next];
      if (order === undefined) return;
      setPhase((prev) =>
        prev === null || order >= (PHASE_ORDER[prev] ?? 0) ? next : prev,
      );
    };

    // Combined extract-jd + tailor in ONE backend job. onStatus reports the
    // real queued→processing transition; onProgress delivers the honest
    // per-stage markers (extracting_jd → tailoring → augmenting → ...).
    const combined = await apiService.tailorResumeWithJDText(
      jdText.trim(),
      ctrl.signal,
      (status) => {
        // Floor: even if an older backend never writes progress markers,
        // "processing" honestly means the JD extraction has started.
        advancePhase(status === 'queued' ? 'queued' : 'extracting_jd');
      },
      (p) => {
        advancePhase(p.phase);
        if (typeof p.pct === 'number') setTailorPct(p.pct);
      },
      pendingJobIdRef.current || undefined,
      (backendJobId) => {
        const prev = getActiveTailorSession();
        setActiveTailorSession({
          sourceJobId: pendingJobIdRef.current || prev?.sourceJobId || 'manual',
          title: prev?.title,
          company: prev?.company,
          backendJobId,
          status: 'running',
        });
      },
    );

    if (ctrl.signal.aborted) {
      cleanup();
      // Leave activeTailorSession running — Jobs banner keeps polling the worker.
      return;
    }
    cleanup();

    if (combined.error) {
      const prev = getActiveTailorSession();
      if (prev) {
        setActiveTailorSession({
          ...prev,
          status: 'error',
          error: combined.error,
        });
      }
      if (combined.status === 403) {
        upgrade.open({
          feature: 'tailor',
          title: 'Unlock more tailoring',
          description: 'Upgrade to keep tailoring resumes to every role you apply to.',
        });
        setTailorError('');
        return;
      }
      if (
        combined.status === 429 &&
        (combined.errorPayload as { error?: string } | undefined)?.error ===
          'daily_quota_exceeded'
      ) {
        const u = (combined.errorPayload as { usage: DailyUsage }).usage;
        applyUsage(u);
        setQuotaDialog(u);
        setTailorError('');
        return;
      }
      setTailorError(combined.error);
      return;
    }
    if (!combined.data?.jd_analysis || !combined.data?.tailored_resume) {
      setTailorError('Failed to tailor resume.');
      const prev = getActiveTailorSession();
      if (prev) {
        setActiveTailorSession({
          ...prev,
          status: 'error',
          error: 'Failed to tailor resume.',
        });
      }
      return;
    }
    refreshUsage();

    const analysis = combined.data.jd_analysis;
    const tailoredResume = combined.data.tailored_resume;
    setResult({ jd_analysis: analysis, tailored_resume: tailoredResume });
    if (combined.data.base_resume) setBaseResume(combined.data.base_resume);
    setReviewDecisions({});
    setScoreStale(false);
    setVersions([
      {
        id: `v1-${Date.now()}`,
        resume: tailoredResume,
        label: 'Initial tailoring',
        timestamp: Date.now(),
      },
    ]);
    const prev = getActiveTailorSession();
    setActiveTailorSession({
      sourceJobId: pendingJobIdRef.current || prev?.sourceJobId || 'manual',
      title: prev?.title,
      company: prev?.company,
      backendJobId: prev?.backendJobId,
      status: 'ready',
    });
    await saveRecord(
      analysis,
      tailoredResume,
      jdText,
      undefined,
      combined.data.record_id,
    );
  }, [jdText, saveRecord, applyUsage, refreshUsage, upgrade]);

  const handleCancel = useCallback(() => {
    tailorAbortRef.current?.abort();
    if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
    tailorTimerRef.current = null;
    setPhase(null);
    setTailorElapsed(0);
    clearActiveTailorSession();
  }, []);

  /* ── Downloads ───────────────────────────────────────────────────────────── */
  const handleDownload = useCallback(
    async (fmt: 'pdf' | 'docx') => {
      if (!result) return;
      setDownloading(fmt);
      const r = await apiService.downloadTailoredResume(
        result.tailored_resume,
        result.jd_analysis,
        fmt,
        {
          recordId: recordIdRef.current || undefined,
          source: 'edited',
          autoSaveOnEdit: true,
        },
      );
      setDownloading(null);
      if (r.error) {
        toast.error('Download failed', { description: r.error });
        return;
      }
      if (r.data) {
        const u = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = u;
        a.download = r.filename || `resume.${fmt}`;
        a.click();
        URL.revokeObjectURL(u);
        toast.success(`Resume downloaded as ${fmt.toUpperCase()}`);
      }
    },
    [result],
  );

  /* ── Regenerate ──────────────────────────────────────────────────────────── */
  const handleRegenerate = useCallback(async () => {
    if (!result || !regenFeedback.trim()) return;
    regenAbortRef.current?.abort();
    const ctrl = new AbortController();
    regenAbortRef.current = ctrl;
    setRegenerating(true);
    setRegenError('');

    const resp = await apiService.regenerateResume(
      result.tailored_resume,
      result.jd_analysis,
      regenFeedback.trim(),
      ctrl.signal,
      // Naming the record lets the backend refuse the 6th version up front
      // (409 version_limit_reached) before spending an LLM call.
      recordIdRef.current || undefined,
    );

    if (ctrl.signal.aborted) {
      setRegenerating(false);
      return;
    }
    setRegenerating(false);

    if (resp.error) {
      if (
        resp.status === 409 &&
        (resp.errorPayload as { error?: string } | undefined)?.error ===
          'version_limit_reached'
      ) {
        setRegenError(VERSION_LIMIT_MESSAGE);
        toast.error('Version limit reached', { description: VERSION_LIMIT_MESSAGE });
        return;
      }
      if (resp.status === 403) {
        upgrade.open({
          feature: 'tailor',
          title: 'Unlock more regenerations',
          description: 'Upgrade to keep refining your tailored resumes.',
        });
        setRegenError('');
        return;
      }
      setRegenError(resp.error);
      toast.error('Regeneration failed', { description: resp.error });
      return;
    }
    if (resp.data?.tailored_resume) {
      if (result?.tailored_resume) setPreviousResume(result.tailored_resume);
      setResult((prev) =>
        prev
          ? { ...prev, tailored_resume: resp.data!.tailored_resume, ats_scores: undefined }
          : prev,
      );
      const feedbackSnippet = regenFeedback.trim().slice(0, 60);
      setVersions((v) => [
        {
          id: `v${v.length + 1}-${Date.now()}`,
          resume: resp.data!.tailored_resume,
          label: feedbackSnippet || `Regeneration ${v.length + 1}`,
          timestamp: Date.now(),
        },
        ...v,
      ]);
      if (recordIdRef.current) {
        apiService
          .saveResumeVersion(recordIdRef.current, {
            tailored_resume: resp.data!.tailored_resume,
            source: 'regenerated',
            user_feedback: regenFeedback.trim() || undefined,
            set_current: true,
          })
          .then((r) => {
            if (r.error) {
              const capped =
                r.status === 409 &&
                (r.errorPayload as { error?: string } | undefined)?.error ===
                  'version_limit_reached';
              toast.error(
                capped ? 'Version limit reached' : "Couldn't save this version to your history",
                { description: capped ? VERSION_LIMIT_MESSAGE : r.error },
              );
            }
          })
          .catch(() => {
            toast.error("Couldn't save this version to your history");
          });
      }
      setRegenFeedback('');
      setRegenView('tailored');
      setInspectorTab('ats');
      toast.success('Resume regenerated. Previous version kept for comparison');
      atsAutoTriggered.current = false;
    }
  }, [result, regenFeedback, upgrade]);

  /* ── Cover letter ────────────────────────────────────────────────────────── */
  const handleCoverLetter = useCallback(async () => {
    if (!result || coverLetterInFlightRef.current) return;
    coverLetterInFlightRef.current = true;
    const ctrl = new AbortController();
    coverLetterAbortRef.current = ctrl;
    setCoverLetterLoading(true);
    try {
      const resp = await apiService.generateCoverLetter(
        result.tailored_resume,
        result.jd_analysis,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      if (resp.error) {
        if (resp.status === 403) {
          upgrade.open({
            feature: 'cover_letter',
            title: 'Unlock cover letters',
            description: 'Upgrade to generate a tailored cover letter for every role.',
          });
          return;
        }
        toast.error('Cover letter generation failed', { description: resp.error });
        return;
      }
      if (resp.data?.cover_letter) {
        setCoverLetter(resp.data.cover_letter);
        toast.success('Cover letter generated');
      }
    } finally {
      coverLetterInFlightRef.current = false;
      setCoverLetterLoading(false);
    }
  }, [result, upgrade]);

  const handleDownloadCoverLetter = useCallback(async () => {
    if (!coverLetter || !result) return;
    setCoverLetterDownloading(true);
    const company =
      result.jd_analysis.company && result.jd_analysis.company !== 'Not specified'
        ? result.jd_analysis.company
        : '';
    const r = await apiService.downloadCoverLetterPDF(
      coverLetter,
      result.tailored_resume.contact?.name || '',
      result.jd_analysis.job_title || '',
      company,
    );
    setCoverLetterDownloading(false);
    if (r.error) {
      toast.error('Download failed', { description: r.error });
      return;
    }
    if (r.data) {
      const u = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = u;
      a.download =
        r.filename ||
        buildCoverLetterFilename(
          result.tailored_resume.contact?.name || '',
          result.jd_analysis.job_title || '',
          'pdf',
        );
      a.click();
      URL.revokeObjectURL(u);
      toast.success('Cover letter downloaded');
    }
  }, [coverLetter, result]);

  /* ── Claim review (human-in-the-loop) + score staleness ──────────────────── */

  // Apply an immutable mutation to the working resume and mark the score
  // stale - the displayed ATS numbers describe the pre-edit document.
  const mutateResume = useCallback(
    (fn: (r: TailoredFullResume) => TailoredFullResume) => {
      setResult((prev) =>
        prev ? { ...prev, tailored_resume: fn(prev.tailored_resume) } : prev,
      );
      setScoreStale(true);
    },
    [],
  );

  const decideReview = useCallback((address: string, decision: ReviewDecision) => {
    setReviewDecisions((prev) => ({ ...prev, [address]: decision }));
  }, []);

  const handleReviewAccept = useCallback(
    (address: string) => decideReview(address, 'accepted'),
    [decideReview],
  );

  const handleReviewRemove = useCallback(
    (address: string) => {
      const item = result?.tailored_resume.verification?.items[address];
      if (!item || !result) return;
      const anchor = resolveAnchor(result.tailored_resume, address, item.text);
      if (!anchor) {
        // Text no longer exists - the user already rewrote it themselves.
        decideReview(address, 'edited');
        return;
      }
      mutateResume((r) =>
        removeBulletAt(r, anchor.section, anchor.itemIndex, anchor.bulletIndex),
      );
      decideReview(address, 'removed');
      toast.success('Bullet removed');
    },
    [result, mutateResume, decideReview],
  );

  const handleReviewRestore = useCallback(
    (address: string) => {
      const item = result?.tailored_resume.verification?.items[address];
      if (!item || !result || !baseResume) return;
      const anchor = resolveAnchor(result.tailored_resume, address, item.text);
      if (!anchor) {
        decideReview(address, 'edited');
        return;
      }
      // Nearest original bullet from the SAME section of the base resume.
      const candidates = (baseResume[anchor.section] || []).flatMap(
        (entry) => entry.bullets || [],
      );
      const original = bestMatch(item.text, candidates, 0.35);
      if (original) {
        mutateResume((r) =>
          replaceBulletText(
            r, anchor.section, anchor.itemIndex, anchor.bulletIndex, original,
          ),
        );
        decideReview(address, 'restored');
        toast.success('Restored your original wording');
      } else {
        mutateResume((r) =>
          removeBulletAt(r, anchor.section, anchor.itemIndex, anchor.bulletIndex),
        );
        decideReview(address, 'removed');
        toast.success('No matching original. Bullet removed');
      }
    },
    [result, baseResume, mutateResume, decideReview],
  );

  const handleReviewEdit = useCallback(
    (address: string, text: string) => {
      const item = result?.tailored_resume.verification?.items[address];
      if (!item || !result || !text.trim()) return;
      const anchor = resolveAnchor(result.tailored_resume, address, item.text);
      if (!anchor) {
        decideReview(address, 'edited');
        return;
      }
      mutateResume((r) =>
        replaceBulletText(
          r, anchor.section, anchor.itemIndex, anchor.bulletIndex, text.trim(),
        ),
      );
      decideReview(address, 'edited');
    },
    [result, mutateResume, decideReview],
  );

  // Manual re-score (scores are paid render+LLM jobs - never automatic on
  // every edit). Clearing ats_scores re-arms the auto-score effect.
  const handleRescore = useCallback(() => {
    if (atsLoading) return;
    setResult((prev) => (prev ? { ...prev, ats_scores: undefined } : prev));
    atsAutoTriggered.current = false;
    setScoreStale(false);
    setAtsError('');
  }, [atsLoading]);

  /* ── Version + keyword + new-session helpers ─────────────────────────────── */
  const handleAddKeyword = useCallback(
    (kw: string) => {
      setResult((prev) => {
        if (!prev) return prev;
        const category = inferSkillCategory(prev.tailored_resume, kw, similarity);
        return {
          ...prev,
          tailored_resume: addSkillToCategory(prev.tailored_resume, category, kw),
        };
      });
      setScoreStale(true);
      setAddedKeywords((prev) => new Set(prev).add(kw));
      toast.success(`Added "${kw}" to your skills`);
    },
    [],
  );

  const handleRestoreVersion = useCallback((version: VersionEntry) => {
    setResult((prev) =>
      prev ? { ...prev, tailored_resume: version.resume, ats_scores: undefined } : prev,
    );
    setPreviousResume(null);
    setRegenView('tailored');
    setReviewDecisions({});
    setScoreStale(false);
    atsAutoTriggered.current = false;
    toast.success(`Restored "${version.label}"`);
  }, []);

  const handleRevert = useCallback(() => {
    if (!previousResume) return;
    setResult((prev) =>
      prev ? { ...prev, tailored_resume: previousResume, ats_scores: undefined } : prev,
    );
    setPreviousResume(null);
    setRegenView('tailored');
    setReviewDecisions({});
    setScoreStale(false);
    atsAutoTriggered.current = false;
    toast.success('Reverted to previous version');
  }, [previousResume]);

  const handleStartNew = useCallback(() => {
    setJdText('');
    setResult(null);
    setTailorError('');
    setAtsLoading(false);
    setAtsError('');
    setEditing(false);
    setRegenFeedback('');
    setRegenerating(false);
    setRegenError('');
    setPreviousResume(null);
    setRegenView('tailored');
    setCoverLetter(null);
    setCoverLetterLoading(false);
    coverLetterInFlightRef.current = false;
    coverLetterAbortRef.current?.abort();
    setAddedKeywords(new Set());
    setInspectorTab('jd');
    setDownloadMenuOpen(false);
    setVersions([]);
    setDismissedNudges(new Set());
    setReviewDecisions({});
    setScoreStale(false);
    recordIdRef.current = null;
    atsAutoTriggered.current = false;
  }, []);

  const handleRetryFetch = useCallback(async () => {
    if (!pendingJobUrl || retryingJdFetch) return;
    setRetryingJdFetch(true);
    const fetching = toast.loading('Fetching JD...', { duration: 50000 });
    try {
      const r = await apiService.fetchJobDescription(pendingJobUrl);
      toast.dismiss(fetching);
      if (r.data?.ok && r.data.jd_text) {
        setJdText(r.data.jd_text);
        cacheJdText(pendingJobUrl, r.data.jd_text);
        toast.success('JD fetched. Review and tailor.');
      } else {
        toast.warning(
          r.data?.error || "Still couldn't fetch. Open the posting and paste manually.",
          { duration: 8000 },
        );
      }
    } catch {
      toast.dismiss(fetching);
      toast.error('Network issue. Try again or paste manually.');
    } finally {
      setRetryingJdFetch(false);
    }
  }, [pendingJobUrl, retryingJdFetch]);

  /* ── Guard states ────────────────────────────────────────────────────────── */
  if (loadingCheck) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-container" />
        <Skeleton className="h-48 rounded-container" />
      </div>
    );
  }
  if (resumeLoadError) {
    return <PanelError title="Couldn't load your resumes" body={resumeLoadError} onRetry={checkResumes} />;
  }
  if (hasResumes === false) {
    return <OnboardingHero onUploaded={() => setHasResumes(true)} />;
  }

  const currentStep: 1 | 2 | 3 = result ? 3 : jdText.trim().length > 20 ? 2 : 1;
  const tailoring = phase !== null;

  // Flagged claims still waiting on a user decision (drives the Review badge).
  const verificationItems = result?.tailored_resume.verification?.items ?? {};
  const pendingFlagged = Object.entries(verificationItems).filter(
    ([addr, item]) =>
      (item.verdict === 'UNSUPPORTED' || item.verdict === 'PARTIAL') &&
      !reviewDecisions[addr],
  );
  const reviewPendingCount = pendingFlagged.length;
  const reviewHasUnsupported = pendingFlagged.some(
    ([, item]) => item.verdict === 'UNSUPPORTED',
  );

  return (
    <div className="space-y-5">
      {/* StreakWidget moved to the Resume overview panel (`/app/resume`): a
          per-account stat belongs on the section landing, not buried inside
          one tool. */}
      {/* APIFY DISABLED (temporary): <SmartFiltersInline /> feeds the hidden Apify pipeline. Restore to re-enable. */}

      <ProgressStepper currentStep={currentStep} />

      {tailorError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-container border border-destructive/30 bg-destructive/10 px-5 py-4"
        >
          <p className="text-sm text-destructive">{tailorError}</p>
        </div>
      )}

      <NudgeBar
        result={result}
        versionsCount={versions.length}
        coverLetter={coverLetter}
        coverLetterLoading={coverLetterLoading}
        dismissedNudges={dismissedNudges}
        onDismiss={(id) => setDismissedNudges((s) => new Set(s).add(id))}
        onDownload={() => handleDownload('pdf')}
        onReviewAts={() => setInspectorTab('ats')}
        onGenerateCoverLetter={() => {
          setInspectorTab('cover');
          setTimeout(handleCoverLetter, 300);
        }}
      />

      {/* Split view */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label="Resume preview">
          <ResumePreviewFrame
            result={result}
            baseResume={baseResume}
            previousResume={previousResume}
            regenView={regenView}
            onRegenViewChange={setRegenView}
            versions={versions}
            onRestoreVersion={handleRestoreVersion}
            onRevert={handleRevert}
            phase={phase}
            pct={tailorPct}
            elapsedSeconds={tailorElapsed}
            onCancel={handleCancel}
          />
        </section>

        <section className="min-w-0" aria-label="Inspector">
          <InspectorTabs
            active={inspectorTab}
            onChange={setInspectorTab}
            hasResult={!!result}
            atsScore={result?.ats_scores?.overall ?? null}
            atsLoading={atsLoading}
            atsStale={scoreStale}
            reviewPendingCount={reviewPendingCount}
            reviewHasUnsupported={reviewHasUnsupported}
            coverLetterReady={!!coverLetter}
            coverLetterLoading={coverLetterLoading}
            jdPanel={
              <JdInputPanel
                jdText={jdText}
                onJdTextChange={setJdText}
                pendingJobUrl={pendingJobUrl}
                retryingJdFetch={retryingJdFetch}
                onRetryFetch={handleRetryFetch}
                disabled={tailoring}
                result={result}
                onSubmit={handleTailoring}
                onQuotaBlocked={() => setQuotaDialog(dailyUsage)}
                dailyRemaining={dailyUsage?.remaining ?? null}
                usageLoading={usageLoading}
              />
            }
            reviewPanel={
              <ReviewPanel
                resume={result?.tailored_resume ?? null}
                decisions={reviewDecisions}
                hasBaseResume={!!baseResume}
                onAccept={handleReviewAccept}
                onRestore={handleReviewRestore}
                onRemove={handleReviewRemove}
                onEdit={handleReviewEdit}
              />
            }
            atsPanel={
              <div>
                {atsError && !atsLoading && (
                  <div
                    role="alert"
                    className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3"
                  >
                    <p className="min-w-0 flex-1 text-sm text-destructive">
                      {atsError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => result && runAtsScoring(result)}
                      disabled={!result}
                      className="shrink-0"
                    >
                      Score now
                    </Button>
                  </div>
                )}
                <AtsScorePanel
                  scores={result?.ats_scores ?? null}
                  onAddKeyword={handleAddKeyword}
                  addedKeywords={addedKeywords}
                  stale={scoreStale}
                  onRescore={handleRescore}
                  rescoring={atsLoading}
                />
              </div>
            }
            regeneratePanel={
              <RegeneratePanel
                feedback={regenFeedback}
                onFeedbackChange={setRegenFeedback}
                regenerating={regenerating}
                error={regenError}
                onSubmit={handleRegenerate}
              />
            }
            coverPanel={
              <CoverLetterPanel
                coverLetter={coverLetter}
                loading={coverLetterLoading}
                downloading={coverLetterDownloading}
                onGenerate={handleCoverLetter}
                onDownload={handleDownloadCoverLetter}
                onClear={() => setCoverLetter(null)}
                onCopy={() => {
                  if (coverLetter) {
                    navigator.clipboard.writeText(coverLetter);
                    toast.success('Copied to clipboard');
                  }
                }}
                jobTitle={result?.jd_analysis.job_title || ''}
                company={result?.jd_analysis.company || ''}
              />
            }
          />
        </section>
      </div>

      {/* Sticky bottom toolbar. Below lg it sits ABOVE the fixed MobileNav
          (same bottom-0 z-40 otherwise - the tab bar painted over Download);
          offsetting here keeps primary navigation reachable while the result
          actions stay visible. ≥lg the Sidebar owns nav, so bottom-0 is safe. */}
      {result && !editing && (
        <motion.div
          initial={reduceMotion ? false : { y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 30 }
          }
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-border bg-card/90 shadow-float backdrop-blur-xl lg:bottom-0"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-primary/25 bg-primary/10">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-foreground">
                  Your Tailored Resume
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Tailored for{' '}
                  <span className="font-medium text-primary">
                    {result.jd_analysis.job_title}
                  </span>
                  {result.jd_analysis.company &&
                    result.jd_analysis.company !== 'Not specified' && (
                      <>
                        {' '}
                        at{' '}
                        <span className="text-foreground">{result.jd_analysis.company}</span>
                      </>
                    )}
                </p>
              </div>
            </div>

            {result.ats_scores && (
              <div
                className={cn(
                  'hidden shrink-0 items-center gap-2 rounded-control border px-4 py-2 lg:flex',
                  result.ats_scores.overall >= 80
                    ? 'border-success/25 bg-success/10'
                    : result.ats_scores.overall >= 60
                      ? 'border-warning/25 bg-warning/10'
                      : 'border-destructive/25 bg-destructive/10',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 animate-pulse rounded-full',
                    result.ats_scores.overall >= 80
                      ? 'bg-success'
                      : result.ats_scores.overall >= 60
                        ? 'bg-warning'
                        : 'bg-destructive',
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    result.ats_scores.overall >= 80
                      ? 'text-success'
                      : result.ats_scores.overall >= 60
                        ? 'text-warning'
                        : 'text-destructive',
                  )}
                >
                  {result.ats_scores.overall}% ATS Match
                </span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleStartNew} title="Start a new tailor">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">New Tailor</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit the tailored resume">
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Edit</span>
              </Button>
              <div className="mx-0.5 h-6 w-px bg-border" />
              <DropdownMenu open={downloadMenuOpen} onOpenChange={setDownloadMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button disabled={downloading !== null} className="gap-1.5">
                    {downloading !== null ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="hidden sm:inline">Preparing...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Download Resume</span>
                        <span className="sm:hidden">Download</span>
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 opacity-70 transition-transform', downloadMenuOpen && 'rotate-180')}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-64">
                  {(['pdf', 'docx'] as const).map((fmt) => (
                    <DropdownMenuItem
                      key={fmt}
                      disabled={downloading !== null}
                      onSelect={() => handleDownload(fmt)}
                      className="gap-3 py-2.5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-primary/20 bg-primary/10">
                        <FileDown className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">
                          Download as {fmt.toUpperCase()}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {fmt === 'pdf' ? 'Best for job applications' : 'Best for further editing'}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>
      )}

      {/* Editor mode - full-screen overlay. A modal Radix Dialog (not a bare
          fixed div) so we get the focus trap, Escape-to-close, aria-modal, and
          body scroll-lock for free. Raw primitives because the shadcn
          DialogContent is a centered card with a baked-in close X that would
          float over the editor chrome. */}
      {result && editing && (
        <RadixDialog.Root open onOpenChange={(open) => !open && setEditing(false)}>
          <RadixDialog.Portal>
            <RadixDialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-background outline-none"
            >
              <RadixDialog.Title className="sr-only">
                Edit your tailored resume
              </RadixDialog.Title>
              <div className="mx-auto max-w-7xl">
                <Suspense
                  fallback={
                    <div className="rounded-container border border-border bg-card p-8">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="mt-3 h-40" />
                    </div>
                  }
                >
                  <ResumeEditor
                    resume={result.tailored_resume}
                    jdAnalysis={result.jd_analysis}
                    recordId={recordIdRef.current || undefined}
                    onBack={() => setEditing(false)}
                    onEditedVersionSaved={(versionId) => {
                      if (recordIdRef.current) {
                        apiService
                          .setCurrentResumeVersion(recordIdRef.current, versionId)
                          .catch(() => {
                            toast.error("Couldn't set the edited version as current");
                          });
                      }
                    }}
                  />
                </Suspense>
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      )}

      <QuotaLimitDialog
        open={!!quotaDialog}
        onOpenChange={(o) => !o && setQuotaDialog(null)}
        usage={quotaDialog}
        onRequestMore={() =>
          feedback.open({
            type: 'quota_bump',
            prefill:
              "Hi, I've hit my daily tailor limit and have an active job-hunt push. " +
              "Could you bump my limit? Here's the context:\n\n",
          })
        }
      />
    </div>
  );
}
