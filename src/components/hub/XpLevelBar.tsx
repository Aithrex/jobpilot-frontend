import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpLevelBarProps {
  xp: number;
  level: number;
  nextLevelXp: number;
  xpGained?: number | null;
  leveledUp?: boolean;
  className?: string;
}

// Approx floor of the current level band so the bar shows progress within it.
const LEVEL_FLOORS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000];

export default function XpLevelBar({ xp, level, nextLevelXp, xpGained, leveledUp, className }: XpLevelBarProps) {
  const reduce = useReducedMotion();
  const floor = LEVEL_FLOORS[Math.max(0, level - 1)] ?? 0;
  const span = Math.max(1, nextLevelXp - floor);
  const pct = Math.min(100, Math.max(0, Math.round(((xp - floor) / span) * 100)));

  return (
    <div className={cn("relative w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-primary">
            <Zap className="h-3 w-3" />
          </span>
          Level {level}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))]"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </div>

      <AnimatePresence>
        {xpGained ? (
          <motion.div
            key={`${xp}-${xpGained}`}
            className="pointer-events-none absolute -top-1 right-0 inline-flex items-center gap-1 text-xs font-bold text-primary"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
          >
            <Sparkles className="h-3 w-3" /> +{xpGained} XP
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {leveledUp ? (
          <motion.div
            key={`levelup-${level}`}
            className="pointer-events-none absolute inset-x-0 -top-6 text-center text-sm font-extrabold gradient-text"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            Level Up!
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
