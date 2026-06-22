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
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Workspace + heavier routes are lazy-loaded so the public landing stays light.
const ResumeParser = lazy(() => import('./pages/ResumeParser'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const GmailCallback = lazy(() => import('./pages/GmailCallback'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ApplyPilotPrivacy = lazy(() => import('./pages/ApplyPilotPrivacy'));

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

function AppContent() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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

          {/* Utility routes */}
          <Route path="/admin" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPortal /></Suspense>} />
          {/* Social sign-in landing (distinct from the Gmail-sync callback above) */}
          <Route path="/oauth/callback" element={<Suspense fallback={<RouteLoadingFallback />}><AuthCallback /></Suspense>} />
          <Route path="/oauth/gmail/callback" element={<Suspense fallback={<RouteLoadingFallback />}><GmailCallback /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<RouteLoadingFallback />}><ResetPassword /></Suspense>} />
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
                <AppContent />
              </FeedbackProvider>
            </TooltipProvider>
          </UpgradeModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
