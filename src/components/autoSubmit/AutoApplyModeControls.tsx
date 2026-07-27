import { useState } from "react";
import { FileText, Rocket, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAutoSubmit } from "@/hooks/useAutoSubmit";
import type { AutoApplyMode } from "@/types/onboarding";

const MODES: {
  mode: AutoApplyMode;
  title: string;
  blurb: string;
  icon: typeof Send;
}[] = [
  {
    mode: "copilot",
    title: "Manual",
    blurb: "Prepare answers — you submit",
    icon: Sparkles,
  },
  {
    mode: "approval",
    title: "Auto",
    blurb: "Submit only after you approve",
    icon: Send,
  },
  {
    mode: "aggressive",
    title: "Auto Aggressive",
    blurb: "Queue & submit matching jobs daily",
    icon: Rocket,
  },
];

/**
 * Compact mode + tailor toggle for the dashboard / Auto-Apply header.
 * Persists via PUT /api/apply/auto-submit/settings.
 */
export default function AutoApplyModeControls() {
  const { available, enabled, settings, updateSettings, savingSettings } =
    useAutoSubmit();
  const [pending, setPending] = useState(false);
  const mode = settings?.mode ?? null;
  const useTailored = settings?.use_tailored_resume !== false;

  if (available !== true) return null;

  const persist = async (patch: {
    mode?: AutoApplyMode;
    use_tailored_resume?: boolean;
    enabled?: boolean;
  }) => {
    setPending(true);
    try {
      const nextEnabled = patch.enabled ?? enabled;
      const res = await updateSettings(
        nextEnabled,
        settings?.autonomy_threshold,
        patch.mode ?? mode ?? undefined,
        patch.use_tailored_resume ?? useTailored,
      );
      if (!res.ok) {
        toast.error("Could not update Auto Apply", { description: res.error });
        return;
      }
      toast.success("Auto Apply settings saved");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Auto Apply mode</h3>
          <p className="text-sm text-muted-foreground">
            Choose how Aspirely handles matching applications. Available on Free and paid plans
            (daily quota applies).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">On</span>
          <Switch
            checked={enabled}
            disabled={pending || savingSettings}
            onCheckedChange={(v) => void persist({ enabled: v })}
            aria-label="Enable Auto Apply"
          />
        </div>
      </div>

      <div role="radiogroup" aria-label="Auto Apply mode" className="grid gap-2 sm:grid-cols-3">
        {MODES.map((opt) => {
          const Icon = opt.icon;
          const selected = mode === opt.mode || (opt.mode === "aggressive" && mode === "autopilot");
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending || savingSettings}
              onClick={() => void persist({ mode: opt.mode, enabled: true })}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-primary">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">{opt.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{opt.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Tailor resume before apply</p>
            <p className="text-xs text-muted-foreground">
              On: pin a tailored resume (uses tailor quota). Off: apply with your base resume.
            </p>
          </div>
        </div>
        <Switch
          checked={useTailored}
          disabled={pending || savingSettings}
          onCheckedChange={(v) => void persist({ use_tailored_resume: v })}
          aria-label="Use tailored resume"
        />
      </div>

      {mode == null && (
        <Button size="sm" variant="outline" onClick={() => void persist({ mode: "approval", enabled: true })}>
          Set mode to Auto
        </Button>
      )}
    </Card>
  );
}
