import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, RefreshCw, FileUp, Sparkles, Lock, AlertCircle } from "lucide-react";
import { apiService } from "@/lib/api";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  isSixSecondsNoResume,
  type SixSecondsResult,
  type SixSecondsSuccess,
} from "@/types/sixSeconds";

interface SixSecondsTabProps {
  /** Lets the no-résumé empty state jump the user to an upload surface. */
  onNavigate?: (tab: string) => void;
}

/** Accent intensity for a section, floored so even skimmed sections read. */
function heatStyle(weight: number): React.CSSProperties {
  const w = Math.max(0, Math.min(1, weight || 0));
  return { backgroundColor: `hsl(var(--primary) / ${(0.08 + w * 0.62).toFixed(3)})` };
}

function GazeHeatmap({ data }: { data: SixSecondsSuccess }) {
  const sections = [...(data.gaze.sections || [])].sort((a, b) => b.weight - a.weight);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Eye className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold">Where the eye lands</h3>
        </div>
        {/* Intensity legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span>skimmed</span>
          <span className="h-2.5 w-16 rounded-full bg-gradient-to-r from-primary/10 to-primary" aria-hidden />
          <span>focused</span>
        </div>
      </div>

      <ol className="space-y-2">
        {sections.map((s, i) => {
          const pct = Math.round((s.weight || 0) * 100);
          return (
            <li
              key={s.key || i}
              style={heatStyle(s.weight)}
              className="flex items-start gap-3 rounded-xl border border-primary/10 px-3.5 py-3 transition-colors"
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-background/60 text-[11px] font-bold tabular-nums text-foreground/80">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{s.label}</p>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-foreground/70">{pct}%</span>
                </div>
                {s.reason && (
                  <p className="mt-0.5 text-xs leading-snug text-foreground/70">{s.reason}</p>
                )}
              </div>
            </li>
          );
        })}
        {sections.length === 0 && (
          <li className="rounded-xl border border-dashed border-border px-3.5 py-6 text-center text-xs text-muted-foreground">
            No sections were detected in your resume.
          </li>
        )}
      </ol>
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  tone: "focus" | "blind";
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3
        className={cn(
          "mb-3 text-sm font-bold",
          tone === "focus" ? "text-primary" : "text-warning",
        )}
      >
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  tone === "focus" ? "bg-primary/60" : "bg-warning/70",
                )}
                aria-hidden
              />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImpressionRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="border-t border-border/70 py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm leading-snug text-foreground/90">{value}</dd>
    </div>
  );
}

function ImpressionCard({ data }: { data: SixSecondsSuccess }) {
  const imp = data.impression;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
        <Sparkles className="h-4 w-4" /> The honest six-second read
      </div>
      {imp.six_second_verdict && (
        <p className="mb-4 text-base font-semibold leading-snug text-foreground">
          "{imp.six_second_verdict}"
        </p>
      )}
      <dl>
        <ImpressionRow label="Reads as" value={imp.headline_read} />
        <ImpressionRow label="Level read" value={imp.level_read} />
        <ImpressionRow label="Stands out" value={imp.standout} />
        <ImpressionRow label="Missing or unclear" value={imp.missing_or_unclear} />
      </dl>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
    </div>
  );
}

export default function SixSecondsTab({ onNavigate }: SixSecondsTabProps) {
  const upgrade = useUpgrade();
  const [result, setResult] = useState<SixSecondsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ranOnce = useRef(false);
  const reduceMotion = useReducedMotion();

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setGated(false);
    const res = await apiService.runSixSeconds(controller.signal);
    if (controller.signal.aborted) return;
    if (res.error) {
      if (res.status === 403 || res.status === 429) {
        setGated(true);
        upgrade.open({
          feature: "six_seconds",
          title: "Unlock the recruiter's six-second read",
          description:
            "See exactly where a recruiter's eye lands on your resume, and what gets skipped.",
        });
      } else {
        setError(res.error);
      }
      setLoading(false);
      return;
    }
    setResult(res.data ?? null);
    setLoading(false);
  }, [upgrade]);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    void run();
    return () => abortRef.current?.abort();
  }, [run]);

  const noResume = isSixSecondsNoResume(result);
  const success = result && !noResume ? (result as SixSecondsSuccess) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Grow · Resume
          </p>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Recruiter's Six Seconds</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            A recruiter spends about six seconds on a first pass. This is a calm, honest read of what
            they actually see. Where the eye lands, and what slips by.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={run}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          {loading ? "Reading…" : "Re-run"}
        </Button>
      </div>

      {/* Loading */}
      {loading && <LoadingState />}

      {/* No résumé */}
      {!loading && noResume && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <FileUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Upload a resume to see the six-second read</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            We need a parsed resume to simulate a recruiter's first pass. It takes a few seconds.
          </p>
          {onNavigate && (
            <Button className="mt-4 gap-1.5" size="sm" onClick={() => onNavigate("my-resumes")}>
              <FileUp className="h-3.5 w-3.5" /> Upload a resume
            </Button>
          )}
        </div>
      )}

      {/* Gated */}
      {!loading && gated && !success && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">This read is a premium feature</p>
          <Button className="mt-4" size="sm" onClick={() => upgrade.open({ feature: "six_seconds" })}>
            See plans
          </Button>
        </div>
      )}

      {/* Error */}
      {!loading && error && !gated && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn't complete the read.</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={run}>Retry</Button>
        </div>
      )}

      {/* Result */}
      {!loading && success && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <GazeHeatmap data={success} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ListCard
              title="What draws the eye"
              items={success.gaze.focal_points || []}
              tone="focus"
              empty="No strong focal points. The page reads flat."
            />
            <ListCard
              title="Blind spots"
              items={success.gaze.blind_spots || []}
              tone="blind"
              empty="Nothing obvious gets skipped. Nice."
            />
          </div>

          {(success.gaze.pattern || success.gaze.note) && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              {success.gaze.pattern && (
                <p className="text-sm font-semibold text-foreground">{success.gaze.pattern}</p>
              )}
              {success.gaze.note && (
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{success.gaze.note}</p>
              )}
            </div>
          )}

          <ImpressionCard data={success} />
        </motion.div>
      )}
    </div>
  );
}
