import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  User,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  GraduationCap,
  Scale,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Lock,
  Sparkles,
  Send,
  Rocket,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAutoApplyOnboarding } from "@/hooks/useAutoApplyOnboarding";
import type {
  AutoApplyMode,
  OnboardingCategory,
  OnboardingField,
  OnboardingAnswerValue,
} from "@/types/onboarding";

// ── category presentation ────────────────────────────────────────────────────

const CATEGORY_META: Record<
  OnboardingCategory,
  { title: string; blurb: string; icon: typeof User; voluntary?: boolean }
> = {
  identity: {
    title: "Contact & address",
    blurb:
      "Name, phone, email, and mailing address used on every application. Confirm or edit what we pulled from your resume.",
    icon: User,
  },
  work_auth: {
    title: "Work authorization",
    blurb: "Factual answers we never guess. Required before we can auto-apply.",
    icon: ShieldCheck,
  },
  eeo: {
    title: "Voluntary self-identification",
    blurb:
      "Optional and never inferred. Every field defaults to decline. You can leave it exactly as it is.",
    icon: Users,
    voluntary: true,
  },
  logistics: {
    title: "Your preferences",
    blurb: "Sensible defaults you can confirm in one tap.",
    icon: SlidersHorizontal,
  },
  screening: {
    title: "Experience & background",
    blurb:
      "Job title, company, dates, and a short role description — required so we can fill Workday and similar forms.",
    icon: GraduationCap,
  },
  legal: {
    title: "Legal attestations",
    blurb:
      "Age confirmation is required. Other attestations stay optional and default to decline until you set them.",
    icon: Scale,
    voluntary: true,
  },
};

const MODE_OPTIONS: {
  mode: AutoApplyMode;
  title: string;
  tagline: string;
  detail: string;
  icon: typeof Send;
  note?: string;
}[] = [
  {
    mode: "copilot",
    title: "Manual",
    tagline: "We prepare, you apply",
    detail:
      "We tailor your resume and resolve every answer, then hand you a ready answer sheet. Nothing is ever submitted for you.",
    icon: Sparkles,
  },
  {
    mode: "approval",
    title: "Auto",
    tagline: "We prepare and submit after you approve each one",
    detail:
      "Every application waits for your explicit go-ahead. We only submit once you have reviewed and approved it.",
    icon: Send,
  },
  {
    mode: "aggressive",
    title: "Auto Aggressive",
    tagline: "Submit matching jobs every day",
    detail:
      "We queue new matching postings daily and submit high-confidence applications on your behalf. Sensitive or unclear fields still pause for you.",
    icon: Rocket,
    note: "Uses your monthly auto-apply quota. You can still switch back to Auto or Manual anytime.",
  },
];

// ── value helpers ─────────────────────────────────────────────────────────────

type FieldValue = OnboardingAnswerValue | "";

/** A value counts as "filled" when it is set - including a boolean `false`. */
function isFilled(v: FieldValue | undefined): boolean {
  return v !== "" && v !== undefined && v !== null;
}

function initialValue(field: OnboardingField): FieldValue {
  if (field.current_value !== null && field.current_value !== undefined) {
    return field.current_value;
  }
  // The backend `default` is the SAFE pre-fill: for protected/legal fields this
  // is the decline option - never a real demographic value.
  if (field.default !== null && field.default !== undefined) return field.default;
  return "";
}

