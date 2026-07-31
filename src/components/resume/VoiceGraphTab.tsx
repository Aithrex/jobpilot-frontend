import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Lightbulb,
  Loader2,
  Lock,
  Mic,
  MicOff,
  PenLine,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  SampleSignal,
  VoiceGraphStatus,
  WritingPrompt,
  WritingSample,
} from "@/types/voicegraph";

// The "reveal" surfaces - lazy-loaded, only mounted once the user has a ready
// sample, so their chunks never load for someone who hasn't written yet.
const VoiceProfileCard = lazy(() => import("./VoiceProfileCard"));
const KnowledgeGraphReveal = lazy(() => import("./KnowledgeGraphReveal"));
const AuthoredResumeView = lazy(() => import("./AuthoredResumeView"));

type SaveState = "idle" | "saving" | "saved";

const AUTOSAVE_MS = 3000;
const VG_KEY = ["voice-graph"] as const;

function wordsIn(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

const speechCtor = (): SpeechRecognitionConstructor | undefined =>
  typeof window === "undefined"
    ? undefined
    : window.SpeechRecognition || window.webkitSpeechRecognition;

interface VoiceGraphTabProps {
  /** Mounted inside the /next app shell - the shell already renders the page
      h1 + SubNav, so demote the internal hero and drop the outer padding. */
  embedded?: boolean;
}

export default function VoiceGraphTab({ embedded }: VoiceGraphTabProps) {
  // Shell pages pass `embedded` via outlet context (the routes in App.tsx
  // mount this component without props); the legacy /app monolith passes
  // neither, so it renders unchanged.
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();

  const statusQuery = useQuery({
    queryKey: [...VG_KEY, "status"],
    retry: false,
    queryFn: async (): Promise<VoiceGraphStatus | null> => {
      const res = await apiService.voiceGraphStatus();
      // 404 = feature flag off → treat as "unavailable", not an error.
      if (res.status === 404) return null;
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
  });

  const status = statusQuery.data;
  const consentGranted = !!status?.consent.granted;
  const featureLive = !!status?.enabled;
  const minSignalWords = status?.samples.min_signal_words ?? 150;

  return (
    <div className={cn("mx-auto w-full max-w-3xl", !isEmbedded && "px-4 py-6 sm:py-8")}>
      {statusQuery.isLoading ? (
        <LoadingState />
      ) : statusQuery.isError ? (
        <ErrorState onRetry={() => statusQuery.refetch()} />
      ) : status == null || !featureLive ? (
        <UnavailableState />
      ) : !consentGranted ? (
        <ConsentGate reduce={!!reduce} embedded={isEmbedded} onGranted={() => statusQuery.refetch()} />
      ) : (
        <WritingSurface
          minSignalWords={minSignalWords}
          readyCount={status.samples.ready}
          reduce={!!reduce}
          embedded={isEmbedded}
          onStatusChanged={() =>
            queryClient.invalidateQueries({ queryKey: [...VG_KEY, "status"] })
          }
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */

function Header({ embedded }: { embedded?: boolean }) {
  // Embedded in the /next shell the page already has an h1 ("Shape your
  // story") and a "Voice" SubNav item - demote to a section h2 on the shell's
  // type scale and drop the duplicative chip so the page keeps a single h1.
  if (embedded) {
    return (
      <header className="mb-6 text-center">
        <h2 className="font-display text-h2 text-foreground">
          Teach us how you write
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-caption leading-relaxed text-muted-foreground">
          Write a little, the way you actually talk. We learn your voice so every
          resume we help you build sounds like you. Not like a template.
        </p>
      </header>
    );
  }
  return (
    <header className="mb-8 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Voice Graph
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Teach us how you write
      </h1>
      <p className="mx-auto mt-3 max-w-prose text-base leading-relaxed text-muted-foreground">
        Write a little, the way you actually talk. We learn your voice so every
        resume we help you build sounds like you. Not like a template.
      </p>
    </header>
  );
}

/* ─────────────────────────── States ─────────────────────────── */

function LoadingState() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your Voice Graph">
      <div className="mx-auto h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mx-auto h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h2 className="font-display text-xl font-bold tracking-tight">
        We couldn&apos;t open your Voice Graph
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong reaching the server. Give it another try.
      </p>
      <Button className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function UnavailableState() {
  return (
    <Card className="mx-auto max-w-lg border-dashed p-10 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl font-bold tracking-tight">
        Your Voice Graph is coming soon
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        We&apos;re polishing the writing surface that learns how you sound. Check
        back shortly. It&apos;ll be worth it.
      </p>
    </Card>
  );
}

/* ─────────────────────────── Consent gate ─────────────────────────── */

const CONSENT_POINTS: { title: string; body: string }[] = [
  {
    title: "What we store",
    body: "Your writing, encrypted. Nothing more.",
  },
  {
    title: "What we build",
    body: "A private knowledge graph of what's true about you, and a profile of how you write.",
  },
  {
    title: "How we use it",
    body: "Only to make your resume sound like you. It never trains a shared model.",
  },
  {
    title: "You're in control",
    body: "Turn it off anytime: we delete your writing, voice profile, and graph. Resumes you already made stay yours to keep or delete.",
  },
];

function ConsentGate({
  reduce,
  embedded,
  onGranted,
}: {
  reduce: boolean;
  embedded?: boolean;
  onGranted: () => void;
}) {
  const [granting, setGranting] = useState(false);

  const grant = async () => {
    setGranting(true);
    const res = await apiService.grantVoiceConsent();
    setGranting(false);
    if (res.error) {
      toast.error("Couldn't turn on Voice Graph", { description: res.error });
      return;
    }
    onGranted();
  };

  return (
    <>
      <Header embedded={embedded} />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Card className="mx-auto max-w-xl p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-primary">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-semibold">
              Private by default. Off until you say so.
            </span>
          </div>
          <ul className="space-y-4">
            {CONSENT_POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Button
            className="mt-7 w-full"
            size="lg"
            disabled={granting}
            onClick={grant}
          >
            {granting && <Loader2 className="h-4 w-4 animate-spin" />}
            Turn on Voice Graph
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You can revoke consent and delete everything whenever you like.
          </p>
        </Card>
      </motion.div>
    </>
  );
}

/* ─────────────────────────── Writing surface ─────────────────────────── */

function WritingSurface({
  minSignalWords,
  readyCount,
  reduce,
  embedded,
  onStatusChanged,
}: {
  minSignalWords: number;
  readyCount: number;
  reduce: boolean;
  embedded?: boolean;
  onStatusChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const upgrade = useUpgrade();

  const [text, setText] = useState("");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [source, setSource] = useState<"typed" | "voice">("typed");
  const [signal, setSignal] = useState<SampleSignal | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [finalizing, setFinalizing] = useState(false);
  const [listening, setListening] = useState(false);

  const lastSavedRef = useRef("");
  const savingRef = useRef(false);
  const finalizingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");

  const wordCount = useMemo(() => wordsIn(text), [text]);
  const progress = Math.min(100, (wordCount / Math.max(1, minSignalWords)) * 100);
  const speechSupported = !!speechCtor();

  const resetComposer = useCallback(() => {
    setText("");
    setSampleId(null);
    setPromptId(null);
    setSource("typed");
    setSignal(null);
    setSaveState("idle");
    lastSavedRef.current = "";
  }, []);

  /* - Prior samples - */
  const samplesQuery = useQuery({
    queryKey: [...VG_KEY, "samples"],
    queryFn: async (): Promise<WritingSample[]> => {
      const res = await apiService.listWritingSamples();
      if (res.error) throw new Error(res.error);
      return res.data?.samples ?? [];
    },
  });

  /* - Autosave (debounced, only when text changed) - */
  const autosave = useCallback(async () => {
    if (savingRef.current || finalizingRef.current) return;
    const body = text;
    if (!body.trim() || body.trim() === lastSavedRef.current.trim()) return;
    savingRef.current = true;
    setSaveState("saving");
    const res = await apiService.saveWritingSample({
      sample_id: sampleId ?? undefined,
      text: body,
      source,
      prompt_id: promptId ?? undefined,
    });
    savingRef.current = false;
    if (res.error || !res.data) {
      setSaveState("idle");
      // Autosave failures stay quiet - a soft toast, never a blocking dialog.
      toast.error("Couldn't autosave", { description: res.error });
      return;
    }
    setSampleId(res.data.sample_id);
    setSignal(res.data.signal);
    lastSavedRef.current = body;
    setSaveState("saved");
  }, [text, sampleId, source, promptId]);

  useEffect(() => {
    if (!text.trim() || text.trim() === lastSavedRef.current.trim()) return;
    const handle = setTimeout(() => void autosave(), AUTOSAVE_MS);
    return () => clearTimeout(handle);
  }, [text, autosave]);

  /* - Auto-grow the writing area - */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 288)}px`;
  }, [text]);

  /* - Mic (Web Speech API): transcript only, no audio leaves the device - */
  const stopMic = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startMic = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    voiceBaseRef.current = text.trim() ? `${text.trimEnd()} ` : "";
    voiceFinalRef.current = "";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) voiceFinalRef.current += `${seg} `;
        else interim += seg;
      }
      const combined = `${voiceBaseRef.current}${voiceFinalRef.current}${interim}`
        .replace(/\s+/g, " ")
        .replace(/^\s+/, "");
      setSource("voice");
      setText(combined);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (ev.error !== "aborted" && ev.error !== "no-speech") {
        toast.error("Mic trouble", {
          description: "We couldn't hear you clearly. You can keep typing.",
        });
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [text]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleMic = () => {
    if (!speechSupported) return;
    if (listening) stopMic();
    else startMic();
  };

  /* - Finalize: "This one's ready" - */
  const finalize = async () => {
    if (!text.trim() || finalizing) return;
    finalizingRef.current = true;
    setFinalizing(true);
    const res = await apiService.saveWritingSample({
      sample_id: sampleId ?? undefined,
      text,
      source,
      prompt_id: promptId ?? undefined,
      finalize: true,
    });
    finalizingRef.current = false;
    setFinalizing(false);
    if (res.error || !res.data) {
      const payload = res.errorPayload || {};
      const code = String(
        payload.error ?? payload.code ?? payload.reason ?? res.error ?? "",
      );
      if (res.status === 403 && code.includes("upgrade_required")) {
        upgrade.open({ feature: "writing_samples" });
        return;
      }
      if (res.status === 403 && code.includes("consent_required")) {
        toast.error("Turn on Voice Graph first", {
          description: "We need your consent before saving a sample.",
        });
        onStatusChanged();
        return;
      }
      toast.error("Couldn't save this one", { description: res.error });
      return;
    }
    toast.success("Saved to your voice", {
      description: "Nice. This makes your resumes sound more like you.",
    });
    resetComposer();
    samplesQuery.refetch();
    onStatusChanged();
  };

  const counterMessage =
    signal?.message ??
    (wordCount === 0
      ? `Start anywhere. Around ${minSignalWords} words lets us learn your voice.`
      : `Keep going. Around ${minSignalWords} words lets us learn your voice. You're at ${wordCount}.`);

  const priorSamples = (samplesQuery.data ?? []).filter(
    (s) => s.sample_id !== sampleId,
  );

  return (
    <>
      <Header embedded={embedded} />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <PromptSpark
          onPick={(p) => {
            setPromptId(p.id);
            textareaRef.current?.focus();
          }}
          onSkip={() => {
            setPromptId(null);
            textareaRef.current?.focus();
          }}
        />

        {/* The writing area - deliberately minimal chrome. */}
        <Card className="mt-4 overflow-hidden border-border/70 shadow-soft">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              if (!listening) setSource("typed");
              setText(e.target.value);
            }}
            aria-label="Your writing"
            placeholder="Write about a project you're proud of, a problem you untangled, or just how your week went. However you'd say it out loud."
            spellCheck
            className="min-h-72 w-full resize-none border-0 bg-transparent px-5 py-6 font-serif text-lg leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-0 sm:px-8 sm:py-8 sm:text-xl"
            style={{ maxWidth: "65ch", marginInline: "auto" }}
          />

          {/* Calm progress + counter - encourages, never blocks. */}
          <div className="border-t border-border/60 px-5 py-4 sm:px-8">
            <Progress
              value={progress}
              className={cn(
                "h-1.5 bg-muted",
                signal?.ready_for_profile && "[&>div]:bg-primary",
              )}
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {counterMessage}
              </p>
              <SaveIndicator state={saveState} wordCount={wordCount} />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={finalize} disabled={!text.trim() || finalizing}>
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            This one&apos;s ready
          </Button>

          {speechSupported && (
            <Button
              type="button"
              variant={listening ? "default" : "outline"}
              onClick={toggleMic}
              aria-pressed={listening}
              className={cn(listening && "animate-pulse")}
            >
              {listening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {listening ? "Listening..." : "Talk instead"}
            </Button>
          )}

          {text.trim() && (
            <button
              type="button"
              onClick={resetComposer}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Start fresh
            </button>
          )}
        </div>

        {listening && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only the transcript is saved. Your audio never leaves this device.
          </p>
        )}
      </motion.div>

      <PriorSamples
        samples={priorSamples}
        loading={samplesQuery.isLoading}
        onStartWriting={() => textareaRef.current?.focus()}
        onDeleted={(id) => {
          if (id === sampleId) resetComposer();
          samplesQuery.refetch();
          onStatusChanged();
        }}
      />

      {/* The reveal - only once there's at least one finished sample to learn from. */}
      {readyCount >= 1 && <VoiceReveal reduce={reduce} />}

      <ConsentFooter
        onRevoked={() => {
          resetComposer();
          queryClient.invalidateQueries({ queryKey: VG_KEY });
        }}
      />
    </>
  );
}

/* ─────────────────────────── The reveal ─────────────────────────── */

function VoiceReveal({ reduce }: { reduce: boolean }) {
  return (
    <div className="mt-14 space-y-14 border-t border-border pt-12">
      <motion.p
        initial={reduce ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center text-sm text-muted-foreground"
      >
        Now that you&apos;ve written something, here&apos;s what we heard back.
      </motion.p>

      <Suspense fallback={<RevealSkeleton />}>
        <VoiceProfileCard />
      </Suspense>
      <Suspense fallback={<RevealSkeleton tall />}>
        <KnowledgeGraphReveal />
      </Suspense>
      <Suspense fallback={<RevealSkeleton />}>
        <AuthoredResumeView />
      </Suspense>
    </div>
  );
}

function RevealSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div
        className={cn(
          "animate-pulse rounded-xl bg-muted",
          tall ? "h-96" : "h-44",
        )}
      />
    </div>
  );
}

/* ─────────────────────────── Save indicator ─────────────────────────── */

function SaveIndicator({
  state,
  wordCount,
}: {
  state: SaveState;
  wordCount: number;
}) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        Saving
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" />
        Saved
      </span>
    );
  return (
    <span className="text-xs tabular-nums text-muted-foreground/70">
      {wordCount} {wordCount === 1 ? "word" : "words"}
    </span>
  );
}

/* ─────────────────────────── Prompt spark ─────────────────────────── */

function PromptSpark({
  onPick,
  onSkip,
}: {
  onPick: (p: WritingPrompt) => void;
  onSkip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const promptsQuery = useQuery({
    queryKey: [...VG_KEY, "prompts"],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<WritingPrompt[]> => {
      const res = await apiService.voiceGraphPrompts();
      if (res.error) throw new Error(res.error);
      return res.data?.prompts ?? [];
    },
  });

  const prompts = promptsQuery.data ?? [];
  const current = prompts.length ? prompts[index % prompts.length] : null;

  const shuffle = () => {
    if (prompts.length < 2) return;
    setIndex((i) => {
      let next = i;
      while (next % prompts.length === i % prompts.length)
        next = Math.floor(Math.random() * prompts.length);
      return next;
    });
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Lightbulb className="h-4 w-4" />
          Need a spark?
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Or just write about anything
        </button>
      </div>
    );
  }

  return (
    <div className="surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="font-serif text-base leading-relaxed text-foreground">
            {promptsQuery.isLoading
              ? "Finding a spark..."
              : current?.text ?? "Write about a moment you're proud of."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide prompts"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!current}
          onClick={() => current && onPick(current)}
        >
          Use this
        </Button>
        {prompts.length > 1 && (
          <Button size="sm" variant="ghost" onClick={shuffle}>
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle
          </Button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onSkip();
          }}
          className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          I&apos;ll write about anything
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Prior samples ─────────────────────────── */

function PriorSamples({
  samples,
  loading,
  onStartWriting,
  onDeleted,
}: {
  samples: WritingSample[];
  loading: boolean;
  onStartWriting: () => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="overline mb-3">Your writing so far</h2>
      {loading ? (
        <div className="space-y-2" role="status" aria-label="Loading your writing">
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : samples.length === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PenLine className="h-4 w-4" />
          </div>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            Nothing here yet. Even a rough paragraph helps us hear you.
          </p>
          <button
            type="button"
            onClick={onStartWriting}
            className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Write your first few sentences
          </button>
        </Card>
      ) : (
        <ul className="space-y-2">
          {samples.map((s) => (
            <SampleRow key={s.sample_id} sample={s} onDeleted={onDeleted} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SampleRow({
  sample,
  onDeleted,
}: {
  sample: WritingSample;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    const res = await apiService.deleteWritingSample(sample.sample_id);
    setDeleting(false);
    if (res.error) {
      toast.error("Couldn't delete", { description: res.error });
      return;
    }
    toast.success("Deleted");
    onDeleted(sample.sample_id);
  };

  const isReady = sample.status === "ready";

  return (
    <li className="surface flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-sm text-foreground">
          {sample.text?.trim() || "Untitled draft"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
              isReady
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isReady ? "Ready" : "Draft"}
          </span>
          <span className="tabular-nums">
            {sample.word_count} {sample.word_count === 1 ? "word" : "words"}
          </span>
          {sample.source === "voice" && (
            <span className="inline-flex items-center gap-1">
              <Mic className="h-3 w-3" /> spoken
            </span>
          )}
          <span>{relativeTime(sample.updated_at)}</span>
        </div>
      </div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting}
            onClick={remove}
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={deleting}
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Delete this sample"
          onClick={() => setConfirming(true)}
          className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

/* ─────────────────────────── Consent footer (revoke) ─────────────────────────── */

function ConsentFooter({ onRevoked }: { onRevoked: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const revoke = async () => {
    setRevoking(true);
    const res = await apiService.revokeVoiceConsent();
    setRevoking(false);
    if (res.error) {
      toast.error("Couldn't turn it off", { description: res.error });
      return;
    }
    toast.success("Voice Graph turned off", {
      description: "Your writing, voice profile, and graph are deleted. Resumes you already made are kept as your files.",
    });
    setConfirming(false);
    onRevoked();
  };

  return (
    <div className="mt-10 border-t border-border pt-5 text-center">
      {confirming ? (
        <div className="inline-flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground">
            This deletes all your writing. Sure?
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={revoking}
            onClick={revoke}
          >
            {revoking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Turn off &amp; delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={revoking}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Turn off Voice Graph and delete my writing
        </button>
      )}
    </div>
  );
}
