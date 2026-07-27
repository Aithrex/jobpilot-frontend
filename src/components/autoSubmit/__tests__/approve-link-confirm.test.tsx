/**
 * ApproveLinkConfirm - the /app/apply?approve=<token> confirmation
 * surface. The apiService boundary + useAuth are mocked. Covers the four
 * outcomes (200 approved · 200 not-ready · 409 already-used · 403 wrong-account)
 * plus the signed-out bounce to /login that preserves the token. NEVER a 401.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, type Location } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import ApproveLinkConfirm from '@/components/autoSubmit/ApproveLinkConfirm';

vi.mock('@/lib/api', () => ({
  apiService: { confirmApproveLink: vi.fn() },
}));

let authState = { isAuthenticated: true, isLoading: false };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const api = apiService as unknown as Record<string, Mock>;

/** Renders the login destination + the deep link Login would bounce back to. */
function LoginProbe() {
  const loc = useLocation();
  const from = (loc.state as { from?: Partial<Location> } | null)?.from;
  return (
    <div>
      login-page:{from ? `${from.pathname ?? ''}${from.search ?? ''}` : ''}
    </div>
  );
}

function renderConfirm(token = 'tok-123') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/app/apply?approve=${token}`]}>
        <Routes>
          <Route
            path="/app/apply"
            element={<ApproveLinkConfirm token={token} />}
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = { isAuthenticated: true, isLoading: false };
});

describe('ApproveLinkConfirm', () => {
  test('posts the token and renders success on 200 approved', async () => {
    api.confirmApproveLink.mockResolvedValue({
      data: { ok: true, approved: 1, ready: true },
      status: 200,
    });

    renderConfirm('tok-abc');

    expect(await screen.findByText('Application approved')).toBeInTheDocument();
    expect(api.confirmApproveLink).toHaveBeenCalledWith('tok-abc');
  });

  test('renders "not ready yet" when the row could not be approved (approved:0)', async () => {
    api.confirmApproveLink.mockResolvedValue({
      data: { ok: true, approved: 0, ready: false },
      status: 200,
    });

    renderConfirm();

    expect(await screen.findByText(/not ready to approve/i)).toBeInTheDocument();
  });

  test('renders "already used" on 409', async () => {
    api.confirmApproveLink.mockResolvedValue({
      status: 409,
      error: 'link_already_used',
    });

    renderConfirm();

    expect(await screen.findByText('This link was already used')).toBeInTheDocument();
  });

  test('renders "wrong account" on 403', async () => {
    api.confirmApproveLink.mockResolvedValue({
      status: 403,
      error: 'not_authorized',
    });

    renderConfirm();

    expect(
      await screen.findByText('This link is for a different account'),
    ).toBeInTheDocument();
  });

  test('signed out: bounces to /login preserving the token, without posting', async () => {
    authState = { isAuthenticated: false, isLoading: false };

    renderConfirm('tok-xyz');

    expect(await screen.findByText(/login-page:/)).toHaveTextContent(
      '/app/apply?approve=tok-xyz',
    );
    expect(api.confirmApproveLink).not.toHaveBeenCalled();
  });
});
