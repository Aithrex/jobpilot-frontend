import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { BookOpen, Bot, CalendarDays, Loader2, MessageSquareText, Users } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const GROW_SECTIONS: SubNavItem[] = [
  { to: "learning", label: "Learning Hub", icon: BookOpen },
  { to: "network", label: "Network", icon: Users },
  { to: "events", label: "Events", icon: CalendarDays },
  { to: "interview", label: "Interview Prep", icon: MessageSquareText },
  { to: "copilot", label: "Career Copilot", icon: Bot },
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
          Learning paths, networking, events, and interview prep in one place.
        </p>
      </header>

      <SubNav ariaLabel="Grow sections" items={GROW_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
