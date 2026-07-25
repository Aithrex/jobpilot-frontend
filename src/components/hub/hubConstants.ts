import { Blocks, Cpu, Rocket, ShieldCheck, Terminal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DayState } from "@/types/hub";

// Tasteful line-icon per curriculum theme (NOT emoji) — drives the trail
// medallions. Falls back to Terminal for any unmapped theme.
export const THEME_ICONS: Record<string, LucideIcon> = {
  setup: Terminal,
  build: Blocks,
  quality: ShieldCheck,
  ops: Rocket,
  advanced: Cpu,
  capstone: Trophy,
};

export function themeIcon(theme?: string): LucideIcon {
  return (theme && THEME_ICONS[theme]) || Terminal;
}

// Per-state visual language for timeline nodes. Uses semantic tokens only.
export const STATE_META: Record<
  DayState,
  { label: string; dot: string; ring: string; text: string; badge: string }
> = {
  completed: {
    label: "Completed",
    dot: "bg-[hsl(var(--success))] text-white",
    ring: "border-[hsl(var(--success))]/40",
    text: "text-[hsl(var(--success))]",
    badge: "bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
  },
  current: {
    label: "Current Challenge",
    dot: "bg-primary text-primary-foreground",
    ring: "border-primary/50",
    text: "text-primary",
    badge: "bg-primary/12 text-primary border-primary/30",
  },
  unlocking_soon: {
    label: "Unlocking Soon",
    dot: "bg-[hsl(var(--warning))] text-white",
    ring: "border-[hsl(var(--warning))]/40",
    text: "text-[hsl(var(--warning))]",
    badge: "bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25",
  },
  available_tomorrow: {
    label: "Available Soon",
    dot: "bg-muted text-muted-foreground",
    ring: "border-border",
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
  locked: {
    label: "Locked",
    dot: "bg-muted text-muted-foreground",
    ring: "border-border",
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
  coming_soon: {
    label: "Coming Soon",
    dot: "bg-muted text-muted-foreground",
    ring: "border-dashed border-border",
    text: "text-muted-foreground",
    badge: "bg-primary/[0.06] text-muted-foreground border-dashed border-primary/25",
  },
};

export const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-[hsl(var(--destructive))]/12 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30",
  High: "bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
  Medium: "bg-primary/10 text-primary border-primary/25",
  Low: "bg-muted text-muted-foreground border-border",
};

export function priorityStyle(p?: string) {
  return PRIORITY_STYLES[p || "Medium"] || PRIORITY_STYLES.Medium;
}

export const TIER_GLOW: Record<string, string> = {
  bronze: "from-amber-500/30 to-orange-500/10",
  silver: "from-slate-300/30 to-slate-500/10",
  gold: "from-yellow-400/30 to-amber-500/10",
  diamond: "from-sky-400/30 to-indigo-500/10",
};

// framer-motion variants shared across the timeline.
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const nodeItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } },
};
