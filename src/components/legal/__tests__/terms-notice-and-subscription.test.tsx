/**
 * The terms update notice in the app shell, and the auto-renewal disclosure.
 *
 * Notice: shows only for a signed-in account whose accepted version differs
 * from TERMS_VERSION; renders nothing on 404 (backend not deployed); Accept
 * PUTs `accept_terms_version` (plus `age_confirmed` when the account has no
 * age confirmation yet); Dismiss hides it for the session.
 *
 * SubscriptionTerms: renders NOTHING while pricing is unpublished (the
 * published case is in subscription-terms-published.test.tsx).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { SubscriptionTerms } from '@/components/legal/SubscriptionTerms';
import { TermsUpdateNotice } from '@/components/legal/TermsUpdateNotice';
import { apiService } from '@/lib/api';
import { TERMS_VERSION } from '@/lib/legal';

vi.mock('@/lib/api', () => ({
  apiService: { getPrivacy: vi.fn(), updatePrivacy: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;

function privacy(version: string | null, ageConfirmed = true) {
  return {
    sale_share_opt_out: true,
    gpc: { detected: false, last_seen_at: null },
    sensitive: { immigration_status: { consented: false, consented_at: null } },
    email: { job_alerts: false, digests: false, product_updates: false, marketing: false },
    terms: { version, accepted_at: null },
    age_confirmed: ageConfirmed,
  };
}

function renderNotice() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TermsUpdateNotice />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('TermsUpdateNotice', () => {
  test('shows for an older accepted version, and Accept records the current one', async () => {
    api.getPrivacy.mockResolvedValue({ data: privacy('2026-07-10'), status: 200 });
    api.updatePrivacy.mockResolvedValue({ data: privacy(TERMS_VERSION), status: 200 });
    const user = userEvent.setup();
    renderNotice();

    expect(await screen.findByRole('heading', { name: /We updated our Terms of Service/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/terms');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(api.updatePrivacy).toHaveBeenCalledWith({ accept_terms_version: TERMS_VERSION });
    await waitFor(() => expect(screen.queryByTestId('terms-update-notice')).toBeNull());
  });

  test('asks for the age confirmation too when the account has none', async () => {
    api.getPrivacy.mockResolvedValue({ data: privacy(null, false), status: 200 });
    api.updatePrivacy.mockResolvedValue({ data: privacy(TERMS_VERSION, true), status: 200 });
    const user = userEvent.setup();
    renderNotice();

    await user.click(await screen.findByRole('button', { name: 'I am 18 or older and accept' }));
    expect(api.updatePrivacy).toHaveBeenCalledWith({ accept_terms_version: TERMS_VERSION, age_confirmed: true });
  });

  test('renders nothing when the current version is already accepted', async () => {
    api.getPrivacy.mockResolvedValue({ data: privacy(TERMS_VERSION), status: 200 });
    renderNotice();
    await waitFor(() => expect(api.getPrivacy).toHaveBeenCalled());
    expect(screen.queryByTestId('terms-update-notice')).toBeNull();
  });

  test('renders nothing when the privacy endpoint is not deployed (404)', async () => {
    api.getPrivacy.mockResolvedValue({ error: 'Not Found', status: 404 });
    renderNotice();
    await waitFor(() => expect(api.getPrivacy).toHaveBeenCalled());
    expect(screen.queryByTestId('terms-update-notice')).toBeNull();
  });

  test('Dismiss hides it for the session without accepting', async () => {
    api.getPrivacy.mockResolvedValue({ data: privacy('2026-07-10'), status: 200 });
    const user = userEvent.setup();
    renderNotice();
    await user.click(await screen.findByRole('button', { name: 'Dismiss for now' }));
    expect(screen.queryByTestId('terms-update-notice')).toBeNull();
    expect(api.updatePrivacy).not.toHaveBeenCalled();
  });
});

describe('SubscriptionTerms', () => {
  test('renders nothing for any plan while prices are unpublished', () => {
    const { container } = render(
      <MemoryRouter>
        <SubscriptionTerms planId="premium" />
        <SubscriptionTerms planId="premium_plus" />
        <SubscriptionTerms planId="free" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
