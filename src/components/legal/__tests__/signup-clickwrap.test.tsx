/**
 * Signup clickwrap and the provider-sign-in agreement line.
 *
 *  - no code is sent, so no account can be made, until the age + Terms box
 *    is checked, and the box is never pre-checked;
 *  - the call that creates the account carries `age_confirmed: true` and the
 *    current TERMS_VERSION;
 *  - `400 {error:"age_requirement"}` is shown as an age message (and unchecks
 *    the box), never treated as a session failure;
 *  - the agreement line sits under the provider buttons on both pages.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TERMS_VERSION } from '@/lib/legal';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

const auth = {
  login: vi.fn(),
  signInWithCode: vi.fn(),
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/api', () => ({
  apiService: {
    getOAuthProviders: vi.fn(async () => ({ data: { providers: ['google'] }, status: 200 })),
    socialAuthUrl: vi.fn(() => '/api/auth/oauth/google/authorize?redirect=1'),
    checkEmail: vi.fn(async () => ({ data: { exists: false }, status: 200 })),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;
const SENT = { data: { ok: true, message: 'sent', resend_after: 60, expires_in: 600 }, status: 200 };

/**
 * The copy a sighted reader sees: drops the screen-reader-only new-tab hints
 * and the space accessible-name computation inserts after an inline link.
 */
function visible(text: string): string {
  return text
    .replace(/ \(opens in a new tab\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

/** Enter a new address on /register and arrive at the create step. */
async function reachCreateStep() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/app/home" element={<div>workspace-destination</div>} />
        <Route path="/login" element={<div>login-destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
  await user.type(screen.getByLabelText('Email'), 'person@example.com');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('checkbox', { name: /at least 18 years old/ });
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.signInWithCode.mockResolvedValue({ created: true });
  api.requestEmailCode.mockResolvedValue(SENT);
  sessionStorage.clear();
});

describe('signup clickwrap', () => {
  test('the box starts unchecked, and no code is sent until it is checked', async () => {
    const user = await reachCreateStep();
    const box = screen.getByRole('checkbox', {
      name: (name) =>
        visible(name) ===
        'I am at least 18 years old and agree to the Terms of Service. I have read the Privacy Policy.',
    });
    expect(box).not.toBeChecked();
    expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy');

    // The button stays pressable so the reason can be said out loud; a
    // disabled button explains nothing to a keyboard or screen-reader user.
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Confirm you are at least 18 and agree to the Terms to create your account.',
    );
    expect(api.requestEmailCode).not.toHaveBeenCalled();

    await user.click(box);
    expect(box).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    await waitFor(() => expect(api.requestEmailCode).toHaveBeenCalledTimes(1));
  });

  test('sends age_confirmed and terms_version with the call that creates the account', async () => {
    const user = await reachCreateStep();
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    await waitFor(() => expect(auth.signInWithCode).toHaveBeenCalledTimes(1));
    expect(auth.signInWithCode.mock.calls[0][0]).toMatchObject({
      email: 'person@example.com',
      code: '123456',
      consent: { age_confirmed: true, terms_version: TERMS_VERSION },
    });
    await screen.findByText('workspace-destination');
  });

  test('400 age_requirement shows the age message and unchecks the box', async () => {
    const message = 'You must be at least 18 years old to use Aspirely.';
    api.requestEmailCode.mockResolvedValue({
      error: 'age_requirement',
      status: 400,
      errorPayload: { error: 'age_requirement', code: 'age_requirement', message },
    });
    const user = await reachCreateStep();
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /at least 18 years old/ })).not.toBeChecked();
    expect(auth.signInWithCode).not.toHaveBeenCalled();
  });
});

describe('provider sign-in agreement line', () => {
  const LINE = /By continuing, you agree to the Terms of Service and acknowledge the Privacy Policy\./;

  test('on sign up, under the provider buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && LINE.test(visible(el.textContent ?? '')))).toBeInTheDocument();
  });

  test('on sign in, under the provider buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && LINE.test(visible(el.textContent ?? '')))).toBeInTheDocument();
  });
});
