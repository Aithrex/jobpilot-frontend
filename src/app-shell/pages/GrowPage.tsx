import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { BookOpen, Bot, CalendarDays, ClipboardList, Loader2, Users } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const GROW_SECTIONS: SubNavItem[] = [
  { to: "learning", label: "Learning Hub", icon: BookOpen },
  { to: "interview", label: "Interview Prep", icon: ClipboardList },
  { to: "copilot", label: "Career Copilot", icon: Bot },
  { to: "network", label: "Network", icon: Users },
  { to: "events", label: "Events", icon: CalendarDays },
];

function SectionFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-muted-foreground"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

/**
 * "Grow" destination in the app shell (`/next/grow`). A layout route: a
 * horizontal sub-nav over deep-linkable nested sections, each mounting an
 * existing standalone tab component from the monolith. Sections are lazy-loaded
 * via the nested routes in App.tsx.
 */
export default function GrowPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Grow</p>
        <h1 className="text-title font-display text-foreground">
          Build skills &amp; momentum
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Learning paths, networking, and events in one place.
        </p>
      </header>

      <SubNav ariaLabel="Grow sections" items={GROW_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        {/* Sections are mounted by App.tsx routes; `embedded` tells the
            monolith-born tab components the shell already renders the page
            header + SubNav, so they suppress their internal hero headers. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
