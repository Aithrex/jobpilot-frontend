/**
 * The in-app answer surface for a `needs_input` row (AUTOAPPLY_REPAIR_SPEC §3).
 *
 * This replaces the product's worst UX failure: the old card said "Needs your
 * answer" and then handed the user an `<a target="_blank">` to the employer's
 * portal. There was no input anywhere. The user was told to go re-do the whole
 * application by hand because we could not resolve ONE field.
 *
 * Two things are funnelled into `needs_input` by the backend and they get
 * OPPOSITE treatment here (see `needsInput.ts`):
 *   - a QUESTION      -> a real, labelled control. Answer it here; we resume.
 *   - a BROWSER WALL  -> captcha / verification / password reset / account gate.
 *                        Nothing is typeable, so this IS a legitimate hand-off
 *                        to the user's own logged-in browser - framed as
 *                        "clear this and we pick it back up", never as
 *                        "go apply manually".
 */
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Pencil,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUpgrade } from "@/components/billing/UpgradeModalProvider";
import type { NeedsInputAnswerOutcome } from "@/hooks/useAutoSubmit";
import type {
  AutoSubmitApprovalView,
  NeedsInputAnswerValue,
  NeedsInputItem,
} from "@/types/autoSubmit";
import {
  controlId,
  inferControl,
  isAnswerableItem,
  isBrowserWallItem,
  isFilled,
  itemLabel,
  serializeAnswer,
  wallHelp,
  wallLabel,
  type NeedsInputControl,
} from "./needsInput";

type Values = Record<string, NeedsInputAnswerValue>;

/**
 * Appended when the backend answered 429: the save landed, the row advanced,
 * and the ONLY thing missing is an auto-submit slot. Never phrased as a failure.
 */
const QUOTA_NOTE =
  "You're out of auto-apply submissions for now, so it waits for your go-ahead (or an upgrade) instead of being sent automatically.";

/**
 * Where the row landed once the last gap closed. NONE of these ever tells the
 * user to go apply manually - that is the whole point of the fix.
 */
function resumedCopy(status?: string): string {
  switch (status) {
    case "approved":
    case "queued_for_execution":
      return "That was the last thing we needed. This application is approved and queued to submit.";
    case "running":
      return "That was the last thing we needed. We're submitting this application now.";
    case "ready_for_review":
      return "That was the last thing we needed. It's back in your review queue, ready for your go-ahead.";
    default:
      return "Your answers are saved and this application is moving again.";
  }
}

// ── one question ────────────────────────────────────────────────────────────

