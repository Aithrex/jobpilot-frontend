import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CircleOff, ClipboardList, Ghost, LayoutGrid, List, MessagesSquare, Pencil,
  PenLine, Search, Send, Trophy, X, Zap,
} from "lucide-react";
import { apiService } from "@/lib/api";
import type { ApplicationStatus, TailoringRecord } from "@/types/resume";
import { formatDate } from "@/components/resume/ResumeDashboard";
import GmailIntegration from "@/components/resume/GmailIntegration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PanelError } from "@/app-shell/pages/today/primitives";

// ─── Column config ────────────────────────────────────────────────────────
// Status hues stay meaning-coded but resolve through the semantic token set:
// primary (in motion), --brand-to (interviewing), success (offer),
// destructive (rejected), warning (ghosted), muted (inactive).
const COLUMNS: {
  key: ApplicationStatus;
  label: string;
  dot: string;      // accent color class for the vertical rail
  chip: string;     // pill colour used on cards
  icon: React.ReactNode;
}[] = [
  { key: "draft",         label: "Draft",        dot: "bg-muted-foreground/50",           chip: "bg-muted text-muted-foreground border-border",                                                            icon: <PenLine className="h-3 w-3" /> },
  { key: "applied",       label: "Applied",      dot: "bg-primary",                       chip: "bg-primary/10 text-primary border-primary/25",                                                            icon: <Send className="h-3 w-3" /> },
  { key: "interviewing",  label: "Interviewing", dot: "bg-[hsl(var(--brand-to))]",        chip: "bg-[hsl(var(--brand-to)/0.12)] text-[hsl(var(--brand-to))] border-[hsl(var(--brand-to)/0.3)]",            icon: <MessagesSquare className="h-3 w-3" /> },
  { key: "offer",         label: "Offer",        dot: "bg-success",                       chip: "bg-success/10 text-success border-success/25",                                                            icon: <Trophy className="h-3 w-3" /> },
  { key: "rejected",      label: "Rejected",     dot: "bg-destructive/70",                chip: "bg-destructive/10 text-destructive border-destructive/25",                                                icon: <X className="h-3 w-3" /> },
  { key: "ghosted",       label: "Ghosted",      dot: "bg-warning",                       chip: "bg-warning/10 text-warning border-warning/25",                                                            icon: <Ghost className="h-3 w-3" /> },
  { key: "withdrawn",     label: "Withdrawn",    dot: "bg-muted-foreground/30",           chip: "bg-muted/60 text-muted-foreground border-border",                                                         icon: <CircleOff className="h-3 w-3" /> },
];

const STATUS_LOOKUP: Record<string, typeof COLUMNS[number]> = COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c }),
  {} as Record<string, typeof COLUMNS[number]>,
);

