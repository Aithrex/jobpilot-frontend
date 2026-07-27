import {
  Briefcase,
  Home,
  LayoutList,
  PenLine,
  Settings,
  Sprout,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical app-shell information architecture.
 * Paths follow common SaaS conventions: `/app/<area>/...` (not a migration
 * prefix like `/next`). Sidebar, TopBar, MobileNav, and deep links all derive
 * from this file so labels and hrefs never drift.
 */
export interface NavItem {
  /** URL segment under {@link SHELL_BASENAME} — also the stable key. */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Collapsed-rail tooltip + mobile hint. */
  hint: string;
}

/** Authenticated product mounts under `/app`. */
export const SHELL_BASENAME = "/app";

/** Absolute href for a top-level destination (e.g. `home` → `/app/home`). */
export function navHref(to: string): string {
  const seg = to.replace(/^\/+/, "");
  return seg ? `${SHELL_BASENAME}/${seg}` : SHELL_BASENAME;
}

/** Join shell base with a relative path (no leading slash required). */
export function appPath(...parts: string[]): string {
  const rest = parts
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return rest ? `${SHELL_BASENAME}/${rest}` : SHELL_BASENAME;
}

/** Default post-login / empty-shell landing. */
export const APP_HOME = appPath("home");

/**
 * Primary destinations (Home first — the daily briefing + feature launchpad).
 * Segment names match user language: jobs, resume, apply.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "home", label: "Home", icon: Home, hint: "Daily briefing and shortcuts" },
  { to: "jobs", label: "Jobs", icon: Briefcase, hint: "Roles picked for you" },
  { to: "resume", label: "Resume", icon: PenLine, hint: "Tailor and manage resumes" },
  { to: "apply", label: "Apply", icon: LayoutList, hint: "Tracker, Auto-Apply, and inbox" },
  { to: "grow", label: "Grow", icon: Sprout, hint: "Skills, interview, and network" },
];

export const NAV_SECONDARY: NavItem[] = [
  { to: "settings", label: "Settings", icon: Settings, hint: "Account and preferences" },
];

export const NAV_ALL: NavItem[] = [...NAV_ITEMS, ...NAV_SECONDARY];
