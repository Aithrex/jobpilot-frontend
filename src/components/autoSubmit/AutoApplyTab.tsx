import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Pencil,
  ExternalLink,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAutoSubmit, type ApproveOutcome } from "@/hooks/useAutoSubmit";
import type { AutoSubmitApprovalView } from "@/types/autoSubmit";

// ── display helpers ─────────────────────────────────────────────────────────

function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function bestUrl(v: AutoSubmitApprovalView): string | null {
  return v.url || v.application_url || null;
}

function displayRole(v: AutoSubmitApprovalView): string {
  return v.role || v.title || "Application";
}

function displayCompany(v: AutoSubmitApprovalView): string {
  return v.company || hostFromUrl(bestUrl(v)) || "Unknown source";
}

function normalizeMatch(v: AutoSubmitApprovalView): number | null {
  if (v.match_score == null) return null;
  const n = v.match_score <= 1 ? v.match_score * 100 : v.match_score;
  return Math.round(n);
}

function secondsLeft(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - now) / 1000));
}

function fmtClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Single 1s ticker, only alive while a countdown is on screen. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

// ── settings ────────────────────────────────────────────────────────────────

function SettingsCard({
  enabled,
  saving,
  onToggle,
}: {
  enabled: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Card className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">
              Let Aspirely submit applications you've approved
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Off by default. Aspirely only prepares applications for you to
            review. Turn this on and Aspirely can submit an application{" "}
            <span className="font-medium text-foreground">
              after you approve it
            </span>
            , with a short window to cancel before it's sent. You approve each
            one, and you can switch this off any time. The browser extension also
            has its own per-device off switch, so you're always in control.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <Switch
            checked={enabled}
            disabled={saving}
            onCheckedChange={onToggle}
            aria-label="Let Aspirely submit applications you've approved"
          />
          <span
            className={cn(
              "text-[11px] font-medium",
              enabled ? "text-primary" : "text-muted-foreground",
            )}
          >
            {saving ? "Saving…" : enabled ? "On" : "Review only"}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── review (pending) card ───────────────────────────────────────────────────

function ReviewCard({
  view,
  optedIn,
  onApprove,
}: {
  view: AutoSubmitApprovalView;
  optedIn: boolean;
  onApprove: (
    v: AutoSubmitApprovalView,
    answers: Record<string, string>,
  ) => Promise<ApproveOutcome>;
}) {
  const initial = view.answers_snapshot ?? {};
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);

  const url = bestUrl(view);
  const match = normalizeMatch(view);
  const questions = Object.keys(initial);
  const canApprove = optedIn && !!url;

  const submit = async () => {
    if (!canApprove || !url) return;
    setBusy(true);
    const out = await onApprove(view, answers);
    setBusy(false);
    if (out.ok) return;
    if (out.needsOptIn) {
      toast.error("Turn on auto-submit first", {
        description: "Enable the switch above so Aspirely can submit for you.",
      });
    } else if (out.quota) {
      toast.error("You've reached today's auto-submit limit", {
        description:
          out.quota.resets_at
            ? `Resets ${new Date(out.quota.resets_at).toLocaleDateString()}.`
            : "Try again after your quota resets.",
      });
    } else if (out.error) {
      toast.error("Couldn't approve", { description: out.error });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{displayRole(view)}</h4>
          <p className="truncate text-sm text-muted-foreground">
            {displayCompany(view)}
          </p>
        </div>
        {match != null && (
          <Badge
            variant="secondary"
            className="shrink-0 border-primary/20 bg-primary/10 text-primary"
          >
            {match}% match
          </Badge>
        )}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{url}</span>
        </a>
      )}

      {questions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Pencil className="h-3 w-3" />
            Your answers. Edit before approving
          </div>
          {questions.map((q) => (
            <div key={q} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{q}</Label>
              <Textarea
                value={answers[q] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                }
                rows={2}
                className="resize-y text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No application questions to review for this posting.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {optedIn
            ? "You'll get a short window to cancel after approving."
            : "Turn on auto-submit above to approve."}
        </p>
        <Button
          size="sm"
          disabled={!canApprove || busy}
          onClick={submit}
          className="shrink-0"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Approve &amp; submit
        </Button>
      </div>
    </div>
  );
}

// ── waiting (approved) card ─────────────────────────────────────────────────

function WaitingCard({
  view,
  now,
  onCancel,
}: {
  view: AutoSubmitApprovalView;
  now: number;
  onCancel: (v: AutoSubmitApprovalView) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const left = secondsLeft(view.undo_until, now);
  const status = view.status;

  const cancel = async () => {
    setBusy(true);
    const out = await onCancel(view);
    setBusy(false);
    if (out.ok) {
      toast.success("Cancelled", {
        description: "This application won't be submitted.",
      });
    } else {
      toast.error("Couldn't cancel", { description: out.error });
    }
  };

  let state: "cancellable" | "submitting" | "submitted" | "cancelled";
  if (status === "submitted") state = "submitted";
  else if (status === "cancelled" || status === "expired") state = "cancelled";
  else if (left > 0) state = "cancellable";
  else state = "submitting";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        state === "submitted"
          ? "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.06)]"
          : state === "cancelled"
            ? "border-border bg-muted/40"
            : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{displayRole(view)}</h4>
          <p className="truncate text-sm text-muted-foreground">
            {displayCompany(view)}
          </p>
        </div>

        {state === "submitted" && (
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
            <CheckCircle2 className="h-4 w-4" />
            Submitted
          </span>
        )}
        {state === "cancelled" && (
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
            <XCircle className="h-4 w-4" />
            Cancelled
          </span>
        )}
      </div>

      {state === "cancellable" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5"
            role="status"
            aria-live="polite"
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm text-foreground">
              Submitting in{" "}
              <span className="font-semibold tabular-nums">{fmtClock(left)}</span>
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={cancel}
            className="shrink-0"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel
          </Button>
        </div>
      )}

      {state === "submitting" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Handed to your browser to submit.
        </div>
      )}
    </div>
  );
}

// ── section wrapper ─────────────────────────────────────────────────────────

function SectionHeading({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

// ── panel ───────────────────────────────────────────────────────────────────

export default function AutoApplyTab() {
  const reduceMotion = useReducedMotion();
  const {
    available,
    enabled,
    savingSettings,
    setEnabled,
    pending,
    waiting,
    pendingLoading,
    pendingError,
    refetchPending,
    approve,
    cancel,
  } = useAutoSubmit();

  const hasLiveCountdown = useMemo(
    () =>
      waiting.some(
        (w) =>
          w.status !== "submitted" &&
          w.status !== "cancelled" &&
          !!w.undo_until,
      ),
    [waiting],
  );
  const now = useNow(hasLiveCountdown);

  const onToggle = async (next: boolean) => {
    const ok = await setEnabled(next);
    if (!ok) {
      toast.error("Couldn't update setting", {
        description: "Please try again in a moment.",
      });
      return;
    }
    toast.success(
      next ? "Auto-submit is on" : "Back to review only",
      {
        description: next
          ? "Aspirely will submit applications you approve, with a cancel window."
          : "Aspirely will only prepare applications for you to review.",
      },
    );
  };

  // Still resolving the feature flag.
  if (available === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // Master flag off — feature unavailable. Kept calm; the nav entry should be
  // gated on `available` so users rarely land here.
  if (available === false) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <Card className="surface flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Auto-Apply isn't available on your account yet.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header>
        <div className="flex items-center gap-1.5 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            Career · Auto-Apply
          </span>
        </div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          Approve, then Aspirely submits
        </h2>
        <p className="text-sm text-muted-foreground">
          You stay in control. Nothing is sent until you approve it, and you can
          cancel within a short window.
        </p>
      </header>

      <SettingsCard enabled={enabled} saving={savingSettings} onToggle={onToggle} />

      {/* Ready to submit — the review queue */}
      <section className="space-y-3">
        <SectionHeading
          icon={<Send className="h-4 w-4 text-primary" />}
          title="Ready to submit"
          count={pending.length}
        />

        {pendingLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : pendingError ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              Couldn't load your review queue. Check your connection and try
              again.
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPending()}>
              Retry
            </Button>
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nothing waiting for review</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              When Aspirely prepares an application, it'll appear here for your
              approval. You're always the one who says go.
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {pending.map((v) => (
              <ReviewCard
                key={v.approval_id}
                view={v}
                optedIn={enabled}
                onApprove={(view, answers) =>
                  approve({
                    application_id: view.application_id,
                    url: bestUrl(view) ?? "",
                    answers,
                  })
                }
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* Approved — handed to the extension */}
      {waiting.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={<Clock className="h-4 w-4 text-primary" />}
            title="Approved & submitting"
            count={waiting.length}
          />
          <div className="space-y-3">
            {waiting.map((v) => (
              <WaitingCard key={v.approval_id} view={v} now={now} onCancel={cancel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
