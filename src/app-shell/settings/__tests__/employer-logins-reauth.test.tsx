/**
 * Employer logins — the reveal dialog must branch on what the ACCOUNT supports.
 *
 * The reported bug: the dialog demanded the "Aspirely password" unconditionally.
 * The live user signed up with Google and has no password at all, so the stored
 * employer login was unreachable forever.
 *
 * Contract under test (backend: `shared/python/services/reveal_reauth_service.py`,
 * routes in `services/jobs/blueprints/apply.py`):
 *   - `GET /apply/credentials/reauth-methods` says what this account can do;
 *   - an OAuth-only account gets send-code / enter-code and NO password box;
 *   - a password account keeps its password box, with the code as a fallback;
 *   - exactly one factor is sent per reveal;
 *   - the revealed secret is rendered from component state only - it is never
 *     put in a query cache and never persisted.
 *
 * The apiService boundary is mocked (house style); sonner is mocked.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import EmployerLoginsPanel from '@/app-shell/settings/EmployerLoginsPanel';
import type { AtsCredential } from '@/types/atsCredentials';

vi.mock('@/lib/api', () => ({
  apiService: {
    getAtsCredentials: vi.fn(),
    getAtsReauthMethods: vi.fn(),
    sendAtsRevealCode: vi.fn(),
    revealAtsCredential: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;

const CREDENTIAL: AtsCredential = {
  ats_family: 'workday',
  tenant: 'acme',
  username: 'career.7f3a@pilotmail.co',
  has_password: true,
  scope: 'shared',
  legacy_per_tenant: false,
  company: 'Acme',
  login_url: 'https://acme.wd1.myworkdayjobs.com/careers',
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-01T10:00:00Z',
  last_used_at: null,
  rotation_count: 1,
  reset_count: 0,
  pending_ats_reset: false,
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <EmployerLoginsPanel />
      </QueryClientProvider>,
    ),
  };
}

async function openRevealDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /reveal/i }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAtsCredentials.mockResolvedValue({ status: 200, data: { credentials: [CREDENTIAL] } });
  api.revealAtsCredential.mockResolvedValue({
    status: 200,
    data: { username: CREDENTIAL.username, password: 'Vx7!qKm2pLz9RtBw4eNs' },
  });
});

function oauthOnlyAccount() {
  api.getAtsReauthMethods.mockResolvedValue({
    status: 200,
    data: {
      methods: ['email_code'],
      email_hint: 's*****p@gnanalytica.com',
      code_ttl_seconds: 600,
      code_length: 6,
      challenge: null,
    },
  });
}

function passwordAccount() {
  api.getAtsReauthMethods.mockResolvedValue({
    status: 200,
    data: {
      methods: ['password', 'email_code'],
      email_hint: 's*****p@gnanalytica.com',
      code_ttl_seconds: 600,
      code_length: 6,
      challenge: null,
    },
  });
}

// ---------------------------------------------------------------------------
// The reported bug
// ---------------------------------------------------------------------------
describe('OAuth-only account', () => {
  test('is never asked for a password it does not have', async () => {
    oauthOnlyAccount();
    renderPanel();
    await openRevealDialog();

    expect(await screen.findByRole('button', { name: /send me a code/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/jobpilot password/i)).not.toBeInTheDocument();
    expect(screen.getByText(/s\*\*\*\*\*p@gnanalytica\.com/)).toBeInTheDocument();
  });

  test('sends a code, then reveals with it', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    renderPanel();
    const user = await openRevealDialog();

    await user.click(await screen.findByRole('button', { name: /send me a code/i }));
    const field = await screen.findByLabelText(/verification code/i);
    await user.type(field, '481920');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));

    await waitFor(() => expect(api.revealAtsCredential).toHaveBeenCalledTimes(1));
    const sent = api.revealAtsCredential.mock.calls[0][0];
    expect(sent).toMatchObject({ ats_family: 'workday', tenant: 'acme', code: '481920' });
    // Exactly ONE factor leaves the client.
    expect(sent.password).toBeUndefined();

    // The plaintext is on screen, and only there.
    expect(await screen.findByText('Vx7!qKm2pLz9RtBw4eNs')).toBeInTheDocument();
  });

  test('the reveal button stays disabled until a full code is typed', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    renderPanel();
    const user = await openRevealDialog();
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));

    const submit = screen.getByRole('button', { name: /reveal password/i });
    expect(submit).toBeDisabled();
    await user.type(await screen.findByLabelText(/verification code/i), '4819');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/verification code/i), '20');
    await waitFor(() => expect(submit).toBeEnabled());
  });

  test('an unusable code sends the user back to "send a new one"', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    api.revealAtsCredential.mockResolvedValue({
      status: 403,
      error: 'That code has expired or was already used. Send a new one.',
      errorPayload: { error: 'code_expired' },
    });
    renderPanel();
    const user = await openRevealDialog();
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));
    await user.type(await screen.findByLabelText(/verification code/i), '481920');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer usable/i);
    // Back to the send step - the dead code is not left sitting in the box.
    expect(await screen.findByRole('button', { name: /send me a code/i })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('481920')).not.toBeInTheDocument();
  });

  test('a code already in flight goes straight to the code box', async () => {
    api.getAtsReauthMethods.mockResolvedValue({
      status: 200,
      data: {
        methods: ['email_code'],
        email_hint: 's*****p@gnanalytica.com',
        code_ttl_seconds: 600,
        code_length: 6,
        challenge: { expires_at: '2026-07-28T20:00:00Z', attempts_remaining: 5 },
      },
    });
    renderPanel();
    await openRevealDialog();

    // No second send off the user's budget for a code they already have.
    expect(await screen.findByLabelText(/verification code/i)).toBeInTheDocument();
    expect(api.sendAtsRevealCode).not.toHaveBeenCalled();
  });

  test('a rate-limited send is explained, and no code box appears', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 429,
      error: 'Too many codes requested. Try again in a few minutes.',
      errorPayload: { error: 'code_send_rate_limited' },
    });
    renderPanel();
    const user = await openRevealDialog();
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many codes/i);
    expect(screen.queryByLabelText(/verification code/i)).not.toBeInTheDocument();
    expect(api.revealAtsCredential).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The path that already worked must not regress
// ---------------------------------------------------------------------------
describe('password account', () => {
  test('still gets the password box and reveals with it', async () => {
    passwordAccount();
    renderPanel();
    const user = await openRevealDialog();

    await user.type(await screen.findByLabelText(/jobpilot password/i), 'Correct-Horse-9!');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));

    await waitFor(() => expect(api.revealAtsCredential).toHaveBeenCalledTimes(1));
    const sent = api.revealAtsCredential.mock.calls[0][0];
    expect(sent).toMatchObject({ password: 'Correct-Horse-9!' });
    expect(sent.code).toBeUndefined();
    expect(api.sendAtsRevealCode).not.toHaveBeenCalled();
    expect(await screen.findByText('Vx7!qKm2pLz9RtBw4eNs')).toBeInTheDocument();
  });

  test('can fall back to an emailed code, and the password is dropped', async () => {
    passwordAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    renderPanel();
    const user = await openRevealDialog();

    await user.type(await screen.findByLabelText(/jobpilot password/i), 'Correct-Horse-9!');
    await user.click(screen.getByRole('button', { name: /email me a code instead/i }));
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));
    await user.type(await screen.findByLabelText(/verification code/i), '481920');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));

    await waitFor(() => expect(api.revealAtsCredential).toHaveBeenCalledTimes(1));
    const sent = api.revealAtsCredential.mock.calls[0][0];
    expect(sent.code).toBe('481920');
    expect(sent.password).toBeUndefined();
  });

  test('a wrong password says so, without offering an emailed-code excuse', async () => {
    passwordAccount();
    api.revealAtsCredential.mockResolvedValue({
      status: 403,
      error: 'Password verification failed.',
      errorPayload: { error: 'reauth_failed' },
    });
    renderPanel();
    const user = await openRevealDialog();

    await user.type(await screen.findByLabelText(/jobpilot password/i), 'nope');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't right/i);
    expect(screen.getByLabelText(/jobpilot password/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Safety properties the panel is responsible for
// ---------------------------------------------------------------------------
describe('secret handling', () => {
  test('the revealed password is never written to the query cache or storage', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    const { client } = renderPanel();
    const user = await openRevealDialog();
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));
    await user.type(await screen.findByLabelText(/verification code/i), '481920');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));
    await screen.findByText('Vx7!qKm2pLz9RtBw4eNs');

    const cache = JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data));
    expect(cache).not.toContain('Vx7!qKm2pLz9RtBw4eNs');
    expect(cache).not.toContain('481920');
    expect(JSON.stringify(localStorage)).not.toContain('Vx7!qKm2pLz9RtBw4eNs');
    expect(JSON.stringify(sessionStorage)).not.toContain('Vx7!qKm2pLz9RtBw4eNs');
  });

  test('hiding the row drops the plaintext from the screen', async () => {
    oauthOnlyAccount();
    api.sendAtsRevealCode.mockResolvedValue({
      status: 200,
      data: {
        sent: true, method: 'email_code', email_hint: 's*****p@gnanalytica.com',
        expires_in_seconds: 600, code_length: 6,
      },
    });
    renderPanel();
    const user = await openRevealDialog();
    await user.click(await screen.findByRole('button', { name: /send me a code/i }));
    await user.type(await screen.findByLabelText(/verification code/i), '481920');
    await user.click(screen.getByRole('button', { name: /reveal password/i }));
    await screen.findByText('Vx7!qKm2pLz9RtBw4eNs');

    await user.click(screen.getByRole('button', { name: /^hide$/i }));
    await waitFor(() =>
      expect(screen.queryByText('Vx7!qKm2pLz9RtBw4eNs')).not.toBeInTheDocument(),
    );
  });

  test('the methods lookup only happens when the dialog is opened', async () => {
    oauthOnlyAccount();
    renderPanel();
    await screen.findByRole('button', { name: /reveal/i });
    expect(api.getAtsReauthMethods).not.toHaveBeenCalled();

    await openRevealDialog();
    await waitFor(() => expect(api.getAtsReauthMethods).toHaveBeenCalledTimes(1));
  });
});
