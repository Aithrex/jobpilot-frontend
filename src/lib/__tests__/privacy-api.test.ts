/**
 * The privacy-rights contract at the apiService boundary, against a stubbed
 * fetch. What must hold:
 *  - unsubscribe never carries the Bearer token (it works signed out, and a
 *    stale token must never reach the 401 force-logout path from a mail link);
 *  - export returns a Blob with the SERVER's filename, and a 429 carries
 *    `retry_after`;
 *  - a real 401 on export still forces a logout, a 404 does not;
 *  - signup sends the clickwrap fields;
 *  - saving a work authorization STATUS records consent; "prefer not to say"
 *    records none.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { apiService } from '@/lib/api';
import { TERMS_VERSION } from '@/lib/legal';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  const h = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: h,
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)], { type: 'application/json' }),
  } as unknown as Response;
}

const fetchMock = vi.fn();

function call(i: number): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[i];
  return { url: String(url), init: (init ?? {}) as RequestInit };
}

function authHeader(init: RequestInit): string | undefined {
  return (init.headers as Record<string, string> | undefined)?.Authorization;
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  apiService.setToken('test-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  apiService.setToken(null);
});

describe('unsubscribe', () => {
  test('GET reads the list without the Bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ list: 'digests' }));
    const res = await apiService.getUnsubscribe('a b/c');
    expect(res.data).toEqual({ list: 'digests' });
    const { url, init } = call(0);
    expect(url).toMatch(/\/auth\/email\/unsubscribe\?t=a%20b%2Fc$/);
    expect(init.method).toBe('GET');
    expect(authHeader(init)).toBeUndefined();
  });

  test('POST sends the token in the query and the JSON body, still without auth', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unsubscribed: true, list: 'digests' }));
    const res = await apiService.confirmUnsubscribe('tok');
    expect(res.data).toEqual({ unsubscribed: true, list: 'digests' });
    const { url, init } = call(0);
    expect(url).toMatch(/\?t=tok$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'tok' });
    expect(authHeader(init)).toBeUndefined();
  });

  test('a 401 on the unauthenticated route does not sign anyone out', async () => {
    const onExpired = vi.fn();
    window.addEventListener('auth:session-expired', onExpired);
    fetchMock.mockResolvedValue(jsonResponse({ error: 'invalid_token' }, 401));
    await apiService.getUnsubscribe('tok');
    window.removeEventListener('auth:session-expired', onExpired);
    expect(onExpired).not.toHaveBeenCalled();
    expect(apiService.getToken()).toBe('test-token');
  });
});

describe('exportAccountData', () => {
  test('returns the Blob and the server filename', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ users: [] }, 200, {
        'content-disposition': 'attachment; filename="aspirely-data-export-2026-11-11.json"',
      }),
    );
    const res = await apiService.exportAccountData();
    expect(res.data).toBeInstanceOf(Blob);
    expect(res.filename).toBe('aspirely-data-export-2026-11-11.json');
    expect(authHeader(call(0).init)).toBe('Bearer test-token');
    expect(call(0).url).toMatch(/\/auth\/account\/export$/);
  });

  test('429 carries retry_after and is not a logout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'rate_limited', retry_after: 5400 }, 429));
    const res = await apiService.exportAccountData();
    expect(res.status).toBe(429);
    expect(res.retryAfter).toBe(5400);
    expect(apiService.getToken()).toBe('test-token');
  });

  test('404 (backend not deployed) degrades without a logout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'not_found' }, 404));
    const res = await apiService.exportAccountData();
    expect(res.status).toBe(404);
    expect(apiService.getToken()).toBe('test-token');
  });

  test('a real 401 still forces the logout', async () => {
    const onExpired = vi.fn();
    window.addEventListener('auth:session-expired', onExpired);
    fetchMock.mockResolvedValue(jsonResponse({ msg: 'Token has expired' }, 401));
    const res = await apiService.exportAccountData();
    window.removeEventListener('auth:session-expired', onExpired);
    expect(res.status).toBe(401);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(apiService.getToken()).toBeNull();
  });
});

describe('privacy state', () => {
  test('GET normalizes a partial payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ email: { digests: true }, terms: { version: '2026-01-01' } }));
    const res = await apiService.getPrivacy();
    expect(res.data?.email).toEqual({ job_alerts: false, digests: true, product_updates: false, marketing: false });
    expect(res.data?.terms.version).toBe('2026-01-01');
    expect(res.data?.sale_share_opt_out).toBe(true);
  });

  test('a 404 passes through as status 404 with no logout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Not Found' }, 404));
    const res = await apiService.getPrivacy();
    expect(res.status).toBe(404);
    expect(res.data).toBeUndefined();
    expect(apiService.getToken()).toBe('test-token');
  });

  test('PUT sends exactly the partial update', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await apiService.updatePrivacy({ email: { marketing: false } });
    expect(call(0).init.method).toBe('PUT');
    expect(JSON.parse(call(0).init.body as string)).toEqual({ email: { marketing: false } });
  });
});

describe('signup and consent', () => {
  test('register sends age_confirmed and terms_version', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 't', email: 'a@b.co' }, 201));
    await apiService.register('a@b.co', 'Pw!12345', undefined, undefined, undefined, undefined, {
      age_confirmed: true,
      terms_version: TERMS_VERSION,
    });
    const body = JSON.parse(call(0).init.body as string);
    expect(body.age_confirmed).toBe(true);
    expect(body.terms_version).toBe(TERMS_VERSION);
  });

  test('400 age_requirement surfaces as data, never as a logout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'age_requirement' }, 400));
    const res = await apiService.register('a@b.co', 'Pw!12345');
    expect(res.status).toBe(400);
    expect(res.errorPayload?.error).toBe('age_requirement');
    expect(apiService.getToken()).toBe('test-token');
  });

  test('saving a work authorization status records consent first', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/auth/privacy')
        ? jsonResponse({})
        : jsonResponse({ preferences: { work_authorization: 'need_sponsorship_future' } }),
    );
    await apiService.saveWorkAuthorization('need_sponsorship_future');
    expect(call(0).url).toMatch(/\/auth\/privacy$/);
    expect(JSON.parse(call(0).init.body as string)).toEqual({ immigration_status_consent: true });
    expect(call(1).url).toMatch(/\/auth\/preferences$/);
  });

  test('"prefer not to say" records no consent', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ preferences: { work_authorization: 'prefer_not_to_say' } }));
    await apiService.saveWorkAuthorization('prefer_not_to_say');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(call(0).url).toMatch(/\/auth\/preferences$/);
  });

  test('a 404 on consent never blocks saving the answer', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/auth/privacy')
        ? jsonResponse({ error: 'Not Found' }, 404)
        : jsonResponse({ preferences: { work_authorization: 'us_citizen' } }),
    );
    const res = await apiService.saveWorkAuthorization('us_citizen');
    expect(res.data?.persisted).toBe(true);
  });
});
