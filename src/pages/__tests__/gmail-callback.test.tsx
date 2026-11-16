/**
 * The page Google sends the user back to. It must finish the connection, name
 * every failure in words, and never lose the code to an expired session.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import GmailCallback from '@/pages/GmailCallback';
import { apiService } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiService: {
    finishGmailLink: vi.fn(),
    getGmailAuthUrl: vi.fn(),
  },
}));

const auth = { isAuthenticated: true, isLoading: false };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

const api = vi.mocked(apiService);
const CALLBACK = '/oauth/gmail/callback?code=the-code&state=the-state';

/** Shows where the router ended up, including the state handed to /login. */
function Where() {
  const location = useLocation();
  return (
    <p data-testid="where">
      {location.pathname}
      {location.search}|{JSON.stringify(location.state)}
    </p>
  );
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/oauth/gmail/callback" element={<GmailCallback />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = true;
  auth.isLoading = false;
});

describe('GmailCallback', () => {
  test('posts the code and state once, then lands on the tracker flagged as linked', async () => {
    api.finishGmailLink.mockResolvedValue({ data: { connected: true }, status: 200 });
    renderAt(CALLBACK);
    expect(await screen.findByText('Gmail connected')).toBeInTheDocument();
    expect(api.finishGmailLink).toHaveBeenCalledTimes(1);
    expect(api.finishGmailLink).toHaveBeenCalledWith('the-code', 'the-state');
    await waitFor(
      () => expect(screen.getByTestId('where')).toHaveTextContent('/app/apply/tracker?gmail=linked'),
      { timeout: 2000 },
    );
  });

  test.each([
    ['state_invalid', 'This Google sign in has expired', /lasts 10 minutes and works once/],
    ['code_rejected', 'Google did not accept the sign in', /expired or been used twice/],
    ['permission_missing', 'Gmail access was not ticked', /Connect again and tick that box/],
    ['no_refresh_token', 'Google did not give lasting access', /choose Allow when Google asks/],
  ])('%s is explained with a way to start again', async (code, title, body) => {
    api.finishGmailLink.mockResolvedValue({
      error: "Traceback: InvalidToken('boom')",
      status: 400,
      errorPayload: { code },
    });
    api.getGmailAuthUrl.mockResolvedValue({ error: 'nope' });
    renderAt(CALLBACK);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was connected and no email was read/)).toBeInTheDocument();
    // The server's own text is never shown.
    expect(screen.queryByText(/Traceback|InvalidToken/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Back to the tracker' })).toBeInTheDocument();
  });

  test('a switched-off integration offers no pointless retry', async () => {
    api.finishGmailLink.mockResolvedValue({
      error: 'disabled',
      status: 503,
      errorPayload: { code: 'gmail_unavailable' },
    });
    renderAt(CALLBACK);
    expect(await screen.findByRole('heading', { name: 'Gmail connection is switched off' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect again' })).not.toBeInTheDocument();
  });

  test('an unknown failure never shows the raw exception', async () => {
    api.finishGmailLink.mockResolvedValue({ error: 'GMAIL_TOKEN_ENCRYPTION_KEY is not configured', status: 500 });
    renderAt(CALLBACK);
    expect(await screen.findByRole('heading', { name: "Couldn't connect Gmail" })).toBeInTheDocument();
    expect(screen.queryByText(/ENCRYPTION_KEY/)).not.toBeInTheDocument();
  });

  test('cancelling at Google is not treated as an error code dump', async () => {
    renderAt('/oauth/gmail/callback?error=access_denied');
    expect(await screen.findByRole('heading', { name: 'Gmail was not connected' })).toBeInTheDocument();
    expect(screen.getByText(/You left Google's screen without allowing access/)).toBeInTheDocument();
    expect(api.finishGmailLink).not.toHaveBeenCalled();
  });

  test('Connect again starts a fresh Google flow', async () => {
    const assign = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
    api.finishGmailLink.mockResolvedValue({ error: 'x', status: 400, errorPayload: { code: 'state_invalid' } });
    api.getGmailAuthUrl.mockResolvedValue({ data: { auth_url: 'https://accounts.google.com/fresh' } });
    const user = userEvent.setup();
    renderAt(CALLBACK);
    await user.click(await screen.findByRole('button', { name: 'Connect again' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/fresh'));
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  test('waits for the session check before spending the code', async () => {
    auth.isLoading = true;
    api.finishGmailLink.mockResolvedValue({ data: { connected: true }, status: 200 });
    const view = renderAt(CALLBACK);
    expect(screen.getByText('Connecting your Gmail...')).toBeInTheDocument();
    expect(api.finishGmailLink).not.toHaveBeenCalled();
    auth.isLoading = false;
    view.rerender(
      <MemoryRouter initialEntries={[CALLBACK]}>
        <Routes>
          <Route path="/oauth/gmail/callback" element={<GmailCallback />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.finishGmailLink).toHaveBeenCalledTimes(1));
  });

  test('no session: the code is kept and sign in returns to this exact URL', async () => {
    auth.isAuthenticated = false;
    const user = userEvent.setup();
    renderAt(CALLBACK);
    expect(await screen.findByRole('heading', { name: 'Sign in to finish connecting Gmail' })).toBeInTheDocument();
    expect(screen.getByText(/The Google step lasts 10 minutes/)).toBeInTheDocument();
    // The one time code was not spent on a call that could only fail.
    expect(api.finishGmailLink).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sign in to finish' }));
    const where = screen.getByTestId('where');
    expect(where).toHaveTextContent('/login|');
    expect(where).toHaveTextContent('"pathname":"/oauth/gmail/callback"');
    expect(where).toHaveTextContent('"search":"?code=the-code&state=the-state"');
  });

  test('a session that expired at Google (401) asks for sign in rather than failing', async () => {
    api.finishGmailLink.mockResolvedValue({ error: 'Session expired. Please sign in again.', status: 401 });
    renderAt(CALLBACK);
    expect(await screen.findByRole('heading', { name: 'Sign in to finish connecting Gmail' })).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't connect Gmail/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to finish' })).toBeEnabled();
  });
});
