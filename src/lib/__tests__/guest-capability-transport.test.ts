/**
 * Guest capability transport (v6).
 *
 * `guest_id` / `device_token` are bearer capabilities: they grant access to the
 * parsed resume, the match snapshot, the tailored record and the download. In a
 * query string they land in CloudFront/API Gateway access logs, browser history
 * and the Referer header of every outbound link, where a capability may not
 * live. They now travel as a Secure/HttpOnly SameSite cookie (Path=/api) with
 * X-Guest-Id / X-Guest-Device-Token as the header fallback.
 *
 * These assertions pin the three things that break silently:
 *   1. no capability ever appears in a request URL,
 *   2. guest calls send `credentials: "include"` (without it the cookie is
 *      never attached and the header fallback is doing all the work),
 *   3. credentials are NOT blanket-enabled on authed calls.
 *
 * Plus the hard repo invariant: a 400 from /resume/guest/challenge/verify must
 * never reach the 401 force-logout path.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiService } from '@/lib/api';

interface RecordedCall {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

let calls: RecordedCall[] = [];

function reply(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Route by URL + method; every request is recorded for assertions. */
function mockFetch(router: (url: string, init: RequestInit) => Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const opts = init ?? {};
    calls.push({
      url,
      init: opts,
      headers: (opts.headers ?? {}) as Record<string, string>,
    });
    return router(url, opts);
  }) as unknown as typeof fetch;
}

const findCall = (fragment: string) => calls.find((c) => c.url.includes(fragment));

beforeEach(() => {
  calls = [];
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('guest job poll', () => {
  test('sends X-Guest-Id as a header and never in the URL', async () => {
    mockFetch(() => reply({ status: 'completed', result: { ok: true } }));

    const resp = await apiService.guestJobPoll<{ ok: boolean }>(
      'job-123',
      'guest-abc',
      5000,
    );

    expect(resp.data).toEqual({ ok: true });
    const call = findCall('/resume/guest/job/');
    expect(call).toBeDefined();
    expect(call!.url).not.toContain('guest_id=');
    expect(call!.url).toBe('http://localhost:5000/api/resume/guest/job/job-123');
    expect(call!.headers['X-Guest-Id']).toBe('guest-abc');
    expect(call!.init.credentials).toBe('include');
  });
});

describe('guest session', () => {
  test('keeps fingerprint_hash in the query but moves both capabilities to headers', async () => {
    mockFetch(() => reply({ exists: true }));

    await apiService.guestSession('guest-abc', 'fp-hash', 'device-xyz');

    const call = findCall('/resume/guest/session');
    expect(call).toBeDefined();
    // fingerprint_hash is a recognition signal, not a capability - it stays.
    expect(call!.url).toContain('fingerprint_hash=fp-hash');
    expect(call!.url).not.toContain('guest_id=');
    expect(call!.url).not.toContain('device_token=');
    expect(call!.headers['X-Guest-Id']).toBe('guest-abc');
    expect(call!.headers['X-Guest-Device-Token']).toBe('device-xyz');
    expect(call!.init.credentials).toBe('include');
  });

  test('omits the query string entirely when there is no fingerprint', async () => {
    mockFetch(() => reply({ exists: false }));

    await apiService.guestSession('guest-abc');

    const call = findCall('/resume/guest/session');
    expect(call!.url).toBe('http://localhost:5000/api/resume/guest/session');
  });
});

describe('guest writes', () => {
  test('tailor keeps its POST body untouched and adds the cookie + header transport', async () => {
    mockFetch(() => reply({ job_id: 'j1' }, 202));

    await apiService.guestTailor({
      guest_id: 'guest-abc',
      match_id: 'm1',
      device_token: 'device-xyz',
    });

    const call = findCall('/resume/guest/tailor');
    expect(call!.url).not.toContain('guest_id=');
    // A body-supplied capability is what lets the backend skip its CSRF check.
    expect(JSON.parse(call!.init.body as string)).toEqual({
      guest_id: 'guest-abc',
      match_id: 'm1',
      device_token: 'device-xyz',
    });
    expect(call!.headers['X-Guest-Id']).toBe('guest-abc');
    expect(call!.init.credentials).toBe('include');
  });

  test('matches and download issue send credentials and no capability in the URL', async () => {
    mockFetch((url) =>
      url.includes('/jobs/guest/matches')
        ? reply({ jobs: [] })
        : reply({ token: 't', formats: ['pdf'] }),
    );

    await apiService.guestMatches('guest-abc', 'device-xyz');
    await apiService.guestDownloadIssue('guest-abc', 'rec-1', 'pdf');

    for (const fragment of ['/jobs/guest/matches', '/resume/guest/download']) {
      const call = findCall(fragment)!;
      expect(call.url).not.toContain('guest_id=');
      expect(call.init.credentials).toBe('include');
      expect(call.headers['X-Guest-Id']).toBe('guest-abc');
    }
  });
});

describe('scope', () => {
  test('authed calls do NOT get credentials:"include" or guest headers', async () => {
    localStorage.setItem('auth_token', 'token-123');
    mockFetch(() => reply({ email: 'a@b.co' }));

    await apiService.getProfile();

    const call = findCall('/auth/profile')!;
    expect(call.init.credentials).toBeUndefined();
    expect(call.headers['X-Guest-Id']).toBeUndefined();
    expect(call.headers['Authorization']).toBe('Bearer token-123');
  });
});

describe('challenge verify', () => {
  test('posts {challenge_id, solution} and reports success', async () => {
    mockFetch(() => reply({ verified: true }));

    const resp = await apiService.guestChallengeVerify('ch-1', 'sol-1', 'guest-abc');

    expect(resp.data?.verified).toBe(true);
    const call = findCall('/resume/guest/challenge/verify')!;
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(call.init.body as string)).toEqual({
      challenge_id: 'ch-1',
      solution: 'sol-1',
      guest_id: 'guest-abc',
    });
    expect(call.init.credentials).toBe('include');
    expect(call.headers['X-Guest-Id']).toBe('guest-abc');
  });

  test.each([
    'challenge_expired',
    'challenge_already_used',
    'challenge_subject_mismatch',
    'challenge_solution_rejected',
  ])('a 400 %s is a plain error: no logout, no session-expired event', async (code) => {
    localStorage.setItem('auth_token', 'token-123');
    const expired = vi.fn();
    window.addEventListener('auth:session-expired', expired);
    mockFetch(() => reply({ error: code, verified: false }, 400));

    const resp = await apiService.guestChallengeVerify('ch-1', 'bad', 'guest-abc');

    expect(resp.status).toBe(400);
    expect((resp.errorPayload as { error?: string }).error).toBe(code);
    expect(expired).not.toHaveBeenCalled();
    expect(localStorage.getItem('auth_token')).toBe('token-123');
    window.removeEventListener('auth:session-expired', expired);
  });

  test('the verify call carries no Authorization header, so it can never trip the 401 path', async () => {
    localStorage.setItem('auth_token', 'token-123');
    mockFetch(() => reply({ verified: true }));

    await apiService.guestChallengeVerify('ch-1', 'sol', 'guest-abc');

    expect(findCall('/challenge/verify')!.headers['Authorization']).toBeUndefined();
  });
});
