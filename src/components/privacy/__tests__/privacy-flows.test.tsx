/**
 * Privacy rights in the product.
 *
 *  - /unsubscribe READS on load and only POSTs on a click (link scanners
 *    prefetch every URL in a message, so loading the page must change nothing);
 *  - export downloads the server's file, and a 429 says when to try again;
 *  - withdrawing immigration consent asks first, then PUTs `false`;
 *  - email toggles PUT one list at a time;
 *  - the GPC status reads `navigator.globalPrivacyControl`;
 *  - a 404 from the privacy endpoint degrades to an email route, not an error.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { GpcStatus } from '@/components/privacy/GpcStatus';
import { ImmigrationNotice } from '@/components/privacy/ImmigrationNotice';
import { PrivacyControls } from '@/components/privacy/PrivacyControls';
import { formatRetryAfter } from '@/components/privacy/privacyFormat';
import { apiService } from '@/lib/api';
import Unsubscribe from '@/pages/Unsubscribe';

const { refreshProfile } = vi.hoisted(() => ({ refreshProfile: vi.fn(async () => undefined) }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, refreshProfile, logout: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/api', () => ({
  apiService: {
    getUnsubscribe: vi.fn(),
    confirmUnsubscribe: vi.fn(),
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
    exportAccountData: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function state(overrides: Partial<{ consented: boolean; digests: boolean }> = {}) {
  return {
    sale_share_opt_out: true,
    gpc: { detected: false, last_seen_at: null },
    sensitive: {
      immigration_status: { consented: overrides.consented ?? true, consented_at: '2026-11-01T10:00:00Z' },
    },
    email: { job_alerts: true, digests: overrides.digests ?? false, product_updates: false, marketing: false },
    terms: { version: '2026-11-11', accepted_at: '2026-11-11T10:00:00Z' },
    age_confirmed: true,
  };
}

function renderWithProviders(element: ReactElement, path = '/', routePath = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, get: () => undefined });
});

describe('/unsubscribe', () => {
  test('loading the page reads the list and never unsubscribes', async () => {
    api.getUnsubscribe.mockResolvedValue({ data: { list: 'digests' }, status: 200 });
    renderWithProviders(<Unsubscribe />, '/unsubscribe?t=tok-1', '/unsubscribe');

    expect(await screen.findByText('Digests')).toBeInTheDocument();
    expect(api.getUnsubscribe).toHaveBeenCalledWith('tok-1');
    expect(api.confirmUnsubscribe).not.toHaveBeenCalled();
  });

  test('one click confirms with POST', async () => {
    api.getUnsubscribe.mockResolvedValue({ data: { list: 'job_alerts' }, status: 200 });
    api.confirmUnsubscribe.mockResolvedValue({ data: { unsubscribed: true, list: 'job_alerts' }, status: 200 });
    const user = userEvent.setup();
    renderWithProviders(<Unsubscribe />, '/unsubscribe?t=tok-2', '/unsubscribe');

    await user.click(await screen.findByRole('button', { name: 'Unsubscribe' }));
    expect(api.confirmUnsubscribe).toHaveBeenCalledWith('tok-2');
    expect(await screen.findByText(/You are unsubscribed from/)).toBeInTheDocument();
  });

  test('a link without a token asks for nothing and explains', async () => {
    renderWithProviders(<Unsubscribe />, '/unsubscribe', '/unsubscribe');
    expect(screen.getByText(/This unsubscribe link is incomplete/)).toBeInTheDocument();
    expect(api.getUnsubscribe).not.toHaveBeenCalled();
  });

  test('a rejected or unknown token (400 or 404) is "could not verify"', async () => {
    api.getUnsubscribe.mockResolvedValue({ error: 'invalid_token', status: 400 });
    renderWithProviders(<Unsubscribe />, '/unsubscribe?t=bad', '/unsubscribe');
    expect(await screen.findByText(/We could not verify this unsubscribe link/)).toBeInTheDocument();
    expect(api.confirmUnsubscribe).not.toHaveBeenCalled();
  });
});

describe('PrivacyControls', () => {
  test('export saves the server file', async () => {
    api.getPrivacy.mockResolvedValue({ data: state(), status: 200 });
    api.exportAccountData.mockResolvedValue({
      data: new Blob(['{}'], { type: 'application/json' }),
      filename: 'aspirely-data-export-2026-11-11.json',
      status: 200,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderWithProviders(<PrivacyControls />);

    await user.click(await screen.findByRole('button', { name: 'Download my data' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('aspirely-data-export-2026-11-11.json');
    click.mockRestore();
  });

  test('export 429 states when the next export is allowed', async () => {
    api.getPrivacy.mockResolvedValue({ data: state(), status: 200 });
    api.exportAccountData.mockResolvedValue({ error: 'rate_limited', status: 429, retryAfter: 1200 });
    const user = userEvent.setup();
    renderWithProviders(<PrivacyControls />);

    await user.click(await screen.findByRole('button', { name: 'Download my data' }));
    expect(
      await screen.findByText('You have reached the limit of 5 exports a day. You can export again in about 20 minutes.'),
    ).toBeInTheDocument();
  });

  test('withdrawing immigration consent asks first, then PUTs false and refreshes', async () => {
    api.getPrivacy.mockResolvedValue({ data: state({ consented: true }), status: 200 });
    api.updatePrivacy.mockResolvedValue({ data: state({ consented: false }), status: 200 });
    const user = userEvent.setup();
    renderWithProviders(<PrivacyControls />);

    const toggle = await screen.findByRole('switch', { name: /Immigration and work authorization status/ });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(api.updatePrivacy).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw and erase' }));
    await waitFor(() => expect(api.updatePrivacy).toHaveBeenCalledWith({ immigration_status_consent: false }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /Immigration and work authorization status/ })).not.toBeChecked(),
    );
  });

  test('an email toggle PUTs only that list', async () => {
    api.getPrivacy.mockResolvedValue({ data: state({ digests: false }), status: 200 });
    api.updatePrivacy.mockResolvedValue({ data: state({ digests: true }), status: 200 });
    const user = userEvent.setup();
    renderWithProviders(<PrivacyControls />);

    await user.click(await screen.findByRole('switch', { name: 'Digests' }));
    expect(api.updatePrivacy).toHaveBeenCalledWith({ email: { digests: true } });
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Digests' })).toBeChecked());
  });

  test('a 404 privacy endpoint degrades to the email route, export stays available', async () => {
    api.getPrivacy.mockResolvedValue({ error: 'Not Found', status: 404 });
    renderWithProviders(<PrivacyControls />);
    expect(await screen.findByText(/not available in the app yet/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('button', { name: 'Download my data' })).toBeInTheDocument();
  });
});

describe('GPC and the notice at collection', () => {
  test('GPC on is shown as detected and honored', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, get: () => true });
    render(<GpcStatus />);
    expect(screen.getByText(/Global Privacy Control: detected and honored/)).toBeInTheDocument();
  });

  test('GPC absent is shown as not detected', () => {
    render(<GpcStatus />);
    expect(screen.getByText(/Global Privacy Control: not detected in this browser/)).toBeInTheDocument();
  });

  test('the immigration notice says what the data is for and where to remove it', () => {
    render(
      <MemoryRouter>
        <ImmigrationNotice />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('immigration-notice')).toHaveTextContent(
      'Used only to match you with employers that sponsor. You can remove it anytime in Settings.',
    );
  });

  test('retry formatting', () => {
    expect(formatRetryAfter(30)).toBe('in about 1 minute');
    expect(formatRetryAfter(1200)).toBe('in about 20 minutes');
    const now = new Date('2026-11-11T08:00:00');
    expect(formatRetryAfter(2 * 3600, now)).toBe('after 10:00 AM');
  });
});
