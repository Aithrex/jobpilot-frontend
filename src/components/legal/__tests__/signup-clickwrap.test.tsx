/**
 * Signup clickwrap and the provider-sign-in agreement line.
 *
 *  - "Create account" stays disabled until the age + Terms box is checked,
 *    and the box is never pre-checked;
 *  - the request carries `age_confirmed: true` and the current TERMS_VERSION;
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
    beginSocialAuth: vi.fn(async () => ({ data: {}, status: 200 })),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

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

async function reachPasswordBeat() {
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
  await screen.findByLabelText('Password');
  await user.type(screen.getByLabelText('Password'), 'Sturdy!Pass1');
  await user.type(screen.getByLabelText('Confirm password'), 'Sturdy!Pass1');
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.login.mockResolvedValue({});
  sessionStorage.clear();
});

describe('signup clickwrap', () => {
  test('the box starts unchecked and gates the submit button', async () => {
    const user = await reachPasswordBeat();
    const box = screen.getByRole('checkbox', {
      name: (name) =>
        visible(name) ===
        'I am at least 18 years old and agree to the Terms of Service. I have read the Privacy Policy.',
    });
    const submit = screen.getByRole('button', { name: 'Create account' });
    expect(box).not.toBeChecked();
    expect(submit).toBeDisabled();

    await user.click(box);
    expect(box).toBeChecked();
    expect(submit).toBeEnabled();

    expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy');
  });

  test('sends age_confirmed and terms_version with the registration', async () => {
    api.register.mockResolvedValue({ data: { access_token: 't', email: 'person@example.com' }, status: 201 });
    const user = await reachPasswordBeat();
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(api.register).toHaveBeenCalledTimes(1));
    const args = api.register.mock.calls[0];
    expect(args[0]).toBe('person@example.com');
    expect(args[6]).toEqual({ age_confirmed: true, terms_version: TERMS_VERSION });
    // The register token is discarded, exactly as AuthContext.register did.
    expect(api.logout).toHaveBeenCalled();
    await screen.findByText('workspace-destination');
  });

  test('400 age_requirement shows the age message and unchecks the box', async () => {
    api.register.mockResolvedValue({
      error: 'age_requirement',
      status: 400,
      errorPayload: { error: 'age_requirement' },
    });
    const user = await reachPasswordBeat();
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findAllByText('You must be at least 18 years old to create an Aspirely account.'),
    ).not.toHaveLength(0);
    expect(screen.getByRole('checkbox', { name: /at least 18 years old/ })).not.toBeChecked();
    expect(auth.login).not.toHaveBeenCalled();
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
