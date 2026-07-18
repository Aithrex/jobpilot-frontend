import { useCallback, useEffect, useRef, useState, KeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { MultiAgentProcessing } from './MultiAgentProcessing';
import {
  Sparkles, X, Loader2, Check, UploadCloud, FileText, RotateCcw, Linkedin,
  Briefcase, MapPin, GraduationCap, Plane, ArrowRight, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EMPTY_ANSWERS, EMPTY_DEFAULTS, EXPERIENCE_LEVELS, REMOTE_OPTIONS, ROLE_SUGGESTIONS,
  clearOnboardingState, deriveDefaultsFromParsed, isOnboardingSnoozed, loadOnboardingState,
  mergeStatusDefaults, saveOnboardingState, snoozeOnboarding,
  type OnboardingAnswers, type OnboardingDefaults,
} from './onboarding';

/**
 * First-run onboarding — the product sequence:
 *   sign in (elsewhere) → 1) upload resume → 2) connect LinkedIn (skippable)
 *   → 3) a FEW resume-derived questions (target role, level, sponsorship,
 *   locations) → profile ready → land in the app.
 *
 * The questions arrive PRE-FILLED from the parsed resume so the user confirms
 * rather than fills blank fields. Progress is persisted to localStorage so the
 * flow survives the LinkedIn OAuth full-page redirect (resumable), and dismissal
 * snoozes it for the session (non-nagging). Self-gates to authenticated users
 * who haven't completed onboarding (new signups + retrofitted accounts).
 */

type ResumeState = 'idle' | 'parsing' | 'parsed' | 'error';

const STEPS = [
  { label: 'Resume', icon: UploadCloud },
  { label: 'LinkedIn', icon: Linkedin },
  { label: 'Profile', icon: Sparkles },
] as const;
const LINKEDIN_STEP = 1;
const QUESTIONS_STEP = 2;

/** House ease (matches AuthShell) for the cinematic reveals. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Presentation phases around the (unchanged) data-collecting steps:
 * a full-bleed welcome moment → the 3 steps → a "workspace ready" resolve.
 */
type WizardPhase = 'welcome' | 'steps' | 'resolve';

// ── Small reusable tag input (chips + suggestions) ──────────────────────────
function TagInput({ value, onChange, placeholder, suggestions }: {
  value: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary">
            {t}
            {/* 24px hit target; negative margins keep the chip's visual size. */}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
              className="-my-1.5 -ml-1 -mr-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !value.includes(s)).slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, isAuthenticated, savePreferences } = useAuth();

  const pending = isAuthenticated && !!user && user.onboarded === false;

  const [dismissed, setDismissed] = useState(() => isOnboardingSnoozed());
  // Fresh users get the cinematic welcome; anyone with real saved progress
  // (e.g. resuming from the LinkedIn OAuth redirect) goes straight to steps.
  const [phase, setPhase] = useState<WizardPhase>(() => {
    const saved = loadOnboardingState();
    return saved && (saved.stepIndex > 0 || saved.resumeDone) ? 'steps' : 'welcome';
  });
  const [ready, setReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [resumeState, setResumeState] = useState<ResumeState>('idle');
  const [resumeDone, setResumeDone] = useState(false);
  const [defaults, setDefaults] = useState<OnboardingDefaults>(EMPTY_DEFAULTS);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);

  const [liConnected, setLiConnected] = useState(false);
  const [liName, setLiName] = useState('');
  const [liChecking, setLiChecking] = useState(false);
  const [liConnecting, setLiConnecting] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const hydrated = useRef(false);
  const resolveTimer = useRef<number | null>(null);

  const update = useCallback(
    (patch: Partial<OnboardingAnswers>) => setAnswers((a) => ({ ...a, ...patch })),
    [],
  );

  const applyDefaults = useCallback((d: OnboardingDefaults) => {
    setAnswers((a) => ({
      ...a,
      roles: a.roles.length ? a.roles : d.roles,
      level: a.level || d.level,
      locations: a.locations.length ? a.locations : d.locations,
    }));
  }, []);

  const checkLinkedin = useCallback(async () => {
    setLiChecking(true);
    const r = await apiService.getConnectStatus().catch(() => null);
    if (r && 'data' in r && r.data?.linkedin) {
      setLiConnected(!!r.data.linkedin.connected);
      setLiName(r.data.linkedin.name || '');
    }
    setLiChecking(false);
  }, []);

  // Consume the ?connected / ?connect_error query params LinkedIn OAuth returns
  // with. Whichever handler (here or DashboardTab) runs first cleans them, so at
  // most one toast fires; correctness comes from checkLinkedin(), not the param.
  const handleConnectReturn = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const connected = url.searchParams.get('connected');
    const err = url.searchParams.get('connect_error');
    if (!connected && !err) return;
    if (connected === 'linkedin') toast.success('LinkedIn connected');
    if (err) toast.error("Couldn't connect LinkedIn", { description: err.replace(/_/g, ' ') });
    url.searchParams.delete('connected');
    url.searchParams.delete('connect_error');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  // Hydrate once: restore saved progress, detect an already-parsed resume for
  // retrofitted users, and reflect any existing LinkedIn connection.
  useEffect(() => {
    if (!pending || hydrated.current) return;
    hydrated.current = true;

    const saved = loadOnboardingState();
    if (saved) {
      setStepIndex(Math.min(Math.max(saved.stepIndex, 0), STEPS.length - 1));
      setResumeDone(saved.resumeDone);
      setDefaults(saved.defaults);
      setAnswers(saved.answers);
      if (saved.resumeDone) setResumeState('parsed');
    }
    setReady(true);

    (async () => {
      if (!saved?.resumeDone) {
        const st = await apiService.getResumeStatus().catch(() => null);
        if (st?.data?.has_resume) {
          const d = mergeStatusDefaults(EMPTY_DEFAULTS, st.data);
          setDefaults(d);
          applyDefaults(d);
          setResumeDone(true);
          setResumeState('parsed');
          setStepIndex((s) => (s === 0 ? LINKEDIN_STEP : s));
        }
      }
      await checkLinkedin();
      handleConnectReturn();
    })();
  }, [pending, applyDefaults, checkLinkedin, handleConnectReturn]);

  // Persist progress on every change so the LinkedIn redirect can resume.
  useEffect(() => {
    if (!ready || !pending) return;
    saveOnboardingState({ stepIndex, resumeDone, defaults, answers });
  }, [ready, pending, stepIndex, resumeDone, defaults, answers]);

  // Clear the resolve → navigate timer if we unmount first.
  useEffect(() => () => {
    if (resolveTimer.current) window.clearTimeout(resolveTimer.current);
  }, []);

  // Keep rendering through the resolve moment: savePreferences refreshes the
  // profile (user.onboarded flips true) before we navigate, which drops
  // `pending` — without this guard the "ready" beat would unmount instantly.
  if ((!pending && phase !== 'resolve') || dismissed) return null;

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error('Please upload a PDF or Word document.');
      return;
    }
    setResumeState('parsing');
    const res = await apiService.uploadResumeForParser(file);
    if (res.error) {
      setResumeState('error');
      toast.error("Couldn't read that resume", { description: res.error });
      return;
    }
    const parsed = (res.data as { parsed_resume?: unknown; resume?: unknown })?.parsed_resume
      ?? (res.data as { resume?: unknown })?.resume
      ?? {};
    let d = deriveDefaultsFromParsed(parsed);
    const st = await apiService.getResumeStatus().catch(() => null);
    if (st?.data) d = mergeStatusDefaults(d, st.data);
    setDefaults(d);
    applyDefaults(d);
    setResumeDone(true);
    setResumeState('parsed');
  };

  const startLinkedin = async () => {
    setLiConnecting(true);
    // Persist first — the browser fully navigates to LinkedIn and back.
    saveOnboardingState({ stepIndex: LINKEDIN_STEP, resumeDone, defaults, answers });
    const r = await apiService.getConnectAuthorizeUrl('linkedin');
    if (r.data?.authorize_url) {
      window.location.href = r.data.authorize_url;
      return;
    }
    setLiConnecting(false);
    toast.error(r.error || 'LinkedIn connect is unavailable right now');
  };

  const complete = async () => {
    setSaving(true);
    const prefs: Record<string, unknown> = { onboarding_complete: true };
    if (answers.roles.length) {
      prefs.target_roles = answers.roles;
      prefs.target_role = answers.roles[0];
    }
    if (answers.level) prefs.experience_level = answers.level;
    if (answers.needsSponsorship) prefs.needs_sponsorship = answers.needsSponsorship === 'yes';
    if (answers.locations.length) prefs.target_locations = answers.locations;
    if (answers.remote) prefs.remote_pref = answers.remote;
    const cf = Number(answers.compFloor);
    if (answers.compFloor && !Number.isNaN(cf) && cf > 0) prefs.comp_floor = cf;

    const res = await savePreferences(prefs);
    setSaving(false);
    if (res.error) {
      toast.error("Couldn't save your profile", { description: res.error });
      return;
    }
    clearOnboardingState();
    // Cinematic resolve: a brief "your workspace is ready" beat, then in.
    setPhase('resolve');
    resolveTimer.current = window.setTimeout(
      () => navigate('/next/today', { replace: true }),
      reduce ? 900 : 1700,
    );
  };

  /**
   * Session snooze — dismisses the wizard WITHOUT marking onboarding complete,
   * so it returns next login until the user genuinely finishes. Used by both
   * the dialog close and the final step's "Skip for now".
   */
  const snoozeAndClose = () => {
    saveOnboardingState({ stepIndex, resumeDone, defaults, answers });
    snoozeOnboarding();
    setDismissed(true);
  };

  const skipForNow = () => {
    snoozeAndClose();
    toast("Skipped for now. We'll pick this up next time you sign in.");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (saving || resumeState === 'parsing' || phase === 'resolve') return; // don't drop mid-work
    snoozeAndClose();
  };

  const stepVariants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {/* Radix a11y: the dialog always has an accessible name + description;
            the title tracks the current phase/step. */}
        <DialogTitle className="sr-only">
          {phase === 'welcome'
            ? 'Welcome to Aspirely'
            : phase === 'resolve'
              ? 'Your workspace is ready'
              : `Set up your workspace. Step ${stepIndex + 1} of ${STEPS.length}: ${STEPS[stepIndex].label}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Upload your resume, connect LinkedIn, and confirm a few details to personalize your workspace.
        </DialogDescription>

        <AnimatePresence mode="wait" initial={false}>
          {phase === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            >
              <WelcomeMoment onBegin={() => setPhase('steps')} />
            </motion.div>
          )}

          {phase === 'steps' && (
            <motion.div
              key="steps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            >
              {/* Thin timeline: hairline track, animated fill, one dot per step. */}
              <div className="border-b border-border px-5 pb-4 pt-6 sm:px-6">
                <div className="relative mx-0.5 flex items-center justify-between">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
                  <motion.span
                    className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-primary"
                    initial={false}
                    animate={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                    aria-hidden
                  />
                  {STEPS.map((s, i) => (
                    <span
                      key={s.label}
                      className={`relative z-10 h-2 w-2 rounded-full transition-colors duration-300 ${
                        i < stepIndex
                          ? 'bg-primary'
                          : i === stepIndex
                            ? 'bg-primary ring-4 ring-primary/20'
                            : 'border border-border bg-background'
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">You can change all of this later</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={stepVariants.initial}
                  animate={stepVariants.animate}
                  exit={stepVariants.exit}
                  transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                >
                  {stepIndex === 0 && (
                    <ResumeStep
                      state={resumeState}
                      defaults={defaults}
                      onPick={() => fileRef.current?.click()}
                      onDropFile={handleFile}
                      onRetry={() => setResumeState('idle')}
                      onSkip={() => setStepIndex(LINKEDIN_STEP)}
                      onContinue={() => setStepIndex(LINKEDIN_STEP)}
                    />
                  )}

                  {stepIndex === LINKEDIN_STEP && (
                    <LinkedInStep
                      connected={liConnected}
                      name={liName}
                      checking={liChecking}
                      connecting={liConnecting}
                      onConnect={startLinkedin}
                      onBack={() => setStepIndex(0)}
                      onSkip={() => setStepIndex(QUESTIONS_STEP)}
                      onContinue={() => setStepIndex(QUESTIONS_STEP)}
                    />
                  )}

                  {stepIndex === QUESTIONS_STEP && (
                    <QuestionsStep
                      answers={answers}
                      defaults={defaults}
                      update={update}
                      saving={saving}
                      onBack={() => setStepIndex(LINKEDIN_STEP)}
                      onSkip={skipForNow}
                      onFinish={complete}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {phase === 'resolve' && (
            <motion.div
              key="resolve"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            >
              <ReadyMoment />
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Cinematic moments (presentation only — no data behavior) ────────────────

/** Dark, brand-tinted gradient backdrop shared by the welcome + resolve beats.
    Black overlays over the brand gradient keep it deliberately dark in BOTH
    themes (same pattern as the glass surfaces in index.css). */
function CinematicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="brand-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" />
      <div className="bg-grid-faint absolute inset-0 opacity-30" />
    </div>
  );
}

/** Full-bleed opening: staged reveals — mark → headline → promise → begin. */
function WelcomeMoment({ onBegin }: { onBegin: () => void }) {
  const reduce = useReducedMotion();
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.4, delayChildren: reduce ? 0 : 0.2 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.55, ease: EASE } },
  };
  return (
    <div className="relative overflow-hidden px-6 py-14 text-center sm:py-16">
      <CinematicBackdrop />
      <motion.div variants={container} initial="hidden" animate="show" className="relative">
        <motion.span
          variants={item}
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white backdrop-blur"
        >
          <Sparkles className="h-7 w-7" aria-hidden />
        </motion.span>
        <motion.h2
          variants={item}
          className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
        >
          Welcome to Aspirely
        </motion.h2>
        <motion.p variants={item} className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/80">
          A workspace built around your real experience. Ready in about two minutes.
        </motion.p>
        <motion.div variants={item} className="mt-8">
          <Button size="lg" onClick={onBegin} className="bg-white text-black hover:bg-white/90">
            Let's begin <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** "Your workspace is ready" resolve, shown briefly before navigating in. */
function ReadyMoment() {
  const reduce = useReducedMotion();
  return (
    <div className="relative overflow-hidden px-6 py-16 text-center">
      <CinematicBackdrop />
      <div className="relative" role="status" aria-live="polite">
        <motion.span
          initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-white/15 text-white"
        >
          <Check className="h-7 w-7" aria-hidden />
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.25, duration: reduce ? 0 : 0.5, ease: EASE }}
          className="font-display text-2xl font-extrabold tracking-tight text-white"
        >
          Your workspace is ready
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.5, duration: reduce ? 0 : 0.4 }}
          className="mt-2 text-sm text-white/80"
        >
          Taking you to your dashboard…
        </motion.p>
      </div>
    </div>
  );
}

