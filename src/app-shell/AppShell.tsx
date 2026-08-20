import { Suspense, lazy, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { onNavigateToTailor } from "@/lib/craftHandoff";
import { appPath } from "./nav.config";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";
import { AnimatedOutlet } from "./AnimatedOutlet";

// First-run onboarding. Auth lands on /app/home; the shell hosts the wizard
// (self-gates unless the signed-in user still lacks onboarding).
const OnboardingWizard = lazy(() => import("@/components/onboarding/OnboardingWizard"));

function FullScreenLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center text-muted-foreground"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm">Loading your workspace...</span>
      </div>
    </div>
  );
}

/**
 * Canonical product shell (`/app/*`).
 *
 * Auth is gated via AuthContext: while the profile is verifying we show a
 * loader; with no valid session we redirect to `/login` so deep links land on
 * a real sign-in page and bounce back.
 */
export default function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Cross-surface "open Tailor with this job" handoff. Producers (job cards,
  // Daily Pipeline, batch tailor) stage a `pending_tailor_job` payload and
  // fire the navigate event via `stagePendingTailorJob`; this is the single
  // listener that actually routes to the Tailor page. If Tailor is already
  // active it re-reads the payload itself, so skip the redundant navigation.
  useEffect(() => {
    const tailorPath = appPath("resume", "tailor");
    return onNavigateToTailor(() => {
      if (!window.location.pathname.startsWith(tailorPath)) {
        navigate(tailorPath);
      }
    });
  }, [navigate]);

  if (isLoading) return <FullScreenLoader />;
  // Carry the attempted deep link so Login can bounce back after sign-in.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="min-h-screen text-foreground antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to content
      </a>

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar />

        {/* Pages own their own measure.

            This used to hard-code `max-w-6xl` + padding here, which is right
            for single-column reading and wrong for anything with side columns:
            a page could only escape it with negative margins, and those
            overflowed this `overflow-x-hidden` and silently clipped the right
            edge - taking the page's primary action with it.

            The shell now contributes only vertical rhythm and the scroll
            container. Each page applies its own width recipe as its outermost
            element: `.page-measure` for the standard centred column (what
            every page had before), or `.page-full` for a full-bleed workspace
            that supplies its own padding. */}
        <main id="main-content" className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
          <AnimatedOutlet scope="destination" />
        </main>
      </div>

      <MobileNav />

      {/* Global ⌘K command palette (jump / search / actions). */}
      <CommandPalette />

      {/* Self-gating first-run onboarding (null for onboarded users). */}
      <Suspense fallback={null}>
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
