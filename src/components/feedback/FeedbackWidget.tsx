import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiService } from "@/lib/api";

// ── Context so anywhere in the app can call openFeedback({type, prefill}) ──

type FeedbackType = "general" | "quota_bump" | "bug" | "idea";

interface OpenOpts {
  type?: FeedbackType;
  prefill?: string;
  title?: string;
}

interface FeedbackContextValue {
  open: (opts?: OpenOpts) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    // Soft fallback so callers don't crash if the provider isn't mounted yet.
    return { open: () => undefined } as FeedbackContextValue;
  }
  return ctx;
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  general: "General feedback",
  idea: "Idea / feature request",
  bug: "Report a bug",
  quota_bump: "Request more tailors",
};

const TYPE_PLACEHOLDERS: Record<FeedbackType, string> = {
  general: "What's on your mind? Anything that worked well, broke, or felt off...",
  idea: "Describe the feature or change you'd like to see.",
  bug: "What happened, what did you expect, and how can I reproduce it?",
  quota_bump:
    "Tell me a bit about your job-hunt push (target roles, how many resumes you're aiming to send this week) and I'll bump your limit.",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  const handleOpen = useCallback((opts?: OpenOpts) => {
    if (opts?.type) setType(opts.type);
    if (opts?.prefill) setMessage(opts.prefill);
    setTitleOverride(opts?.title ?? null);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ open: handleOpen }), [handleOpen]);

  const submit = async () => {
    if (!message.trim()) {
      toast.error("Tell me what you're thinking. Message can't be blank.");
      return;
    }
    setSubmitting(true);
    const resp = await apiService.submitFeedback(message.trim(), type);
    setSubmitting(false);
    if (resp.error) {
      toast.error(resp.error || "Could not send feedback. Try again in a moment.");
      return;
    }
    toast.success("Thanks. Feedback received. I read every one.");
    setMessage("");
    setOpen(false);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {/* Floating "Feedback" launcher removed for now (per request) - hidden on
          every page. The dialog below stays reachable via useFeedback().open()
          for programmatic flows (e.g. the quota-bump request), so nothing else
          breaks. Restore the launcher button here to bring it back. */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {titleOverride ?? (type === "quota_bump" ? "Request more daily tailors" : "Send feedback")}
            </DialogTitle>
            <DialogDescription>
              Goes straight to me. I read every one and act on the most-asked stuff first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <p id="feedback-type-label" className="overline">Type</p>
              <div role="radiogroup" aria-labelledby="feedback-type-label" className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(TYPE_LABELS) as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-left text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      type === t
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="feedback-msg" className="overline">
                Message
              </Label>
              <Textarea
                id="feedback-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  // Enter is a newline in a message; Cmd or Ctrl plus Enter sends.
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !submitting) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                aria-describedby="feedback-msg-count"
                placeholder={TYPE_PLACEHOLDERS[type]}
                rows={6}
                maxLength={4000}
                className="mt-2 resize-none"
              />
              <p id="feedback-msg-count" className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                {message.length} / 4000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !message.trim()} aria-busy={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

// Silence unused-import warning for useEffect - kept in case future logic
// (e.g., open-on-mount when ?feedback=1) wants it without re-edits.
void useEffect;
