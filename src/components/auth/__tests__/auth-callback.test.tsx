/**
 * The provider callback page and the provider buttons: every error code the
 * backend can put in the fragment gets its own sentence and stays on screen,
 * the token is removed from the address bar, and a button press is a
 * navigation to the backend (never a fetch).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { AUTH_RETURN_TO_KEY } from '@/components/auth/AuthShell';
import { SocialQuietRow } from '@/components/auth/SocialQuietRow';
import AuthCallback, { describeProviderError } from '@/pages/AuthCallback';

const auth = { hydrateFromToken: vi.fn(), isAuthenticated: false, isLoading: false };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/lib/api', () => ({
  apiService: {
    getOAuthProviders: vi.fn(),
    socialAuthUrl: vi.fn((p: string) => `/api/auth/oauth/${p}/authorize?redirect=1`),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function open(fragment: string) {
  window.history.replaceState(null, '', `/oauth/callback${fragment}`);
  return render(
    <MemoryRouter initialEntries={['/oauth/callback']}>
      <Routes>
        <Route path="/oauth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<div>sign-in-page</div>} />
        <Route path="/app/home" element={<div>workspace-home</div>} />
        <Route path="/app/apply/tracker" element={<div>tracker-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.hydrateFromToken.mockResolvedValue({});
});

afterEach(() => window.history.replaceState(null, '', '/'));

describe('provider callback', () => {
  test('a token signs in, leaves the address bar, and honours the stashed deep link', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/app/apply/tracker');
    open('#token=abc.def.ghi');
    await waitFor(() => expect(auth.hydrateFromToken).toHaveBeenCalledWith('abc.def.ghi'));
    expect(window.location.hash).toBe('');
    expect(await screen.findByText('tracker-page')).toBeInTheDocument();
  });

  test('without a deep link it opens the workspace home', async () => {
    open('#token=abc');
    expect(await screen.findByText('workspace-home')).toBeInTheDocument();
  });

  test.each([
    ['access_denied', 'Sign-in was cancelled'],
    ['user_cancelled_authorize', 'Sign-in was cancelled'],
    ['invalid_state', 'That sign-in attempt expired'],
    ['email_unverified', 'Google has not confirmed your email'],
    ['no_email', 'Google did not share an email'],
    ['account_closed', 'This account has been closed'],
    ['link_not_allowed', 'This email already has an account'],
    ['rate_limited', 'Too many attempts'],
    ['provider_not_configured', 'That sign-in method is not available'],
    ['oauth_failed', 'We could not sign you in with Google'],
    ['something_new', 'We could not sign you in with Google'],
  ])('%s is explained and stays until the person acts', async (code, title) => {
    open(`#error=${code}&provider=google`);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(auth.hydrateFromToken).not.toHaveBeenCalled();
    expect(screen.queryByText('sign-in-page')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to sign in' }));
    expect(await screen.findByText('sign-in-page')).toBeInTheDocument();
  });

  test('a cancel is information, a failure is an alert', async () => {
    const first = open('#error=access_denied&provider=google');
    expect(await screen.findByRole('status')).toHaveTextContent('You left Google before finishing');
    first.unmount();
    open('#error=oauth_failed&provider=google');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  test('a token the server rejects is a failure, not a loop', async () => {
    auth.hydrateFromToken.mockResolvedValue({ error: 'Sign-in could not be completed. Please try again.' });
    open('#token=stale');
    expect(await screen.findByRole('heading', { name: 'We could not finish signing you in' })).toBeInTheDocument();
  });

  test('opened with nothing to finish (Back, or a bookmark)', async () => {
    open('');
    expect(await screen.findByRole('heading', { name: 'There is no sign-in to finish' })).toBeInTheDocument();
  });

  test('other providers are named in their own messages', () => {
    expect(describeProviderError('user_cancelled_authorize', 'apple').body).toContain('You left Apple');
    expect(describeProviderError('email_unverified', 'microsoft').title).toBe('Microsoft has not confirmed your email');
    expect(describeProviderError('oauth_failed', '').title).toBe('We could not sign you in with that provider');
  });
});

describe('provider buttons', () => {
  const assign = vi.fn();
  const original = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  test('only what the backend lists is offered, Google first', async () => {
    api.getOAuthProviders.mockResolvedValue({ data: { providers: ['apple', 'google', 'made-up'] } });
    render(<SocialQuietRow />);
    const buttons = await screen.findAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Continue with Google', 'Continue with Apple']);
  });

  test('nothing listed, or the list unreachable, renders nothing', async () => {
    api.getOAuthProviders.mockResolvedValue({ error: 'offline', status: 0 });
    const { container } = render(<SocialQuietRow />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  test('a press navigates to the backend and shows it is working', async () => {
    api.getOAuthProviders.mockResolvedValue({ data: { providers: ['google'] } });
    render(<SocialQuietRow />);
    const button = await screen.findByRole('button', { name: 'Continue with Google' });
    await userEvent.setup().click(button);
    expect(assign).toHaveBeenCalledWith('/api/auth/oauth/google/authorize?redirect=1');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    // Back from the provider: the page is restored from cache, spinner gone.
    window.dispatchEvent(new Event('pageshow'));
    await waitFor(() => expect(button).toBeEnabled());
  });

  test('`only` narrows to the providers an account is linked to', async () => {
    api.getOAuthProviders.mockResolvedValue({ data: { providers: ['google', 'microsoft'] } });
    render(<SocialQuietRow only={['microsoft']} divider={false} />);
    expect(await screen.findByRole('button', { name: 'Continue with Microsoft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
  });
});
