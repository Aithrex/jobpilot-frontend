/**
 * Auth stage (AuthShell + AuthAtlas) - proves the sign-in visual reacts to
 * the REAL form (focus zones, pending/error phases), that the password
 * visibility toggle is keyboard reachable, and that the shared shell still
 * serves register and reset-password after the redesign.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';

const auth = {
  login: vi.fn(),
  register: vi.fn(),
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
    forgotPassword: vi.fn(async () => ({ data: {}, status: 200 })),
    resetPassword: vi.fn(async () => ({ data: {}, status: 200 })),
  },
}));

function scene(): string | null {
  return document.querySelector('[data-auth-scene]')?.getAttribute('data-auth-scene') ?? null;
}

async function renderLogin() {
  const view = render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/next/today" element={<div>workspace-destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
  // Wait out the page's 120ms email autofocus so it can't yank focus away
  // mid-interaction and flake the assertions below.
  await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = false;
  auth.login.mockResolvedValue({});
  sessionStorage.clear();
});

describe('auth Signal Atlas stage', () => {
  test('focusing the real fields drives the scene: email to origin, password to secure', async () => {
    const user = userEvent.setup();
    await renderLogin();

    await user.click(screen.getByLabelText('Email'));
    expect(scene()).toBe('origin');

    await user.click(screen.getByLabelText('Password'));
    expect(scene()).toBe('secure');
  });

  test('password visibility toggle is keyboard reachable and works', async () => {
    const user = userEvent.setup();
    await renderLogin();

    const password = screen.getByLabelText('Password') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).not.toHaveAttribute('tabindex', '-1');

    // Tab order: the toggle is the very next stop after the field.
    await user.click(password);
    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(password.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('REAL pending state: the scene reports pending while login is in flight', async () => {
    let resolveLogin: (v: { error?: string }) => void = () => {};
    auth.login.mockImplementation(
      () => new Promise<{ error?: string }>((r) => (resolveLogin = r)),
    );
    const user = userEvent.setup();
    await renderLogin();

    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(scene()).toBe('pending');
    expect(screen.getByRole('button', { name: /Signing in/ })).toBeDisabled();

    resolveLogin({});
    await waitFor(() => expect(screen.getByText('workspace-destination')).toBeInTheDocument());
  });

  test('REAL error state: inline notice + error scene, and typing clears it (no shaking)', async () => {
    auth.login.mockResolvedValue({ error: 'Invalid email or password.' });
    const user = userEvent.setup();
    await renderLogin();

    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(scene()).toBe('error');
    // No shake animation anywhere on the error path.
    expect(document.querySelector('.animate-shake')).toBeNull();

    await user.type(screen.getByLabelText('Password'), 'x');
    expect(scene()).not.toBe('error');
  });

  test('session-expired notice still renders through the redesigned shell', async () => {
    render(
      <MemoryRouter initialEntries={['/login?expired=1']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Your session ended for your security/),
    ).toBeInTheDocument();
  });

  test('register and reset-password still render on the shared shell', async () => {
    const first = render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(scene()).not.toBeNull();
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>,
    );
    // No token in the URL: the page explains, inside the same atlas shell.
    expect(await screen.findByText(/reset link is missing its token/)).toBeInTheDocument();
    expect(scene()).not.toBeNull();
  });
});
