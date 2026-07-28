import {
  Beaker,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Eye,
  FileCheck2,
  FolderOpen,
  Gauge,
  Globe,
  Home,
  Inbox,
  KeyRound,
  Layers,
  LayoutList,
  Mail,
  Mic,
  PenLine,
  Plane,
  PlugZap,
  Send,
  Settings,
  Sprout,
  TrendingUp,
  UserCircle,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical app-shell information architecture.
 *
 * Paths follow common SaaS conventions: `/app/<area>/...` (not a migration
 * prefix like `/next`). Sidebar, TopBar, MobileNav, SubNavs, the command
 * palette and deep links all derive from this file so labels and hrefs never
 * drift.
 *
 * TWO levels, one source of truth:
 *   - {@link NAV_ITEMS} - the 5 primary destinations (top bar / bottom tabs).
 *   - {@link NAV_SECTIONS} - every sub-destination under each of them. This is
 *     what makes the product findable: the command palette and the mobile
 *     "More" sheet enumerate it, so no feature is reachable ONLY by first
 *     landing on its parent page and reading a tab strip.
 */
export interface NavItem {
  /** URL segment under {@link SHELL_BASENAME} — also the stable key. */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Collapsed-rail tooltip + mobile hint. */
  hint: string;
}

/** A sub-destination inside a primary destination (rendered by `SubNav`). */
export interface NavSection {
  /** URL segment RELATIVE to its destination (e.g. "auto-apply"). */
  to: string;
  label: string;
  icon: LucideIcon;
  /** One-line "what is this for", shown in the palette and the More sheet. */
  hint: string;
  /** Extra search terms so the palette finds a feature by the word a user
   *  would actually type ("cover letter", "sponsorship", "ATS"). */
  keywords?: string;
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

/* ── Sub-destinations ─────────────────────────────────────────────────────
 * Order matters: it is the literal left-to-right order of each page's tab
 * strip, and the top-to-bottom order in the palette / More sheet. Put the
 * thing the product is FOR first (Jobs → For you, Apply → Auto-Apply is
 * second only because the tracker is the daily habit).
 */

export const JOBS_SECTIONS: NavSection[] = [
  {
    to: "for-you",
    label: "For you",
    icon: Briefcase,
    hint: "Matched roles scored against your resume",
    keywords: "search browse matches fit score opportunities discover",
  },
  {
    to: "portals",
    label: "Career Portals",
    icon: Globe,
    hint: "Scan employer career sites directly",
    keywords: "workday greenhouse lever ashby ats companies",
  },
];

export const RESUME_SECTIONS: NavSection[] = [
  {
    to: "tailor",
    label: "Tailor",
    icon: Wand2,
    hint: "Rewrite one resume for one job description",
    keywords: "jd rewrite ats keywords cover letter",
  },
  {
    to: "batch",
    label: "Batch",
    icon: Layers,
    hint: "Tailor against several roles at once",
    keywords: "bulk multiple queue",
  },
  {
    to: "library",
    label: "Library",
    icon: FolderOpen,
    hint: "Your base resumes and uploads",
    keywords: "upload base master versions pdf docx",
  },
  {
    to: "tailored",
    label: "Tailored",
    icon: FileCheck2,
    hint: "Everything you have already tailored",
    keywords: "history downloads generated",
  },
  {
    to: "six-seconds",
    label: "Six Seconds",
    icon: Eye,
    hint: "What a recruiter sees in the first glance",
    keywords: "scan skim first impression recruiter",
  },
  {
    to: "voice",
    label: "Voice",
    icon: Mic,
    hint: "How your writing sounds across your resume",
    keywords: "tone writing style",
  },
];

export const APPLY_SECTIONS: NavSection[] = [
  {
    to: "tracker",
    label: "Tracker",
    icon: LayoutList,
    hint: "Every application and where it stands",
    keywords: "pipeline kanban status applied interview offer",
  },
  {
    to: "auto-apply",
    label: "Auto-Apply",
    icon: Send,
    hint: "Queue roles and let Aspirely fill the forms",
    keywords: "autopilot submit automation approve review",
  },
  {
    to: "inbox",
    label: "Inbox",
    icon: Inbox,
    hint: "Replies to your managed application address",
    keywords: "email mail replies recruiter messages",
  },
  {
    to: "pipeline",
    label: "Pipeline",
    icon: TrendingUp,
    hint: "Daily sourcing run and its results",
    keywords: "daily scan sourcing feed",
  },
];

export const GROW_SECTIONS: NavSection[] = [
  {
    to: "learning",
    label: "Learning Hub",
    icon: BookOpen,
    hint: "Close skill gaps with a guided sprint",
    keywords: "skills course sprint tickets practice",
  },
  {
    to: "interview",
    label: "Interview Prep",
    icon: ClipboardList,
    hint: "Practice questions and mock interviews",
    keywords: "mock behavioral coach star questions",
  },
  {
    to: "copilot",
    label: "Career Copilot",
    icon: Bot,
    hint: "Ask about your search and get a next step",
    keywords: "chat assistant advice ai",
  },
  {
    to: "network",
    label: "Network",
    icon: Users,
    hint: "Referrals and people worth reaching",
    keywords: "referral contacts outreach linkedin",
  },
  {
    to: "events",
    label: "Events",
    icon: CalendarDays,
    hint: "Hackathons and webinars worth your time",
    keywords: "hackathon webinar meetup",
  },
];

export const SETTINGS_SECTIONS: NavSection[] = [
  {
    to: "profile",
    label: "Profile",
    icon: UserCircle,
    hint: "Name, contact, and job preferences",
    keywords: "account details preferences",
  },
  {
    to: "visa",
    label: "Visa Timeline",
    icon: Plane,
    hint: "OPT / H-1B clock and sponsorship posture",
    keywords: "sponsorship h1b opt cpt green card immigration work authorization",
  },
  {
    to: "mailbox",
    label: "Mailbox",
    icon: Mail,
    hint: "Your managed application address and forwarding",
    keywords: "email forwarding address",
  },
  {
    to: "employer-logins",
    label: "Employer logins",
    icon: KeyRound,
    hint: "Accounts we created for you on employer career sites",
    keywords: "ats password workday credentials login portal reveal account",
  },
  {
    to: "integrations",
    label: "Integrations",
    icon: PlugZap,
    hint: "Gmail, GitHub, and LinkedIn connections",
    keywords: "connect gmail github linkedin oauth",
  },
  {
    to: "autonomy",
    label: "Autonomy",
    icon: Gauge,
    hint: "How far Auto-Apply may go without you",
    keywords: "auto apply autopilot threshold approval",
  },
  {
    to: "billing",
    label: "Billing",
    icon: CreditCard,
    hint: "Plan, quota, and invoices",
    keywords: "plan upgrade quota subscription payment usage",
  },
  {
    to: "notifications",
    label: "Notifications",
    icon: Bell,
    hint: "What we email you and when",
    keywords: "email alerts digest",
  },
  {
    to: "beta",
    label: "Beta Lab",
    icon: Beaker,
    hint: "Experiments you can opt into",
    keywords: "experimental labs preview",
  },
];

/** Every sub-destination, keyed by its primary destination segment. */
export const NAV_SECTIONS: Record<string, NavSection[]> = {
  jobs: JOBS_SECTIONS,
  resume: RESUME_SECTIONS,
  apply: APPLY_SECTIONS,
  grow: GROW_SECTIONS,
  settings: SETTINGS_SECTIONS,
};

/** A sub-destination flattened with its parent, for the palette / More sheet. */
export interface FlatDestination extends NavSection {
  /** Parent destination segment (e.g. "apply"). */
  parent: string;
  /** Parent label, used as the group heading ("Apply"). */
  parentLabel: string;
  /** Absolute in-app href (e.g. "/app/apply/auto-apply"). */
  href: string;
}

/**
 * Every reachable sub-destination in nav order. The command palette renders
 * this in full, which is the mechanism that satisfies "find it without
 * hunting": one keystroke, type any word for the feature, land on it.
 */
export const ALL_DESTINATIONS: FlatDestination[] = NAV_ALL.flatMap((dest) =>
  (NAV_SECTIONS[dest.to] ?? []).map((section) => ({
    ...section,
    parent: dest.to,
    parentLabel: dest.label,
    href: appPath(dest.to, section.to),
  })),
);