function QuestionField({
  applicationId,
  item,
  control,
  value,
  disabled,
  onChange,
}: {
  applicationId: string;
  item: NeedsInputItem;
  control: NeedsInputControl;
  value: NeedsInputAnswerValue | undefined;
  disabled: boolean;
  onChange: (v: NeedsInputAnswerValue) => void;
}) {
  const fieldId = String(item.field_id ?? "");
  const id = controlId(applicationId, fieldId);
  const labelId = `${id}-label`;
  const label = itemLabel(item);
  // Pill groups aren't a single focusable control, so they are labelled by a
  // referenced element rather than a dangling `htmlFor`.
  const isGroup = control === "boolean" || control === "options";
  const asString = value === undefined || value === null ? "" : String(value);

  const options: { label: string; val: NeedsInputAnswerValue }[] =
    control === "boolean"
      ? [
          { label: "Yes", val: true },
          { label: "No", val: false },
        ]
      : (item.options ?? []).map((o) => ({ label: o, val: o }));

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={isGroup ? undefined : id}
        id={isGroup ? labelId : undefined}
        className="text-sm leading-snug"
      >
        {label}
      </Label>

      {isGroup ? (
        <div
          role="group"
          aria-labelledby={labelId}
          className="flex flex-wrap gap-2"
        >
          {options.map((opt) => {
            const active = value === opt.val;
            return (
              <button
                key={String(opt.val)}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChange(opt.val)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : control === "textarea" ? (
        <Textarea
          id={id}
          rows={3}
          disabled={disabled}
          value={asString}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y text-sm"
        />
      ) : (
        <Input
          id={id}
          type={
            control === "email"
              ? "email"
              : control === "tel"
                ? "tel"
                : control === "url"
                  ? "url"
                  : control === "date"
                    ? "date"
                    : "text"
          }
          inputMode={control === "number" ? "numeric" : undefined}
          disabled={disabled}
          value={asString}
          onChange={(e) =>
            onChange(
              control === "number"
                ? e.target.value.replace(/[^0-9.-]/g, "")
                : e.target.value,
            )
          }
        />
      )}
    </div>
  );
}

// ── card ────────────────────────────────────────────────────────────────────

export interface NeedsInputCardProps {
  view: AutoSubmitApprovalView;
  /** Best URL for the row, resolved by the parent (url / application_url / apply_url). */
  url: string | null;
  role: string;
  company: string;
  onAnswer: (
    applicationId: string,
    answers: Values,
  ) => Promise<NeedsInputAnswerOutcome>;
}

export default function NeedsInputCard({
  view,
  url,
  role,
  company,
  onAnswer,
}: NeedsInputCardProps) {
  const reduceMotion = useReducedMotion();
  const upgrade = useUpgrade();

  const serverItems = useMemo<NeedsInputItem[]>(
    () => (Array.isArray(view.needs_input) ? view.needs_input : []),
    [view.needs_input],
  );
  // The post-submit `remaining` list wins until the polled payload catches up,
  // so the user never re-sees a question they just answered.
  const [remaining, setRemaining] = useState<NeedsInputItem[] | null>(null);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resumedStatus, setResumedStatus] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  // Server truth eventually wins: when the polled item list changes, drop the
  // local override.
  const serverSig = useMemo(
    () => serverItems.map((i) => `${i.field_id ?? ""}|${i.question ?? ""}`).join("~"),
    [serverItems],
  );
  useEffect(() => {
    setRemaining(null);
  }, [serverSig]);

  const items = remaining ?? serverItems;
  const walls = useMemo(() => items.filter(isBrowserWallItem), [items]);
  const questions = useMemo(() => items.filter(isAnswerableItem), [items]);
  const controls = useMemo(
    () => questions.map((q) => ({ item: q, control: inferControl(q) })),
    [questions],
  );

  const filledCount = controls.filter(({ item }) =>
    isFilled(values[String(item.field_id)]),
  ).length;
  const canSubmit = filledCount > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    // Only send what the user actually filled. An empty value would be handed
    // to `answer_library_service.remember()` and poison every future run.
    const payload: Values = {};
    for (const { item, control } of controls) {
      const key = String(item.field_id);
      const raw = values[key];
      if (!isFilled(raw)) continue;
      payload[key] = serializeAnswer(control, raw as NeedsInputAnswerValue);
    }
    if (Object.keys(payload).length === 0) return;

    setBusy(true);
    setNotice(null);
    const out = await onAnswer(view.application_id, payload);
    setBusy(false);

    if (out.ok) {
      const left = out.remaining ?? [];
      // A 429 arrives with ok:true (the save SUCCEEDED - see the hook). The row
      // is in review; it just can't auto-submit, so we say both things at once
      // rather than claiming the answer was lost.
      const quotaNote = out.quota ? ` ${QUOTA_NOTE}` : "";
      setValues({});
      if (left.length === 0) {
        setRemaining([]);
        setResumed(true);
        setResumedStatus(out.applicationStatus ?? null);
        setNotice(resumedCopy(out.applicationStatus) + quotaNote);
      } else {
        setRemaining(left);
        setNotice(
          `Saved. ${left.length} ${left.length === 1 ? "question" : "questions"} still ${
            left.length === 1 ? "needs" : "need"
          } an answer.${quotaNote}`,
        );
      }
      if (out.quota) {
        toast.info("Saved - but you're out of auto-apply submissions", {
          description: out.quota.resets_at
            ? `Approve it yourself, or upgrade. Your quota resets ${new Date(
                out.quota.resets_at,
              ).toLocaleDateString()}.`
            : "Approve it yourself, or upgrade for more submissions.",
        });
      }
      return;
    }

    if (out.notInNeedsInput) {
      // Benign race: a sweep or another tab already cleared it.
      setResumed(true);
      setNotice("This application already moved on - nothing more is needed here.");
      return;
    }
    if (out.needsUpgrade) {
      setNotice("Answering in-app isn't included in your current plan.");
      upgrade.open({ feature: "auto_submit" });
      return;
    }
    setNotice(out.error ?? "We couldn't save that. Please try again.");
    toast.error("Couldn't save your answer", { description: out.error });
  };

  const onlyWalls = walls.length > 0 && controls.length === 0;
  // Guarded on `resumed`: a stale poll can briefly leave the item list empty
  // right after a successful answer, and "we need one more detail" next to a
  // success message is exactly the contradiction this whole card exists to kill.
  const nothingKnown = items.length === 0 && !resumed;

  return (
    <div className="rounded-xl border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.06)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{role}</h4>
          <p className="truncate text-sm text-muted-foreground">{company}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[hsl(var(--warning))]">
          {onlyWalls ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
          Action needed
        </span>
      </div>

      {/* ── browser walls: the ONE legitimate "finish it on their site" case ── */}
      {walls.length > 0 && (
        <div className="mt-3 space-y-3">
          {walls.map((w, i) => (
            <div
              key={`${w.field_id ?? "wall"}-${i}`}
              className="rounded-lg border border-border bg-background/60 p-3"
            >
              <p className="text-sm font-medium">{wallLabel(w)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{wallHelp(w)}</p>
              {(w.apply_url || url) && (
                <Button asChild size="sm" variant="outline" className="mt-2.5">
                  <a href={w.apply_url || url || "#"} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open the employer's site
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── answerable questions: the in-app form ─────────────────────────── */}
      {controls.length > 0 && !resumed && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Pencil className="h-3 w-3" />
            {controls.length === 1
              ? "Answer this and we'll continue"
              : "Answer these and we'll continue"}
          </div>

          {controls.map(({ item, control }) => (
            <QuestionField
              key={String(item.field_id)}
              applicationId={view.application_id}
              item={item}
              control={control}
              value={values[String(item.field_id)]}
              disabled={busy}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [String(item.field_id)]: v }))
              }
            />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              We save these so you're never asked the same question twice.
            </p>
            <Button type="submit" size="sm" disabled={!canSubmit} className="shrink-0">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Save &amp; continue
            </Button>
          </div>
        </form>
      )}

      {/* Items we can't render a control for (no field_id to submit under). */}
      {nothingKnown && (
        <p className="mt-3 text-sm text-muted-foreground">
          We need one more detail before this can continue. Open the job to see
          what the employer is asking for.
        </p>
      )}
      {nothingKnown && url && (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Open job
            </a>
          </Button>
        </div>
      )}

      {/* ── result ────────────────────────────────────────────────────────── */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {notice && (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
              resumed
                ? "border border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.08)] text-foreground"
                : "border border-border bg-background/60 text-muted-foreground",
            )}
          >
            {resumed && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
            )}
            <span>{notice}</span>
          </motion.p>
        )}
      </div>

      {/* Keep the raw status visible for the resumed case - no fabricated progress. */}
      {resumed && resumedStatus && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Status: {resumedStatus.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}
