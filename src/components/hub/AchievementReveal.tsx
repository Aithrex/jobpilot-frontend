import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Award } from "lucide-react";
import type { HubAchievement } from "@/types/hub";
import { TIER_GLOW } from "./hubConstants";
import { cn } from "@/lib/utils";

interface AchievementRevealProps {
  achievement: HubAchievement | null;
  onDismiss: () => void;
}

// Deterministic pseudo-random spread (no Math.random in render dependency).
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const dist = 120 + (i % 5) * 26;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rotate: (i * 47) % 360,
    delay: (i % 6) * 0.03,
    hue: i % 3,
  };
});

export default function AchievementReveal({ achievement, onDismiss }: AchievementRevealProps) {
  const reduce = useReducedMotion();
  const glow = useMemo(() => TIER_GLOW[achievement?.tier || "gold"] || TIER_GLOW.gold, [achievement?.tier]);
  const hueClass = ["bg-[hsl(var(--brand-from))]", "bg-[hsl(var(--brand-to))]", "bg-[hsl(var(--warning))]"];

  return (
    <AnimatePresence>
      {achievement ? (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          role="dialog"
          aria-label={`Achievement unlocked: ${achievement.title}`}
        >
          {/* Confetti — framer-motion only, no library */}
          {!reduce &&
            PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className={cn("absolute h-2 w-2 rounded-sm", hueClass[p.hue])}
                initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: [1, 1, 0], x: p.x, y: p.y, rotate: p.rotate, scale: 0.6 }}
                transition={{ duration: 1.3, delay: p.delay, ease: "easeOut" }}
              />
            ))}

          <motion.div
            className={cn(
              "glass-card relative z-10 w-full max-w-sm rounded-2xl border border-border p-6 text-center",
              "bg-gradient-to-b",
              glow,
            )}
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary glow-primary"
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Award className="h-8 w-8" />
            </motion.div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Achievement Unlocked
            </p>
            <h3 className="mt-1 text-xl font-extrabold gradient-text">{achievement.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{achievement.description}</p>
            {achievement.xp_bonus ? (
              <p className="mt-3 inline-flex items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-bold text-primary">
                +{achievement.xp_bonus} XP
              </p>
            ) : null}
            <button
              onClick={onDismiss}
              className="mt-4 block w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Nice!
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
