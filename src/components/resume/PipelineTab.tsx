import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp, Ghost, Users, RefreshCw, AlertCircle, ArrowRight, Info, Send,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MailIngressCard } from "./MailIngressCard";
import type { PipelineFunnel, PipelineGhost, PipelineCohort } from "@/types/pipeline";

interface PipelineTabProps {
  onNavigate?: (tab: string) => void;
}

/** Conversion/callback values arrive as either a 0-1 fraction or a percent. */
function pct(v?: number): number {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v <= 1 ? v * 100 : v);
}

function FunnelCard({ funnel }: { funnel: PipelineFunnel }) {
  const max = Math.max(1, ...funnel.stages.map((s) => s.count));
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="h-4 w-4" />
        </span>
        <h3 className="font-display text-sm font-bold">Your funnel</h3>
      </div>

      <div className="space-y-2.5">
        {funnel.stages.map((s) => {
          const width = Math.max(4, Math.round((s.count / max) * 100));
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="flex h-full items-center rounded-md bg-gradient-to-r from-primary/70 to-primary px-2 text-[11px] font-bold text-primary-foreground transition-all"
                  style={{ width: `${width}%` }}
                >
                  {s.count}
                </div>
              </div>
            </div>
          );
        })}
        {funnel.stages.length === 0 && (
          <p className="text-sm text-muted-foreground">No tracked applications yet.</p>
        )}
      </div>

      {/* Conversions */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        {[
          { label: "Applied → interview", v: funnel.conversion.applied_to_interview },
          { label: "Interview → offer", v: funnel.conversion.interview_to_offer },
          { label: "Applied → offer", v: funnel.conversion.applied_to_offer },
        ].map((c) => (
          <div key={c.label} className="text-center">
            <p className="font-display text-xl font-extrabold tabular-nums">{pct(c.v)}%</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {funnel.untracked_stages?.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Some stages aren't tracked yet ({funnel.untracked_stages.join(", ")}). Keep statuses current for a sharper funnel.
        </p>
      )}
    </div>
  );
}

function GhostsCard({
  ghosts,
  onMark,
  marking,
  onNavigate,
}: {
  ghosts: PipelineGhost[];
  onMark: (id: string) => void;
  marking: string | null;
  onNavigate?: (tab: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted-foreground/10 text-muted-foreground">
          <Ghost className="h-4 w-4" />
        </span>
        <h3 className="font-display text-sm font-bold">Likely ghosted</h3>
      </div>

      {ghosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No silent applications. You're on top of it.</p>
          {onNavigate && (
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-primary" onClick={() => onNavigate("applications")}>
              View all applications <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {ghosts.map((g) => (
            <li
              key={g.application_id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{g.role || "Role"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {g.company || "Company"} · {g.days_since_last_event}d silent
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 text-xs"
                disabled={marking === g.application_id}
                onClick={() => onMark(g.application_id)}
              >
                {marking === g.application_id ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Ghost className="h-3 w-3" />
                )}
                Mark as ghosted
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CohortCard({ cohort }: { cohort: PipelineCohort }) {
  const insufficient = cohort.insufficient || cohort.cohort_callback_rate == null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </span>
        <h3 className="font-display text-sm font-bold">How you compare</h3>
      </div>

      {insufficient ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm font-medium">Not enough data yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {cohort.reason ||
              "We compare you to people applying to similar roles, but only once there's enough activity to be honest and private."}
          </p>
          {cohort.your_callback_rate != null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Your callback rate so far:{" "}
              <span className="font-semibold text-foreground">{pct(cohort.your_callback_rate)}%</span>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3 text-center">
              <p className="font-display text-2xl font-extrabold tabular-nums text-primary">{pct(cohort.your_callback_rate)}%</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Your callback rate</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
              <p className="font-display text-2xl font-extrabold tabular-nums">{pct(cohort.cohort_callback_rate)}%</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Similar applicants</p>
            </div>
          </div>
          {cohort.strongest_predictor && (
            <p className="text-xs text-foreground/80">
              <span className="font-semibold">Biggest lever:</span> {cohort.strongest_predictor}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {cohort.noised
              ? "Comparison numbers are slightly noised to protect everyone's privacy."
              : "Based on aggregated, anonymized activity."}
            {cohort.sample_size ? ` Sample: ~${cohort.sample_size}.` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PipelineTab({ onNavigate }: PipelineTabProps) {
  const [funnel, setFunnel] = useState<PipelineFunnel | null>(null);
  const [ghosts, setGhosts] = useState<PipelineGhost[] | null>(null);
  const [cohort, setCohort] = useState<PipelineCohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [fR, gR, cR] = await Promise.all([
      apiService.getPipelineFunnel().catch(() => ({ error: "x" } as const)),
      apiService.getPipelineGhosts().catch(() => ({ error: "x" } as const)),
      apiService.getPipelineCohort().catch(() => ({ error: "x" } as const)),
    ]);
    if ("data" in fR && fR.data) setFunnel(fR.data as PipelineFunnel);
    if ("data" in gR && gR.data) setGhosts((gR.data as { ghosts: PipelineGhost[] }).ghosts || []);
    if ("data" in cR && cR.data) setCohort(cR.data as PipelineCohort);
    // Only hard-error when everything failed - partial data still renders.
    if (!("data" in fR) && !("data" in gR) && !("data" in cR)) {
      setError("Couldn't load your pipeline. Try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markGhost = async (id: string) => {
    setMarking(id);
    const res = await apiService.markPipelineGhosts([id]);
    setMarking(null);
    if (res.error) {
      toast.error("Couldn't mark as ghosted", { description: res.error });
      return;
    }
    setGhosts((prev) => (prev ? prev.filter((g) => g.application_id !== id) : prev));
    toast.success("Marked as ghosted");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Career · Pipeline</p>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Pipeline Intelligence</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Where your applications convert, which have gone quiet, and how you stack up. Honestly.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {funnel && <FunnelCard funnel={funnel} />}
          <div className="grid gap-4 lg:grid-cols-2">
            {ghosts && (
              <GhostsCard ghosts={ghosts} onMark={markGhost} marking={marking} onNavigate={onNavigate} />
            )}
            {cohort && <CohortCard cohort={cohort} />}
          </div>
          {!funnel && !ghosts && !cohort && (
            <div className="rounded-2xl border border-dashed border-border py-14 text-center">
              <Send className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Apply to a few roles to unlock your pipeline analytics.</p>
            </div>
          )}

          {/* Inbox capture - self-hides when the feature flag is off (404). */}
          <MailIngressCard />
        </div>
      )}
    </div>
  );
}
