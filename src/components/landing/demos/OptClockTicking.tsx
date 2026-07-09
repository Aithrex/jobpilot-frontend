import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CalendarCheck2, Flag } from 'lucide-react';
import { DemoFrame, EASE, useDemoActive, useEntered } from './_demoKit';

const TOTAL = 90; // OPT unemployment days allowed
const USED = 12;

/** The OPT clock, framed calmly (amber, never alarm-red): the ring settles,
 *  a live clock ticks toward tomorrow, and key dates fade in. */
export default function OptClockTicking() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useDemoActive(ref);
  const entered = useEntered(ref);

  const [secs, setSecs] = useState(17 * 3600 + 42 * 60 + 9);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSecs((s) => (s <= 0 ? 24 * 3600 - 1 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);

  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  const R = 52;
  const C = 2 * Math.PI * R;
  const usedFrac = USED / TOTAL;
  const daysLeft = TOTAL - USED;
  // Endpoint of the visible arc (inside the -rotate-90 svg, the circle's path
  // starts at 3 o'clock and sweeps clockwise — same convention as the dash).
  const endAngle = 2 * Math.PI * usedFrac;
  const dotX = 60 + R * Math.cos(endAngle);
  const dotY = 60 + R * Math.sin(endAngle);

  const DATES = [
    { icon: Flag, label: 'OPT started', date: 'Jun 1' },
    { icon: CalendarClock, label: 'Day 90 deadline', date: 'Aug 30' },
    { icon: CalendarCheck2, label: 'STEM extension', date: '+24 mo' },
  ];

  return (
    <DemoFrame innerClassName="mesh-warning">
      <div
        ref={ref}
        role="img"
        aria-label={`OPT job-search clock: ${daysLeft} of 90 unemployment days remaining, with a live countdown to tomorrow and key visa dates.`}
        className="flex flex-col items-center gap-5 py-2"
      >
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
            <circle cx="60" cy="60" r={R} className="fill-none stroke-border" strokeWidth="9" />
            <motion.circle
              cx="60"
              cy="60"
              r={R}
              className="fill-none stroke-warning"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: entered ? C * (1 - usedFrac) : C }}
              transition={{ duration: 1.1, ease: EASE }}
            />
            {/* rounded endpoint marker — appears once the ring has settled */}
            <motion.circle
              cx={dotX}
              cy={dotY}
              r={6.5}
              className="fill-warning stroke-card"
              strokeWidth={2}
              initial={{ opacity: 0 }}
              animate={{ opacity: entered ? 1 : 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: entered ? 1.05 : 0 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-extrabold tabular-nums text-foreground">{daysLeft}</span>
            <span className="text-[11px] font-medium text-muted-foreground">days left of 90</span>
          </div>
        </div>

        <div className="relative inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 font-display text-sm font-bold tabular-nums text-foreground">
          {/* very subtle breathing glow while the clock is live */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full shadow-md shadow-warning/20"
            initial={{ opacity: 0 }}
            animate={active ? { opacity: [0.2, 1, 0.2] } : { opacity: 0 }}
            transition={active ? { duration: 4, ease: 'easeInOut', repeat: Infinity } : { duration: 0.3 }}
          />
          <CalendarClock className="h-4 w-4 text-warning" aria-hidden />
          {hh}:{mm}:{ss}
          <span className="text-[11px] font-medium text-muted-foreground">to a fresh day</span>
        </div>

        <ul className="w-full max-w-[15rem] space-y-1.5">
          {DATES.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.li
                key={d.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: entered ? 1 : 0, x: entered ? 0 : -8 }}
                transition={{ duration: 0.4, ease: EASE, delay: entered ? 0.3 + i * 0.12 : 0 }}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
              >
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-warning" aria-hidden />
                  {d.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{d.date}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </DemoFrame>
  );
}
