import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Lock, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HubJourney, HubSeasonSummary } from "@/types/hub";

interface JourneyMapProps {
  journey: HubJourney;
  selectedSeasonId?: string;
  onSelect: (seasonId: string) => void;
}

type StateMeta = {
  dot: string;
  ring: string;
  badge: string;
  label: string;
  icon: React.ReactNode;
  clickable: boolean;
};

const STATE_META: Record<HubSeasonSummary["state"], StateMeta> = {
  completed: {
    dot: "bg-[hsl(var(--success))] text-white border-[hsl(var(--success))]",
    ring: "border-[hsl(var(--success))]/35 hover:border-[hsl(var(--success))]/60",
    badge: "border-[hsl(var(--success))]/30 text-[hsl(var(--success))]",
    label: "Complete",
    icon: <Check className="h-4 w-4" />,
    clickable: true,
  },
  active: {
    dot: "bg-primary text-white border-primary shadow-[0_0_0_5px_hsl(var(--primary)/0.18)]",
    ring: "border-primary/50 shadow-md ring-1 ring-primary/25",
    badge: "border-primary/40 text-primary",
    label: "In progress",
    icon: <Play className="h-4 w-4" />,
    clickable: true,
  },
  available: {
    dot: "bg-primary text-white border-primary",
    ring: "border-primary/30 hover:border-primary/60",
    badge: "border-primary/25 text-primary",
    label: "Available",
    icon: <Play className="h-4 w-4" />,
    clickable: true,
  },
  locked: {
    dot: "bg-muted text-muted-foreground border-border",
    ring: "border-border",
    badge: "border-border text-muted-foreground",
    label: "Locked",
    icon: <Lock className="h-4 w-4" />,
    clickable: false,
  },
  coming_soon: {
    dot: "bg-transparent text-muted-foreground border-dashed border-border",
    ring: "border-dashed border-border",
    badge: "border-border text-muted-foreground",
    label: "Coming soon",
    icon: <Sparkles className="h-4 w-4" />,
    clickable: false,
  },
};

/** The campaign map as a vertical roadmap path. Completed/active/available
 *  chapters are enterable; locked + coming-soon are shown but not clickable. */
export default function JourneyMap({ journey, selectedSeasonId, onSelect }: JourneyMapProps) {
  const reduce = useReducedMotion();
  const chapters = [...(journey?.seasons ?? [])].sort((a, b) => a.order - b.order);

  // Fill the spine through the furthest reached node (last completed, or active).
  const reachedIdx = Math.max(
    chapters.map((c) => c.state).lastIndexOf("completed"),
    chapters.map((c) => c.state).indexOf("active"),
  );
  const fillPct = chapters.length > 1 ? Math.max(0, (reachedIdx / (chapters.length - 1)) * 100) : 0;
  const doneCount = chapters.filter((c) => c.state === "completed").length;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your journey</h2>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{chapters.length} chapters
        </span>
      </div>

      <div className="relative">
        {/* Spine */}
        <div className="pointer-events-none absolute bottom-6 left-[18px] top-3 w-0.5 bg-border">
          <motion.div
            className="w-full bg-gradient-to-b from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))]"
            initial={reduce ? false : { height: 0 }}
            animate={{ height: `${fillPct}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          />
        </div>

        <ul className="relative space-y-3">
          {chapters.map((ch, i) => {
            const meta = STATE_META[ch.state] ?? STATE_META.locked;
            const selected = ch.season_id === selectedSeasonId;
            const prev = chapters[i - 1];
            const denom = ch.published_days || ch.length_days;
            const pct = denom ? Math.round((100 * ch.completed_count) / denom) : 0;
            const cta =
              ch.state === "completed" ? "Review" : ch.completed_count > 0 ? "Continue" : "Start";

            return (
              <motion.li
                key={ch.season_id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex gap-3"
              >
                {/* Node dot on the spine */}
                <div
                  className={cn(
                    "z-10 mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2",
                    meta.dot,
                  )}
                >
                  {meta.icon}
                </div>

                {/* Chapter card */}
                <button
                  type="button"
                  disabled={!meta.clickable}
                  onClick={() => meta.clickable && onSelect(ch.season_id)}
                  className={cn(
                    "group flex-1 rounded-2xl border bg-card p-4 text-left transition",
                    meta.ring,
                    meta.clickable ? "cursor-pointer hover:shadow-md" : "cursor-default opacity-70",
                    selected && "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ch.state === "active" ? "You are here" : `Chapter ${ch.order}`}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        meta.badge,
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>

                  <h3 className="mt-1 text-base font-bold text-foreground">{ch.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {ch.state === "locked" && prev ? `Finish "${prev.title}" to unlock this chapter.` : ch.premise}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{ch.length_days} days</span>
                    {meta.clickable && (
                      <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition group-hover:opacity-100">
                        {cta} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {meta.clickable && ch.state !== "coming_soon" && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>

        {/* Tail hint — the series continues. */}
        <div className="relative mt-1 flex items-center gap-3 pl-[7px] text-xs text-muted-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-border">
            <Sparkles className="h-3 w-3" />
          </span>
          <span>More chapters ahead as your career grows…</span>
        </div>
      </div>
    </div>
  );
}
