import { DailyUsage } from "@/hooks/useDailyUsage";

interface Props {
  usage: DailyUsage | null;
  loading?: boolean;
  className?: string;
}

/**
 * Compact pill shown near the tailor submit button:
 *   "3 of 5 daily tailors left"
 *
 * Visual signal scales with remaining: full at >=2, amber at 1, red at 0.
 */
export function DailyUsageBadge({ usage, loading, className = "" }: Props) {
  if (loading && !usage) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
        Checking quota...
      </span>
    );
  }
  if (!usage) return null;

  const { remaining, limit } = usage;
  const tone =
    remaining === 0
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : remaining === 1
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-success/30 bg-success/10 text-success";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone} ${className}`}
      title={`Resets at midnight UTC (${new Date(usage.resets_at).toLocaleTimeString()})`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {remaining} of {limit} daily tailors left
    </span>
  );
}
