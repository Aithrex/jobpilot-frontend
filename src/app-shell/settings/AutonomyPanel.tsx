import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useAutoSubmit } from "@/hooks/useAutoSubmit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DEFAULT_THRESHOLD = 0.9;
const MIN_THRESHOLD = 0.5;

/** Clamp a 0–1 confidence to the panel's supported band. */
function clampThreshold(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_THRESHOLD;
  return Math.min(1, Math.max(MIN_THRESHOLD, value));
}

/**
 * Autonomy settings — the opt-in auto-apply control. A master toggle plus a
 * confidence-threshold dial, both persisted together to the existing
 * /apply/auto-submit/settings endpoint (which now carries `autonomy_threshold`)
 * via the shared useAutoSubmit hook.
 */
export default function AutonomyPanel() {
  const {
    available,
    settings,
    settingsLoading,
    settingsError,
    savingSettings,
    saveSettings,
  } = useAutoSubmit();

  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  // Sync local control state from the server settings once they resolve.
  useEffect(() => {
    if (!settings) return;
    setEnabled(!!settings.auto_submit_enabled);
    setThreshold(clampThreshold(settings.autonomy_threshold ?? DEFAULT_THRESHOLD));
  }, [settings]);

  const dirty = useMemo(() => {
    if (!settings) return false;
    const serverThreshold = clampThreshold(
      settings.autonomy_threshold ?? DEFAULT_THRESHOLD,
    );
    return (
      enabled !== !!settings.auto_submit_enabled ||
      Math.round(threshold * 100) !== Math.round(serverThreshold * 100)
    );
  }, [settings, enabled, threshold]);

  const onSave = async () => {
    const ok = await saveSettings({ enabled, autonomyThreshold: threshold });
    if (ok) {
      toast.success("Autonomy settings saved.");
    } else {
      toast.error("Couldn't save autonomy settings.");
    }
  };

  // Feature master-flag resolving.
  if (available === undefined || (settingsLoading && !settings)) {
    return (
      <div className="max-w-xl space-y-4" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // Feature flag off — explain rather than render an empty page.
  if (available === false) {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Auto-apply isn&rsquo;t available yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We&rsquo;re rolling out autonomous applications gradually. You&rsquo;ll
              see the controls here as soon as they reach your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Couldn&rsquo;t load your autonomy settings.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() =>
                // Re-runs the useAutoSubmit settings query (its key prefix).
                void qc.invalidateQueries({ queryKey: ["auto-submit", "settings"] })
              }
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.round(threshold * 100);

  return (
    <div className="max-w-xl space-y-6">
      {/* Master opt-in */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="min-w-0">
          <Label htmlFor="autonomy-toggle" className="text-sm font-semibold text-foreground">
            Auto-submit confident applications
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-submit applications I&rsquo;m this confident about; hold the rest
            for a one-tap review.
          </p>
        </div>
        <Switch
          id="autonomy-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable auto-submit"
        />
      </div>

      {/* Confidence threshold dial */}
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-5 transition-opacity",
          !enabled && "opacity-60",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="autonomy-threshold" className="text-sm font-semibold text-foreground">
            Confidence threshold
          </Label>
          <span
            className="tabular-nums text-lg font-bold text-primary"
            aria-live="polite"
          >
            {pct}%
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Only auto-submit when Aspirely is at least this confident. Everything
          below is queued for your review.
        </p>
        <Slider
          id="autonomy-threshold"
          className="mt-5"
          value={[pct]}
          min={MIN_THRESHOLD * 100}
          max={100}
          step={1}
          disabled={!enabled}
          onValueChange={([v]) => setThreshold(clampThreshold(v / 100))}
          aria-label="Confidence threshold percent"
          aria-valuetext={`${pct} percent`}
        />
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>More applications</span>
          <span>Higher confidence</span>
        </div>
      </div>

      {/* Legal attestation */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          We&rsquo;ll always ask you before answering work-authorization or EEO
          questions.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={!dirty || savingSettings} className="min-h-[44px]">
          {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {savingSettings ? "Saving…" : "Save changes"}
        </Button>
        {dirty && !savingSettings && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
