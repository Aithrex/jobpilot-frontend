import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHubAchievements } from "@/hooks/useHub";
import { cn } from "@/lib/utils";

export default function AchievementsGrid() {
  const { data, isLoading } = useHubAchievements();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = data ?? [];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 transition-all",
            a.unlocked
              ? "border-primary/25 bg-primary/[0.04]"
              : "border-dashed border-border bg-muted/30 opacity-70",
          )}
        >
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
              a.unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {a.unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{a.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
            <p className="mt-1 text-[11px] font-medium text-primary">+{a.xp_bonus} XP</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