// ── field control ─────────────────────────────────────────────────────────────

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: OnboardingField;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}) {
  const voluntary =
    field.sensitivity === "protected" || field.sensitivity === "legal";
  const describedBy = voluntary ? `${field.field_id}-voluntary` : undefined;

  const control = () => {
    if (field.value_type === "boolean") {
      return (
        <div
          role="group"
          aria-label={field.label}
          className="flex flex-wrap gap-2"
        >
          {[
            { label: "Yes", val: true },
            { label: "No", val: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={value === opt.val}
              onClick={() => onChange(opt.val)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                value === opt.val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    }

    if (field.value_type === "select") {
      return (
        <div
          role="group"
          aria-label={field.label}
          className="flex flex-wrap gap-2"
        >
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={value === opt}
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                value === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    const inputType =
      field.value_type === "email"
        ? "email"
        : field.value_type === "phone"
          ? "tel"
          : field.value_type === "url"
            ? "url"
            : field.value_type === "date"
              ? "date"
              : field.value_type === "number" ||
                  field.value_type === "years" ||
                  field.value_type === "money"
                ? "text"
                : "text";
    const numeric =
      field.value_type === "number" ||
      field.value_type === "years" ||
      field.value_type === "money";
    return (
      <Input
        id={field.field_id}
        type={inputType}
        inputMode={numeric ? "numeric" : undefined}
        value={value === "" || value === undefined ? "" : String(value)}
        aria-describedby={describedBy}
        onChange={(e) =>
          onChange(
            numeric ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value,
          )
        }
      />
    );
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.field_id} className="text-sm">
        {field.label}
        {field.required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {control()}
      {voluntary && (
        <p id={describedBy} className="text-[11px] text-muted-foreground">
          Voluntary. You can decline.
        </p>
      )}
    </div>
  );
}

// ── mode picker ───────────────────────────────────────────────────────────────

function ModePicker({
  value,
  onChange,
}: {
  value: AutoApplyMode | null;
  onChange: (m: AutoApplyMode) => void;
}) {
  return (
    <div role="radiogroup" aria-label="How auto-apply works" className="space-y-3">
      {MODE_OPTIONS.map((opt) => {
        const active = value === opt.mode;
        const Icon = opt.icon;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.mode)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{opt.title}</span>
                <span className="text-xs text-muted-foreground">{opt.tagline}</span>
                {active && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {opt.detail}
              </span>
              {opt.note && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {opt.note}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── the flow ──────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface AutoApplyOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jump straight to the mode-picker step (used when settings.mode is null). */
  focusMode?: boolean;
  /** Fired after a successful save so the caller can refresh dependent state. */
  onCompleted?: () => void;
}

/**
 * The Auto-Apply onboarding flow: a progressive, category-grouped questionnaire
 * that ends in the required mode picker. Drives entirely off the backend
 * `/api/apply/onboarding/questions` payload (required/missing/ready flags +
 * mode). Completion is blocked until every required field is filled AND a mode
 * is chosen; protected/legal fields default to decline and never pre-select a
 * real value. Saves via PUT and surfaces `ready_for_autoapply`.
 */
export default function AutoApplyOnboarding({
  open,
  onOpenChange,
  focusMode = false,
  onCompleted,
}: AutoApplyOnboardingProps) {
  const reduce = useReducedMotion();
  const { available, questions, loading, error, saving, save } =
    useAutoApplyOnboarding(open);

  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [mode, setMode] = useState<AutoApplyMode | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const hydrated = useRef(false);
  const onModeStepJumped = useRef(false);

  // Hydrate control state once the payload arrives (don't clobber edits).
  useEffect(() => {
    if (!questions || hydrated.current) return;
    hydrated.current = true;
    const next: Record<string, FieldValue> = {};
    for (const group of questions.groups) {
      for (const field of group.fields) next[field.field_id] = initialValue(field);
    }
    setValues(next);
    setMode(questions.mode);
  }, [questions]);

  // Reset the flow each time it re-opens so a re-entry starts clean.
  useEffect(() => {
    if (open) return;
    hydrated.current = false;
    setStepIndex(0);
  }, [open]);

  const groups = questions?.groups ?? [];
  // Steps = one per populated category group, then the mode picker.
  const totalSteps = groups.length + 1;
  const modeStepIndex = groups.length;
  const onModeStep = stepIndex === modeStepIndex;

  // Jump to the mode step on open when the caller asks for it (mode is null).
  useEffect(() => {
    if (open && focusMode && questions && !onModeStepJumped.current) {
      onModeStepJumped.current = true;
      setStepIndex(groups.length);
    }
    if (!open) onModeStepJumped.current = false;
  }, [open, focusMode, questions, groups.length]);

  const requiredFields = questions?.required_fields ?? [];
  const missingRequired = useMemo(
    () => requiredFields.filter((fid) => !isFilled(values[fid])),
    [requiredFields, values],
  );
  const canFinish = missingRequired.length === 0 && mode !== null;

  const setValue = (fid: string, v: FieldValue) =>
    setValues((prev) => ({ ...prev, [fid]: v }));

  const handleFinish = async () => {
    const answers: Record<string, OnboardingAnswerValue> = {};
    for (const [fid, v] of Object.entries(values)) {
      if (!isFilled(v)) continue;
      answers[fid] = v as OnboardingAnswerValue;
    }
    const res = await save({ answers, ...(mode ? { mode } : {}) });
    if (!res.ok) {
      toast.error("Couldn't save your setup", { description: res.error });
      return;
    }
    toast.success(
      res.data?.ready_for_autoapply
        ? "Auto-apply is ready"
        : "Saved. A few required details are still missing.",
    );
    onCompleted?.();
    onOpenChange(false);
  };

  const goNext = () => setStepIndex((s) => Math.min(s + 1, totalSteps - 1));
  const goBack = () => setStepIndex((s) => Math.max(s - 1, 0));

  const currentGroup = onModeStep ? null : groups[stepIndex];
  const meta = currentGroup ? CATEGORY_META[currentGroup.category] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Set up auto-apply</DialogTitle>
        <DialogDescription className="sr-only">
          Confirm your details and choose how auto-apply works before we prepare
          applications for you.
        </DialogDescription>

        {/* Progress rail */}
        <div className="border-b border-border px-6 pb-4 pt-6">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= stepIndex ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Step {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}
          </p>
        </div>

        <div className="px-6 py-5">
          {available === false ? (
            <div className="flex items-start gap-3 py-6 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Auto-apply setup isn&rsquo;t available on your account yet.</p>
            </div>
          ) : loading || !questions ? (
            <div className="space-y-3 py-2" aria-busy="true">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 py-6 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Couldn&rsquo;t load your setup questions. Please try again.</p>
            </div>
          ) : (
            <motion.div
              key={stepIndex}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={reduce ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
            >
              {onModeStep ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Choose how auto-apply works
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight">
                      Pick your mode
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Required. You are always in control and can change this
                      anytime.
                    </p>
                  </div>
                  <ModePicker value={mode} onChange={setMode} />
                  {missingRequired.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Some required contact or work-authorization details are still
                      missing. Go back to finish them before saving.
                    </p>
                  )}
                </div>
              ) : (
                currentGroup &&
                meta && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-primary">
                        <meta.icon className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {meta.title}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {meta.blurb}
                      </p>
                    </div>

                    {meta.voluntary && (
                      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>
                          These are voluntary and never inferred. We only ever use
                          what you declare here, including a decline.
                        </span>
                      </div>
                    )}

                    <div className="max-h-[46vh] space-y-4 overflow-y-auto pr-1">
                      {currentGroup.fields.map((field) => (
                        <FieldControl
                          key={field.field_id}
                          field={field}
                          value={values[field.field_id] ?? ""}
                          onChange={(v) => setValue(field.field_id, v)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </motion.div>
          )}
        </div>

        {/* Footer nav */}
        {available !== false && questions && !loading && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || saving}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {onModeStep ? (
              <Button onClick={handleFinish} disabled={!canFinish || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save &amp; finish
              </Button>
            ) : (
              <Button onClick={goNext} disabled={saving}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
