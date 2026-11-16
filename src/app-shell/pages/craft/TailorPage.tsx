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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { userFacingError } from '@/lib/errorCopy';
import { DURATION, EASE_DECELERATE } from '@/lib/motion';
import { apiService, VERSION_LIMIT_MESSAGE } from '@/lib/api';
import { isTrimmedOutcome, resumeTrimDescription } from '@/lib/resumeLayoutSpec';
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
import OnboardingHero from '@/components/resume/OnboardingHero';
import ApplyOutcomeDialog, { type ApplyOutcome } from '@/components/resume/ApplyOutcomeDialog';
import { buildCoverLetterFilename } from '@/lib/filename';
import { formatCivilDay } from '@/lib/applicationDates';
import {
  consumeBatchHandoff,
  readBatchHandoffIdFromUrl,
  clearBatchHandoffFromUrl,
  consumePendingTailorJob,
  onNavigateToTailor,
  cacheJdText,
  readCachedJdText,
} from '@/lib/craftHandoff';
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
import type { ResumeAssetRow, BaseResumeSelection } from '@/types/resume';
import { BaseResumePicker, AUTO_BASE } from './tailor/BaseResumePicker';
import { BaseResumeUsedBanner } from './tailor/BaseResumeUsedBanner';
import {
  replaceBulletText,
  removeBulletAt,
  replaceSummarySentence,
  removeSummarySentence,
  appendBulletOrClause,
} from '@/lib/resumeMutations';
import { resolveAnchor } from '@/lib/reviewAnchors';
import type { EvidenceTarget } from './tailor/MatchGapsPanel';
import { bestMatch } from '@/lib/textDiff';
import { ProgressStepper } from './tailor/ProgressStepper';
import { StartPreview } from './tailor/StartPreview';
import { RecentTailored } from './tailor/RecentTailored';
import { ResumePreviewFrame } from './tailor/ResumePreviewFrame';
import { AiDisclosure } from '@/components/ai/AiDisclosure';
import { InspectorTabs } from './tailor/InspectorTabs';
import { JdInputPanel } from './tailor/JdInputPanel';
import { AtsScoreCard } from './tailor/AtsScoreCard';
import { RegeneratePanel } from './tailor/RegeneratePanel';
import { CoverLetterPanel } from './tailor/CoverLetterPanel';
import { ResumeFormatControls } from './tailor/ResumeFormatControls';
import {
  formatOf,
  loadSavedFormat,
  saveFormat,
  sameFormat,
  type ResumeFormatPreferences,
} from '@/lib/resumeFormat';

const ResumeEditor = lazy(() => import('@/components/resume/ResumeEditor'));

