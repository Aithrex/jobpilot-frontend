/**
 * The anti-abuse challenge loop: 429 { error:"challenge_required", provider,
 * challenge_id } -> solve the provider widget -> POST
 * /api/resume/guest/challenge/verify -> RETRY the original call.
 *
 * Invariants pinned here:
 * - verify failures are 400 with a code and must never log anyone out or fire
 *   auth:session-expired (the repo forces logout on ANY 401);
 * - a provider we cannot render honestly degrades to the conversion CTA
 *   instead of a broken or fake widget;
 * - when no provider is configured server-side the 429 never fires and the
 *   flow works end to end, untouched.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useGuestFlow } from '@/hooks/useGuestFlow';

interface RecordedCall {
  url: string;
  init: RequestInit;
}

let calls: RecordedCall[] = [];

function reply(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const SESSION = { exists: true, tailors_used: 0, tailors_limit: 1 };
const MATCHES = { jobs: [{ match_id: 'm1', title: 'Data Engineer' }], total_considered: 12 };
const CHALLENGE_429 = {
  error: 'challenge_required',
  provider: 'turnstile',
  challenge_id: 'ch-1',
  message: 'Please complete a quick verification to continue.',
};

/** matchesResponses is consumed in order, one per POST /jobs/guest/matches. */
function mockBackend(opts: {
  matchesResponses: Response[];
  verify?: Response;
}) {
  const queue = [...opts.matchesResponses];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url.includes('/resume/guest/session')) return reply(SESSION);
    if (url.includes('/resume/guest/challenge/verify')) {
      return opts.verify ?? reply({ verified: true });
    }
    if (url.includes('/jobs/guest/matches')) {
      return queue.shift() ?? reply(MATCHES);
    }
    return reply({}, 404);
  }) as unknown as typeof fetch;
}

const urls = (fragment: string) => calls.filter((c) => c.url.includes(fragment));

function mountFlow() {
  return renderHook(() => useGuestFlow({ enabled: true, onUnavailable: () => {} }));
}

beforeEach(() => {
  calls = [];
  localStorage.clear();
  localStorage.setItem('guest_id', 'guest-abc');
  // Deterministic fingerprint (skips SubtleCrypto entirely).
  localStorage.setItem('portfolio_fingerprint_hash', 'fp-test');
  // A publishable site key is what makes a provider renderable.
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('challenge loop', () => {
  test('a 429 challenge_required opens the challenge, then verify retries the original call', async () => {
    mockBackend({ matchesResponses: [reply(CHALLENGE_429, 429), reply(MATCHES)] });
    const { result } = mountFlow();

    await act(async () => {
      await result.current.loadMatches();
    });

    // The original call failed: the challenge is open and the surface behind
    // it says so honestly (no spinner pretending work is still running).
    expect(result.current.challenge?.challengeId).toBe('ch-1');
    expect(result.current.challenge?.provider.id).toBe('turnstile');
    expect(result.current.matchesState).toBe('cta');
    expect(urls('/jobs/guest/matches')).toHaveLength(1);

    await act(async () => {
      await result.current.submitChallenge('widget-token');
    });

    await waitFor(() => expect(result.current.matchesState).toBe('ready'));
    expect(result.current.challenge).toBeNull();
    expect(result.current.matches).toHaveLength(1);

    // verify was posted, then the ORIGINAL call ran again - and neither URL
    // carries the capability.
    const verify = urls('/resume/guest/challenge/verify');
    expect(verify).toHaveLength(1);
    expect(JSON.parse(verify[0].init.body as string)).toMatchObject({
      challenge_id: 'ch-1',
      solution: 'widget-token',
    });
    const matchCalls = urls('/jobs/guest/matches');
    expect(matchCalls).toHaveLength(2);
    for (const call of [...matchCalls, ...verify]) {
      expect(call.url).not.toContain('guest_id=');
      expect(call.init.credentials).toBe('include');
    }
  });

  test('a 400 from challenge/verify keeps the session: no logout, no session-expired event', async () => {
    localStorage.setItem('auth_token', 'token-123');
    const expired = vi.fn();
    window.addEventListener('auth:session-expired', expired);
    mockBackend({
      matchesResponses: [reply(CHALLENGE_429, 429)],
      verify: reply({ error: 'challenge_solution_rejected', verified: false }, 400),
    });
    const { result } = mountFlow();

    await act(async () => {
      await result.current.loadMatches();
    });
    await act(async () => {
      await result.current.submitChallenge('wrong-token');
    });

    expect(expired).not.toHaveBeenCalled();
    expect(localStorage.getItem('auth_token')).toBe('token-123');
    // The challenge stays open with honest failure copy; nothing was retried.
    expect(result.current.challenge?.challengeId).toBe('ch-1');
    expect(result.current.challengeError).toBe('That check did not pass. Please try it again.');
    expect(urls('/jobs/guest/matches')).toHaveLength(1);
    window.removeEventListener('auth:session-expired', expired);
  });

  test('an expired challenge id is retried against the original call so a fresh one can be issued', async () => {
    mockBackend({
      matchesResponses: [reply(CHALLENGE_429, 429), reply(MATCHES)],
      verify: reply({ error: 'challenge_expired', verified: false }, 400),
    });
    const { result } = mountFlow();

    await act(async () => {
      await result.current.loadMatches();
    });
    await act(async () => {
      await result.current.submitChallenge('stale-token');
    });

    await waitFor(() => expect(result.current.matchesState).toBe('ready'));
    expect(result.current.challenge).toBeNull();
    expect(urls('/jobs/guest/matches')).toHaveLength(2);
  });

  test('a provider we cannot render degrades to the conversion CTA, never a fake widget', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    mockBackend({ matchesResponses: [reply(CHALLENGE_429, 429)] });
    const { result } = mountFlow();

    await act(async () => {
      await result.current.loadMatches();
    });

    expect(result.current.challenge).toBeNull();
    expect(result.current.matchesState).toBe('cta');
    expect(result.current.matchesCta?.body).toContain('try again shortly');
    expect(urls('/resume/guest/challenge/verify')).toHaveLength(0);
  });

  test('with no challenge configured server-side the flow runs end to end untouched', async () => {
    mockBackend({ matchesResponses: [reply(MATCHES)] });
    const { result } = mountFlow();

    await act(async () => {
      await result.current.loadMatches();
    });

    expect(result.current.matchesState).toBe('ready');
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.challenge).toBeNull();
    expect(result.current.matchesCta).toBeNull();
    expect(urls('/resume/guest/challenge/verify')).toHaveLength(0);
  });
});
