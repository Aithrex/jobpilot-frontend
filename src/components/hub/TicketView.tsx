import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  Github,
  Linkedin,
  Loader2,
  Package,
  Send,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MentorChat from "./MentorChat";
import CountdownTimer from "./CountdownTimer";
import { priorityStyle } from "./hubConstants";
import { useSubmitDay, isUpgrade } from "@/hooks/useHub";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import type { HubDay, HubPathParams, HubSubmitResult } from "@/types/hub";
import { cn } from "@/lib/utils";

interface TicketViewProps {
  day: HubDay;
  params?: HubPathParams;
  onBack: () => void;
  onCompleted?: (result: HubSubmitResult) => void;
}

type FeedbackCriterion = { criterion: string; met: string; evidence?: string };
type Feedback = { message: string; criteria: FeedbackCriterion[] };

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

/** Full-screen ticket page — replaces the old right-side drawer. Renders in
 *  place of the day timeline; `onBack` returns to it. */
export default function TicketView({ day, params, onBack, onCompleted }: TicketViewProps) {
  const submit = useSubmitDay(params);
  const { open: openUpgrade } = useUpgrade();
  const [repoUrl, setRepoUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (!day.ticket) return null;
  const t = day.ticket;
  const isCompleted = day.state === "completed";
  const canSubmit = day.state === "current";
  const hasRepo = /github\.com\/[^/]+\/[^/]+/i.test(repoUrl.trim());

  const handleSubmit = async () => {
    try {
      setFeedback(null);
      const result = await submit.mutateAsync({ dayKey: day.key, repoUrl: repoUrl.trim() });
      if (!result.verified) {
        setFeedback({
          message: result.message || "Verification did not pass.",
          criteria: (result as { criteria_results?: FeedbackCriterion[] }).criteria_results || [],
        });
        toast.error("Not verified yet", { description: "See the reviewer notes below." });
        return;
      }
      toast.success(`${t.ticket_number} shipped! +${result.xp_gained} XP`);
      onCompleted?.(result);
      onBack();
    } catch (e) {
      const err = e as Error & { status?: number; errorPayload?: Record<string, unknown> };
      if (isUpgrade(err)) {
        openUpgrade({
          feature: "learning",
          title: "Keep your sprint going",
          description: "You've hit today's limit. Upgrade to continue without waiting.",
        });
        return;
      }
      toast.error("Could not submit", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-3 gap-1 px-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to timeline
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {t.ticket_number}
          </Badge>
          <Badge variant="outline" className={cn("text-[11px]", priorityStyle(t.priority))}>
            {t.priority}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {t.difficulty}
          </Badge>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {t.estimated_time}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--success))]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{t.sprint_label}</p>
        <h1 className="mt-0.5 text-2xl font-extrabold gradient-text">{t.title}</h1>
      </div>

      {/* Two-column body: ticket on the left, mentor on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Section title="Business Context">
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
              {t.business_context}
            </p>
          </Section>

          <Section title="Sprint Objective" icon={<Target className="h-3.5 w-3.5" />}>
            <p className="text-sm leading-relaxed text-foreground">{t.sprint_objective}</p>
          </Section>

          <Section title="Acceptance Criteria" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            <ul className="space-y-2">
              {t.acceptance_criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Deliverables" icon={<Package className="h-3.5 w-3.5" />}>
            <ul className="space-y-1.5">
              {t.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>

          {t.helpful_resources.length > 0 && (
            <Section title="Helpful Resources">
              <div className="flex flex-col gap-1.5">
                {t.helpful_resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {r.label}
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Mentor — sticky beside the ticket on desktop, stacked on mobile. */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <Section title="AI Mentor">
            <MentorChat dayKey={day.key} params={params} />
          </Section>
        </div>
      </div>

      {/* Action bar — pinned to the bottom while you scroll the ticket. */}
      {canSubmit && (
        <div className="sticky bottom-0 z-20 -mx-1 rounded-t-xl border-t border-border bg-background/95 px-1 pt-3 backdrop-blur">
          {feedback && (
            <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3">
              <p className="text-sm font-medium text-destructive">Not verified yet</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{feedback.message}</p>
              {feedback.criteria.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {feedback.criteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 shrink-0 font-semibold">
                        {c.met === "yes" ? "✓" : c.met === "partial" ? "~" : "✗"}
                      </span>
                      <span>{c.criterion}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Fix these and submit again — retries are free.</p>
            </div>
          )}

          <label
            htmlFor="hub-repo-url"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <Github className="h-3.5 w-3.5" /> Proof of work — public repo URL
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="hub-repo-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/your-repo"
              disabled={submit.isPending}
              className="h-11 flex-1 text-sm"
            />
            <Button
              className="btn-premium h-11 shrink-0 gap-1.5 px-5"
              disabled={submit.isPending || !hasRepo}
              onClick={handleSubmit}
              title={!hasRepo ? "Add a public GitHub repo URL to submit" : undefined}
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submit.isPending ? "Verifying…" : "Submit"}
            </Button>
          </div>
          <p className="mb-3 mt-1.5 text-xs text-muted-foreground">
            Graded against the acceptance criteria above. Repo must be public, with commits pushed after you
            started.
          </p>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/[0.06] px-4 py-3">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
            <CheckCircle2 className="h-4 w-4" /> Done
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto">
                  <Button variant="outline" size="sm" disabled className="gap-1.5">
                    <Linkedin className="h-4 w-4" /> Share
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>LinkedIn sharing — coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {(day.state === "unlocking_soon" || day.state === "available_tomorrow") && day.unlock_at ? (
        <div className="rounded-xl border border-border px-5 py-2 text-center text-xs text-muted-foreground">
          Unlocks in <CountdownTimer target={day.unlock_at} />
        </div>
      ) : null}
    </div>
  );
}