// ── Step 1: Resume ──────────────────────────────────────────────────────────
function ResumeStep({ state, defaults, onPick, onDropFile, onRetry, onSkip, onContinue }: {
  state: ResumeState;
  defaults: OnboardingDefaults;
  onPick: () => void;
  onDropFile: (f: File) => void;
  onRetry: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="px-5 pb-6 pt-5 sm:px-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Welcome to Aspirely</span>
      </div>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Upload your resume. We'll do the rest</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One upload personalizes your workspace and pre-fills your profile. No forms required.
      </p>

      <div className="mt-4 min-h-[260px]">
        {state === 'idle' && (
          <div>
            <button
              type="button"
              onClick={onPick}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onDropFile(f); }}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="h-7 w-7" />
              </span>
              <span className="font-semibold">Drop your resume or tap to browse</span>
              <span className="text-xs text-muted-foreground">PDF or Word · we never share it</span>
            </button>
            <button type="button" onClick={onSkip} className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Skip for now, I'll add it later
            </button>
          </div>
        )}

        {state === 'parsing' && <MultiAgentProcessing active />}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <FileText className="h-8 w-8 text-destructive" />
            <p className="text-sm">We couldn't read that file. Try a different PDF/Word resume.</p>
            <Button variant="outline" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Try again</Button>
          </div>
        )}

        {state === 'parsed' && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
              <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
                <Check className="h-6 w-6" />
              </span>
              <p className="font-semibold">Resume read. Profile pre-filled</p>
              <p className="text-xs text-muted-foreground">We'll confirm a few details with you in a moment.</p>
            </div>
            {(defaults.roles.length > 0 || defaults.skills.length > 0) && (
              <div className="space-y-2">
                {defaults.roles.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Target roles</p>
                    <div className="flex flex-wrap gap-1.5">{defaults.roles.map((r) => <span key={r} className="rounded-full bg-muted px-2.5 py-1 text-xs">{r}</span>)}</div>
                  </div>
                )}
                {defaults.skills.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Detected skills</p>
                    <div className="flex flex-wrap gap-1.5">{defaults.skills.slice(0, 10).map((s) => <span key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{s}</span>)}</div>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={onContinue}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={onRetry}>Re-upload</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Connect LinkedIn (skippable) ────────────────────────────────────
function LinkedInStep({ connected, name, checking, connecting, onConnect, onBack, onSkip, onContinue }: {
  connected: boolean;
  name: string;
  checking: boolean;
  connecting: boolean;
  onConnect: () => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <div className="flex items-center gap-2 text-primary">
        <Linkedin className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Connect LinkedIn</span>
      </div>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Bring your network along</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connecting LinkedIn lets Aspirely audit your profile and share wins on your behalf. Always with your review. Optional, and you can do it anytime.
      </p>

      <div className="mt-4 min-h-[180px]">
        {checking ? (
          <div className="flex min-h-[160px] items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : connected ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <Check className="h-6 w-6" />
            </span>
            <p className="font-semibold">LinkedIn connected{name ? ` · ${name}` : ''}</p>
            <p className="text-xs text-muted-foreground">You're all set. We'll never post without your say-so.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border p-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Audit your headline &amp; about for recruiter appeal</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Draft and post wins. You always approve first</li>
              <li className="flex items-start gap-2"><Linkedin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Keep your profile in sync with your target roles</li>
            </ul>
            <Button className="mt-5 w-full" onClick={onConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Linkedin className="h-4 w-4" />}
              {connecting ? 'Opening LinkedIn…' : 'Connect LinkedIn'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {!connected && (
            <button type="button" onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          )}
          <Button onClick={onContinue}>Continue <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: A few resume-derived questions ──────────────────────────────────
function QuestionsStep({ answers, defaults, update, saving, onBack, onSkip, onFinish }: {
  answers: OnboardingAnswers;
  defaults: OnboardingDefaults;
  update: (patch: Partial<OnboardingAnswers>) => void;
  saving: boolean;
  onBack: () => void;
  /** Session snooze — does NOT complete onboarding (unlike onFinish). */
  onSkip: () => void;
  onFinish: () => void;
}) {
  const roleSuggestions = [...defaults.roles, ...ROLE_SUGGESTIONS];
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Confirm your profile</span>
      </div>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">A few quick things</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pulled from your resume. Confirm or tweak. Nothing here is locked in.
      </p>

      <div className="mt-4 max-h-[52vh] space-y-5 overflow-y-auto pr-1">
        {/* Target roles */}
        <div>
          <Label className="mb-2 flex items-center gap-1.5 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" /> What roles are you targeting?
          </Label>
          <TagInput
            value={answers.roles}
            onChange={(roles) => update({ roles })}
            placeholder="Type a role and press Enter"
            suggestions={roleSuggestions}
          />
        </div>

        {/* Experience level */}
        <div>
          <Label className="mb-2 flex items-center gap-1.5 text-sm">
            <GraduationCap className="h-4 w-4 text-muted-foreground" /> Your experience level
          </Label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((lvl) => (
              <Chip key={lvl} active={answers.level === lvl} onClick={() => update({ level: lvl })}>{lvl}</Chip>
            ))}
          </div>
        </div>

        {/* Visa sponsorship */}
        <div>
          <Label className="mb-2 flex items-center gap-1.5 text-sm">
            <Plane className="h-4 w-4 text-muted-foreground" /> Will you need visa sponsorship?
          </Label>
          <div className="flex flex-wrap gap-2">
            <Chip active={answers.needsSponsorship === 'yes'} onClick={() => update({ needsSponsorship: 'yes' })}>Yes, now or soon</Chip>
            <Chip active={answers.needsSponsorship === 'no'} onClick={() => update({ needsSponsorship: 'no' })}>No, I'm authorized</Chip>
          </div>
        </div>

        {/* Locations + remote */}
        <div>
          <Label className="mb-2 flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" /> Where do you want to work?
          </Label>
          <TagInput
            value={answers.locations}
            onChange={(locations) => update({ locations })}
            placeholder="City or country (optional)"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {REMOTE_OPTIONS.map((r) => (
              <Chip key={r} active={answers.remote === r} onClick={() => update({ remote: r })}>{r}</Chip>
            ))}
          </div>
        </div>

        {/* Comp floor (optional) */}
        <div>
          <Label htmlFor="comp-floor" className="mb-2 block text-sm">
            Minimum base salary <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="comp-floor"
              value={answers.compFloor}
              onChange={(e) => update({ compFloor: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="e.g. 120000"
              inputMode="numeric"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack} disabled={saving} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSkip} disabled={saving} className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
          <Button onClick={onFinish} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Finish
          </Button>
        </div>
      </div>
    </div>
  );
}