export default function TailorPage() {
  const reduceMotion = useReducedMotion();
  const [hasResumes, setHasResumes] = useState<boolean | null>(null);
  const [parsedResumes, setParsedResumes] = useState<ResumeAssetRow[]>([]);
  const [baseChoice, setBaseChoice] = useState<string>(AUTO_BASE);
  const [baseSelection, setBaseSelection] = useState<BaseResumeSelection | null>(null);
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
  // Format choices (length, spacing, accent, order). Sent with the next
  // tailor; after tailoring, changing one re-fits the resume with no AI call.
  const [formatPrefs, setFormatPrefs] = useState<ResumeFormatPreferences>(() => loadSavedFormat());
  const [reformatting, setReformatting] = useState(false);
  const [atsLoading, setAtsLoading] = useState(false);
  // ATS scoring failed - surfaced beside the ATS panel with a manual retry
  // (scoring used to fail silently, leaving users staring at a spinnerless gap).
  const [atsError, setAtsError] = useState('');
  const [tailorElapsed, setTailorElapsed] = useState(0);

  // The parsed BASE resume (arrives with the tailor result) - powers the
  // Base preview segment, diff-vs-base, and "Restore original" in review.
  const [baseResume, setBaseResume] = useState<TailoredFullResume | null>(null);
  // Read by the scorer without re-creating it: the original resume is scored
  // by the same rules so the result shows before and after.
  const baseResumeRef = useRef<TailoredFullResume | null>(null);
  baseResumeRef.current = baseResume;
  // Per-claim review decisions (keyed by structural address).
  const [reviewDecisions, setReviewDecisions] = useState<
    Record<string, ReviewDecision>
  >({});
  // The displayed ATS score no longer matches the edited resume.
  const [scoreStale, setScoreStale] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const prevOverallRef = useRef<number | null>(null);

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

  // "Did you apply?" — asked once per record, after the first download. Without
  // it a tailored role sits in Draft forever, which is wrong for the common
  // case of tailoring precisely because you're about to apply.
  const [applyPromptOpen, setApplyPromptOpen] = useState(false);
  const [applyPromptSaving, setApplyPromptSaving] = useState(false);
  const applyPromptShownRef = useRef(false);

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

  const [inspectorTab, setInspectorTab] = useState<InspectorTabKey>('jd');
  const [versions, setVersions] = useState<VersionEntry[]>([]);

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
        `Tailoring for ${job.title || 'this role'}${job.company ? ' at ' + job.company : ''}. We'll ask whether you applied when you return to Jobs.`,
      );
    }
    if (job.jd_fetch_failed) {
      toast.warning(
        job.url
          ? "We couldn't read this job posting automatically. Open it and paste the text here, or choose Read the posting again."
          : "We couldn't read this job posting automatically. Please copy it from the posting and paste it into the box.",
        { duration: 8000 },
      );
      if (job.url) {
        const cached = readCachedJdText(job.url);
        if (cached) {
          setJdText(cached);
          toast.success('We recovered the job description.');
          return;
        }
        apiService
          .fetchJobDescription(job.url)
          .then((r) => {
            if (r.data?.ok && r.data.jd_text) {
              setJdText(r.data.jd_text);
              cacheJdText(job.url!, r.data.jd_text);
              toast.success('Job description loaded. Review it, then tailor.');
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
      const parsed = baseVersions.filter((v) => v.parse_status === 'parsed');
      setParsedResumes(parsed);
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
        toast.error("Couldn't save the match score to your history");
      }
    } catch {
      toast.error("Couldn't save the match score to your history");
    }
  }, []);

  /* ── ATS scoring - shared by the auto-trigger and the manual retry ───────── */
  const runAtsScoring = useCallback(
    (res: TailorPipelineResult, opts?: { silent?: boolean }) => {
      atsAbortRef.current?.abort();
      const ctrl = new AbortController();
      atsAbortRef.current = ctrl;
      setAtsLoading(true);
      setAtsError('');
      apiService
        .fetchATSScores(res.tailored_resume, res.jd_analysis, ctrl.signal, {
          sourceResume: baseResumeRef.current,
        })
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setAtsLoading(false);
          if (r.data?.ats_scores) {
            const next = r.data.ats_scores.overall;
            const prev = prevOverallRef.current;
            if (
              opts?.silent &&
              prev != null &&
              typeof next === 'number' &&
              next !== prev
            ) {
              setScoreDelta(next - prev);
            } else if (!opts?.silent) {
              setScoreDelta(null);
            }
            if (typeof next === 'number') prevOverallRef.current = next;
            setResult((p) => (p ? { ...p, ats_scores: r.data!.ats_scores } : p));
            updateRecordATS(r.data.ats_scores);
            setScoreStale(false);
            // The score is the first thing to see. Lines that need a check
            // show as a warning right under it, one click away.
            if (!opts?.silent) setInspectorTab('ats');
          } else {
            setAtsError(r.error || "Couldn't score this resume. Try again.");
          }
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setAtsLoading(false);
          setAtsError("Couldn't reach us to score this resume. Check your connection.");
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

  /* ── Re-score after edits (gradient is honest now; the number may move). ─ */
  useEffect(() => {
    if (!result || !scoreStale || phase !== null) return;
    const t = setTimeout(() => runAtsScoring(result, { silent: true }), 800);
    return () => clearTimeout(t);
  }, [result, scoreStale, phase, runAtsScoring]);

  /* ── The tailoring flow - real phase transitions, no fake timer ──────────── */
  const handleTailoring = useCallback(async () => {
    if (!jdText.trim()) return;
    tailorAbortRef.current?.abort();
    const ctrl = new AbortController();
    tailorAbortRef.current = ctrl;

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
      baseChoice === AUTO_BASE
        ? { selection_mode: 'auto', preferences: formatPrefs }
        : { resume_id: baseChoice, preferences: formatPrefs },
    );

    if (ctrl.signal.aborted) {
      cleanup();
      return;
    }
    cleanup();

    if (combined.error) {
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
      if (combined.status === 404) {
        setTailorError('That resume was not found. Pick another from the list and try again.');
        return;
      }
      if (combined.status === 409) {
        setTailorError(
          'That resume has not finished parsing yet. Wait a moment or pick another.',
        );
        return;
      }
      setTailorError(combined.error);
      return;
    }
    if (!combined.data?.jd_analysis || !combined.data?.tailored_resume) {
      setTailorError('Failed to tailor resume.');
      return;
    }
    refreshUsage();

    const analysis = combined.data.jd_analysis;
    const tailoredResume = combined.data.tailored_resume;
    const selection = combined.data.base_selection || null;
    if (selection) {
      setBaseSelection(selection);
      if (selection.resume_id) {
        activeResumeRef.current = {
          filename: selection.filename || '',
          resume_id: selection.resume_id,
        };
      }
      if (selection.filename) {
        toast.success(`Tailored from ${selection.filename}`);
      }
    } else {
      setBaseSelection(null);
    }
    setResult({
      jd_analysis: analysis,
      tailored_resume: tailoredResume,
      base_selection: selection || undefined,
    });
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
    await saveRecord(
      analysis,
      tailoredResume,
      jdText,
      undefined,
      combined.data.record_id,
    );
  }, [jdText, saveRecord, applyUsage, refreshUsage, upgrade, baseChoice]);

  const handleCancel = useCallback(() => {
    tailorAbortRef.current?.abort();
    if (tailorTimerRef.current) clearInterval(tailorTimerRef.current);
    tailorTimerRef.current = null;
    setPhase(null);
    setTailorElapsed(0);
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
        toast.error("Couldn't download that file", { description: r.error });
        return;
      }
      if (r.data) {
        const u = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = u;
        a.download = r.filename || `resume.${fmt}`;
        a.click();
        URL.revokeObjectURL(u);
        if (isTrimmedOutcome(r.outcome) || (r.dropped?.length ?? 0) > 0) {
          toast.warning('Content omitted to fit', {
            description: resumeTrimDescription(r.dropped?.length || 0),
          });
        } else {
          toast.success(`Resume downloaded as ${fmt.toUpperCase()}`);
        }

        // Downloading is the point where applying becomes plausible, so this is
        // where we ask. Needs a persisted record to patch — if the save-record
        // settle failed there is nothing to attach an outcome to.
        if (recordIdRef.current && !applyPromptShownRef.current) {
          applyPromptShownRef.current = true;
          setApplyPromptOpen(true);
          // Mark it pending server-side so closing the tab without answering
          // resurfaces the prompt on the tracker card instead of losing it.
          apiService
            .updateApplication(recordIdRef.current, { confirmation_pending: true })
            .catch(() => { /* the prompt is already open; this is just durability */ });
        }
      }
    },
    [result],
  );

  const handleApplyOutcome = useCallback(
    async (outcome: ApplyOutcome) => {
      const recordId = recordIdRef.current;
      if (!recordId) return;
      setApplyPromptSaving(true);
      const resp = await apiService.updateApplication(recordId, {
        status: outcome.status,
        ...(outcome.applied_at ? { applied_at: outcome.applied_at } : {}),
        ...(outcome.job_url ? { job_url: outcome.job_url } : {}),
        resume_used: 'tailored',
        confirmation_pending: false,
      });
      setApplyPromptSaving(false);
      if (resp.error) {
        toast.error("Couldn't update your tracker", { description: resp.error });
        return;
      }
      setApplyPromptOpen(false);
      const day = resp.data?.application?.applied_date;
      if (outcome.status === 'applied') {
        toast.success(
          day ? `Marked as applied on ${formatCivilDay(day)}` : 'Marked as applied',
          { description: 'Find it under Applied in your tracker.' },
        );
      } else if (outcome.status === 'saved') {
        toast.success('Saved for later', { description: "It's in the Saved column." });
      }
      window.dispatchEvent(new CustomEvent('resume:application-saved'));
    },
    [],
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
      baseSelection?.resume_id,
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
      toast.error("Couldn't update the resume", { description: resp.error });
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
  }, [result, regenFeedback, upgrade, baseSelection]);

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
        toast.error("Couldn't write the cover letter", { description: resp.error });
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
      toast.error("Couldn't download that file", { description: r.error });
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

  // Re-fit the current resume to new format choices. Layout only: the
  // backend re-selects the user's own lines (no AI). The ATS score is marked
  // stale only when the set of lines actually changed, so switching the
  // accent or section order never triggers a paid re-score.
  const handleFormatChange = useCallback(
    async (next: ResumeFormatPreferences) => {
      const previous = formatPrefs;
      setFormatPrefs(next);
      saveFormat(next);
      if (!result || sameFormat(formatOf(result.tailored_resume), next)) return;
      setReformatting(true);
      const resp = await apiService.reformatResume(result.tailored_resume, next, result.jd_analysis);
      setReformatting(false);
      if (resp.error || !resp.data?.tailored_resume) {
        setFormatPrefs(previous);
        toast.error(resp.error || "Couldn't apply that format. Please try again.");
        return;
      }
      const lines = (r: TailoredFullResume) =>
        [...(r.experience || []), ...(r.projects || [])].flatMap((e) => e.bullets || []).join('\n');
      const changed = lines(resp.data.tailored_resume) !== lines(result.tailored_resume);
      setResult((prev) => (prev ? { ...prev, tailored_resume: resp.data!.tailored_resume } : prev));
      if (changed) setScoreStale(true);
    },
    [formatPrefs, result],
  );

  const decideReview = useCallback((address: string, decision: ReviewDecision) => {
    setReviewDecisions((prev) => ({ ...prev, [address]: decision }));
    apiService.trackCraftEvent(`review_${decision}`, address);
  }, []);

  const reverifyAfterEdit = useCallback(
    (resume: TailoredFullResume) => {
      if (!result) return;
      void apiService
        .verifyResume(resume, result.jd_analysis, {
          recordId: recordIdRef.current || undefined,
          resumeId: activeResumeRef.current?.resume_id,
        })
        .then((resp) => {
          if (!resp.data?.verification) return;
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  tailored_resume: {
                    ...prev.tailored_resume,
                    verification: resp.data!.verification,
                  },
                }
              : prev,
          );
        });
    },
    [result],
  );

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
      let next: TailoredFullResume | null = null;
      mutateResume((r) => {
        next =
          anchor.section === 'summary'
            ? removeSummarySentence(r, anchor.bulletIndex)
            : removeBulletAt(r, anchor.section, anchor.itemIndex, anchor.bulletIndex);
        return next;
      });
      decideReview(address, 'removed');
      toast.success(anchor.section === 'summary' ? 'Sentence removed' : 'Bullet removed');
      if (next) reverifyAfterEdit(next);
    },
    [result, mutateResume, decideReview, reverifyAfterEdit],
  );

  const handleReviewRestore = useCallback(
    (address: string) => {
      const item = result?.tailored_resume.verification?.items[address];
      if (!item || !result || !baseResume) return;
      const anchor = resolveAnchor(result.tailored_resume, address, item.text);
      if (!anchor || anchor.section === 'summary') {
        decideReview(address, 'edited');
        return;
      }
      const section = anchor.section;
      // Restore only from the actual source entry, never another employer.
      const candidates = baseResume[section]?.[anchor.itemIndex]?.bullets || [];
      const original = bestMatch(item.text, candidates, 0.35);
      if (original) {
        mutateResume((r) =>
          replaceBulletText(
            r, section, anchor.itemIndex, anchor.bulletIndex, original,
          ),
        );
        decideReview(address, 'restored');
        toast.success('Restored your original wording');
      } else {
        mutateResume((r) =>
          removeBulletAt(r, section, anchor.itemIndex, anchor.bulletIndex),
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
      let next: TailoredFullResume | null = null;
      mutateResume((r) => {
        next =
          anchor.section === 'summary'
            ? replaceSummarySentence(r, anchor.bulletIndex, text.trim())
            : replaceBulletText(
                r, anchor.section, anchor.itemIndex, anchor.bulletIndex, text.trim(),
              );
        return next;
      });
      decideReview(address, 'edited');
      if (next) reverifyAfterEdit(next);
    },
    [result, mutateResume, decideReview, reverifyAfterEdit],
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
  const handleAttachEvidence = useCallback(
    (term: string, target: EvidenceTarget) => {
      setResult((prev) => {
        if (!prev) return prev;
        const withBullet = appendBulletOrClause(
          prev.tailored_resume,
          target.section,
          target.itemIndex,
          target.bulletIndex,
          target.clause,
          !!target.asNewBullet,
        );
        return {
          ...prev,
          tailored_resume: withBullet,
        };
      });
      setScoreStale(true);
      apiService.trackCraftEvent('gap_attach_evidence', term);
      toast.success(`Recorded ${term} against a bullet. Run Recheck to refresh the review. Your resume text stays as it is.`);
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
    setBaseSelection(null);
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
    setInspectorTab('jd');
    setDownloadMenuOpen(false);
    setVersions([]);
    setDismissedNudges(new Set());
    setReviewDecisions({});
    setScoreStale(false);
    setScoreDelta(null);
    prevOverallRef.current = null;
    recordIdRef.current = null;
    atsAutoTriggered.current = false;
    setApplyPromptOpen(false);
    applyPromptShownRef.current = false;
  }, []);

  const handleRetryFetch = useCallback(async () => {
    if (!pendingJobUrl || retryingJdFetch) return;
    setRetryingJdFetch(true);
    const fetching = toast.loading('Reading the job posting...', { duration: 50000 });
    try {
      const r = await apiService.fetchJobDescription(pendingJobUrl);
      toast.dismiss(fetching);
      if (r.data?.ok && r.data.jd_text) {
        setJdText(r.data.jd_text);
        cacheJdText(pendingJobUrl, r.data.jd_text);
        toast.success('Job description loaded. Review it, then tailor.');
      } else {
        toast.warning(
          userFacingError(r.data?.error) === 'Something went wrong. Please try again.'
            ? "We still couldn't read that posting. Open it and paste the text here."
            : userFacingError(r.data?.error),
          { duration: 8000 },
        );
      }
    } catch {
      toast.dismiss(fetching);
      toast.error('Connection problem. Try again, or paste the job description yourself.');
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

  const formatSummary = [
    formatPrefs.page_length === 'two' ? '2 pages' : '1 page',
    formatPrefs.density,
    formatPrefs.accent === 'navy' ? 'navy headings' : 'black headings',
  ].join(', ');
  // The file the start screen shows: the one pinned for this job, else the
  // one used for job matching, else the first that is ready.
  const startResume =
    parsedResumes.find((r) => r.resume_id === baseChoice) ??
    parsedResumes.find((r) => r.is_active) ??
    parsedResumes[0] ??
    null;
  const idle = !result && !tailoring;

  return (
    <div className="space-y-5">
      {/* Where you are, and the resumes you already made, on one line at
          the top: nothing worth finding sits below the fold. */}
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between 2xl:gap-6">
        <ProgressStepper currentStep={currentStep} />
        {idle && <RecentTailored className="2xl:max-w-[60%]" />}
      </div>

      {/* Which file was picked matters only when there was a choice. */}
      {baseSelection && result && parsedResumes.length > 1 && (
        <BaseResumeUsedBanner selection={baseSelection} />
      )}

      {tailorError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-container border border-destructive/30 bg-destructive/10 px-5 py-4"
        >
          <p className="text-sm text-destructive">{tailorError}</p>
        </div>
      )}

      {/* Two columns that read left to right as cause and effect: what goes
          in (the job posting, then the tools for the result) and what comes
          out (the resume). On a phone the working column comes first. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 space-y-4" aria-label={result ? 'Result tools' : 'Job posting'}>
          <InspectorTabs
            active={inspectorTab}
            onChange={setInspectorTab}
            hasResult={!!result}
            atsScore={
              typeof result?.ats_scores?.overall === 'number'
                ? result.ats_scores.overall
                : null
            }
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
                formatControls={
                  <ResumeFormatControls
                    value={formatPrefs}
                    onChange={handleFormatChange}
                    disabled={tailoring}
                    busy={reformatting}
                  />
                }
                formatSummary={formatSummary}
                // With one resume there is nothing to pick, and the preview
                // beside the form already names the file.
                resumePicker={
                  parsedResumes.length > 1 ? (
                    <BaseResumePicker
                      resumes={parsedResumes}
                      value={baseChoice}
                      onChange={setBaseChoice}
                      disabled={tailoring}
                    />
                  ) : undefined
                }
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
              <AtsScoreCard
                scores={result?.ats_scores ?? null}
                loading={atsLoading}
                error={atsError}
                stale={scoreStale}
                onRescore={() => (scoreStale ? handleRescore() : result && runAtsScoring(result))}
                jobTitle={result?.jd_analysis.job_title || ''}
                company={result?.jd_analysis.company || ''}
              />
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
                onCopy={async () => {
                  if (!coverLetter) return;
                  try {
                    await navigator.clipboard.writeText(coverLetter);
                    toast.success('Copied to clipboard');
                  } catch {
                    toast.error("Couldn't copy. Select the text and copy it manually.");
                  }
                }}
                jobTitle={result?.jd_analysis.job_title || ''}
                company={result?.jd_analysis.company || ''}
              />
            }
          />
        </section>

        <section className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Resume preview">
          {result && !tailoring && (
            <details className="group rounded-container border border-border bg-card shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>Format</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {formatSummary}
                </span>
              </summary>
              <div className="border-t border-border px-4 py-4">
                <ResumeFormatControls
                  value={formatPrefs}
                  onChange={handleFormatChange}
                  busy={reformatting}
                  note="Changes apply to this resume and your next tailor. Nothing is added; lines are only kept or left out."
                />
              </div>
            </details>
          )}
          {result && !tailoring && <AiDisclosure kind="draft" className="px-1" />}
          {idle ? (
            <StartPreview resume={startResume} />
          ) : (
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
          )}
        </section>
      </div>


      {/* Sticky bottom toolbar. Below lg it sits ABOVE the fixed MobileNav
          (same bottom-0 z-40 otherwise - the tab bar painted over Download);
          offsetting here keeps primary navigation reachable while the result
          actions stay visible. ≥lg the Sidebar owns nav, so bottom-0 is safe. */}
      {result && !editing && (
        <motion.div
          // A short decelerating slide, not a spring: this bar lands on a
          // working surface, where overshoot reads as wobble.
          initial={reduceMotion ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: DURATION.slow, ease: EASE_DECELERATE }
          }
          className="job-search-pop fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-border lg:bottom-0"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-primary/25 bg-primary/10">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-foreground">
                  Your tailored resume
                </p>
                <p className="truncate text-caption-sm text-muted-foreground">
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

            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleStartNew} title="Start over with a different job posting" aria-label="Tailor for another job" className="hit-target">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Tailor for another job</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit the text of this resume yourself" aria-label="Edit the tailored resume" className="hit-target">
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Edit text</span>
              </Button>
              <div className="mx-0.5 h-6 w-px bg-border" aria-hidden="true" />
              <DropdownMenu open={downloadMenuOpen} onOpenChange={setDownloadMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button disabled={downloading !== null} aria-busy={downloading !== null} className="min-h-11 gap-1.5">
                    {downloading !== null ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span className="hidden sm:inline">Preparing...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Download resume</span>
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
                        <span className="block text-caption-sm text-muted-foreground">
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

      <ApplyOutcomeDialog
        open={applyPromptOpen}
        jobTitle={result?.jd_analysis.job_title}
        company={result?.jd_analysis.company}
        defaultJobUrl={pendingJobUrl || ''}
        saving={applyPromptSaving}
        onSubmit={handleApplyOutcome}
        // Dismissing leaves confirmation_pending set, so the tracker card keeps
        // asking rather than silently stranding the record in Draft.
        onDismiss={() => setApplyPromptOpen(false)}
      />
    </div>
  );
}
