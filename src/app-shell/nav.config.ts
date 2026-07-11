import {
  Compass,
  LayoutList,
  PenLine,
  Settings,
  Sprout,
  Sun,
  type LucideIcon,
} from "lucide-react";

/**
 * Data-driven information architecture for the new app shell (`/next`).
 * One source of truth consumed by the Sidebar, TopBar user menu, and MobileNav
 * so nav labels/icons/routes never drift apart. Segments are relative to
 * {@link SHELL_BASENAME}; helpers below build absolute, deep-linkable paths.
 */
export interface NavItem {
  /** URL segment under `/next` — also the stable key. */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Short description used for collapsed-rail tooltips + mobile hints. */
  hint: string;
}

/** Root path the shell mounts under. */
export const SHELL_BASENAME = "/next";

/** Absolute, deep-linkable href for a nav segment. */
export function navHref(to: string): string {
  return `${SHELL_BASENAME}/${to}`;
}

/** Primary top-level destinations, in display order. */
export const NAV_ITEMS: NavItem[] = [
  { to: "today", label: "Today", icon: Sun, hint: "Your daily briefing" },
  { to: "applications", label: "Applications", icon: LayoutList, hint: "Track every role" },
  { to: "grow", label: "Grow", icon: Sprout, hint: "Skills & progress" },
  { to: "discover", label: "Discover", icon: Compass, hint: "Find opportunities" },
  { to: "craft", label: "Craft", icon: PenLine, hint: "Tailor & build" },
];

/** Secondary / utility entries, pinned to the foot of the rail. */
export const NAV_SECONDARY: NavItem[] = [
  { to: "settings", label: "Settings", icon: Settings, hint: "Account & preferences" },
];

/** Full set (primary + secondary) for surfaces that list everything. */
export const NAV_ALL: NavItem[] = [...NAV_ITEMS, ...NAV_SECONDARY];
