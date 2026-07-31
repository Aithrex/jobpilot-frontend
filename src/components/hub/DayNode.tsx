import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CountdownTimer from "./CountdownTimer";
import { STATE_META, priorityStyle, themeIcon } from "./hubConstants";
import type { HubDay } from "@/types/hub";
import { cn } from "@/lib/utils";

function isClickable(day: HubDay) {
  return day.state === "current" || day.state === "completed";
}

/** A circular checkpoint on the trail — the "level node". */
export function Medallion({
  day,
  onOpen,
  size = 56,
}: {
  day: HubDay;
  onOpen: (day: HubDay) => void;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const Icon = themeIcon(day.theme);
  const clickable = isClickable(day);
  const isCurrent = day.state === "current";
  const isCompleted = day.state === "completed";
  const waiting = day.state === "locked" || day.state === "available_tomorrow";
  const soon = day.state === "unlocking_soon";
  const coming = day.state === "coming_soon";

  const glyph = isCompleted ? (
    <Check className="h-5 w-5" strokeWidth={2.5} />
  ) : waiting ? (
    <Lock className="h-4 w-4" />
  ) : soon ? (
    <Clock className="h-4 w-4" />
  ) : (
    <Icon className="h-5 w-5" />
  );

  return (
    <motion.button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpen(day)}
      whileHover={clickable && !reduce ? { scale: 1.08 } : undefined}
      whileTap={clickable && !reduce ? { scale: 0.95 } : undefined}
      style={{ width: size, height: size }}
      aria-label={`Day ${day.day}`}
      className={cn(
        "relative grid place-items-center rounded-full border-2 border-background shadow-lg transition-colors",
        clickable ? "cursor-pointer" : "cursor-default",
        isCompleted && "bg-gradient-to-br from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))] text-white",
        isCurrent && "bg-card text-primary ring-2 ring-primary",
        soon && "bg-card text-[hsl(var(--warning))] ring-2 ring-[hsl(var(--warning))]/60",
        (waiting || coming) && "bg-muted text-muted-foreground",
        coming && "border-dashed",
      )}
    >
      {/* Pulsing halo for the current checkpoint. */}
      {isCurrent && !reduce && (
        <motion.span
          className="absolute inset-0 -z-10 rounded-full bg-primary/25"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {glyph}
      {/* Day number chip */}
      <span
        className={cn(
          "absolute -bottom-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border border-background px-1 text-[10px] font-bold shadow",
          isCompleted || isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {day.day}
      </span>
    </motion.button>
  );
}

/** The glass info card beside a checkpoint. `align` mirrors the layout for the
 *  card on the left side of the trail. */
export function DayCard({
  day,
  onOpen,
  onExpire,
  align = "left",
}: {
  day: HubDay;
  onOpen: (day: HubDay) => void;
  onExpire: () => void;
  align?: "left" | "right";
}) {
  const reduce = useReducedMotion();
  const meta = STATE_META[day.state];
  const t = day.ticket;
  const clickable = isClickable(day);
  const isCurrent = day.state === "current";
  const waiting = day.state === "unlocking_soon" || day.state === "available_tomorrow";
  const right = align === "right";

  return (
    <motion.button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpen(day)}
      whileHover={clickable && !reduce ? { y: -3 } : undefined}
      className={cn(
        "group w-full rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur transition-all",
        right ? "text-right" : "text-left",
        meta.ring,
        clickable ? "cursor-pointer hover:shadow-xl" : "cursor-default opacity-70",
        isCurrent && "ring-1 ring-primary/40",
      )}
    >
      <div className={cn("flex items-center gap-2", right && "flex-row-reverse")}>
        <Badge variant="outline" className={cn("text-[11px]", meta.badge)}>
          {meta.label}
        </Badge>
        {t && <span className="font-mono text-[11px] text-muted-foreground">{t.ticket_number}</span>}
      </div>

      <p className="mt-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t?.sprint_label || `Day ${day.day}`}
      </p>
      <h3
        className={cn(
          "mt-1 line-clamp-2 text-lg font-bold leading-snug",
          isCurrent ? "gradient-text" : "text-foreground",
        )}
      >
        {t?.title || day.objective}
      </h3>

      {t && (t.sprint_objective || t.business_context) && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {t.sprint_objective || t.business_context}
        </p>
      )}

      <div className={cn("mt-3 flex flex-wrap items-center gap-2", right && "justify-end")}>
        {t && (
          <Badge variant="outline" className={cn("text-[11px]", priorityStyle(t.priority))}>
            {t.priority}
          </Badge>
        )}
        {t?.estimated_time && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {t.estimated_time}
          </span>
        )}
        {waiting && day.unlock_at ? (
          <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--warning))]">
            <Clock className="h-3.5 w-3.5" />
            <CountdownTimer target={day.unlock_at} onExpire={onExpire} />
          </span>
        ) : null}
        {day.state === "coming_soon" && (
          <span className="text-xs italic text-muted-foreground">Under development</span>
        )}
        {clickable && (
          <span
            className={cn(
              "text-sm font-semibold text-primary opacity-0 transition group-hover:opacity-100",
              right ? "mr-auto" : "ml-auto",
            )}
          >
            {day.state === "completed" ? "Review →" : "Open →"}
          </span>
        )}
      </div>
    </motion.button>
  );
}
