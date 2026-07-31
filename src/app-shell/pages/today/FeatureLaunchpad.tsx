import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  PenLine,
  Send,
  Sparkles,
} from "lucide-react";
import { appPath } from "@/app-shell/nav.config";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    to: appPath("apply", "auto-apply"),
    title: "Auto-Apply",
    blurb: "Queue matching roles. We prepare answers; you approve or go hands-free.",
    icon: Send,
    badge: "New",
  },
  {
    to: appPath("jobs", "for-you"),
    title: "Jobs for you",
    blurb: "Matched roles from career portals and your resume signal.",
    icon: Briefcase,
  },
  {
    to: appPath("resume", "tailor"),
    title: "Tailor resume",
    blurb: "Rewrite for a job description without inventing experience.",
    icon: PenLine,
  },
  {
    to: appPath("grow", "interview"),
    title: "Interview prep",
    blurb: "Practice questions, mocks, and coach chat for target roles.",
    icon: ClipboardList,
  },
] as const;

/**
 * Home launchpad — one calm row of product shortcuts so new features
 * (especially Auto-Apply) are discoverable without the classic workspace.
 */
export function FeatureLaunchpad() {
  return (
    <section aria-label="Get started" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
          Where to go next
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ to, title, blurb, icon: Icon, ...rest }) => {
          const badge = "badge" in rest ? rest.badge : undefined;
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "group interactive interactive-press flex min-h-[44px] gap-3 rounded-xl border border-border bg-card p-4",
                  "hover:border-primary/40 hover:bg-accent/40 hover:shadow-panel",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors duration-fast ease-standard group-hover:bg-primary/20">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{title}</span>
                    {badge && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="block text-caption text-muted-foreground">{blurb}</span>
                </span>
                <ArrowRight
                  className="icon-advance mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
