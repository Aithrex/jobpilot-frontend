/**
 * Route-scoping guard for the workspace provider stack.
 *
 * Providers mount only under the pathless layout wrapping `/app/*` (and legacy
 * `/next/*` redirects / classic `/home` bookmarks).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('@/components/billing/UpgradeModalProvider', () => ({
  UpgradeModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-upgrade">{children}</div>
  ),
  useUpgrade: () => ({ open: () => undefined }),
}));

vi.mock('@/components/feedback/FeedbackWidget', () => ({
  FeedbackProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-feedback">{children}</div>
  ),
  useFeedback: () => ({ open: () => undefined }),
}));

vi.mock('@/components/job-search/CombinedJobsProvider', () => ({
  CombinedJobsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-combined-jobs">{children}</div>
  ),
  useCombinedJobsCtx: () => ({}),
}));

vi.mock('@/pages/Landing', () => ({
  default: () => <div data-testid="page-landing">landing</div>,
}));

vi.mock('@/app-shell/ClassicWorkspaceRedirect', () => ({
  default: () => <div data-testid="page-classic-redirect">redirect</div>,
  LegacyNextRedirect: () => <div data-testid="page-next-redirect">next-redirect</div>,
}));

vi.mock('@/components/onboarding/OnboardingWizard', () => ({ default: () => null }));

vi.mock('@/app-shell/AppShell', () => ({
  default: () => <div data-testid="page-app-shell">app shell</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, isAuthenticated: false, refreshProfile: () => undefined }),
}));

const PROVIDER_TESTIDS = ['provider-upgrade', 'provider-feedback', 'provider-combined-jobs'];

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const { default: App } = await import('@/App');
  return render(<App />);
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('workspace provider route-scoping', () => {
  it('does NOT mount the workspace providers on the landing route', async () => {
    await renderAppAt('/');

    expect(await screen.findByTestId('page-landing')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('page-landing')).toBeInTheDocument());

    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.queryByTestId(testId)).toBeNull();
    }
  });

  it('mounts all three workspace providers on /app', async () => {
    await renderAppAt('/app/home');

    expect(await screen.findByTestId('page-app-shell')).toBeInTheDocument();
    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });

  it('mounts workspace providers on legacy /home bookmark redirect', async () => {
    await renderAppAt('/home');

    expect(await screen.findByTestId('page-classic-redirect')).toBeInTheDocument();
    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });
});
