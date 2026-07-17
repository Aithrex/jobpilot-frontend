import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFingerprintHash,
  getGuestId,
  isGuestOnboardingEnabled,
  markGuestOnboardingUnavailable,
  setGuestId,
} from '@/lib/guest';
import type {
  GuestJobMatch,
  GuestParseResult,
  GuestQuotaError,
  GuestSession,
  GuestTailorResult,
} from '@/types/guest';
import type { JobStatus, TailoredFullResume } from '@/types/resume';

/**
 * /start — guest onboarding: upload → parsed resume → top matched jobs →
 * up to 5 free tailors, all before signup. First impression of the product:
 * calm, honest, mobile-first. Contract: the implemented backend guest
 * blueprints (see types/guest.ts for the exact shapes).
 *
 * Guest failures are 429/503 (never 401); 429 { quota_exhausted: true } is a
 * signup CTA, not an error ({ global: true } = platform capacity variant).
 * A 503/404 anywhere = feature off / edge route not live → fall back to the
 * login-first landing for the rest of the session.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TAILOR_LIMIT = 5;

type Step = 'hero' | 'parsing' | 'matches' | 'tailor';
// 'capacity' = global daily circuit breaker (429 global:true) — a friendly
// signup CTA, NOT an error card and NOT a retryable throttle.
type MatchesState = 'idle' | 'loading' | 'ready' | 'error' | 'capacity';
type TailorState = 'working' | 'done' | 'cta' | 'error';

// Staged progress copy: each list ends on a phrase that can honestly PERSIST
// (parse ~30–60s, first matches scan ~1–2 min, tailor ~1–2 min are all longer
// than the staged run-through) — never an "almost there" that lies for 90s.
const PARSE_STAGES = [
  'Uploading your resume…',
  'Reading the document…',
  'Extracting your experience and skills…',
  'Building your profile — almost done…',
];

const TAILOR_STAGES = [
  'Reading the job description…',
  'Mapping it against your real experience…',
  'Rewriting with integrity checks — nothing invented…',
  'Polishing and scoring keyword coverage…',
];

// Matching is async on cache miss and genuinely takes a while — honest
// staged copy beats a bare spinner. (Same-day repeats return instantly.)
const MATCHES_STAGES = [
  'Scanning live openings on Workday, Greenhouse, Lever, and Ashby…',
  'Scoring each role against your resume…',
  'Keeping only the strong matches…',
  'Ranking your best fits — a first scan takes a minute or two…',
];

// Editorial easing shared with the landing (_shared.tsx EASE) — a confident
// settle, never springy.
const EASE = [0.16, 1, 0.3, 1] as const;
const stepTransition = { duration: 0.28, ease: EASE } as const;

function useStagedCopy(active: boolean, stages: readonly string[], intervalMs = 5000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const id = window.setInterval(
      () => setIdx((i) => Math.min(i + 1, stages.length - 1)),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [active, stages, intervalMs]);
  return stages[Math.min(idx, stages.length - 1)];
}

function isUnavailable(status?: number): boolean {
  // 503 = backend feature flag off; 404 = guest edge route not deployed yet.
  return status === 503 || status === 404;
}

// ── Small presentational pieces ──────────────────────────────────

function TailorQuota({
  used,
  limit,
  className,
}: {
  used: number;
  limit: number;
  className?: string;
}) {
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;
  // The bar shows what's LEFT (it drains as you tailor) so it always agrees
  // with the "X of Y left" wording.
  const pct = Math.round((remaining / Math.max(1, limit)) * 100);
  return (
    <div className={cn('w-36 space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">Free tailors</span>
        <span className={cn('font-medium tabular-nums', exhausted && 'text-warning')}>
          {remaining} of {limit} left
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${remaining} of ${limit} free tailors left`}
        className="h-1.5"
      />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-primary/30 bg-primary/10 text-primary';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
        tone,
      )}
    >
      <Target className="h-3 w-3" aria-hidden />
      {score}% match
    </span>
  );
}

function SignupCta({
  title,
  body,
  loginLabel = 'Sign in',
}: {
  title: string;
  body: string;
  loginLabel?: string;
}) {
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/login">{loginLabel}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Create free account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Spinner + crossfading stage line + steady hint — the shared "alive"
 *  header for every long-running phase. The crossfade keys on the stage
 *  string so each cadence tick visibly moves, and is inert under
 *  prefers-reduced-motion (the spinner still turns via CSS until the global
 *  reduced-motion net freezes it). */
