import { motion, useReducedMotion } from "framer-motion";
import DayNode from "./DayNode";
import { listContainer } from "./hubConstants";
import type { HubDay } from "@/types/hub";

interface TimelineProps {
  days: HubDay[];
  onOpenDay: (day: HubDay) => void;
  onExpire: () => void;
}

export default function Timeline({ days, onOpenDay, onExpire }: TimelineProps) {
  const reduce = useReducedMotion();
  const completed = days.filter((d) => d.state === "completed").length;
  const pct = days.length ? (completed / days.length) * 100 : 0;

  return (
    <div className="relative">
      {/* Central spine (desktop) / left rail (mobile) */}
      <div className="pointer-events-none absolute bottom-0 left-4 top-0 w-0.5 bg-border lg:left-1/2 lg:-translate-x-1/2">
        <motion.div
          className="w-full bg-gradient-to-b from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))]"
          initial={reduce ? false : { height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        />
      </div>

      <motion.ul
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="relative flex flex-col gap-4 pl-12 lg:items-stretch lg:pl-0"
      >
        {days.map((day, i) => (
          <DayNode
            key={day.key}
            day={day}
            side={i % 2 === 0 ? "left" : "right"}
            onOpen={onOpenDay}
            onExpire={onExpire}
          />
        ))}
      </motion.ul>
    </div>
  );
}
