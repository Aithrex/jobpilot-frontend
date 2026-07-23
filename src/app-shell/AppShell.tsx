import { Suspense, lazy } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";

// First-run onboarding. All auth successes land on /next/today, so the shell
// must host the wizard too (it self-gates: renders null unless the signed-in
// user still lacks onboarding). Lazy so onboarded users never fetch the chunk.
// No double-mount risk: /app mounts its own instance, but /app and /next/* are
// mutually exclusive routes - exactly one instance can exist at a time.
const OnboardingWizard = lazy(() => import("@/components/onboarding/OnboardingWizard"));

function FullScreenLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm">Loading your workspace...</span>
      </div>
    </div>
  );
}

function OutletFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

/**
 * Isolated shell for the migrated app (`/next/*`). Coexists with the
 * ResumeParser monolith at `/app` during the strangler-fig migration.
 *
 * Auth is gated the same way the monolith gates via AuthContext: while the
 * profile is verifying we show a loader; with no valid session we redirect to
 * `/login` (the monolith renders an in-place wall - here the task calls for a
 * redirect so deep links land on a real sign-in page and bounce back).
 */
export default function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  // Carry the attempted deep link so Login can bounce back after sign-in.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to content
      </a>

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar />

        <main id="main-content" className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<OutletFallback />}>
              <Outlet />
            </Suspense>
          </div>
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
