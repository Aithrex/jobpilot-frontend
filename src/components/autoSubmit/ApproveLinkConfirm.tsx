import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Confirmation surface for an emailed approval link.
 *
 * The email link's GET is NON-mutating - the backend 302s the browser to
 * `/app/apply?approve=<token>`. This component (mounted on that page,
 * inside the authed app shell) completes the action via the CSRF-safe
 * `POST /api/apply/approve-link`, reading the outcome off the HTTP status:
 *   200 approved (`approved > 0`) · 200 not-ready (`approved === 0`) ·
 *   409 already-used · 403 wrong-account. None is ever a 401 by contract.
 *
 * Signed OUT (defensive - the shell normally redirects first): we bounce to
 * `/login`, preserving the token in `state.from` so Login lands back here and
 * re-runs the confirmation after sign-in.
 */

type ConfirmState =
  | "confirming"
  | "approved"
  | "not_ready"
  | "review"
  | "already_used"
  | "wrong_account"
  | "error";

interface Visual {
  tone: "success" | "info" | "muted" | "danger";
  icon: React.ReactNode;
  title: string;
  message: string;
}

function visualFor(state: ConfirmState, detail?: string): Visual {
  switch (state) {
    case "approved":
      return {
        tone: "success",
        icon: <CheckCircle2 className="h-5 w-5" />,
        title: "Application approved",
        message:
          "Thanks - we've approved it and it's on its way to being submitted.",
      };
    case "not_ready":
      return {
        tone: "info",
        icon: <Clock className="h-5 w-5" />,
        title: "Not ready to approve yet",
        message:
          "This application is still being prepared, so there was nothing to approve. Open your review queue and try again in a moment.",
      };
    case "review":
      return {
        tone: "info",
        icon: <Info className="h-5 w-5" />,
        title: "Here's your review queue",
        message: "Review your prepared applications below.",
      };
    case "already_used":
      return {
        tone: "muted",
        icon: <Info className="h-5 w-5" />,
        title: "This link was already used",
        message:
          "You've already used this approval link - no further action was taken.",
      };
    case "wrong_account":
      return {
        tone: "danger",
        icon: <ShieldAlert className="h-5 w-5" />,
        title: "This link is for a different account",
        message:
          "This approval link belongs to another account. Sign in with the account it was sent to, then open the link again.",
      };
    case "error":
    default:
      return {
        tone: "danger",
        icon: <ShieldAlert className="h-5 w-5" />,
        title: "We couldn't complete that",
        message:
          detail ||
          "Something went wrong confirming this link. Open your review queue to approve from there.",
      };
  }
}

const TONE_CLASSES: Record<Visual["tone"], string> = {
  success:
    "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.06)] text-[hsl(var(--success))]",
  info: "border-primary/30 bg-primary/5 text-primary",
  muted: "border-border bg-muted/40 text-muted-foreground",
  danger:
    "border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] text-destructive",
};

export default function ApproveLinkConfirm({
  token,
  onDismiss,
}: {
  token: string;
  onDismiss?: () => void;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [state, setState] = useState<ConfirmState>("confirming");
  const [detail, setDetail] = useState<string | undefined>();
  const ran = useRef(false);

  useEffect(() => {
    // Fire the confirming POST exactly once, and only for a signed-in user.
    if (ran.current || isLoading || !isAuthenticated) return;
    ran.current = true;
    let alive = true;
    (async () => {
      const res = await apiService.confirmApproveLink(token);
      if (!alive) return;
      if (res.status === 409) {
        setState("already_used");
      } else if (res.status === 403) {
        setState("wrong_account");
      } else if (res.error || !res.data) {
        setDetail(res.error);
        setState("error");
      } else {
        const d = res.data;
        if (d.action === "review") {
          setState("review");
        } else if ((d.approved ?? 0) > 0 || d.ready) {
          setState("approved");
          // Keep the review queue in sync now that a row is approved.
          qc.invalidateQueries({ queryKey: ["auto-submit", "pending"] });
        } else if ((d.skipped ?? 0) > 0) {
          setState("review");
        } else {
          setState("not_ready");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, isAuthenticated, isLoading, qc]);

  // Still verifying the session - hold before deciding signed-in vs signed-out.
  if (isLoading) {
    return (
      <Card
        className="flex items-center gap-3 p-4 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        Checking your approval link...
      </Card>
    );
  }

  // Signed out: preserve the token across sign-in (Login honors state.from).
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: "/app/apply",
            search: `?approve=${encodeURIComponent(token)}`,
          },
        }}
      />
    );
  }

  if (state === "confirming") {
    return (
      <Card
        className="flex items-center gap-3 p-4 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        Confirming your approval...
      </Card>
    );
  }

  const v = visualFor(state, detail);
  const isProblem = v.tone === "danger";

  return (
    <Card
      className={cn("relative border p-4 pr-11", TONE_CLASSES[v.tone])}
      role={isProblem ? "alert" : "status"}
      aria-live={isProblem ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {v.icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold">{v.title}</h3>
          <p className="mt-1 text-sm text-foreground/80">{v.message}</p>
          {state === "wrong_account" && (
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/login">Switch account</Link>
            </Button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </Card>
  );
}
