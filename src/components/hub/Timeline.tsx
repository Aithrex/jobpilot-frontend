import { motion, useReducedMotion } from "framer-motion";
import { Medallion, DayCard } from "./DayNode";
import type { HubDay } from "@/types/hub";

interface TimelineProps {
  days: HubDay[];
  onOpenDay: (day: HubDay) => void;
  onExpire: () => void;
}

// Medallions ride a gentle winding spine down the CENTER; big cards strictly
// alternate left/right of it. Fixed row height (taller than a card) so nothing
// overlaps and the single SVG lines up with the medallions.
const ROW_H = 220;
const VB_W = 1000;
const AMP = 46; // gentle sway → spine stays in the centre gutter between cards
const GUTTER = 58; // cards fill out to this % from their side; spine + medallions
                   // live in the 42–58% gutter so they never overlap a card

function nodeX(i: number) {
  return VB_W / 2 + Math.sin(i * 1.0) * AMP;
}

/** Smooth Catmull-Rom → bezier path through the points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function Timeline({ days, onOpenDay, onExpire }: TimelineProps) {
  const reduce = useReducedMotion();

  const points = days.map((_, i) => ({ x: nodeX(i), y: i * ROW_H + ROW_H / 2 }));
  const totalH = days.length * ROW_H;
  let reachedIdx = -1;
  days.forEach((d, i) => {
    if (d.state === "completed" || d.state === "current") reachedIdx = i;
  });
  const progressPts = points.slice(0, reachedIdx + 1);

  return (
    <>
      {/* ── Desktop: winding centre spine + alternating cards ── */}
      <div className="relative hidden w-full lg:block" style={{ height: totalH }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${totalH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="trail-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand-from))" />
              <stop offset="100%" stopColor="hsl(var(--brand-to))" />
            </linearGradient>
          </defs>
          <path
            d={smoothPath(points)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {progressPts.length > 1 && (
            <motion.path
              d={smoothPath(progressPts)}
              fill="none"
              stroke="url(#trail-grad)"
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
            />
          )}
        </svg>

        {days.map((day, i) => {
          const xPct = (points[i].x / VB_W) * 100;
          const side: "left" | "right" = i % 2 === 0 ? "right" : "left";
          return (
            <div key={day.key}>
              {/* Positioning (plain div, so Tailwind's -translate-y-1/2 centering
                  isn't clobbered by framer-motion's transform); animation on the
                  inner motion.div. */}
              <div
                className="absolute z-10 -translate-y-1/2"
                style={
                  side === "right"
                    ? { left: `${GUTTER}%`, right: "8px", top: points[i].y }
                    : { right: `${GUTTER}%`, left: "8px", top: points[i].y }
                }
              >
                <motion.div
                  initial={reduce ? false : { opacity: 0, x: side === "right" ? -14 : 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.08 }}
                >
                  <DayCard day={day} onOpen={onOpenDay} onExpire={onExpire} align={side === "right" ? "left" : "right"} />
                </motion.div>
              </div>

              {/* Medallion on the spine, centred on the node. */}
              <div
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${xPct}%`, top: points[i].y }}
              >
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 18 }}
                >
                  <Medallion day={day} onOpen={onOpenDay} />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile: compact left rail ── */}
      <div className="relative lg:hidden">
        <div className="pointer-events-none absolute bottom-6 left-[21px] top-6 w-0.5 bg-border">
          <motion.div
            className="w-full bg-gradient-to-b from-[hsl(var(--brand-from))] to-[hsl(var(--brand-to))]"
            initial={reduce ? false : { height: 0 }}
            animate={{ height: days.length ? `${((reachedIdx + 1) / days.length) * 100}%` : "0%" }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          />
        </div>
        <ul className="relative space-y-5">
          {days.map((day) => (
            <li key={day.key} className="flex items-start gap-4">
              <div className="z-10 shrink-0">
                <Medallion day={day} onOpen={onOpenDay} size={44} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <DayCard day={day} onOpen={onOpenDay} onExpire={onExpire} align="left" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
