import {
  Briefcase,
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
  /** URL segment under `/next` - also the stable key. */
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

/**
 * Primary top-level destinations, in display order (roles-first). Paths are
 * kept stable (`discover`, `craft`, `applications`, `today`) so existing deep
 * links never break; only the user-facing labels/order changed. Roles (the
 * job feed) leads; Overview is the secondary daily briefing, pinned last.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "discover", label: "Roles", icon: Briefcase, hint: "Roles picked for you" },
  { to: "craft", label: "Tailor", icon: PenLine, hint: "Tailor and build your resume" },
  { to: "applications", label: "Apply", icon: LayoutList, hint: "Track every application" },
  { to: "grow", label: "Grow", icon: Sprout, hint: "Skills and progress" },
  { to: "today", label: "Overview", icon: Sun, hint: "Your daily briefing" },
];

/** Secondary / utility entries, pinned to the foot of the rail. */
export const NAV_SECONDARY: NavItem[] = [
  { to: "settings", label: "Settings", icon: Settings, hint: "Account & preferences" },
];

/** Full set (primary + secondary) for surfaces that list everything. */
export const NAV_ALL: NavItem[] = [...NAV_ITEMS, ...NAV_SECONDARY];
