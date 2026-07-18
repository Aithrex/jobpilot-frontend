import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  GraduationCap,
  History,
  Layers,
  Lightbulb,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Pin,
  Play,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type CopilotMessage = {
  role: string;
  content: string;
  at?: string;
  id?: string;
  meta?: {
    pipeline?: PipelineStep[];
    citations?: Citation[];
    tool_calls?: ToolCall[];
    deliverable?: Deliverable | null;
  };
};

type PipelineStep = { agent: string; label: string; summary: string };
type Citation = { id: string; snippet: string };
type ToolCall = { tool: string; agent: string; summary: string };
type NextAction = { title: string; reason: string; priority?: number };

type Deliverable = {
  type: "ppt" | "pdf" | "project";
  data: Record<string, unknown>;
};

type PlaygroundState = {
  active_track?: string;
  custom_title?: string | null;
  custom_topic?: string | null;
  current_step?: number;
  steps?: Array<{ title: string; type: string; body: string }>;
  completed?: number[];
  finished_at?: string;
  xp?: number;
  streak?: number;
};

type Track = {
  id: string;
  title: string;
  description: string;
  steps: Array<{ title: string; type: string; body: string }>;
};

type KpiCard = { label: string; value: string | number; trend?: string; icon?: string };

type TimelineEvent = { type: string; description: string; timestamp: string };

