import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Workspace + heavier routes are lazy-loaded so the public landing stays light.
// Landing is kept eager (it's the LCP content on `/`); everything else - auth
// pages, onboarding, workspace - splits into its own chunk so the marketing
// route ships a lean bundle.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Start = lazy(() => import('./pages/Start'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const GmailCallback = lazy(() => import('./pages/GmailCallback'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ApplyPilotPrivacy = lazy(() => import('./pages/ApplyPilotPrivacy'));
const Privacy = lazy(() => import('./pages/Privacy'));
// Public marketing sub-routes. Every component they render is already in the
// eager landing chunk, so these lazy chunks are the page files and nothing
// else - the route is close to free, and it is what makes pricing and trust
// linkable and survivable once a guest upload collapses the landing sections.
const Pricing = lazy(() => import('./pages/Pricing'));
const Trust = lazy(() => import('./pages/Trust'));
const Terms = lazy(() => import('./pages/Terms'));

// The authenticated workspace's provider stack (upgrade modal + feedback dialog
// + combined-jobs controller). Mounted as a pathless layout route around
// `/next/*` (and legacy `/app` redirects) ONLY - at the App root it forced
// billing UI, ui/dialog and the whole jobs controller into the eager landing
// payload. Lazy so Rollup splits it (and its deps) out of the entry chunk.
const WorkspaceProviders = lazy(() => import('./components/workspace/WorkspaceProviders'));

// Canonical app shell (`/next/*`). Classic `/app` ResumeParser is retired —
// those URLs redirect into `/next` via ClassicWorkspaceRedirect.
const AppShell = lazy(() => import('@/app-shell/AppShell'));
const ClassicWorkspaceRedirect = lazy(() => import('@/app-shell/ClassicWorkspaceRedirect'));
const LegacyNextRedirect = lazy(() =>
  import('@/app-shell/ClassicWorkspaceRedirect').then((m) => ({ default: m.LegacyNextRedirect })),
);
const TodayPage = lazy(() => import('@/app-shell/pages/TodayPage'));
const ApplicationsPage = lazy(() => import('@/app-shell/pages/ApplicationsPage'));
const TrackerPage = lazy(() => import('@/components/tracker/TrackerPage'));
const MailboxInboxTab = lazy(() => import('@/components/mailbox/MailboxInboxTab'));
const AutoApplyTab = lazy(() => import('@/components/autoSubmit/AutoApplyTab'));
const PipelineSection = lazy(() => import('@/app-shell/pages/PipelineSection'));
const GrowPage = lazy(() => import('@/app-shell/pages/GrowPage'));
const DiscoverPage = lazy(() => import('@/app-shell/pages/DiscoverPage'));
const CraftPage = lazy(() => import('@/app-shell/pages/CraftPage'));
const SettingsPage = lazy(() => import('@/app-shell/pages/SettingsPage'));

// Grow + Discover mount existing standalone tab components as deep-linkable
// nested sections under their destination layout.
// Sprint Learning Hub — the 14-day Jira-ticket sprint (components/hub).
const LearningHubTab = lazy(() => import('@/components/hub/LearningHubTab'));
const NetworkTab = lazy(() => import('@/components/resume/NetworkTab'));
const EventsTab = lazy(() => import('@/components/resume/EventsTab'));
const InterviewPrepTab = lazy(() => import('@/components/resume/InterviewPrepTab'));
const CareerCopilotTab = lazy(() => import('@/components/resume/CareerCopilotTab'));
const JobOpportunitiesTab = lazy(() => import('@/components/resume/JobOpportunitiesTab'));
const CareerPortalsTab = lazy(() => import('@/components/resume/CareerPortalsTab'));

// Craft mounts the resume tools directly as nested sections.
const ResumeOverviewPage = lazy(() => import('@/app-shell/pages/craft/ResumeOverviewPage'));
const TailorPage = lazy(() => import('@/app-shell/pages/craft/TailorPage'));
const MyResumesPage = lazy(() => import('@/app-shell/pages/craft/MyResumesPage'));
const TailoredPage = lazy(() => import('@/app-shell/pages/craft/TailoredPage'));
const BatchTailor = lazy(() => import('@/components/resume/BatchTailor'));
const SixSecondsTab = lazy(() => import('@/components/resume/SixSecondsTab'));
const VoiceGraphTab = lazy(() => import('@/components/resume/VoiceGraphTab'));

// Settings hub sections.
const VisaTimelineTab = lazy(() => import('@/components/visa/VisaTimelineTab'));
const ProfileTab = lazy(() => import('@/app-shell/settings/ProfileTab'));
const IntegrationsPanel = lazy(() => import('@/app-shell/settings/IntegrationsPanel'));
const AutonomyPanel = lazy(() => import('@/app-shell/settings/AutonomyPanel'));
const BillingTab = lazy(() => import('@/components/billing/BillingTab'));
const NotificationsTab = lazy(() => import('@/components/resume/NotificationsTab'));
const MailboxSettingsPanel = lazy(() => import('@/app-shell/settings/MailboxSettingsPanel'));
const EmployerLoginsPanel = lazy(() => import('@/app-shell/settings/EmployerLoginsPanel'));
const VerifyForwardPanel = lazy(() => import('@/app-shell/settings/VerifyForwardPanel'));
const BetaLabTab = lazy(() => import('@/components/beta/BetaLabTab'));

const queryClient = new QueryClient();

