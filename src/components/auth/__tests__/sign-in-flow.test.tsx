/**
 * The email-first sign-in screen (`SignInFlow`, rendered by /login and
 * /register): every branch after the address is entered, and every state the
 * backend can answer with. The API and auth context are mocked at their
 * boundary; nothing here touches the network.
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
    getOAuthProviders: vi.fn(),
    socialAuthUrl: vi.fn((p: string) => `/api/auth/oauth/${p}/authorize?redirect=1`),
    checkEmail: vi.fn(),
    register: vi.fn(),
    requestEmailCode: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;
const EMAIL = 'riya@example.com';
const SENT = { data: { ok: true, message: 'sent', resend_after: 60, expires_in: 600 }, status: 200 };

function fail(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return { error: message, status, errorPayload: { code, message, error: message, ...extra } };
}
/** What AuthContext hands back for the same failure. */
function refused(code: string, message: string, extra: Record<string, unknown> = {}) {
  return { error: message, code, payload: { code, message, ...extra } };
}

function mount(path: '/login' | '/register' = '/login', entry: string | object = path) {
  return render(
    <MemoryRouter initialEntries={[entry as string]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app/home" element={<div>workspace-home</div>} />
        <Route path="/app/jobs/for-you" element={<div>deep-link-destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function enterEmail(user: ReturnType<typeof userEvent.setup>, email = EMAIL) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.type(await screen.findByLabelText('6-digit code'), code);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.isAuthenticated = false;
  auth.login.mockResolvedValue({});
  auth.signInWithCode.mockResolvedValue({});
  api.getOAuthProviders.mockResolvedValue({ data: { providers: ['google'] }, status: 200 });
  api.checkEmail.mockResolvedValue({ data: { exists: true, has_password: true, methods: ['password'] } });
  api.requestEmailCode.mockResolvedValue(SENT);
  api.register.mockResolvedValue({ data: { ...SENT.data, email: EMAIL, verification_required: true }, status: 202 });
});

describe('the address step', () => {
  test('Google sits above the email field, and unlisted providers are not offered', async () => {
    mount();
    const google = await screen.findByRole('button', { name: 'Continue with Google' });
    const email = screen.getByLabelText('Email');
    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Microsoft|Apple/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to Aspirely' })).toBeInTheDocument();
  });

  test('a malformed address is caught before any request', async () => {
    const user = userEvent.setup();
    mount();
    await enterEmail(user, 'not-an-email');
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email address');
    expect(api.checkEmail).not.toHaveBeenCalled();
  });

  test('offline shows a sentence, never the browser error', async () => {
    api.checkEmail.mockResolvedValue({
      error: 'We could not reach Aspirely. Check your connection and try again.',
      status: 0,
      errorPayload: { code: 'network_error' },
    });
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach Aspirely');
    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL); // nothing typed is lost
  });

  test('a closed account is told so and goes no further', async () => {
    api.checkEmail.mockResolvedValue({ data: { exists: true, closed: true, methods: [] } });
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('This account has been closed');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  test('a session that ended says so', async () => {
    mount('/login', '/login?expired=1');
    expect(await screen.findByText(/Your session ended/)).toBeInTheDocument();
  });

  test('being rate limited shows how long to wait', async () => {
    api.checkEmail.mockResolvedValue(fail(429, 'rate_limited', 'Too many requests.', { retry_after: 125 }));
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests. Try again in 3 minutes.');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('an account with a password', () => {
  test('signs in and honours the deep link', async () => {
    const user = userEvent.setup();
    mount('/login', { pathname: '/login', state: { from: { pathname: '/app/jobs/for-you' } } });
    await enterEmail(user);
    await user.type(await screen.findByLabelText('Password'), 'Str0ng!Pass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith(EMAIL, 'Str0ng!Pass1'));
    expect(await screen.findByText('deep-link-destination')).toBeInTheDocument();
  });

  test('a wrong password is an inline message on the field', async () => {
    auth.login.mockResolvedValue(refused('invalid_credentials', 'Invalid email or password'));
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.type(await screen.findByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That password is not right');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  test('a locked account shows the wait and still offers a code', async () => {
    auth.login.mockResolvedValue(
      refused('account_locked', 'Too many wrong passwords. This account is locked for a few minutes.', { retry_after: 840 }),
    );
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.type(await screen.findByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 14 minutes.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Email me a code instead' })).toBeEnabled();
  });

  test('an unverified email goes to a code, and the password rides with it', async () => {
    auth.login.mockResolvedValue(refused('email_unverified', 'Confirm your email to finish signing in.'));
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.type(await screen.findByLabelText('Password'), 'Str0ng!Pass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(api.requestEmailCode).toHaveBeenCalledWith(EMAIL);
    await typeCode(user, '123456');
    await waitFor(() =>
      expect(auth.signInWithCode).toHaveBeenCalledWith({
        email: EMAIL, code: '123456', password: 'Str0ng!Pass1', consent: undefined,
      }),
    );
    expect(await screen.findByText('workspace-home')).toBeInTheDocument();
  });

  test('"Change" returns to the address step with the address kept', async () => {
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Change' }));
    expect(await screen.findByLabelText('Email')).toHaveValue(EMAIL);
  });

  test('forgot password asks for a reset link without saying if the address exists', async () => {
    api.requestPasswordReset.mockResolvedValue({ data: { ok: true, message: 'ok' } });
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Reset your password');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    await waitFor(() => expect(api.requestPasswordReset).toHaveBeenCalledWith(EMAIL));
    expect(await screen.findByText('Request received')).toBeInTheDocument();
    expect(dialog).toHaveTextContent(`If ${EMAIL} is registered`);
  });
});

describe('an account with no password', () => {
  test('one made with Google is shown Continue with Google, not a dead end', async () => {
    api.checkEmail.mockResolvedValue({ data: { exists: true, has_password: false, methods: ['google'] } });
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    expect(await screen.findByText('This account signs in with Google. It has no password.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email me a code' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  test('the server saying no_password after a password try lands on the same step', async () => {
    auth.login.mockResolvedValue(refused('no_password', 'no password', { methods: ['google'] }));
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.type(await screen.findByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/signs in with Google/)).toBeInTheDocument();
  });
});

describe('the emailed code', () => {
  async function reachCode(user: ReturnType<typeof userEvent.setup>) {
    mount();
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Email me a code instead' }));
    await screen.findByRole('heading', { name: 'Check your email' });
  }

  test('six digits sign in without pressing a button', async () => {
    const user = userEvent.setup();
    await reachCode(user);
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    await typeCode(user, '123456');
    await waitFor(() => expect(auth.signInWithCode).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('workspace-home')).toBeInTheDocument();
  });

  test('a wrong code says how many tries are left and clears the boxes', async () => {
    auth.signInWithCode.mockResolvedValue(refused('code_invalid', 'That code is not right. 4 tries left.', { attempts_left: 4 }));
    const user = userEvent.setup();
    await reachCode(user);
    await typeCode(user, '111111');
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not right. 4 tries left.');
    expect(screen.getByLabelText('6-digit code')).toHaveValue('');
  });

  test.each([
    ['code_expired', 'That code has expired. Request a new one.'],
    ['code_locked', 'Too many wrong tries. Request a new code.'],
  ])('%s turns the main button into "Send a new code"', async (code, message) => {
    auth.signInWithCode.mockResolvedValue(refused(code, message));
    const user = userEvent.setup();
    await reachCode(user);
    await typeCode(user, '111111');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    const again = screen.getByRole('button', { name: 'Send a new code' });
    expect(again).toBeEnabled();
    await user.click(again);
    await waitFor(() => expect(api.requestEmailCode).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/A new code is on its way/)).toBeInTheDocument();
  });

  test('resend counts down before it can be pressed', async () => {
    const user = userEvent.setup();
    await reachCode(user);
    const resend = screen.getByRole('button', { name: /Send a new code in \d+s/ });
    expect(resend).toBeDisabled();
  });

  test('a code sent moments ago takes you to it instead of an error', async () => {
    api.requestEmailCode.mockResolvedValue(fail(429, 'code_cooldown', 'We just sent a code.', { retry_after: 41 }));
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Email me a code instead' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send a new code in 4\ds/ })).toBeDisabled();
  });

  test('a code that could not be sent is said plainly', async () => {
    api.requestEmailCode.mockResolvedValue(
      fail(503, 'email_send_failed', 'We could not send an email to that address. Check it for typos, or try again in a minute.'),
    );
    const user = userEvent.setup();
    mount();
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Email me a code instead' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send an email to that address');
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
  });

  test('"Use a different email" goes back to the address', async () => {
    const user = userEvent.setup();
    await reachCode(user);
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(await screen.findByLabelText('Email')).toHaveValue(EMAIL);
  });

  test('arriving on the code step with nothing in memory starts over', async () => {
    mount('/login', { pathname: '/login', state: { flow: { step: 'code', email: EMAIL } } });
    expect(await screen.findByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.queryByLabelText('6-digit code')).not.toBeInTheDocument();
  });
});

describe('a new address', () => {
  beforeEach(() => {
    api.checkEmail.mockResolvedValue({ data: { exists: false } });
  });

  test('needs the age and terms box, then creates the account with a code alone', async () => {
    auth.signInWithCode.mockResolvedValue({ created: true });
    const user = userEvent.setup();
    mount('/register');
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    await enterEmail(user);

    const box = await screen.findByRole('checkbox', { name: /at least 18 years old/ });
    expect(box).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm you are at least 18');
    expect(api.requestEmailCode).not.toHaveBeenCalled();

    await user.click(box);
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    await waitFor(() => expect(api.requestEmailCode).toHaveBeenCalledWith(EMAIL));
    expect(api.register).not.toHaveBeenCalled();

    await typeCode(user, '654321');
    await waitFor(() =>
      expect(auth.signInWithCode).toHaveBeenCalledWith({
        email: EMAIL, code: '654321', password: undefined,
        consent: { age_confirmed: true, terms_version: TERMS_VERSION },
      }),
    );
    expect(await screen.findByText('workspace-home')).toBeInTheDocument();
  });

  test('with a password: checked against the rules, sent to register, carried with the code', async () => {
    const user = userEvent.setup();
    mount('/register');
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Add a password' }));
    await user.type(screen.getByLabelText('Password'), 'weak');
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('does not meet every rule');
    expect(api.register).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'Sturdy!Pass1');
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith(EMAIL, 'Sturdy!Pass1', {
        age_confirmed: true, terms_version: TERMS_VERSION,
      }),
    );
    await typeCode(user, '654321');
    await waitFor(() =>
      expect(auth.signInWithCode).toHaveBeenCalledWith(
        expect.objectContaining({ code: '654321', password: 'Sturdy!Pass1' }),
      ),
    );
  });

  test('on the sign-in page too, an unknown address is offered an account', async () => {
    const user = userEvent.setup();
    mount('/login');
    await enterEmail(user);
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText(/no Aspirely account for this email yet/)).toBeInTheDocument();
  });

  test('under 18 is shown as an age message and unchecks the box', async () => {
    api.requestEmailCode.mockResolvedValue(
      fail(400, 'age_requirement', 'You must be at least 18 years old to use Aspirely.'),
    );
    const user = userEvent.setup();
    mount('/register');
    await enterEmail(user);
    await user.click(await screen.findByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect(await screen.findByText('You must be at least 18 years old to use Aspirely.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /at least 18 years old/ })).not.toBeChecked();
  });
});

describe('signing up with an address that already has an account', () => {
  test('is steered to sign in, with the method that account uses', async () => {
    const user = userEvent.setup();
    mount('/register');
    await enterEmail(user);
    expect(await screen.findByText('You already have an account with this email. Sign in instead.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('a 409 from register (lost race) does the same and names Google', async () => {
    api.checkEmail.mockResolvedValue({ data: { exists: false } });
    api.register.mockResolvedValue(fail(409, 'account_exists', 'An account with this email already exists', { methods: ['google'] }));
    const user = userEvent.setup();
    mount('/register');
    await enterEmail(user);
    await user.click(await screen.findByRole('button', { name: 'Add a password' }));
    await user.type(screen.getByLabelText('Password'), 'Sturdy!Pass1');
    await user.click(screen.getByRole('checkbox', { name: /at least 18 years old/ }));
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect(await screen.findByText('You already have an account with this email. Sign in instead.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });
});