// Some backend services emit "interview" (singular) where the dashboard uses
// "interviewing". Other unknown statuses (e.g. legacy rows from migrations)
// would otherwise crash the row renderer when we access meta.dot / meta.chip.
const STATUS_ALIASES: Record<string, string> = {
  interview: "interviewing",
  interested: "draft",
  in_review: "applied",
  in_progress: "applied",
};
function statusMeta(status?: string | null): typeof COLUMNS[number] {
  const key = (status || "draft").toLowerCase();
  return STATUS_LOOKUP[key] || STATUS_LOOKUP[STATUS_ALIASES[key] || "draft"] || COLUMNS[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / 86400000);
}
function relDate(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d === null) return " - ";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 7) return `In ${d}d`;
  if (d <= 30) return `In ~${Math.round(d / 7)}w`;
  return `In ${Math.round(d / 30)}mo`;
}
function initials(name?: string): string {
  if (!name || name === "Not specified") return "·";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/** Calm token-driven avatar chip for company initials - one accent, not a
 *  per-company rainbow, so cards inherit the workspace's single-accent rule. */
const avatarCls = "bg-primary/10 text-primary";

// ─── Metric card ──────────────────────────────────────────────────────────
function Metric({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative rounded-xl border border-border bg-card px-4 py-3 overflow-hidden shadow-soft">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
interface ApplicationsTabProps {
  /** When mounted inside the app shell (which renders its own h1/SubNav),
   *  suppress the tab's internal hero header so the page has one title. */
  embedded?: boolean;
}

export default function ApplicationsTab({ embedded = false }: ApplicationsTabProps) {
  const [records, setRecords] = useState<TailoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editing, setEditing] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [funnel, setFunnel] = useState<{ counts: Record<string, number>; conversions: Record<string, number>; insight?: { headline: string; insight: string; action_items: string[] } } | null>(null);
  const [staleApps, setStaleApps] = useState<Array<{ record_id: string; job_title: string; company: string; days_stale: number }>>([]);
  const [followups, setFollowups] = useState<Record<string, { subject: string; message: string }>>({});
  const [reframe, setReframe] = useState<{ acknowledgement: string; what_went_right: string; next_actions: string[]; silver_lining: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ApplicationStatus | null>(null);
  // Show-all toggle for stale-apps list (defaults to top 4).
  const [staleShowAll, setStaleShowAll] = useState(false);

  // Track auxiliary loads separately from the primary records load so we can
  // paint the kanban as soon as `listTailoringRecords` resolves and let the
  // funnel/stale panels stream in once they're ready. Previously the whole
  // tab waited on the slowest of three serial-blocking endpoints.
  const [funnelLoading, setFunnelLoading] = useState(true);

  // Drag-and-drop only makes sense with a fine pointer (mouse/trackpad).
  // On touch devices the cards' status <select> is the supported mutation
  // path, so we disable HTML5 DnD there entirely.
  const [canDrag, setCanDrag] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanDrag(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Silent mode: post-action refreshes (e.g. applying a Gmail suggestion)
  // re-fetch in place without toggling the page-wide skeleton, so the user
  // doesn't see a 1-2s blank flash. Only the very first load shows the
  // skeleton.
  const fetch = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setFunnelLoading(true);
      setLoadError(null);
    }

    // Records are the only thing the kanban needs to render - fire it first
    // and clear the page-level loading flag the moment it resolves.
    const recordsPromise = apiService.listTailoringRecords().then((resp) => {
      if (resp.error) {
        // Track the failure so we can render a retryable error panel instead
        // of masquerading as "No applications yet". Silent refreshes keep the
        // data already on screen and just toast.
        setLoadError(resp.error);
        if (silent) toast.error("Couldn't refresh applications");
      } else if (resp.data) {
        setRecords((resp.data.records || []) as TailoringRecord[]);
        setLoadError(null);
      }
      if (!silent) setLoading(false);
    });

    // Funnel + stale-apps are auxiliary panels - let them resolve in the
    // background; kanban is already visible.
    const auxPromise = Promise.all([
      apiService.getFunnelAnalytics(),
      apiService.getStaleApplications(5),
    ]).then(([funnelResp, staleResp]) => {
      if (funnelResp.data?.ok) {
        setFunnel({
          counts: funnelResp.data.counts || {},
          conversions: funnelResp.data.conversions || {},
          insight: funnelResp.data.insight,
        });
      }
      if (staleResp.data?.stale_applications) {
        setStaleApps(staleResp.data.stale_applications as Array<{ record_id: string; job_title: string; company: string; days_stale: number }>);
      }
      if (!silent) setFunnelLoading(false);
    });

    await Promise.all([recordsPromise, auxPromise]);
  }, []);
  const fetchSilent = useCallback(() => fetch({ silent: true }), [fetch]);
  useEffect(() => { fetch(); }, [fetch]);

  const updateRecord = useCallback((id: string, patcher: (r: TailoringRecord) => TailoringRecord) => {
    setRecords(prev => prev.map(r => r.record_id === id ? patcher(r) : r));
  }, []);

  // Refresh the funnel counts after a status change so the column counts
  // (from local `grouped`) and the summary chips (from server `funnel`)
  // stay in lockstep. Cheap fire-and-forget - no toast on failure.
  const refreshFunnel = useCallback(async () => {
    try {
      const r = await apiService.getFunnelAnalytics();
      if (r.data) {
        setFunnel({
          counts: r.data.counts || {},
          conversions: r.data.conversions || {},
          insight: r.data.insight,
        });
      }
    } catch { /* best effort */ }
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: ApplicationStatus) => {
    setSavingId(id);
    const resp = await apiService.updateApplication(id, { status });
    setSavingId(null);
    if (resp.error) { toast.error("Couldn't update status"); return; }
    updateRecord(id, r => ({ ...r, application: { ...(r.application || {}), ...resp.data!.application } }));
    refreshFunnel();
    if (status === "rejected") {
      const refr = await apiService.reframeRejection(id);
      if (refr.data?.reframe) setReframe(refr.data.reframe);
    }
  }, [updateRecord, refreshFunnel]);

  // Drag & drop handlers - optimistic update, then persist via the
  // existing updateApplication endpoint. Rollback on failure.
  const handleDrop = useCallback(async (status: ApplicationStatus) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOverCol(null);
    if (!id) return;
    const current = records.find((r) => r.record_id === id);
    if (!current) return;
    const prev = (current.application?.status || 'draft') as ApplicationStatus;
    if (prev === status) return;
    // Optimistic
    updateRecord(id, (r) => ({
      ...r,
      application: { ...(r.application || {}), status },
    }));
    setSavingId(id);
    const resp = await apiService.updateApplication(id, { status });
    setSavingId(null);
    if (resp.error) {
      // Rollback
      updateRecord(id, (r) => ({
        ...r,
        application: { ...(r.application || {}), status: prev },
      }));
      toast.error("Couldn't move the card. Reverted.");
      return;
    }
    updateRecord(id, (r) => ({
      ...r,
      application: { ...(r.application || {}), ...resp.data!.application },
    }));
    refreshFunnel();
    if (status === 'rejected') {
      const refr = await apiService.reframeRejection(id);
      if (refr.data?.reframe) setReframe(refr.data.reframe);
    }
  }, [draggingId, records, updateRecord, refreshFunnel]);

  const handlePatch = useCallback(async (id: string, patch: Parameters<typeof apiService.updateApplication>[1]) => {
    setSavingId(id);
    const resp = await apiService.updateApplication(id, patch);
    setSavingId(null);
    if (resp.error) { toast.error("Couldn't save changes"); return; }
    updateRecord(id, r => ({ ...r, application: { ...(r.application || {}), ...resp.data!.application } }));
    toast.success("Saved");
  }, [updateRecord]);

  // Quick search across role + company + recruiter
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const hay = `${r.jd_analysis?.job_title || ""} ${r.jd_analysis?.company || ""} ${r.application?.recruiter_name || ""} ${r.application?.recruiter_company || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

  const grouped = useMemo(() => {
    const g: Record<ApplicationStatus, TailoringRecord[]> = {
      draft: [], applied: [], interviewing: [], offer: [], rejected: [], withdrawn: [], ghosted: [],
    };
    for (const r of searched) {
      const s = (r.application?.status || "draft") as ApplicationStatus;
      (g[s] || g.draft).push(r);
    }
    for (const k of Object.keys(g) as ApplicationStatus[]) {
      g[k].sort((a, b) => {
        const aDate = a.application?.next_action_date ? new Date(a.application.next_action_date).getTime() : Infinity;
        const bDate = b.application?.next_action_date ? new Date(b.application.next_action_date).getTime() : Infinity;
        if (aDate !== bDate) return aDate - bDate;
        const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bc - ac;
      });
    }
    return g;
  }, [searched]);

  // Dashboard metrics (whole set, not filtered)
  const metrics = useMemo(() => {
    const active = records.filter(r => {
      const s = r.application?.status || "draft";
      return s !== "rejected" && s !== "withdrawn" && s !== "ghosted";
    });
    const upcomingList = records
      .filter(r => r.application?.next_action_date)
      .map(r => ({ r, d: daysUntil(r.application?.next_action_date) }))
      .filter(x => x.d !== null && x.d <= 14)
      .sort((a, b) => a.d! - b.d!);
    const offers = records.filter(r => r.application?.status === "offer");
    const interviewing = records.filter(r => r.application?.status === "interviewing");
    const applied = records.filter(r => r.application?.status === "applied").length;
    // Response rate = (interviewing + offer + rejected) / applied+interviewing+offer+rejected
    const resp = records.filter(r => ["interviewing", "offer", "rejected"].includes(r.application?.status || "")).length;
    const total = applied + resp;
    const respRate = total > 0 ? Math.round((resp / total) * 100) : null;
    return {
      total: records.length,
      active: active.length,
      interviewing: interviewing.length,
      offers: offers.length,
      upcoming: upcomingList,
      respRate,
    };
  }, [records]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Active loading indicator - spinner + descriptive text so users
            understand the tab is working rather than frozen. */}
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
            role="status"
            aria-label="Loading"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Loading your applications...</p>
            <p className="text-[11px] text-muted-foreground">Pulling tailored records, funnel analytics, and follow-up nudges.</p>
          </div>
        </div>
        {/* Skeleton placeholders - sized to roughly match the real layout so
            the layout doesn't jump when the data arrives. */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-56 rounded-xl bg-muted/40 animate-pulse md:w-[272px] md:shrink-0 ${i > 2 ? "hidden md:block" : ""}`}
            />
          ))}
        </div>
      </div>
    );
  }
  if (loadError && records.length === 0) {
    // API failure - never masquerade as an empty pipeline.
    return (
      <PanelError
        title="Couldn't load your applications"
        body={loadError}
        onRetry={() => fetch()}
      />
    );
  }
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="h-6 w-6" />
        </div>
        <p className="font-display text-sm font-semibold text-foreground">No applications yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Tailor a resume and it lands here as a draft. Then track every role from applied to offer,
          with no guessing which stage you're in.
        </p>
        <Button asChild className="mt-4 min-h-11">
          <Link to="/next/craft/tailor">Tailor a resume</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header - the hero title is suppressed when the app shell already
          renders the page h1/SubNav (embedded), leaving only the controls. */}
      <div className={`flex items-start gap-3 flex-wrap ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Library · Applications</p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Applications</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Your pipeline. Every role from first tailor to offer, tracked in one place.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search role, company, recruiter..."
              aria-label="Search applications"
              className="h-11 w-[min(280px,72vw)] bg-card pl-9"
            />
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => { if (v === "kanban" || v === "list") setView(v); }}
            aria-label="Pipeline view"
            className="rounded-lg border border-border bg-muted p-0.5"
          >
            <ToggleGroupItem
              value="kanban"
              className="h-11 gap-1.5 px-3 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Kanban
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              className="h-11 gap-1.5 px-3 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              <List className="h-4 w-4" aria-hidden="true" /> List
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="space-y-1.5">
        <GmailIntegration onSyncComplete={fetchSilent} />
        <p className="text-right text-xs text-muted-foreground">
          <Link
            to="/next/settings/integrations"
            className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Manage Gmail in Settings
          </Link>
        </p>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Metric label="Total" value={metrics.total} accent="bg-primary" />
        <Metric label="Active" value={metrics.active} accent="bg-primary/60" />
        <Metric label="Interviewing" value={metrics.interviewing} accent="bg-[hsl(var(--brand-to))]" />
        <Metric label="Offers" value={metrics.offers} accent="bg-success" />
        <Metric
          label="Response rate"
          value={metrics.respRate !== null ? `${metrics.respRate}%` : " - "}
          accent="bg-muted-foreground/50"
        />
      </div>

      {funnelLoading && !funnel && (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/[0.03] px-3 py-2 text-[11px] text-primary">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <span>Crunching funnel intelligence and stale-application nudges...</span>
        </div>
      )}

      {funnel && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-2">Funnel intelligence</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            {["draft", "applied", "interviewing", "offer", "rejected", "ghosted"].map((k) => (
              <div key={k} className="rounded-lg border border-primary/15 bg-card/70 px-2 py-1.5">
                <p className="text-muted-foreground capitalize">{k}</p>
                <p className="font-semibold text-foreground tabular-nums">{funnel.counts[k] ?? 0}</p>
              </div>
            ))}
          </div>
          {funnel.insight && <p className="mt-2 text-xs text-muted-foreground">{funnel.insight.insight}</p>}
        </div>
      )}

      {/* Upcoming banner */}
      {metrics.upcoming.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-warning/15 text-warning flex items-center justify-center"><Zap className="h-3.5 w-3.5" /></div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
              Next actions · {metrics.upcoming.length}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {metrics.upcoming.map(({ r, d }) => (
              <div key={r.record_id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card/70 border border-warning/25 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full ${d! < 0 ? "bg-destructive" : d! <= 2 ? "bg-warning" : "bg-muted-foreground/50"}`} />
                <span className="font-medium text-foreground">{r.jd_analysis?.job_title || "Untitled"}</span>
                {r.jd_analysis?.company && r.jd_analysis.company !== "Not specified" && (
                  <span className="text-muted-foreground">· {r.jd_analysis.company}</span>
                )}
                <span className={`font-semibold ${d! < 0 ? "text-destructive" : d! <= 2 ? "text-warning" : "text-muted-foreground"}`}>
                  {relDate(r.application?.next_action_date)}
                </span>
                {r.application?.next_action_note && <span className="text-muted-foreground italic">· {r.application.next_action_note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {staleApps.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/[0.05] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
              Needs follow-up · {staleApps.length}
            </p>
            {staleApps.length > 4 && (
              <button
                type="button"
                onClick={() => setStaleShowAll((v) => !v)}
                className="text-[11px] text-warning underline-offset-2 hover:underline"
              >
                {staleShowAll ? 'Show fewer' : `Show all ${staleApps.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(staleShowAll ? staleApps : staleApps.slice(0, 4)).map((s) => (
              <div key={s.record_id} className="rounded-lg border border-warning/20 bg-card/70 p-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    {s.job_title} {s.company ? `· ${s.company}` : ""}
                    <span className="ml-2 inline-flex items-center rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      {s.days_stale}d silent
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await apiService.generateIntelligenceFollowup({ record_id: s.record_id, channel: "email" });
                        if (r.data?.followup) {
                          setFollowups((prev) => ({ ...prev, [s.record_id]: { subject: r.data!.followup.subject, message: r.data!.followup.message } }));
                        }
                      }}
                      className="rounded bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning hover:bg-warning/15 transition-colors"
                    >
                      Draft follow-up
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await apiService.dismissIntelligenceFollowup(s.record_id);
                        if (r.error) { toast.error(r.error); return; }
                        // Optimistic local removal - server will already not return it next time.
                        setStaleApps(prev => prev.filter(x => x.record_id !== s.record_id));
                        setFollowups(prev => {
                          const next = { ...prev };
                          delete next[s.record_id];
                          return next;
                        });
                      }}
                      className="rounded border border-warning/25 px-2 py-1 text-[11px] font-medium text-warning/80 hover:bg-warning/5 transition-colors"
                      title="Hide this follow-up nudge until the application status changes again"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                {followups[s.record_id] && (
                  <div className="mt-2 space-y-2 rounded border border-border/80 p-2 text-xs">
                    <p className="font-semibold text-foreground">{followups[s.record_id].subject}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{followups[s.record_id].message}</p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border/60 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const f = followups[s.record_id];
                          navigator.clipboard
                            .writeText(`Subject: ${f.subject}\n\n${f.message}`)
                            .then(() => toast.success('Copied. Paste into your email'))
                            .catch(() => toast.error('Clipboard blocked'));
                        }}
                        className="rounded border border-border bg-card px-2 py-1 text-[11px] text-foreground hover:bg-muted transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const f = followups[s.record_id];
                          const params = new URLSearchParams();
                          params.set('view', 'cm');
                          params.set('fs', '1');
                          params.set('su', f.subject);
                          params.set('body', f.message);
                          window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Open in Gmail ↗
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reframe && (
        <div className="rounded-2xl border border-success/25 bg-success/[0.05] p-4">
          <p className="text-sm font-semibold text-success">{reframe.acknowledgement}</p>
          <p className="mt-1 text-xs text-muted-foreground">{reframe.what_went_right}</p>
          <ul className="mt-2 list-disc ml-5 text-xs text-muted-foreground">
            {reframe.next_actions?.map((a, idx) => <li key={idx}>{a}</li>)}
          </ul>
          <p className="mt-2 text-xs font-medium text-success">{reframe.silver_lining}</p>
        </div>
      )}

      {/* Pipeline */}
      {view === "kanban" ? (
        <>
          <p className="text-xs italic text-muted-foreground">
            {canDrag
              ? "Tip: drag a card between columns to update its status."
              : "Tip: use the status dropdown on each card to move it between stages."}
          </p>
          {/* Horizontal scroll-snap board on md+ (columns never wrap into a
              grid of tiles); a plain vertical stack on small screens where
              DnD is disabled and the card status select does the work. */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:snap-x md:snap-proximity md:overflow-x-auto md:pb-3">
          {COLUMNS.map(col => {
            const list = grouped[col.key];
            const isDragOver = canDrag && dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => { if (!canDrag) return; e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setDragOverCol((c) => (c === col.key ? null : c));
                }}
                onDrop={(e) => { if (!canDrag) return; e.preventDefault(); handleDrop(col.key); }}
                className={`relative rounded-xl border overflow-hidden transition-all md:w-[272px] md:shrink-0 md:snap-start ${
                  isDragOver
                    ? 'border-primary/60 bg-primary/10 ring-2 ring-primary/40 scale-[1.01]'
                    : 'border-border bg-card/60'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-0.5 ${col.dot}`} />
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {col.icon}
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                    {list.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px] max-h-[68vh] overflow-y-auto">
                  {list.map(r => (
                    <div
                      key={r.record_id}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        if (!canDrag) return;
                        setDraggingId(r.record_id);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', r.record_id); } catch { /* */ }
                      }}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                      className={`transition-opacity ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
                        draggingId === r.record_id ? 'opacity-40' : ''
                      }`}
                    >
                      <ApplicationCard
                        record={r}
                        saving={savingId === r.record_id}
                        isEditing={editing === r.record_id}
                        onToggleEdit={() => setEditing(editing === r.record_id ? null : r.record_id)}
                        onStatusChange={(s) => handleStatusChange(r.record_id, s)}
                        onPatch={(patch) => handlePatch(r.record_id, patch)}
                      />
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-[10px] text-muted-foreground/70 italic">
                        {isDragOver ? 'Drop here' : 'Nothing here yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Company / Role</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Applied</th>
                <th className="text-left px-3 py-3 font-semibold">Next action</th>
                <th className="text-left px-3 py-3 font-semibold">Recruiter</th>
                <th className="text-left px-3 py-3 font-semibold">ATS</th>
              </tr>
            </thead>
            <tbody>
              {searched.map(r => {
                const co = r.jd_analysis?.company && r.jd_analysis.company !== "Not specified" ? r.jd_analysis.company : "";
                const st = r.application?.status || "draft";
                const meta = statusMeta(st);
                const ats = r.ats_scores?.overall;
                const d = daysUntil(r.application?.next_action_date);
                return (
                  <tr key={r.record_id} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 shrink-0 rounded-lg ${avatarCls} text-[11px] font-bold flex items-center justify-center`}>
                          {initials(co) || initials(r.jd_analysis?.job_title)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{r.jd_analysis?.job_title || " - "}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{co || " - "}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={st}
                        onChange={e => handleStatusChange(r.record_id, e.target.value as ApplicationStatus)}
                        disabled={savingId === r.record_id}
                        className={`text-[10px] px-2 py-1 rounded-full font-semibold border ${meta.chip}`}
                      >
                        {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[11px]">{r.application?.applied_at ? formatDate(r.application.applied_at) : " - "}</td>
                    <td className="px-3 py-2.5 text-[11px]">
                      {r.application?.next_action_date ? (
                        <span className={`${d! < 0 ? "text-destructive font-semibold" : d !== null && d <= 2 ? "text-warning font-semibold" : "text-muted-foreground"}`}>
                          {relDate(r.application.next_action_date)}
                          {r.application.next_action_note && <span className="text-muted-foreground"> · {r.application.next_action_note}</span>}
                        </span>
                      ) : " - "}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[11px] truncate max-w-[160px]">
                      {r.application?.recruiter_name || " - "}
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      {ats !== undefined ? (
                        <span className={`tabular-nums font-semibold ${ats >= 80 ? "text-success" : ats >= 60 ? "text-warning" : "text-destructive"}`}>
                          {ats}
                        </span>
                      ) : " - "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────
function ApplicationCard({
  record, saving, isEditing, onToggleEdit, onStatusChange, onPatch,
}: {
  record: TailoringRecord;
  saving: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onStatusChange: (s: ApplicationStatus) => void;
  onPatch: (p: Parameters<typeof apiService.updateApplication>[1]) => void;
}) {
  const app = record.application || {};
  const [recruiterName, setRecruiterName] = useState(app.recruiter_name || "");
  const [recruiterEmail, setRecruiterEmail] = useState(app.recruiter_email || "");
  const [nextDate, setNextDate] = useState(app.next_action_date ? app.next_action_date.slice(0, 10) : "");
  const [nextNote, setNextNote] = useState(app.next_action_note || "");
  const [notes, setNotes] = useState(app.notes || "");
  const [jobUrl, setJobUrl] = useState(app.job_url || "");

  const d = daysUntil(app.next_action_date);
  const urgent = d !== null && d <= 2;
  const overdue = d !== null && d < 0;
  const title = record.jd_analysis?.job_title || "Untitled";
  const company = record.jd_analysis?.company && record.jd_analysis.company !== "Not specified" ? record.jd_analysis.company : null;
  const ats = record.ats_scores?.overall;
  const meta = statusMeta(app.status);

  const save = () => {
    onPatch({
      recruiter_name: recruiterName,
      recruiter_email: recruiterEmail,
      next_action_date: nextDate ? new Date(nextDate).toISOString() : null,
      next_action_note: nextNote,
      notes,
      job_url: jobUrl,
    });
    onToggleEdit();
  };

  return (
    <div
      className={`group relative rounded-lg border bg-card transition-all overflow-hidden ${
        overdue
          ? "border-destructive/40 shadow-soft"
          : urgent
          ? "border-warning/40 shadow-soft"
          : "border-border hover:border-primary/30 hover:shadow-soft"
      }`}
    >
      {/* Left accent rail */}
      <div className={`absolute inset-y-0 left-0 w-0.5 ${meta.dot}`} />

      <div className="pl-2.5 pr-2 py-2 space-y-1.5">
        {/* Top row: company avatar + title */}
        <div className="flex items-start gap-2">
          <div className={`w-7 h-7 shrink-0 rounded-md ${avatarCls} text-[10px] font-bold flex items-center justify-center`}>
            {initials(company || title)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground truncate leading-snug">{title}</p>
            {company && <p className="text-[10px] text-muted-foreground truncate">{company}</p>}
          </div>
          <button
            onClick={onToggleEdit}
            className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title={isEditing ? "Close" : "Edit"}
            aria-label={isEditing ? "Close editor" : "Edit application"}
          >{isEditing ? <X className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}</button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {ats !== undefined && (
            <span className={`text-[10px] font-semibold tabular-nums ${ats >= 80 ? "text-success" : ats >= 60 ? "text-warning" : "text-destructive"}`}>
              ATS {ats}
            </span>
          )}
          {d !== null && (
            <span className={`text-[10px] font-medium ${overdue ? "text-destructive font-bold" : urgent ? "text-warning" : "text-muted-foreground"}`}>
              {overdue && "⚠ "}{relDate(app.next_action_date)}
            </span>
          )}
          {app.next_action_note && (
            <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]">· {app.next_action_note}</span>
          )}
        </div>

        {/* Status select */}
        <select
          value={app.status || "draft"}
          onChange={e => onStatusChange(e.target.value as ApplicationStatus)}
          disabled={saving}
          className={`w-full text-[10px] px-2 py-1 rounded-md border font-semibold capitalize ${meta.chip}`}
        >
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        {/* Expanded editor */}
        {isEditing && (
          <div className="pt-2 mt-1 space-y-1.5 border-t border-border">
            <div className="grid grid-cols-1 gap-1.5">
              <input placeholder="Recruiter name" value={recruiterName} onChange={e => setRecruiterName(e.target.value)}
                     className="w-full text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input focus:outline-none focus:ring-1 focus:ring-ring/30" />
              <input placeholder="Recruiter email" value={recruiterEmail} onChange={e => setRecruiterEmail(e.target.value)}
                     className="w-full text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input focus:outline-none focus:ring-1 focus:ring-ring/30" />
              <input placeholder="Job URL" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                     className="w-full text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input focus:outline-none focus:ring-1 focus:ring-ring/30" />
              <div className="grid grid-cols-2 gap-1.5">
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                       className="text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input" />
                <input placeholder="Action" value={nextNote} onChange={e => setNextNote(e.target.value)}
                       className="text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input" />
              </div>
              <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                     className="w-full text-[10px] px-2 py-1.5 rounded-md bg-muted/40 border border-input resize-none focus:outline-none focus:ring-1 focus:ring-ring/30" />
            </div>
            <div className="flex gap-1.5 justify-end pt-1">
              <button onClick={onToggleEdit}
                      className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={save} disabled={saving}
                      className="text-[10px] px-2.5 py-0.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50 shadow-soft">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
