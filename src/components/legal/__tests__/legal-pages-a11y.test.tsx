/**
 * Accessibility gate for the US launch legal surface: every new or rewritten
 * public page, the signed-in privacy controls and the signup form must have
 * ZERO axe-core violations (WCAG 2.0 to 2.2 A and AA, plus best practices;
 * color contrast is checked on the tokens, see axeHelper).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrivacySettingsSection } from '@/components/privacy/PrivacySettingsSection';
import Accessibility from '@/pages/Accessibility';
import Licenses from '@/pages/Licenses';
import Privacy from '@/pages/Privacy';
import PrivacyChoices from '@/pages/PrivacyChoices';
import Register from '@/pages/Register';
import Terms from '@/pages/Terms';
import Trust from '@/pages/Trust';
import Unsubscribe from '@/pages/Unsubscribe';
import { axeViolations } from './axeHelper';

const { authState, privacyState } = vi.hoisted(() => ({
  authState: { isAuthenticated: false, isLoading: false },
  privacyState: {
    sale_share_opt_out: true,
    gpc: { detected: false, last_seen_at: null },
    sensitive: { immigration_status: { consented: true, consented_at: '2026-11-01T10:00:00Z' } },
    email: { job_alerts: true, digests: false, product_updates: false, marketing: false },
    terms: { version: '2026-11-11', accepted_at: '2026-11-11T10:00:00Z' },
    age_confirmed: true,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(async () => undefined),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/api', () => ({
  apiService: {
    getOAuthProviders: vi.fn(async () => ({ data: { providers: ['google'] }, status: 200 })),
    beginSocialAuth: vi.fn(async () => ({ data: {}, status: 200 })),
    getPrivacy: vi.fn(async () => ({ data: privacyState, status: 200 })),
    updatePrivacy: vi.fn(async () => ({ data: privacyState, status: 200 })),
    getUnsubscribe: vi.fn(async () => ({ data: { list: 'digests' }, status: 200 })),
    confirmUnsubscribe: vi.fn(),
    exportAccountData: vi.fn(),
    deleteAccount: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderAt(path: string, routePath: string, element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider>
          <TooltipProvider>
            <Routes>
              <Route path={routePath} element={element} />
            </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authState.isAuthenticated = false;
  authState.isLoading = false;
  localStorage.clear();
  sessionStorage.clear();
});

describe('legal surface has zero axe violations', () => {
  test.each([
    ['/privacy', <Privacy />, /Aspirely Privacy Policy/],
    ['/terms', <Terms />, /Aspirely Terms of Service/],
    ['/accessibility', <Accessibility />, /Accessibility statement/],
    ['/licenses', <Licenses />, /Open source licenses/],
    ['/trust', <Trust />, /What Aspirely does with your data/],
    ['/privacy/choices', <PrivacyChoices />, /Your Privacy Choices/],
  ] as const)('%s', async (path, element, heading) => {
    const { container } = renderAt(path, path, element);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  test('/privacy/choices signed in, with the live controls', async () => {
    authState.isAuthenticated = true;
    const { container } = renderAt('/privacy/choices', '/privacy/choices', <PrivacyChoices />);
    await screen.findByRole('switch', { name: /Immigration and work authorization status/i });
    expect(await axeViolations(container)).toEqual([]);
  });

  test('/unsubscribe with a token, before confirming', async () => {
    const { container } = renderAt('/unsubscribe?t=tok', '/unsubscribe', <Unsubscribe />);
    await screen.findByRole('button', { name: 'Unsubscribe' });
    expect(await axeViolations(container)).toEqual([]);
  });

  test('settings privacy section', async () => {
    authState.isAuthenticated = true;
    const { container } = renderAt('/app/settings/profile', '/app/settings/profile', <PrivacySettingsSection />);
    await screen.findByRole('switch', { name: /Job alerts/i });
    expect(await axeViolations(container)).toEqual([]);
  });

  test('register form, both beats, with the clickwrap', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/register', '/register', <Register />);
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    expect(await axeViolations(container)).toEqual([]);

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('checkbox', { name: /at least 18 years old/i });
    expect(await axeViolations(container)).toEqual([]);
  });
});
