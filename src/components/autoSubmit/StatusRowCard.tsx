/**
 * Rows in states the Auto-Apply tab used to render as NOTHING - or, worse, as a
 * re-approvable review card.
 *
 * `AutoSubmitStatus` only listed 12 of the ledger's statuses, so every
 * `unsupported` / `failed` / `preparing` / `confirmed` / `withdrawn` / `external`
 * row fell through the partition in AutoApplyTab and silently vanished from the
 * user's view. A failed application disappearing without explanation is the
 * reason applications seem to "just go missing".
 *
 * Each variant here states EXACTLY what happened, with no fabricated progress
 * and no implied blame:
 *   unsupported  spec §4 - an honest, calm "apply manually". NOT an error.
 *   failed       nothing was submitted. Visible, with the real reason.
 *   preparing    still gathering; it will reach the review queue on its own.
 *   outcome      terminal bookkeeping (confirmed / cancelled / withdrawn /
 *                external) - read-only, never approvable.
 */
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AutoSubmitApprovalView } from "@/types/autoSubmit";

export type StatusRowKind =
  | "unsupported"
  | "failed"
  | "preparing"
  | "confirmed"
  | "cancelled"
  | "withdrawn"
  | "external";

const FAILED_STATUSES = new Set(["failed", "failed_pre_submit"]);
const PREPARING_STATUSES = new Set(["draft", "queued", "gathering", "preparing"]);
const CANCELLED_STATUSES = new Set(["cancelled", "expired"]);

/**
 * Map a raw row status onto a card variant, or `null` when the row belongs to
 * another section (actionable / attention / approved). Exported so AutoApplyTab
 * partitions on exactly the same rule it renders with.
 */
export function statusRowKind(v: AutoSubmitApprovalView): StatusRowKind | null {
  const s = String(v.status);
  if (s === "unsupported") return "unsupported";
  if (FAILED_STATUSES.has(s)) return "failed";
  if (PREPARING_STATUSES.has(s)) return "preparing";
  if (s === "confirmed") return "confirmed";
  if (CANCELLED_STATUSES.has(s)) return "cancelled";
  if (s === "withdrawn") return "withdrawn";
  if (s === "external") return "external";
  return null;
}

interface Variant {
  /** Short state label in the card's top-right. */
  label: string;
  body: string;
  /** Container classes - `unsupported` is deliberately NOT styled as an error. */
  tone: string;
  labelTone: string;
  icon: typeof Info;
  spin?: boolean;
  /** Text for the outbound CTA, when one makes sense. */
  cta?: string;
}

const VARIANTS: Record<StatusRowKind, Variant> = {
  unsupported: {
    label: "Apply manually",
    body: "We can't auto-apply to this employer's system yet - please apply manually. Everything we prepared for you still applies.",
    tone: "border-border bg-muted/40",
    labelTone: "text-muted-foreground",
    icon: Info,
    cta: "Open job to apply",
  },
  failed: {
    label: "Didn't go through",
    body: "We couldn't finish this application. Nothing was submitted, so applying yourself won't create a duplicate.",
    tone: "border-destructive/30 bg-destructive/5",
    labelTone: "text-destructive",
    icon: AlertTriangle,
    cta: "Open job to apply",
  },
  preparing: {
    label: "Preparing",
    body: "We're gathering the answers for this one. It'll move to your queue on its own when it's ready.",
    tone: "border-border bg-card",
    labelTone: "text-muted-foreground",
    icon: Loader2,
    spin: true,
  },
  confirmed: {
    label: "Confirmed",
    body: "The employer confirmed they received this application.",
    tone: "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.06)]",
    labelTone: "text-[hsl(var(--success))]",
    icon: CheckCircle2,
    cta: "Open job",
  },
  cancelled: {
    label: "Cancelled",
    body: "This application wasn't submitted.",
    tone: "border-border bg-muted/40",
    labelTone: "text-muted-foreground",
    icon: XCircle,
    cta: "Open job to apply",
  },
  withdrawn: {
    label: "Withdrawn",
    body: "You withdrew this application.",
    tone: "border-border bg-muted/40",
    labelTone: "text-muted-foreground",
    icon: XCircle,
  },
  external: {
    label: "Applied elsewhere",
    body: "This was submitted outside JobPilot, so we're only tracking the employer's response.",
    tone: "border-border bg-muted/40",
    labelTone: "text-muted-foreground",
    icon: Send,
    cta: "Open job",
  },
};

export interface StatusRowCardProps {
  kind: StatusRowKind;
  role: string;
  company: string;
  url: string | null;
  /** Best-effort free-text reason from the ledger (`error` / `reason`). */
  reason?: string | null;
  /** ATS family label, shown on `unsupported` so the message is concrete. */
  ats?: string | null;
}

export default function StatusRowCard({
  kind,
  role,
  company,
  url,
  reason,
  ats,
}: StatusRowCardProps) {
  const v = VARIANTS[kind];
  const Icon = v.icon;
  const detail = (reason || "").trim();
  const atsLabel = (ats || "").trim();

  return (
    <div className={cn("rounded-xl border p-4", v.tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{role}</h4>
          <p className="truncate text-sm text-muted-foreground">{company}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-sm font-medium",
            v.labelTone,
          )}
        >
          <Icon className={cn("h-4 w-4", v.spin && "animate-spin")} />
          {v.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {v.body}
        {kind === "unsupported" && atsLabel ? ` (${atsLabel})` : ""}
      </p>

      {detail && (
        <p className="mt-1.5 text-xs text-muted-foreground">Details: {detail}</p>
      )}

      {v.cta && url && (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> {v.cta}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
