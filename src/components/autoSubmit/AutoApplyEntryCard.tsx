import { ShieldCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAutoSubmit } from "@/hooks/useAutoSubmit";

/**
 * Calm dashboard entry point for Auto-Apply. Renders NOTHING when the feature
 * flag is off (404 → available:false) so the surface stays hidden entirely.
 * Pass `onOpen` to route to the Auto-Apply tab (e.g. selectNav("auto-apply")).
 */
export default function AutoApplyEntryCard({ onOpen }: { onOpen?: () => void }) {
  const { available, enabled, pending } = useAutoSubmit();

  // Hide entirely until we know the feature is on.
  if (available !== true) return null;

  const count = pending.length;
  const subtitle = count > 0
    ? `${count} application${count === 1 ? "" : "s"} ready for your approval`
    : enabled
    ? "On — Manual, Auto, or Auto Aggressive"
    : "Set mode + tailor preference, then queue jobs";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="card-interactive flex cursor-pointer items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">Auto-Apply</h3>
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Card>
  );
}
