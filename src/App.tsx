import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './components/feedback/FeedbackWidget';
import { UpgradeModalProvider } from './components/billing/UpgradeModalProvider';
import { CombinedJobsProvider } from './components/job-search/CombinedJobsProvider';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Workspace + heavier routes are lazy-loaded so the public landing stays light.
// Landing is kept eager (it's the LCP content on `/`); everything else — auth
// pages, onboarding, workspace — splits into its own chunk so the marketing
// route ships a lean bundle.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Start = lazy(() => import('./pages/Start'));
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));
const ResumeParser = lazy(() => import('./pages/ResumeParser'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const GmailCallback = lazy(() => import('./pages/GmailCallback'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ApplyPilotPrivacy = lazy(() => import('./pages/ApplyPilotPrivacy'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

// New app shell (`/next/*`) — the migrated main app. Coexists with the
// ResumeParser monolith at `/app` during the strangler-fig migration; AppShell
// self-gates on AuthContext and redirects to /login without a session.
const AppShell = lazy(() => import('@/app-shell/AppShell'));
const TodayPage = lazy(() => import('@/app-shell/pages/TodayPage'));
const ApplicationsTab = lazy(() => import('@/components/resume/ApplicationsTab'));
const GrowPage = lazy(() => import('@/app-shell/pages/GrowPage'));
const DiscoverPage = lazy(() => import('@/app-shell/pages/DiscoverPage'));
const CraftPage = lazy(() => import('@/app-shell/pages/CraftPage'));
const SettingsPage = lazy(() => import('@/app-shell/pages/SettingsPage'));

// Grow + Discover mount existing standalone tab components as deep-linkable
// nested sections under their destination layout — the monolith is untouched.
const LearningHubTab = lazy(() => import('@/components/resume/LearningHubTab'));
const NetworkTab = lazy(() => import('@/components/resume/NetworkTab'));
const EventsTab = lazy(() => import('@/components/resume/EventsTab'));
const JobOpportunitiesTab = lazy(() => import('@/components/resume/JobOpportunitiesTab'));
const CareerPortalsTab = lazy(() => import('@/components/resume/CareerPortalsTab'));

// Craft mounts the résumé tools directly as nested sections. Tailor / My
// Resumes / Tailored are extracted into the app shell; Batch / Six Seconds /
// Voice are standalone components. No fallback cards remain — migration complete.
const TailorPage = lazy(() => import('@/app-shell/pages/craft/TailorPage'));
const MyResumesPage = lazy(() => import('@/app-shell/pages/craft/MyResumesPage'));
const TailoredPage = lazy(() => import('@/app-shell/pages/craft/TailoredPage'));
const BatchTailor = lazy(() => import('@/components/resume/BatchTailor'));
const SixSecondsTab = lazy(() => import('@/components/resume/SixSecondsTab'));
const VoiceGraphTab = lazy(() => import('@/components/resume/VoiceGraphTab'));

// Settings hub sections.
const VisaTimelineTab = lazy(() => import('@/components/visa/VisaTimelineTab'));
const ProfilePanel = lazy(() => import('@/app-shell/settings/ProfilePanel'));
const IntegrationsPanel = lazy(() => import('@/app-shell/settings/IntegrationsPanel'));
const AutonomyPanel = lazy(() => import('@/app-shell/settings/AutonomyPanel'));
const BillingTab = lazy(() => import('@/components/billing/BillingTab'));
const NotificationsTab = lazy(() => import('@/components/resume/NotificationsTab'));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" aria-live="polite">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}

/**
 * Root route: the marketing landing is the front door for everyone. The
 * guest onboarding funnel at /start stays one click away — the landing's
 * primary CTAs route into it when the feature is enabled — so the landing
 * sells the product and /start converts. Deep links to /start, /login,
 * /register, /privacy, /terms etc. are untouched.
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
          {/* Guest onboarding (Start self-gates: authed users → /next/today;
              feature off → back to the login-first landing). */}
          <Route path="/start" element={<Suspense fallback={<RouteLoadingFallback />}><Start /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<RouteLoadingFallback />}><Login /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<RouteLoadingFallback />}><Register /></Suspense>} />

          {/* Product workspace (AuthGate handles the sign-in wall). The
              OnboardingWizard self-gates to authed users who haven't onboarded. */}
          <Route
            path="/app"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ResumeParser />
                <OnboardingWizard />
              </Suspense>
            }
          />

          {/* New app shell — isolated from the /app monolith. AppShell wraps
              its lazy children in its own Suspense, so nested routes render the
              lazy page directly. Deep-linkable (e.g. /next/applications). */}
          <Route
            path="/next"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AppShell />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="applications" element={<ApplicationsTab embedded />} />
            <Route path="grow" element={<GrowPage />}>
              <Route index element={<Navigate to="learning" replace />} />
              <Route path="learning" element={<LearningHubTab />} />
              <Route path="network" element={<NetworkTab />} />
              <Route path="events" element={<EventsTab />} />
            </Route>
            <Route path="discover" element={<DiscoverPage />}>
              <Route index element={<Navigate to="jobs" replace />} />
              <Route path="jobs" element={<JobOpportunitiesTab />} />
              <Route path="portals" element={<CareerPortalsTab />} />
            </Route>
            <Route path="craft" element={<CraftPage />}>
              {/* Land on Tailor — the flagship tool — as the Craft default. */}
              <Route index element={<Navigate to="tailor" replace />} />
              <Route path="tailor" element={<TailorPage />} />
              <Route path="batch" element={<BatchTailor />} />
              <Route path="my-resumes" element={<MyResumesPage />} />
              <Route path="tailored" element={<TailoredPage />} />
              <Route path="six-seconds" element={<SixSecondsTab />} />
              <Route path="voicegraph" element={<VoiceGraphTab />} />
            </Route>
            <Route path="settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfilePanel />} />
              <Route path="integrations" element={<IntegrationsPanel />} />
              <Route path="autonomy" element={<AutonomyPanel />} />
              <Route path="visa" element={<VisaTimelineTab />} />
              <Route path="billing" element={<BillingTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
            </Route>
          </Route>

          {/* Utility routes */}
          <Route path="/admin" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPortal /></Suspense>} />
          {/* Social sign-in landing (distinct from the Gmail-sync callback above) */}
          <Route path="/oauth/callback" element={<Suspense fallback={<RouteLoadingFallback />}><AuthCallback /></Suspense>} />
          <Route path="/oauth/gmail/callback" element={<Suspense fallback={<RouteLoadingFallback />}><GmailCallback /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<RouteLoadingFallback />}><ResetPassword /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<RouteLoadingFallback />}><Privacy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<RouteLoadingFallback />}><Terms /></Suspense>} />
          <Route path="/applypilot/privacy" element={<Suspense fallback={<RouteLoadingFallback />}><ApplyPilotPrivacy /></Suspense>} />

          {/* Legacy redirects → product-first paths */}
          <Route path="/resume-parser" element={<Navigate to="/app" replace />} />
          <Route path="/home" element={<Navigate to="/app" replace />} />
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
          <UpgradeModalProvider>
            <TooltipProvider>
              <FeedbackProvider>
                <CombinedJobsProvider>
                  <AppContent />
                </CombinedJobsProvider>
              </FeedbackProvider>
            </TooltipProvider>
          </UpgradeModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
