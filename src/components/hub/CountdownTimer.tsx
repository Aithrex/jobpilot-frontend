import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  target?: string | null;
  onExpire?: () => void;
  variant?: "compact" | "large";
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({ target, onExpire, variant = "compact", className }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, expired } = useCountdown(target, onExpire);

  if (expired) {
    return <span className={cn("tabular-nums text-primary", className)}>Ready now</span>;
  }

  if (variant === "large") {
    const cell = (v: number, label: string) => (
      <div className="flex flex-col items-center">
        <span className="rounded-lg bg-muted px-2.5 py-1.5 font-mono text-lg font-semibold tabular-nums text-foreground sm:text-xl">
          {pad(v)}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
    );
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {days > 0 && cell(days, "days")}
        {cell(hours, "hrs")}
        {cell(minutes, "min")}
        {cell(seconds, "sec")}
      </div>
    );
  }

  return (
    <span className={cn("font-mono text-xs tabular-nums", className)}>
      {days > 0 ? `${days}d ` : ""}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