/**
 * Route-level Suspense fallback.
 *
 * Theme-neutral on every route: it declares no surface of its own, so it
 * inherits the active theme and the page it precedes paints the same way.
 *
 * This used to take a `pinnedDark` flag for the auth routes, back when
 * `AuthShell` forced the dark token set regardless of the user's choice - the
 * fallback had to be pinned to match or /login flashed light then went dark.
 * Auth now follows the global theme, so pinning would cause the inverse flash
 * (dark fallback → light page) and the flag is gone.
 */
export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden
        />
        <span>Loading workspace...</span>
      </div>
    </div>
  );
}

/**
 * Root route: the landing IS the product's front door - the full guest flow
 * (upload → up to 5 matches → one tailored resume → download → signup gate)
 * runs directly on `/` inside the hero workspace. /start survives only as a
 * backward-compatible redirect (authed → /app/home, guests → /#try). Deep
 * links to /login, /register, /privacy, /terms etc. are untouched.
 */
function RootRoute() {
  return <Landing />;
}

function AppContent() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRoute />} />
          {/* Legacy guest-onboarding entry - now a pure redirect (authed →
  /app/home; guests → /#try; feature off → /). Guest state
  lives in localStorage + the backend session, so nothing is
  lost crossing this redirect. */}
          {/* These render on the AuthShell stage, which follows the global
  theme - so the theme-neutral fallback matches it in both light and dark. */}
          <Route
            path="/start"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Start />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Register />
              </Suspense>
            }
          />

          {/* Authenticated workspace providers wrap the product shell. */}
          <Route
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <WorkspaceProviders />
              </Suspense>
            }
          >
            {/* Canonical product shell at /app (industry-standard SaaS prefix). */}
            <Route
              path="/app"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <AppShell />
                </Suspense>
              }
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<TodayPage />} />
              <Route path="apply" element={<ApplicationsPage />}>
                <Route index element={<Navigate to="tracker" replace />} />
                <Route path="tracker" element={<TrackerPage />} />
                <Route path="auto-apply" element={<AutoApplyTab />} />
                <Route path="inbox" element={<MailboxInboxTab />} />
                <Route path="pipeline" element={<PipelineSection />} />
              </Route>
              <Route path="grow" element={<GrowPage />}>
                <Route index element={<Navigate to="learning" replace />} />
                <Route path="learning" element={<LearningHubTab />} />
                <Route path="interview" element={<InterviewPrepTab />} />
                <Route path="copilot" element={<CareerCopilotTab />} />
                <Route path="network" element={<NetworkTab />} />
                <Route path="events" element={<EventsTab />} />
              </Route>
              <Route path="jobs" element={<DiscoverPage />}>
                <Route index element={<Navigate to="for-you" replace />} />
                <Route path="for-you" element={<JobOpportunitiesTab />} />
                <Route path="saved" element={<JobOpportunitiesTab />} />
                <Route path="applied" element={<JobOpportunitiesTab />} />
                <Route path="portals" element={<CareerPortalsTab />} />
              </Route>
              <Route path="resume" element={<CraftPage />}>
                {/* The Resume workspace overview. This used to redirect to
                    Tailor, leaving the section with no landing surface. */}
                <Route index element={<ResumeOverviewPage />} />
                <Route path="tailor" element={<TailorPage />} />
                <Route path="batch" element={<BatchTailor />} />
                <Route path="library" element={<MyResumesPage />} />
                <Route path="tailored" element={<TailoredPage />} />
                <Route path="six-seconds" element={<SixSecondsTab />} />
                <Route path="voice" element={<VoiceGraphTab />} />
              </Route>
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<ProfileTab />} />
                <Route path="integrations" element={<IntegrationsPanel />} />
                <Route path="autonomy" element={<AutonomyPanel />} />
                <Route path="visa" element={<VisaTimelineTab />} />
                <Route path="mailbox" element={<MailboxSettingsPanel />} />
                <Route path="mailbox/verify-forward" element={<VerifyForwardPanel />} />
                <Route path="employer-types" element={<Navigate to="/app/settings" replace />} />
                <Route path="employer-logins" element={<EmployerLoginsPanel />} />
                <Route path="billing" element={<BillingTab />} />
                <Route path="notifications" element={<NotificationsTab />} />
                <Route path="beta" element={<BetaLabTab />} />
              </Route>
            </Route>

            {/* Legacy classic ?tab= entry (old /home and /resume-parser bookmarks). */}
            <Route
              path="/home"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ClassicWorkspaceRedirect />
                </Suspense>
              }
            />
            <Route
              path="/resume-parser"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ClassicWorkspaceRedirect />
                </Suspense>
              }
            />
            {/* Temporary /next/* strangler → /app/* */}
            <Route
              path="/next/*"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <LegacyNextRedirect />
                </Suspense>
              }
            />
          </Route>

          {/* Utility routes */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminPortal />
              </Suspense>
            }
          />
          {/* Social sign-in landing (distinct from the Gmail-sync callback above) */}
          <Route
            path="/oauth/callback"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AuthCallback />
              </Suspense>
            }
          />
          <Route
            path="/oauth/gmail/callback"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <GmailCallback />
              </Suspense>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/pricing"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Pricing />
              </Suspense>
            }
          />
          <Route
            path="/trust"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Trust />
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Privacy />
              </Suspense>
            }
          />
          <Route
            path="/terms"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Terms />
              </Suspense>
            }
          />
          <Route
            path="/applypilot/privacy"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ApplyPilotPrivacy />
              </Suspense>
            }
          />

          <Route path="/welcome" element={<Navigate to="/" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          {/* UpgradeModalProvider / FeedbackProvider / CombinedJobsProvider used
  to live here. They are now route-scoped to the workspace via
  `components/workspace/WorkspaceProviders` so the eager landing
  route does not ship billing + jobs code it can never use. */}
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
