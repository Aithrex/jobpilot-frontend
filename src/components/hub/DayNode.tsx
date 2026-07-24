import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Construction, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CountdownTimer from "./CountdownTimer";
import { STATE_META, priorityStyle, nodeItem } from "./hubConstants";
import type { HubDay } from "@/types/hub";
import { cn } from "@/lib/utils";

interface DayNodeProps {
  day: HubDay;
  side: "left" | "right";
  onOpen: (day: HubDay) => void;
  onExpire: () => void;
}

export default function DayNode({ day, side, onOpen, onExpire }: DayNodeProps) {
  const reduce = useReducedMotion();
  const meta = STATE_META[day.state];
  const t = day.ticket;
  const isCurrent = day.state === "current";
  const clickable = day.state === "current" || day.state === "completed";

  const isComingSoon = day.state === "coming_soon";
  const dotIcon =
    day.state === "completed" ? (
      <Check className="h-4 w-4" />
    ) : isComingSoon ? (
      <Construction className="h-3.5 w-3.5" />
    ) : day.state === "locked" || day.state === "available_tomorrow" ? (
      <Lock className="h-3.5 w-3.5" />
    ) : day.state === "unlocking_soon" ? (
      <Clock className="h-3.5 w-3.5" />
    ) : (
      <span className="text-xs font-bold">{day.day}</span>
    );

  return (
    <motion.li
      variants={nodeItem}
      className={cn(
        "relative flex items-center gap-4 lg:w-1/2",
        side === "left" ? "lg:self-start lg:pr-10 lg:text-right" : "lg:ml-auto lg:self-end lg:pl-10 lg:flex-row-reverse",
      )}
    >
      {/* Spine node dot (absolute on the central line for desktop) */}
      <span
        className={cn(
          "z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-background shadow lg:absolute lg:top-5",
          meta.dot,
          side === "left" ? "lg:-right-4" : "lg:-left-4",
          isCurrent && !reduce && "animate-[pulse-glow_2.2s_ease-in-out_infinite]",
        )}
      >
        {dotIcon}
      </span>

      <motion.button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onOpen(day)}
        whileHover={clickable && !reduce ? { scale: 1.02 } : undefined}
        className={cn(
          "group w-full rounded-xl border bg-card p-3.5 text-left transition-all",
          side === "left" ? "lg:text-right" : "",
          meta.ring,
          clickable ? "cursor-pointer hover:shadow-md" : "cursor-not-allowed opacity-70",
          isCurrent && "glow-primary ring-1 ring-primary/40",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            side === "left" ? "lg:flex-row-reverse" : "",
          )}
        >
          <Badge variant="outline" className={cn("text-[10px]", meta.badge)}>
            {meta.label}
          </Badge>
          {t && (
            <span className="font-mono text-[10px] text-muted-foreground">{t.ticket_number}</span>
          )}
        </div>

        <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
          {t?.sprint_label || `Sprint ${day.day}`}
        </p>
        <h3
          className={cn(
            "truncate text-sm font-bold",
            isCurrent ? "gradient-text" : "text-foreground",
          )}
        >
          {t?.title || day.objective}
        </h3>

        <div
          className={cn(
            "mt-2 flex flex-wrap items-center gap-2",
            side === "left" ? "lg:justify-end" : "",
          )}
        >
          {t && (
            <Badge variant="outline" className={cn("text-[10px]", priorityStyle(t.priority))}>
              {t.priority}
            </Badge>
          )}
          {(day.state === "unlocking_soon" || day.state === "available_tomorrow") && day.unlock_at ? (
            <span className="inline-flex items-center gap-1 text-[hsl(var(--warning))]">
              <Clock className="h-3 w-3" />
              <CountdownTimer target={day.unlock_at} onExpire={onExpire} />
            </span>
          ) : null}
          {isComingSoon ? (
            <span className="inline-flex items-center gap-1 text-[11px] italic text-muted-foreground">
              <Construction className="h-3 w-3" /> Under development
            </span>
          ) : null}
        </div>
      </motion.button>
    </motion.li>
  );
}