type OutreachCampaign = {
  campaign_id: string;
  target_company: string;
  target_role: string;
  channel: string;
  contacts: Array<{ name: string; title: string; notes: string }>;
  sequence: Array<{
    step: number;
    action: string;
    template: string;
    status: string;
    sent_at: string | null;
    notes: string;
  }>;
  status: string;
  created_at: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

// ─── Agent theming ──────────────────────────────────────────────────────────

// Deliberate token exception: a categorical, data-driven agent color scale.
// Eight agents need eight distinguishable hues — more than the semantic token
// set offers. Chips always pair the color with the agent's name, so meaning
// never rides on color alone.
const AGENT_COLORS: Record<string, { grad: string; text: string }> = {
  memory:     { grad: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-700 dark:text-violet-300" },
  strategist: { grad: "from-sky-500/20 to-cyan-500/10",       text: "text-sky-700 dark:text-sky-300" },
  tailor:     { grad: "from-amber-500/20 to-orange-500/10",    text: "text-amber-700 dark:text-amber-300" },
  interview:  { grad: "from-emerald-500/20 to-teal-500/10",    text: "text-emerald-700 dark:text-emerald-300" },
  outreach:   { grad: "from-rose-500/20 to-pink-500/10",       text: "text-rose-700 dark:text-rose-300" },
  project:    { grad: "from-indigo-500/20 to-blue-500/10",     text: "text-indigo-700 dark:text-indigo-300" },
  deliverable:{ grad: "from-teal-500/20 to-emerald-500/10",    text: "text-teal-700 dark:text-teal-300" },
  router:     { grad: "from-slate-500/20 to-gray-500/10",      text: "text-slate-600 dark:text-slate-400" },
};

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  linkedin: Linkedin,
  twitter: MessageSquare,
};

// ─── Small shared components ────────────────────────────────────────────────

function PipelineChips({ steps }: { steps: PipelineStep[] }) {
  if (!steps?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {steps.map((s, i) => {
        const c = AGENT_COLORS[(s.agent || "router").toLowerCase()] ?? AGENT_COLORS.router;
        return (
          <span
            key={`${s.agent}-${i}`}
            title={s.summary}
            className={`inline-flex max-w-full items-center gap-1 rounded-lg border border-border/60 bg-gradient-to-r ${c.grad} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground`}
          >
            <span className="shrink-0 text-[9px] opacity-80">{s.agent}</span>
            <span className="truncate font-normal normal-case">{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function ToolCallLog({ calls }: { calls: ToolCall[] }) {
  if (!calls?.length) return null;
  return (
    <details className="mt-2 text-[11px] text-muted-foreground">
      <summary className="cursor-pointer font-semibold hover:text-primary">
        {calls.length} tool call{calls.length !== 1 ? "s" : ""} executed
      </summary>
      <ul className="mt-1 ml-3 space-y-1 list-disc">
        {calls.map((t, i) => (
          <li key={i}>
            <span className="font-mono">{t.tool}</span>
            <span className="mx-1 opacity-60">→</span>
            <span>{t.summary}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function DeliverableCard({ d }: { d: Deliverable }) {
  if (!d?.data) return null;
  const data = d.data as Record<string, unknown>;
  if (d.type === "ppt") {
    const slides = (data.slides || []) as Array<{ title: string; bullets: string[]; speaker_notes?: string }>;
    return (
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs">
        <p className="font-bold text-primary flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> PPT Outline: {String(data.title || "")}
        </p>
        {(data.subtitle as string) && <p className="text-muted-foreground text-[11px] mt-0.5">{String(data.subtitle)}</p>}
        <ol className="mt-2 ml-4 list-decimal space-y-1.5">
          {slides.map((s, i) => (
            <li key={i}>
              <span className="font-semibold text-foreground">{s.title}</span>
              {s.bullets?.length > 0 && (
                <ul className="ml-3 list-disc text-muted-foreground">
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
              {s.speaker_notes && <p className="italic text-muted-foreground/70 mt-0.5">{s.speaker_notes}</p>}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (d.type === "pdf") {
    const sections = (data.sections || []) as Array<{ heading: string; body: string }>;
    return (
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs">
        <p className="font-bold text-primary flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> PDF One-Pager: {String(data.title || "")}
        </p>
        {sections.map((s, i) => (
          <div key={i} className="mt-2">
            <p className="font-semibold text-foreground">{s.heading}</p>
            <p className="text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">{s.body}</p>
          </div>
        ))}
      </div>
    );
  }
  if (d.type === "project") {
    const milestones = (data.milestones || []) as Array<{ title: string; deliverable: string; duration: string }>;
    return (
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs">
        <p className="font-bold text-primary flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" /> Project Scaffold: {String(data.name || "")}
        </p>
        <p className="text-muted-foreground mt-1">{String(data.description || "")}</p>
        {(data.tech_stack as string) && <p className="mt-1 text-muted-foreground">Stack: {String(data.tech_stack)}</p>}
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          {milestones.map((m, i) => (
            <li key={i}>
              <span className="font-semibold">{m.title}</span>
              <span className="text-muted-foreground/70 ml-1">({m.duration})</span>
              <span className="block text-muted-foreground">{m.deliverable}</span>
            </li>
          ))}
        </ol>
        {(data.folder_structure as string) && (
          <pre className="mt-2 rounded bg-muted p-2 text-[10px] text-foreground/90 overflow-auto whitespace-pre-wrap">
            {String(data.folder_structure)}
          </pre>
        )}
      </div>
    );
  }
  return null;
}

function KpiRow({ cards }: { cards: KpiCard[] }) {
  if (!cards?.length) return null;
  const icons: Record<string, typeof Zap> = {
    messages: MessageSquare,
    outreach: Mail,
    tracks: GraduationCap,
    days: Calendar,
    streak: Flame,
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {cards.map((k) => {
        const Ic = icons[(k.icon || "").toLowerCase()] || Zap;
        return (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <Ic className="h-4 w-4 text-primary" />
              <span className="font-display text-lg font-extrabold text-foreground tabular-nums">{k.value}</span>
              {k.trend && (
                <span className="text-[10px] font-semibold text-success">{k.trend}</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function TimelineList({ events }: { events: TimelineEvent[] }) {
  if (!events?.length) return null;
  const iconFor = (t: string) => {
    if (t.includes("chat") || t.includes("copilot")) return MessageSquare;
    if (t.includes("outreach")) return Mail;
    if (t.includes("playground") || t.includes("track")) return GraduationCap;
    if (t.includes("memory")) return Brain;
    return Clock;
  };
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((e, i) => {
        const Ic = iconFor(e.type);
        return (
          <div key={i} className="flex gap-2 text-xs">
            <Ic className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
            <div className="min-w-0">
              <p className="text-foreground/90">{e.description}</p>
              <p className="text-[10px] text-muted-foreground/70">{new Date(e.timestamp).toLocaleString()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionSkeleton({ heights = ["h-24", "h-24"] }: { heights?: string[] }) {
  return (
    <div className="space-y-3" aria-hidden>
      {heights.map((h, i) => (
        <div key={i} className={`animate-pulse rounded-xl bg-muted ${h}`} />
      ))}
    </div>
  );
}

function SectionErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-xs text-destructive">
      <p className="flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type SubTab = "chat" | "outreach" | "playground" | "dashboard" | "network" | "offers";

type MomentumData = {
  streak: number;
  momentum_score: number;
  trend: "up" | "down";
  this_week: number;
  last_week: number;
  milestones: Array<{ id: string; label: string; earned: boolean }>;
  heatmap: Array<{ date: string; count: number }>;
};

type NetworkContact = {
  contact_id: string;
  name: string;
  company?: string;
  role?: string;
  platform?: string;
  relationship_strength?: string;
  notes?: string;
  referral_status?: string;
};

type OfferItem = {
  offer_id: string;
  company: string;
  role: string;
  base: number;
  bonus: number;
  equity: number;
  location?: string;
  remote?: boolean;
  status?: string;
  notes?: string;
};

export default function CareerCopilotTab() {
  // Core state
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [jdPaste, setJdPaste] = useState("");
  const [showJd, setShowJd] = useState(false);
  const [hasResume, setHasResume] = useState(true);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [nba, setNba] = useState<NextAction[]>([]);
  const [compliance, setCompliance] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);

  // Dashboard
  const [kpiCards, setKpiCards] = useState<KpiCard[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [focusDist, setFocusDist] = useState<Record<string, number>>({});
  const [memoryCtx, setMemoryCtx] = useState<Record<string, unknown>>({});

  // Playground
  const [playground, setPlayground] = useState<PlaygroundState | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [pgBusy, setPgBusy] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Outreach
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [outreachBusy, setOutreachBusy] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ company: "", role: "", channel: "email" });
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  // Memory
  const [memoryNotes, setMemoryNotes] = useState<Record<string, string>>({});
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemVal, setNewMemVal] = useState("");
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<{
    headline: string;
    summary: string;
    wins: string[];
    focus_for_next_week: string[];
  } | null>(null);

  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [networkInsights, setNetworkInsights] = useState<{ headline: string; analysis: string; actions: string[] } | null>(null);
  const [newContact, setNewContact] = useState({
    name: "",
    company: "",
    role: "",
    platform: "linkedin",
    relationship_strength: "cold",
    notes: "",
  });
  const [networkBusy, setNetworkBusy] = useState(false);
  const [introByContact, setIntroByContact] = useState<Record<string, string>>({});

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offerCompare, setOfferCompare] = useState<{
    headline: string;
    recommendation: string;
    pros_cons: Array<{ company: string; pros: string[]; cons: string[] }>;
    total_comp_table: Array<{ company: string; total_comp: number }>;
  } | null>(null);
  const [newOffer, setNewOffer] = useState({
    company: "",
    role: "",
    base: "",
    bonus: "",
    equity: "",
    location: "",
    remote: false,
    notes: "",
  });
  const [offerBusy, setOfferBusy] = useState(false);
  const [negotiationByOffer, setNegotiationByOffer] = useState<Record<string, string>>({});

  // Navigation
  const [subTab, setSubTab] = useState<SubTab>("chat");
  const endRef = useRef<HTMLDivElement>(null);

  // Per-section async UI state (loading skeletons + quiet inline errors).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectionBusy, setSectionBusy] = useState<Partial<Record<SubTab, boolean>>>({});
  const [sectionError, setSectionError] = useState<Partial<Record<SubTab, string | null>>>({});

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  // ─── Data fetchers ──────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const r = await apiService.getCareerCopilotState();
    setLoading(false);
    if (r.error) { setLoadError(r.error); return; }
    const d = r.data!;
    setMessages((d.messages || []) as CopilotMessage[]);
    setHasResume(!!d.has_resume);
    setSuggested(d.suggested_prompts || []);
    setNba(d.next_best_actions || []);
    setPlayground((d.playground as PlaygroundState) || null);
    setTracks(d.tracks || []);
    if ((d as any).kpi_cards) setKpiCards((d as any).kpi_cards);
    if ((d as any).activity_timeline) setTimeline((d as any).activity_timeline);
    if ((d as any).focus_distribution) setFocusDist((d as any).focus_distribution);
    if ((d as any).memory_context) setMemoryCtx((d as any).memory_context);
  }, []);

  const loadTimeline = useCallback(async () => {
    const r = await apiService.getCopilotTimeline(20);
    if (r.data?.events) setTimeline(r.data.events);
  }, []);

  const loadCampaigns = useCallback(async () => {
    setSectionBusy((p) => ({ ...p, outreach: true }));
    setSectionError((p) => ({ ...p, outreach: null }));
    const r = await apiService.getOutreachCampaigns();
    setSectionBusy((p) => ({ ...p, outreach: false }));
    if (r.error) { setSectionError((p) => ({ ...p, outreach: r.error })); return; }
    if (r.data?.campaigns) setCampaigns(r.data.campaigns);
  }, []);

  const loadMemory = useCallback(async () => {
    const r = await apiService.getMemoryNotes();
    if (r.data?.notes) setMemoryNotes(r.data.notes);
  }, []);

  const loadMomentum = useCallback(async () => {
    const [m, d] = await Promise.all([
      apiService.getMomentumData(),
      apiService.getWeeklyDigest(),
    ]);
    if (m.data?.ok) setMomentum(m.data);
    if (d.data?.digest) setWeeklyDigest(d.data.digest);
  }, []);

  const loadNetworkData = useCallback(async () => {
    setSectionBusy((p) => ({ ...p, network: true }));
    setSectionError((p) => ({ ...p, network: null }));
    const [contactsResp, insightsResp] = await Promise.all([
      apiService.getNetworkContacts(),
      apiService.getNetworkingInsights(),
    ]);
    setSectionBusy((p) => ({ ...p, network: false }));
    if (contactsResp.error) setSectionError((p) => ({ ...p, network: contactsResp.error }));
    if (contactsResp.data?.contacts) setNetworkContacts(contactsResp.data.contacts as NetworkContact[]);
    if (insightsResp.data?.insights) setNetworkInsights(insightsResp.data.insights);
  }, []);

  const loadOffersData = useCallback(async () => {
    setSectionBusy((p) => ({ ...p, offers: true }));
    setSectionError((p) => ({ ...p, offers: null }));
    const [offersResp, compareResp] = await Promise.all([
      apiService.getOffers(),
      apiService.compareOffers(),
    ]);
    setSectionBusy((p) => ({ ...p, offers: false }));
    if (offersResp.error) setSectionError((p) => ({ ...p, offers: offersResp.error }));
    if (offersResp.data?.offers) setOffers(offersResp.data.offers as OfferItem[]);
    if (compareResp.data?.comparison) setOfferCompare(compareResp.data.comparison);
  }, []);

  const loadDashboard = useCallback(async () => {
    setSectionBusy((p) => ({ ...p, dashboard: true }));
    await Promise.all([loadTimeline(), loadMemory(), loadMomentum()]);
    setSectionBusy((p) => ({ ...p, dashboard: false }));
  }, [loadTimeline, loadMemory, loadMomentum]);

  useEffect(() => { void loadState(); }, [loadState]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (subTab === "outreach") void loadCampaigns();
    if (subTab === "dashboard") void loadDashboard();
    if (subTab === "network") void loadNetworkData();
    if (subTab === "offers") void loadOffersData();
  }, [subTab, loadCampaigns, loadDashboard, loadNetworkData, loadOffersData]);

  // ─── Chat ───────────────────────────────────────────────────────────────

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    const r = await apiService.sendCareerCopilotMessage(msg, showJd && jdPaste.trim() ? jdPaste : undefined);
    setSending(false);
    if (r.error) { toast.error(r.error); return; }
    const d = r.data!;
    if (d.messages) setMessages(d.messages as CopilotMessage[]);
    if (d.citations) setCitations(d.citations);
    if (d.compliance) setCompliance(d.compliance);
    if (d.suggested_prompts?.length) setSuggested(d.suggested_prompts);
    if (d.next_best_actions?.length) setNba(d.next_best_actions);
  };

  const onReset = async () => {
    if (!window.confirm("Clear this chat history?")) return;
    await apiService.resetCareerCopilotChat();
    setMessages([]); setCitations([]); setCompliance("");
    void loadState();
  };

  // ─── Playground ─────────────────────────────────────────────────────────

  const startTrack = async (trackId?: string) => {
    setPgBusy(true);
    const r = await apiService.startPlaygroundTrack(
      trackId ? { track_id: trackId } : { custom_topic: customTopic.trim() || undefined },
    );
    setPgBusy(false);
    if (r.error || !r.data?.ok) { toast.error(r.data?.error || r.error || "Couldn't start the track"); return; }
    setPlayground((r.data.playground as PlaygroundState) || null);
    setCustomTopic("");
    setQuiz(null); setQuizAnswers({}); setQuizSubmitted(false);
    toast.success("Track started");
  };

  const advance = async () => {
    setPgBusy(true);
    const r = await apiService.advancePlaygroundStep();
    setPgBusy(false);
    if (r.error || !r.data?.ok) { toast.error(r.data?.error || r.error); return; }
    setPlayground((r.data.playground as PlaygroundState) || null);
  };

  const resetPlay = async () => {
    if (!window.confirm("Reset learning progress?")) return;
    await apiService.resetPlaygroundTrack();
    setPlayground(null); setQuiz(null); setQuizAnswers({}); setQuizSubmitted(false);
  };

  const runQuiz = async () => {
    const topic = playground?.custom_topic || playground?.active_track || "general";
    setPgBusy(true);
    const r = await apiService.generatePlaygroundQuiz({ topic, difficulty: "medium", count: 4 });
    setPgBusy(false);
    if (r.data?.questions) { setQuiz(r.data.questions); setQuizAnswers({}); setQuizSubmitted(false); }
    else toast.error(r.error || "Could not generate quiz");
  };

  const currentStep = playground?.steps?.[playground.current_step ?? 0];
  const pgProgress = playground?.steps?.length && playground.current_step != null
    ? Math.min(100, (playground.current_step / playground.steps.length) * 100) : 0;

  // ─── Outreach ───────────────────────────────────────────────────────────

  const createCampaign = async () => {
    if (!newCampaign.company.trim() || !newCampaign.role.trim()) {
      toast.error("Company and role required"); return;
    }
    setOutreachBusy(true);
    const r = await apiService.createOutreachCampaign({
      target_company: newCampaign.company,
      target_role: newCampaign.role,
      channel: newCampaign.channel,
    });
    setOutreachBusy(false);
    if (r.error || !r.data?.ok) { toast.error(r.error || "Couldn't create the campaign"); return; }
    setShowNewCampaign(false);
    setNewCampaign({ company: "", role: "", channel: "email" });
    toast.success("Campaign created");
    void loadCampaigns();
  };

  const markStep = async (campId: string, stepIdx: number, status: string) => {
    const r = await apiService.updateOutreachStep(campId, { step_index: stepIdx, status });
    if (r.error) { toast.error(r.error); return; }
    void loadCampaigns();
  };

  // ─── Memory ─────────────────────────────────────────────────────────────

  const addMemory = async () => {
    if (!newMemKey.trim() || !newMemVal.trim()) { toast.error("Key and value required"); return; }
    const r = await apiService.saveMemoryNote(newMemKey.trim(), newMemVal.trim());
    if (r.error) { toast.error(r.error); return; }
    setNewMemKey(""); setNewMemVal("");
    void loadMemory();
    toast.success("Memory saved");
  };

  const delMemory = async (key: string) => {
    await apiService.deleteMemoryNote(key);
    void loadMemory();
  };

  const addContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setNetworkBusy(true);
    const r = await apiService.addNetworkContact(newContact);
    setNetworkBusy(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    setNewContact({
      name: "",
      company: "",
      role: "",
      platform: "linkedin",
      relationship_strength: "cold",
      notes: "",
    });
    void loadNetworkData();
  };

  const removeContact = async (contactId: string) => {
    const r = await apiService.deleteNetworkContact(contactId);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    void loadNetworkData();
  };

  const makeIntro = async (contactId: string) => {
    const r = await apiService.generateNetworkIntro(contactId);
    if (r.error || !r.data?.intro?.message) {
      toast.error(r.error || "Could not generate intro");
      return;
    }
    setIntroByContact((prev) => ({ ...prev, [contactId]: r.data!.intro.message }));
  };

  const addOffer = async () => {
    if (!newOffer.company.trim() || !newOffer.role.trim()) {
      toast.error("Company and role are required");
      return;
    }
    setOfferBusy(true);
    const r = await apiService.addOffer({
      company: newOffer.company,
      role: newOffer.role,
      base: Number(newOffer.base || 0),
      bonus: Number(newOffer.bonus || 0),
      equity: Number(newOffer.equity || 0),
      location: newOffer.location,
      remote: newOffer.remote,
      notes: newOffer.notes,
      status: "active",
    });
    setOfferBusy(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    setNewOffer({
      company: "",
      role: "",
      base: "",
      bonus: "",
      equity: "",
      location: "",
      remote: false,
      notes: "",
    });
    void loadOffersData();
  };

  const removeOffer = async (offerId: string) => {
    const r = await apiService.deleteOffer(offerId);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    void loadOffersData();
  };

  const generateNegotiation = async (offerId: string) => {
    const ask = "Request a higher base compensation while staying collaborative.";
    const r = await apiService.generateNegotiationScript(offerId, ask);
    if (r.error || !r.data?.script?.email_body) {
      toast.error(r.error || "Failed to generate script");
      return;
    }
    setNegotiationByOffer((prev) => ({ ...prev, [offerId]: r.data!.script.email_body }));
  };

  // ─── Focus distribution chart (simple bar) ─────────────────────────────

  const focusItems = useMemo(() => {
    const entries = Object.entries(focusDist);
    if (!entries.length) return [];
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return entries
      .map(([k, v]) => ({ topic: k, pct: Math.round((v / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [focusDist]);

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[50vh] rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-6">
        <p className="text-sm font-semibold text-destructive">Couldn't load your copilot workspace.</p>
        <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadState()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <History className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const SUB_TABS: Array<{ id: SubTab; label: string; icon: typeof Bot }> = [
    { id: "chat", label: "Copilot", icon: Bot },
    { id: "outreach", label: "Outreach", icon: Mail },
    { id: "playground", label: "Playground", icon: GraduationCap },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "network", label: "Network", icon: Linkedin },
    { id: "offers", label: "Offers", icon: Award },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="mesh-accent rounded-2xl border border-primary/20 p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Career · Copilot
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Career Copilot
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Ask naturally and get grounded responses from your resume context. Use this workspace for outreach, interview drills,
              application strategy, networking, and offer decisions. All in one guided flow.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Resume-grounded answers</span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Multi-agent tools</span>
              <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Actionable next steps</span>
            </div>
            {!hasResume && (
              <p className="mt-1 text-sm text-warning">
                No parsed resume. Upload in <strong>My Resumes</strong> for grounded answers.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => void loadState()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <History className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* KPI Row */}
      {kpiCards.length > 0 && <KpiRow cards={kpiCards} />}

      {/* Sub-tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card/60 p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              subTab === t.id
                ? "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main area */}
        <div className="min-w-0 space-y-4">

          {/* ═══════════ CHAT TAB ═══════════ */}
          {subTab === "chat" && (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Bot className="h-4 w-4 text-primary" /> Agentic chat
                </span>
                <button type="button" onClick={() => void onReset()}
                  className="text-xs text-destructive font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                >
                  <Trash2 className="inline h-3 w-3 mr-1" />Clear
                </button>
              </div>
              <div className="max-h-[min(56vh,620px)] overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { title: "Tailor for a role", prompt: "Tailor my resume strategy for a backend engineer role at Stripe." },
                    { title: "Practice interview", prompt: "Run a quick mock behavioral interview for senior backend roles." },
                    { title: "Create outreach", prompt: "Draft a 3-step outreach sequence for a recruiter at Google." },
                  ].map((quick) => (
                    <button
                      key={quick.title}
                      type="button"
                      onClick={() => void send(quick.prompt)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="font-semibold text-foreground">{quick.title}</p>
                      <p className="mt-0.5 text-muted-foreground">One-click starter</p>
                    </button>
                  ))}
                </div>
                {messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] p-5 text-sm text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                      <Sparkles className="h-4 w-4" /> Start with a play or ask anything
                    </div>
                    <ul className="ml-1 list-inside list-disc space-y-1.5 text-[13px]">
                      <li>Tailor bullets to a JD (paste one below).</li>
                      <li>Generate a cold email + LinkedIn connect sequence for a target company.</li>
                      <li>Scaffold a portfolio project with milestones.</li>
                      <li>Create a PPT outline for a presentation.</li>
                      <li>Practice STAR answers for behavioral interviews.</li>
                    </ul>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    const pipe = m.meta?.pipeline;
                    const tools = m.meta?.tool_calls;
                    const deliv = m.meta?.deliverable;
                    return (
                      <motion.div
                        key={m.id || `${m.role}-${m.at}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          {!isUser && pipe?.length ? <PipelineChips steps={pipe} /> : null}
                          {!isUser && tools?.length ? <ToolCallLog calls={tools} /> : null}
                          {!isUser && deliv ? <DeliverableCard d={deliv} /> : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {sending && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" /> Orchestrating agents…
                  </div>
                )}
                <div ref={endRef} />
              </div>
              {citations.length > 0 && (
                <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <p className="mb-1 font-semibold text-foreground/90">RAG sources</p>
                  <ul className="space-y-1">
                    {citations.slice(0, 4).map((c) => (
                      <li key={c.id}>
                        <span className="font-mono text-[10px] text-primary">{c.id}</span> {c.snippet}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t border-border p-3 sm:p-4 space-y-3">
                <button type="button" onClick={() => setShowJd((s) => !s)}
                  className="text-xs font-semibold text-primary"
                >
                  {showJd ? "Hide" : "Attach"} job description
                </button>
                {showJd && (
                  <textarea value={jdPaste} onChange={(e) => setJdPaste(e.target.value)} rows={3}
                    placeholder="Paste a job description. Agents use it for tailoring, outreach, and interview prep."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {compliance && <p className="text-[11px] text-warning">{compliance}</p>}
                {suggested.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggested.map((s) => (
                      <button key={s} type="button" onClick={() => void send(s)}
                        className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition"
                      >{s}</button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    rows={2}
                    placeholder="Ask: outreach, PPT, project scaffold, STAR answers, tailoring…"
                    className="min-h-[44px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="button" disabled={sending || !input.trim()} onClick={() => void send()} aria-label="Send message"
                    className="brand-gradient inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-panel active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ OUTREACH TAB ═══════════ */}
          {subTab === "outreach" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Outreach campaigns
                </h3>
                <button type="button" onClick={() => setShowNewCampaign(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> New campaign
                </button>
              </div>
              {showNewCampaign && (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
                  <input value={newCampaign.company} onChange={(e) => setNewCampaign((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Target company" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  <input value={newCampaign.role} onChange={(e) => setNewCampaign((p) => ({ ...p, role: e.target.value }))}
                    placeholder="Target role" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  <div className="flex gap-2">
                    {["email", "linkedin", "twitter"].map((ch) => (
                      <button key={ch} type="button" onClick={() => setNewCampaign((p) => ({ ...p, channel: ch }))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                          newCampaign.channel === ch
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >{ch}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={outreachBusy} onClick={() => void createCampaign()}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >{outreachBusy ? "Creating…" : "Create & auto-generate sequence"}</button>
                    <button type="button" onClick={() => setShowNewCampaign(false)} className="text-xs text-muted-foreground">Cancel</button>
                  </div>
                </div>
              )}
              {sectionBusy.outreach ? (
                <SectionSkeleton heights={["h-28", "h-28"]} />
              ) : sectionError.outreach ? (
                <SectionErrorNote message="Couldn't load your campaigns." onRetry={() => void loadCampaigns()} />
              ) : (
                <>
              {campaigns.length === 0 && !showNewCampaign && (
                <div className="rounded-xl border border-dashed border-border py-10 text-center">
                  <Mail className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No campaigns yet. Create one to get a ready-to-send outreach sequence.</p>
                </div>
              )}
              {campaigns.map((c) => {
                const ChIcon = CHANNEL_ICON[c.channel] || Mail;
                return (
                  <div key={c.campaign_id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{c.target_role} @ {c.target_company}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ChIcon className="h-3 w-3" /> {c.channel} · {c.status}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-success/10 text-success"
                        : c.status === "completed" ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                      }`}>{c.status}</span>
                    </div>
                    {c.sequence?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {c.sequence.map((s, si) => (
                          <div key={si} className="flex items-start gap-2 text-xs">
                            <div className={`mt-1 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              s.status === "sent" ? "bg-success text-white"
                              : s.status === "replied" ? "bg-primary text-primary-foreground"
                              : s.status === "skipped" ? "bg-muted-foreground/70 text-white"
                              : "border-2 border-border text-muted-foreground"
                            }`}>
                              {s.status === "sent" || s.status === "replied" ? <Check className="h-2.5 w-2.5" /> : s.step}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground">{s.action}</p>
                              {s.template && (
                                <p className="mt-1 text-muted-foreground whitespace-pre-wrap leading-relaxed">{s.template}</p>
                              )}
                              <div className="mt-1.5 flex gap-1.5">
                                {s.status === "pending" && (
                                  <>
                                    <button type="button" onClick={() => void markStep(c.campaign_id, si, "sent")}
                                      className="rounded px-2 py-0.5 bg-success/10 text-success font-semibold"
                                    >Mark sent</button>
                                    <button type="button" onClick={() => void markStep(c.campaign_id, si, "skipped")}
                                      className="rounded px-2 py-0.5 bg-muted text-muted-foreground font-semibold"
                                    >Skip</button>
                                  </>
                                )}
                                {s.status === "sent" && (
                                  <button type="button" onClick={() => void markStep(c.campaign_id, si, "replied")}
                                    className="rounded px-2 py-0.5 bg-primary/10 text-primary font-semibold"
                                  >Got reply</button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
                </>
              )}
            </div>
          )}

          {/* ═══════════ PLAYGROUND TAB ═══════════ */}
          {subTab === "playground" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> Guided learning paths
                    </h3>
                    {playground?.xp != null && (
                      <span className="flex items-center gap-1 text-xs font-bold text-warning">
                        <Trophy className="h-3.5 w-3.5" /> {playground.xp} XP
                        {(playground.streak ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 ml-2 text-warning">
                            <Flame className="h-3.5 w-3.5" /> {playground.streak}d streak
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Theory → practice, basic → advanced. Complete tracks, earn XP, take assessments. Or type any topic below.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Kubernetes for interviews, React performance patterns"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    <button type="button" disabled={pgBusy} onClick={() => void startTrack()}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >{pgBusy ? "Generating…" : "Generate custom track"}</button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {tracks.map((t) => (
                    <button key={t.id} type="button" onClick={() => void startTrack(t.id)} disabled={pgBusy}
                      className="text-left rounded-xl border border-border p-3 text-xs transition hover:border-primary/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block font-bold text-foreground text-[13px] leading-snug">{t.title}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.description}</span>
                      <span className="mt-1.5 inline-block text-[10px] font-semibold text-primary">
                        {t.steps.length} steps
                      </span>
                    </button>
                  ))}
                </div>
                {tracks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No tracks yet. Generate a custom track to get started.
                  </div>
                )}

                {playground?.steps && playground.steps.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4 space-y-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full brand-gradient transition-all"
                        style={{ width: `${pgProgress}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">
                        {playground.custom_title || tracks.find((x) => x.id === playground.active_track)?.title || "Track"}
                        {playground.finished_at && " · complete"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {playground.current_step ?? 0}/{playground.steps.length} steps
                      </span>
                    </div>
                    {playground.finished_at && !currentStep && (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/90 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Track complete. Take the assessment or send results to the copilot.
                        </p>
                        <button type="button" disabled={pgBusy} onClick={() => void runQuiz()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          <Award className="h-3.5 w-3.5" /> {pgBusy ? "Generating…" : "Take assessment"}
                        </button>
                      </div>
                    )}
                    {currentStep && !playground.finished_at && (
                      <>
                        <p className={`text-[10px] uppercase font-bold mt-1 ${
                          currentStep.type === "practice" ? "text-success" : "text-primary"
                        }`}>
                          {currentStep.type === "practice" ? "Practice" : "Theory"} · Step {(playground.current_step ?? 0) + 1}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{currentStep.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{currentStep.body}</p>
                        <div className="flex gap-2">
                          <button type="button" disabled={pgBusy} onClick={() => void advance()}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                          >
                            <Play className="h-3.5 w-3.5" /> Mark done & next
                          </button>
                          <button type="button" onClick={() => void send(`Help me with: ${currentStep.title}. ${currentStep.body}`)}
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                          >Ask copilot</button>
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => void resetPlay()} className="text-xs text-muted-foreground underline hover:text-foreground">Reset</button>
                  </div>
                )}

                {quiz && (
                  <div className="rounded-xl border border-success/20 bg-success/[0.04] p-4 space-y-4">
                    <p className="font-bold text-success text-sm flex items-center gap-1.5">
                      <Award className="h-4 w-4" /> Assessment
                    </p>
                    {quiz.map((q, qi) => (
                      <div key={qi} className="space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">{qi + 1}. {q.question}</p>
                        <div className="space-y-1">
                          {q.options.map((opt, oi) => {
                            const selected = quizAnswers[qi] === oi;
                            const isCorrect = quizSubmitted && oi === q.correct_index;
                            const isWrong = quizSubmitted && selected && oi !== q.correct_index;
                            return (
                              <button key={oi} type="button" disabled={quizSubmitted}
                                onClick={() => setQuizAnswers((p) => ({ ...p, [qi]: oi }))}
                                className={`w-full text-left rounded-lg border px-3 py-1.5 text-xs transition ${
                                  isCorrect ? "border-success bg-success/10 text-success"
                                  : isWrong ? "border-destructive bg-destructive/10 text-destructive"
                                  : selected ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-foreground/90 hover:border-primary/30"
                                }`}
                              >{opt}</button>
                            );
                          })}
                        </div>
                        {quizSubmitted && <p className="text-[11px] text-muted-foreground italic">{q.explanation}</p>}
                      </div>
                    ))}
                    {!quizSubmitted && (
                      <button type="button" onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(quizAnswers).length < quiz.length}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >Submit answers</button>
                    )}
                    {quizSubmitted && (
                      <p className="text-sm font-bold text-success">
                        Score: {quiz.filter((q, i) => quizAnswers[i] === q.correct_index).length}/{quiz.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ DASHBOARD TAB ═══════════ */}
          {subTab === "dashboard" && (
            <div className="space-y-5">
              {sectionBusy.dashboard ? (
                <SectionSkeleton heights={["h-40", "h-40", "h-32"]} />
              ) : (
              <>
              {/* Activity timeline */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" /> Activity timeline
                </h3>
                {timeline.length > 0 ? <TimelineList events={timeline} /> : (
                  <p className="text-xs text-muted-foreground">No activity yet. Start chatting, creating campaigns, or learning.</p>
                )}
              </div>

              {/* Focus distribution */}
              {focusItems.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" /> Topic focus
                  </h3>
                  <div className="space-y-2">
                    {focusItems.map((f) => (
                      <div key={f.topic} className="flex items-center gap-3">
                        <span className="w-20 text-xs font-medium text-foreground/90 capitalize truncate">{f.topic}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full brand-gradient" style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-8 text-right">{f.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {momentum && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-warning" /> Momentum engine
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Current streak</p>
                      <p className="text-xl font-bold text-warning">{momentum.streak} days</p>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Momentum score</p>
                      <p className="text-xl font-bold text-primary">{momentum.momentum_score}/100</p>
                    </div>
                    <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Week-over-week</p>
                      <p className="text-xl font-bold text-success">{momentum.this_week} vs {momentum.last_week}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-10 gap-1">
                    {momentum.heatmap.slice(-30).map((h) => (
                      <div key={h.date} title={`${h.date}: ${h.count} actions`} className={`h-3 rounded ${h.count >= 3 ? "bg-primary" : h.count >= 1 ? "bg-primary/40" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
              )}

              {weeklyDigest && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5">
                  <h3 className="text-sm font-bold text-primary">{weeklyDigest.headline}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{weeklyDigest.summary}</p>
                </div>
              )}

              {/* Memory notes */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-primary" /> Pinned memory
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Pin preferences so agents always know them: "Remote only," "Target PM roles," "No FAANG."
                </p>
                <div className="space-y-2">
                  {Object.entries(memoryNotes).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                      <Pin className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground">{k}</span>
                        <span className="mx-1 text-muted-foreground/70">→</span>
                        <span className="text-muted-foreground">{v}</span>
                      </div>
                      <button type="button" onClick={() => void delMemory(k)} className="text-muted-foreground/70 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {Object.keys(memoryNotes).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nothing pinned yet. Add preferences so the copilot remembers your constraints.
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input value={newMemKey} onChange={(e) => setNewMemKey(e.target.value)} placeholder="Key (e.g. constraint)"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground" />
                  <input value={newMemVal} onChange={(e) => setNewMemVal(e.target.value)} placeholder="Value (e.g. remote only)"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground" />
                  <button type="button" onClick={() => void addMemory()}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  ><Plus className="inline h-3 w-3 mr-0.5" /> Pin</button>
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {subTab === "network" && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} placeholder="Name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                <input value={newContact.company} onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))} placeholder="Company"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                <input value={newContact.role} onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))} placeholder="Role"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </div>
              <textarea value={newContact.notes} onChange={(e) => setNewContact((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <button type="button" onClick={() => void addContact()} disabled={networkBusy}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                Add contact
              </button>
              {sectionBusy.network ? (
                <SectionSkeleton heights={["h-16", "h-16", "h-16"]} />
              ) : sectionError.network ? (
                <SectionErrorNote message="Couldn't load your contacts." onRetry={() => void loadNetworkData()} />
              ) : (
                <>
              {networkInsights && <p className="text-xs text-muted-foreground">{networkInsights.analysis}</p>}
              <div className="space-y-2">
                {networkContacts.map((c) => (
                  <div key={c.contact_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{c.name} {c.company ? `· ${c.company}` : ""}</p>
                      <button type="button" onClick={() => void removeContact(c.contact_id)} className="text-xs text-destructive">Delete</button>
                    </div>
                    {c.role && <p className="text-xs text-muted-foreground mt-0.5">{c.role}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void makeIntro(c.contact_id)} className="rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">Generate intro</button>
                      {introByContact[c.contact_id] && (
                        <button type="button" onClick={() => navigator.clipboard?.writeText(introByContact[c.contact_id])} className="rounded bg-muted px-2 py-1 text-[11px]">Copy</button>
                      )}
                    </div>
                    {introByContact[c.contact_id] && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{introByContact[c.contact_id]}</p>}
                  </div>
                ))}
                {networkContacts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border py-8 text-center">
                    <Linkedin className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No contacts yet. Add someone to start building your referral pipeline.</p>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}

          {subTab === "offers" && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <input value={newOffer.company} onChange={(e) => setNewOffer((p) => ({ ...p, company: e.target.value }))} placeholder="Company"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                <input value={newOffer.role} onChange={(e) => setNewOffer((p) => ({ ...p, role: e.target.value }))} placeholder="Role"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                <input value={newOffer.base} onChange={(e) => setNewOffer((p) => ({ ...p, base: e.target.value }))} placeholder="Base salary"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </div>
              <button type="button" onClick={() => void addOffer()} disabled={offerBusy}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                Add offer
              </button>
              {sectionBusy.offers ? (
                <SectionSkeleton heights={["h-20", "h-24"]} />
              ) : sectionError.offers ? (
                <SectionErrorNote message="Couldn't load your offers." onRetry={() => void loadOffersData()} />
              ) : (
                <>
              {offerCompare && (
                <div className="rounded-lg border border-success/20 bg-success/[0.04] p-3">
                  <p className="text-sm font-bold text-success">{offerCompare.headline}</p>
                  <p className="text-xs text-muted-foreground mt-1">{offerCompare.recommendation}</p>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {offers.map((o) => (
                  <div key={o.offer_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{o.role} @ {o.company}</p>
                      <button type="button" onClick={() => void removeOffer(o.offer_id)} className="text-xs text-destructive">Delete</button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Base ${o.base || 0} · Bonus ${o.bonus || 0} · Equity ${o.equity || 0}</p>
                    <button type="button" onClick={() => void generateNegotiation(o.offer_id)}
                      className="mt-2 rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      Generate negotiation script
                    </button>
                    {negotiationByOffer[o.offer_id] && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{negotiationByOffer[o.offer_id]}</p>}
                  </div>
                ))}
                {offers.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border py-8 text-center md:col-span-2">
                    <Award className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No offers yet. Add one to compare total compensation and plan your negotiation.</p>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT SIDEBAR ═══════════ */}
        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" /> Next best actions
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Adaptive picks from your latest context + behavior patterns.
            </p>
            <ul className="mt-3 space-y-2">
              {nba.map((a, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => { setSubTab("chat"); void send(a.title); }}
                  >
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <p className="text-muted-foreground mt-0.5 leading-snug">{a.reason}</p>
                  </button>
                </li>
              ))}
            </ul>
            {nba.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No suggestions yet. Chat once to get personalized next actions.</p>
            )}
          </div>

          {/* Context card */}
          <div className="rounded-2xl border border-border bg-card p-4 text-xs shadow-soft">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> System overview
            </p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${hasResume ? "bg-success" : "bg-destructive"}`} />
                Resume: {hasResume ? "loaded" : "missing"}
              </li>
              <li>Messages: {messages.length}</li>
              <li>Campaigns: {campaigns.length}</li>
              <li>Memory notes: {Object.keys(memoryNotes).length}</li>
            </ul>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground leading-relaxed shadow-soft">
            <p className="font-semibold text-foreground">How the agentic loop works</p>
            <p className="mt-1.5">
              Each message enters a <strong>ReAct orchestrator</strong>. Aspirely decides which tools to call
              (resume RAG, JD analysis, bullet tailoring, email drafting, PPT/project scaffolding, quiz generation).
              Tool results feed back for up to 5 rounds, and every agent and tool call shows up in the pipeline chips.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