function WorkingHeader({ stage, hint }: { stage: string; hint: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      </span>
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={stage}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="font-semibold"
          >
            {stage}
          </motion.p>
        </AnimatePresence>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** Recoverable error surface — consistent icon + title + body + actions,
 *  announced via role="alert". Never a raw string dump. */
function ErrorCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string | null;
  children?: ReactNode;
}) {
  return (
    <Card className="border-destructive/30" role="alert">
      <CardContent className="space-y-4 p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        {children && <div className="flex flex-col justify-center gap-2 sm:flex-row">{children}</div>}
      </CardContent>
    </Card>
  );
}

function TailoredPreview({ resume }: { resume: TailoredFullResume }) {
  const skillGroups = Object.entries(resume.skills || {});
  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold">{resume.contact?.name || 'Your tailored resume'}</h3>
          {resume.target_role && (
            <p className="text-sm text-muted-foreground">Tailored for: {resume.target_role}</p>
          )}
        </div>
        {resume.summary && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h4>
            <p className="text-sm leading-relaxed">{resume.summary}</p>
          </section>
        )}
        {skillGroups.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h4>
            <div className="space-y-2">
              {skillGroups.map(([group, items]) => (
                <div key={group} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{group}:</span>
                  {(items || []).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
        {(resume.experience || []).length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</h4>
            <div className="space-y-4">
              {resume.experience.map((exp, i) => (
                <div key={`${exp.company}-${i}`}>
                  <p className="text-sm font-medium">
                    {exp.title} · <span className="text-muted-foreground">{exp.company}</span>
                    {exp.dates ? <span className="text-muted-foreground"> — {exp.dates}</span> : null}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(exp.bullets || []).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
        {(resume.projects || []).length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</h4>
            <div className="space-y-3">
              {resume.projects.map((p, i) => (
                <div key={`${p.name}-${i}`}>
                  <p className="text-sm font-medium">{p.name}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(p.bullets || []).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

// ── Plain-text export (client-side; PDF download requires an account) ──

function tailoredToText(tr: TailoredFullResume): string {
  const lines: string[] = [];
  const c = tr.contact;
  lines.push(c?.name || 'Tailored Resume');
  const contactLine = [c?.email, c?.phone, c?.linkedin, c?.github].filter(Boolean).join(' | ');
  if (contactLine) lines.push(contactLine);
  if (tr.summary) lines.push('', 'SUMMARY', tr.summary);
  const skillGroups = Object.entries(tr.skills || {});
  if (skillGroups.length) {
    lines.push('', 'SKILLS');
    for (const [group, items] of skillGroups) lines.push(`${group}: ${(items || []).join(', ')}`);
  }
  if (tr.experience?.length) {
    lines.push('', 'EXPERIENCE');
    for (const exp of tr.experience) {
      lines.push(`${exp.title} — ${exp.company}${exp.dates ? ` (${exp.dates})` : ''}`);
      for (const b of exp.bullets || []) lines.push(`  • ${b}`);
    }
  }
  if (tr.projects?.length) {
    lines.push('', 'PROJECTS');
    for (const p of tr.projects) {
      lines.push(p.name);
      for (const b of p.bullets || []) lines.push(`  • ${b}`);
    }
  }
  if (tr.education?.length) {
    lines.push('', 'EDUCATION');
    for (const e of tr.education) {
      lines.push(`${e.degree} — ${e.institution}${e.dates ? ` (${e.dates})` : ''}`);
    }
  }
  if (tr.certifications?.length) {
    lines.push('', 'CERTIFICATIONS');
    for (const cert of tr.certifications) lines.push(`  • ${cert}`);
  }
  return lines.join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── The page ─────────────────────────────────────────────────────

export default function Start() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>('hero');
  const [session, setSession] = useState<GuestSession | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [tailorsUsed, setTailorsUsed] = useState(0);
  const [tailorsLimit, setTailorsLimit] = useState(DEFAULT_TAILOR_LIMIT);

  const [dragActive, setDragActive] = useState(false);
  const [parseStatus, setParseStatus] = useState<JobStatus | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  // Onboard global-capacity 429 (global:true) — a friendly signup CTA, not an
  // error card and not retryable (retrying just hits the same breaker).
  const [parseCapacity, setParseCapacity] = useState(false);

  const [matches, setMatches] = useState<GuestJobMatch[]>([]);
  const [matchesState, setMatchesState] = useState<MatchesState>('idle');
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<GuestJobMatch | null>(null);
  const [tailorState, setTailorState] = useState<TailorState>('working');
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorCta, setTailorCta] = useState<{ title: string; body: string } | null>(null);
  const [tailored, setTailored] = useState<GuestTailorResult | null>(null);

  const fingerprintRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stepSectionRef = useRef<HTMLElement | null>(null);
  const prevStepRef = useRef<Step>('hero');

  const remaining = Math.max(0, tailorsLimit - tailorsUsed);
  const parseStage = useStagedCopy(step === 'parsing' && !parseError, PARSE_STAGES);
  const tailorStage = useStagedCopy(step === 'tailor' && tailorState === 'working', TAILOR_STAGES, 7000);
  const matchesStage = useStagedCopy(matchesState === 'loading', MATCHES_STAGES, 7000);

  // Step transition variants — inert under prefers-reduced-motion (framer
  // animates inline styles, so the CSS reduced-motion net can't catch it).
  const stepMotion = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: stepTransition,
      };

  const fallbackToLanding = useCallback(() => {
    // Backend says the feature is off (503) or the edge route isn't live
    // (404) — retreat to the existing login-first landing for this session.
    markGuestOnboardingUnavailable();
    navigate('/', { replace: true });
  }, [navigate]);

  // Recognition: on mount, ask the backend who this device might be.
  useEffect(() => {
    if (authLoading || isAuthenticated || !isGuestOnboardingEnabled()) return;
    let cancelled = false;
    (async () => {
      const fp = await getFingerprintHash();
      if (cancelled) return;
      fingerprintRef.current = fp;
      const resp = await apiService.guestSession(getGuestId() ?? undefined, fp);
      if (cancelled) return;
      if (isUnavailable(resp.status)) {
        fallbackToLanding();
        return;
      }
      if (resp.data) {
        setSession(resp.data);
        if (typeof resp.data.tailors_used === 'number') setTailorsUsed(resp.data.tailors_used);
        if (typeof resp.data.tailors_limit === 'number') setTailorsLimit(resp.data.tailors_limit);
      }
      // Network/transient errors: stay on /start — the dropzone still works
      // and upload surfaces its own honest error state.
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, fallbackToLanding]);

  // Focus management: after a user-initiated step change, move focus to the
  // new step's region (its aria-label announces where we landed). Waits out
  // the exit+enter transition; never fires for the initial hero render.
  useEffect(() => {
    if (prevStepRef.current === step) return;
    prevStepRef.current = step;
    if (step === 'hero') return;
    const t = window.setTimeout(() => stepSectionRef.current?.focus(), 340);
    return () => window.clearTimeout(t);
  }, [step]);

  const loadMatches = useCallback(
    async (gid: string) => {
      setMatchesState('loading');
      setMatchesError(null);
      const resp = await apiService.guestMatches(gid);
      if (isUnavailable(resp.status)) {
        fallbackToLanding();
        return;
      }
      if (resp.status === 429) {
        // global:true = platform-wide daily circuit breaker → capacity CTA,
        // never a retry button. A plain per-IP 429 keeps the friendly throttle.
        const payload = (resp.errorPayload ?? {}) as GuestQuotaError;
        if (payload.global) {
          setMatchesState('capacity');
          return;
        }
        setMatchesState('error');
        setMatchesError('High demand right now — give it a few minutes and try again.');
        return;
      }
      if (resp.error || !resp.data) {
        setMatchesState('error');
        setMatchesError(resp.error || 'We could not load your matches. Please try again.');
        return;
      }
      setMatches(resp.data.jobs ?? []);
      setMatchesState('ready');
    },
    [fallbackToLanding],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!/\.(pdf|docx)$/i.test(file.name)) {
        toast.error('Please upload a PDF or DOCX resume.');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error('That file is over 5 MB — please upload a smaller resume.');
        return;
      }
      fileRef.current = file;
      setParseError(null);
      setParseCapacity(false);
      setParseStatus(null);
      setStep('parsing');

      const fp = fingerprintRef.current ?? (await getFingerprintHash());
      fingerprintRef.current = fp;
      const submit = await apiService.guestOnboard(file, fp, getGuestId() ?? undefined);
      if (submit.error || !submit.data?.job_id) {
        if (isUnavailable(submit.status)) {
          fallbackToLanding();
          return;
        }
        if (submit.status === 429) {
          // global:true = platform-wide daily free-scan breaker → capacity CTA
          // (no retry). A plain per-IP 429 keeps the friendly throttle copy.
          const payload = (submit.errorPayload ?? {}) as GuestQuotaError;
          if (payload.global) {
            setParseCapacity(true);
          } else {
            setParseError(
              "We've hit the guest upload limit from your network for now. Create a free account to continue right away — it takes a minute.",
            );
          }
        } else {
          setParseError(submit.error || 'Upload failed. Please try again.');
        }
        return;
      }

      setGuestId(submit.data.guest_id);
      const poll = await apiService.guestJobPoll<GuestParseResult>(
        submit.data.job_id,
        submit.data.guest_id,
        180000,
        undefined,
        setParseStatus,
      );
      if (poll.error || !poll.data) {
        setParseError(
          poll.error ||
            "We couldn't read that resume. If it's a scan or image-based PDF, try exporting a text-based version and upload again.",
        );
        return;
      }
      // Result is nested: { parsed_resume: { structured, filename }, guest: {...} }.
      const contact = (
        poll.data.parsed_resume?.structured as { contact?: { name?: string } } | undefined
      )?.contact;
      if (contact?.name) setGuestName(contact.name);
      // The `guest` block carries recognition + quota — no extra session call.
      const guest = poll.data.guest;
      if (guest) {
        if (typeof guest.tailors_used === 'number') setTailorsUsed(guest.tailors_used);
        if (typeof guest.tailors_limit === 'number') setTailorsLimit(guest.tailors_limit);
        if (guest.recognized) {
          // The guest_id-based path usually carries a name (personalizes the
          // banner); tolerate an empty one (banner falls back to no-name copy).
          setSession((s) => ({
            ...(s ?? { exists: true }),
            exists: true,
            recognized: true,
            recognized_name: guest.recognized_name ?? '',
          }));
        }
      }
      setStep('matches');
      void loadMatches(submit.data.guest_id);
    },
    [fallbackToLanding, loadMatches],
  );

  const handleTailor = useCallback(
    async (job: GuestJobMatch) => {
      const gid = getGuestId();
      if (!gid) {
        toast.error('Upload your resume first so we can tailor it.');
        setStep('hero');
        return;
      }
      // Matches carry no JD text — the backend fetches the JD from the
      // posting URL (apply_link) through its SSRF-guarded jd_fetcher.
      if (!job.apply_link) {
        toast.error("This posting doesn't carry an application link to tailor against.");
        return;
      }
      setActiveJob(job);
      setTailored(null);
      setTailorError(null);
      setTailorCta(null);
      setTailorState('working');
      setStep('tailor');

      const submit = await apiService.guestTailor({
        guest_id: gid,
        job: { title: job.title, company: job.company, url: job.apply_link },
      });
      if (submit.error || !submit.data?.job_id) {
        if (isUnavailable(submit.status)) {
          fallbackToLanding();
          return;
        }
        if (submit.status === 429) {
          // Quota / circuit breaker — a signup CTA, never an error state.
          const payload = (submit.errorPayload ?? {}) as GuestQuotaError;
          if (typeof payload.tailors_used === 'number') setTailorsUsed(payload.tailors_used);
          if (typeof payload.tailors_limit === 'number') setTailorsLimit(payload.tailors_limit);
          if (payload.global) {
            // Platform-wide daily circuit breaker — not this guest's fault.
            setTailorCta({
              title: 'Guest tailoring is at capacity today.',
              body: 'Create a free account to keep going right now — your resume and matches come with you.',
            });
          } else {
            if (typeof payload.tailors_used !== 'number') setTailorsUsed(tailorsLimit);
            setTailorCta({
              title: `You've used all ${payload.tailors_limit ?? tailorsLimit} free tailors — nice work.`,
              body: 'Free accounts get 5 fresh tailors every day, and everything you made here carries over automatically.',
            });
          }
          setTailorState('cta');
          return;
        }
        setTailorError(submit.error || 'Could not start tailoring. Please try again.');
        setTailorState('error');
        return;
      }

      // The 202 carries the server-confirmed quota numbers — update the meter
      // immediately (no double-count: the completed result doesn't repeat them).
      if (typeof submit.data.tailors_used === 'number') setTailorsUsed(submit.data.tailors_used);
      if (typeof submit.data.tailors_limit === 'number') setTailorsLimit(submit.data.tailors_limit);

      const poll = await apiService.guestJobPoll<GuestTailorResult>(
        submit.data.job_id,
        gid,
        240000,
      );
      if (poll.error || !poll.data?.tailored_resume) {
        setTailorError(poll.error || 'Tailoring failed. Please try again.');
        setTailorState('error');
        return;
      }
      setTailored(poll.data);
      setTailorState('done');
    },
    [fallbackToLanding, tailorsLimit],
  );

  // ── Route guards (after hooks) ─────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/app" replace />;
  if (!isGuestOnboardingEnabled()) return <Navigate to="/" replace />;

  // Recognition is driven by the `recognized` flag alone — a fingerprint-only
  // match now intentionally withholds the name (PII-leak fix), returning
  // recognized:true with an empty recognized_name until the guest_id
  // capability is presented. The name, when present, only personalizes.
  const recognized = !!session?.recognized;
  const recognizedName = session?.recognized_name || '';
  const hasReturningResume = !!(session?.exists && session.has_resume);
  const firstName = guestName?.split(' ')[0];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Persistent slim guest banner */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Aspirely
          </Link>
          <span className="hidden text-xs text-muted-foreground md:inline">
            Guest preview — create a free account to save your work
          </span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <TailorQuota used={tailorsUsed} limit={tailorsLimit} className="hidden sm:block" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">
                <span className="sm:hidden">Sign up free</span>
                <span className="hidden sm:inline">Create free account</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        {/* Welcome-back recognition (soft — guests may continue below).
            Also shown right after parsing, when the parse job's `guest`
            block recognizes a returning person. */}
        {recognized && (step === 'hero' || step === 'matches') && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stepTransition}
            className="mb-8 space-y-1.5"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <UserRound className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-sm">
                {recognizedName ? (
                  <>
                    Welcome back, <span className="font-semibold">{recognizedName}</span> — sign in
                    to pick up where you left off.
                  </>
                ) : (
                  <>Welcome back — sign in to pick up where you left off.</>
                )}
              </p>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              Or keep going as a guest below
              {remaining > 0
                ? ` — you have ${remaining} free tailor${remaining === 1 ? '' : 's'} left.`
                : '.'}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Step 1: hero + dropzone ── */}
          {step === 'hero' && (
            <motion.section key="hero" {...stepMotion} aria-label="Upload your resume">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Upload your resume.{' '}
                  <span className="text-primary">See today's best-matched jobs</span> — free.
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">
                  No account needed. We match your resume against live openings on real company
                  career sites, then tailor it for the roles you pick — {tailorsLimit} free
                  tailors included.
                </p>
              </div>

              {hasReturningResume && (
                <div className="mx-auto mt-8 max-w-2xl">
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                      <p className="flex-1 text-sm">
                        Your resume is already on file from a previous visit.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          const gid = getGuestId();
                          if (gid) {
                            setStep('matches');
                            void loadMatches(gid);
                          }
                        }}
                      >
                        See today's matches
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload your resume — PDF or DOCX, up to 5 MB"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
                className={cn(
                  'mx-auto mt-8 flex max-w-2xl cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40',
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <UploadCloud className="h-6 w-6 text-primary" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">Drop your resume here, or tap to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF or DOCX · up to 5 MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  aria-label="Resume file — PDF or DOCX, up to 5 MB"
                  tabIndex={-1}
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>

              <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <li className="flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Only strong matches — no volume padding
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Integrity-checked tailoring — nothing invented
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Free — no card, no account needed
                </li>
              </ul>
            </motion.section>
          )}

          {/* ── Step 2: parsing progress ── */}
          {step === 'parsing' && (
            <motion.section
              key="parsing"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Reading your resume"
              aria-live="polite"
            >
              <div className="mx-auto max-w-xl">
                {parseCapacity ? (
                  <SignupCta
                    title="We've hit today's free-scan limit"
                    body="Guest uploads are maxed out for today. Create a free account to continue right now — it's free and takes about a minute, and there's no daily guest cap."
                  />
                ) : parseError ? (
                  <ErrorCard title="We hit a snag reading your resume" body={parseError}>
                    {fileRef.current && (
                      <Button
                        onClick={() => {
                          if (fileRef.current) void handleFile(fileRef.current);
                        }}
                      >
                        Try again
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setStep('hero')}>
                      Choose another file
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to="/register">Create free account</Link>
                    </Button>
                  </ErrorCard>
                ) : (
                  <Card>
                    <CardContent className="space-y-6 p-6 sm:p-8">
                      <WorkingHeader
                        stage={parseStage}
                        hint={
                          parseStatus === 'processing'
                            ? 'Working — usually under a minute.'
                            : 'Queued — starting now.'
                        }
                      />
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.section>
          )}

          {/* ── Step 3: top matches ── */}
          {step === 'matches' && (
            <motion.section
              key="matches"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Your top job matches"
            >
              <div className="mb-6">
                <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                  {firstName ? `${firstName}, your` : 'Your'} top matches today
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scored against live openings from company career sites. We only show roles that
                  clear our match bar — fewer, accurate results beat volume.
                </p>
                <p className="sr-only" role="status">
                  {matchesState === 'ready'
                    ? matches.length > 0
                      ? `${matches.length} strong ${matches.length === 1 ? 'match' : 'matches'} found.`
                      : 'No strong matches today.'
                    : ''}
                </p>
              </div>

              {remaining === 0 && (
                <div className="mb-6">
                  <SignupCta
                    title={`You've used all ${tailorsLimit} free tailors — nice work.`}
                    body="Free accounts get 5 fresh tailors every day, and your resume, matches, and tailored versions carry over automatically."
                  />
                </div>
              )}

              {matchesState === 'loading' && (
                <div className="space-y-4" aria-live="polite" aria-busy="true">
                  <WorkingHeader
                    stage={matchesStage}
                    hint="First scan of the day takes a minute or two — repeat visits are instant."
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="space-y-3 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-full space-y-2">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                          </div>
                          <Skeleton className="h-10 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {matchesState === 'capacity' && (
                <SignupCta
                  title="We're at capacity for guest matches today"
                  body="Matching is maxed out for guests right now. Create a free account to keep going — it's free, your resume comes with you, and there's no daily guest cap."
                />
              )}

              {matchesState === 'error' && (
                <ErrorCard title="Couldn't load your matches" body={matchesError}>
                  <Button
                    onClick={() => {
                      const gid = getGuestId();
                      if (gid) void loadMatches(gid);
                    }}
                  >
                    Try again
                  </Button>
                </ErrorCard>
              )}

              {matchesState === 'ready' && matches.length === 0 && (
                <Card>
                  <CardContent className="space-y-3 p-8 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
                    </span>
                    <p className="font-semibold">No strong matches today</p>
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">
                      Nothing cleared our match bar today — we'd rather show you zero than pad the
                      list. Check back tomorrow, or create a free account to scan more sources
                      with your own filters.
                    </p>
                    <div className="flex justify-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/login">Sign in</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link to="/register">Create free account</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {matchesState === 'ready' && matches.length > 0 && (
                <>
                  <p className="mb-4 text-xs text-muted-foreground" role="status">
                    {matches.length} {matches.length === 1 ? 'role' : 'roles'} cleared the bar in
                    today's scan.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {matches.map((job, i) => (
                      <motion.div
                        key={`${job.company}-${job.title}-${i}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...stepTransition, delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.3) }}
                      >
                        <Card className="h-full">
                          <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="line-clamp-2 font-semibold" title={job.title}>
                                  {job.title}
                                </h3>
                                <p className="truncate text-sm text-muted-foreground">
                                  {job.company}
                                  {job.location ? ` · ${job.location}` : ''}
                                </p>
                              </div>
                              <ScoreBadge score={job.match_score} />
                            </div>
                            <div className="flex items-center gap-2">
                              {job.source && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                  {job.source}
                                </Badge>
                              )}
                              {job.apply_link && (
                                <a
                                  href={job.apply_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded py-1 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  View posting
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                  <span className="sr-only"> (opens in a new tab)</span>
                                </a>
                              )}
                            </div>
                            {(job.matched_skills?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">You match:</span>
                                {job.matched_skills!.slice(0, 4).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                                    {skill}
                                  </Badge>
                                ))}
                                {job.matched_skills!.length > 4 && (
                                  <span className="text-[11px] text-muted-foreground">
                                    +{job.matched_skills!.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                            {remaining > 0 ? (
                              <Button
                                className="mt-auto"
                                onClick={() => void handleTailor(job)}
                                aria-label={`Tailor my resume for ${job.title} at ${job.company} — ${remaining} of ${tailorsLimit} free tailors left`}
                              >
                                <Wand2 className="h-4 w-4" aria-hidden />
                                Tailor my resume — free ({remaining} left)
                              </Button>
                            ) : (
                              <Button asChild variant="outline" className="mt-auto">
                                <Link to="/register">Sign up to keep tailoring — free</Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.section>
          )}

          {/* ── Step 4: tailor flow ── */}
          {step === 'tailor' && (
            <motion.section
              key="tailor"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Tailoring your resume"
            >
              <button
                type="button"
                onClick={() => setStep('matches')}
                className="-my-2 mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to matches
              </button>

              {activeJob && (
                <div className="mb-6">
                  <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
                    {activeJob.title} · {activeJob.company}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground" role="status">
                    {tailorState === 'done'
                      ? 'Your tailored resume is ready — every line traces back to your real experience.'
                      : 'Tailoring your resume for this role.'}
                  </p>
                </div>
              )}

              {tailorState === 'working' && (
                <Card>
                  <CardContent className="space-y-6 p-6 sm:p-8" aria-live="polite">
                    <WorkingHeader
                      stage={tailorStage}
                      hint="Usually one to two minutes. Every line is checked against your real experience — nothing invented."
                    />
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {tailorState === 'cta' && tailorCta && (
                <SignupCta title={tailorCta.title} body={tailorCta.body} />
              )}

              {tailorState === 'error' && (
                <ErrorCard title="Tailoring didn't finish" body={tailorError}>
                  {activeJob && (
                    <Button
                      onClick={() => {
                        if (activeJob) void handleTailor(activeJob);
                      }}
                    >
                      Try again
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setStep('matches')}>
                    Back to matches
                  </Button>
                </ErrorCard>
              )}

              {tailorState === 'done' && tailored && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          `tailored-resume-${(activeJob?.company || 'job')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')}.txt`,
                          tailoredToText(tailored.tailored_resume),
                        )
                      }
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Download (.txt)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Want the polished PDF/DOCX?{' '}
                      <Link to="/register" className="font-medium text-primary hover:underline">
                        Create a free account
                      </Link>{' '}
                      — this tailor is saved to it automatically.
                    </p>
                  </div>

                  <TailoredPreview resume={tailored.tailored_resume} />

                  <SignupCta
                    title="Save your work — and get 5 free tailors every day."
                    body={`Your resume, today's matches, and this tailored version all carry into your free account${
                      remaining > 0
                        ? ` — and you still have ${remaining} free tailor${remaining === 1 ? '' : 's'} left as a guest.`
                        : '.'
                    }`}
                  />
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile: persistent quota + signup strip (top-bar meter is sm+ only).
          Hidden on the entry hero — there's no work to save yet, and the
          dropzone deserves the full viewport at 360px. */}
      {(step !== 'hero' || tailorsUsed > 0) && (
        <div className="sticky bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] pt-2.5 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <TailorQuota used={tailorsUsed} limit={tailorsLimit} className="w-32 shrink-0" />
            <Button asChild className="h-11">
              <Link to="/register">Save my work — free</Link>
            </Button>
          </div>
        </div>
      )}

      <footer className="border-t border-border/60 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Aspirely</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
