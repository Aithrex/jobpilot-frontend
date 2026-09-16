/**
 * The API boundary, against a stubbed `fetch`.
 *
 * What must hold no matter what the server does:
 *  - `tz_offset_minutes` rides every search;
 *  - a 410 `cursor_expired` comes back as DATA, with status 410, and is NOT an
 *    error - and above all is NOT the 401 force-logout path;
 *  - a real 401 still forces a logout (the invariant this feature must not
 *    weaken);
 *  - an AbortSignal from the caller tears the request down;
 *  - `async: true` follows the 202 {job_id} + poll path.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { apiService } from '@/lib/api';
import { isTechFeedCursorExpired } from '@/types/techFeed';
import { makeTechFeedResponse } from '@/test/techFeedFixtures';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** A real 204: no content at all, so `json()` rejects. */
function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  } as unknown as Response;
}

/**
 * The tz offset the client should be sending, as it survives the wire.
 *
 * `-new Date().getTimezoneOffset()` is NEGATIVE ZERO in a UTC environment,
 * and negative zero does not survive JSON: `JSON.stringify(-0)` is `"0"`, so
 * the body the assertion reads back always holds `+0`. `toBe` is `Object.is`,
 * which is the one comparison in JavaScript that separates the two - so the
 * bare expression passed on every developer machine outside UTC and failed on
 * CI, which runs UTC, with "expected +0 to be -0".
 *
 * The sign of zero is not a fact about anybody's timezone and the backend
 * cannot observe it. Normalizing it here keeps the assertion about the thing
 * it was always about: the client sends the VIEWER's offset from UTC, in
 * minutes, on every search.
 */
function expectedTzOffsetMinutes(): number {
  const offset = -new Date().getTimezoneOffset();
  return offset === 0 ? 0 : offset;
}

const fetchMock = vi.fn();

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

function lastBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse((init as RequestInit).body as string);
}

describe('apiService.searchTechFeed', () => {
  test('posts to the tech feed endpoint and always sends tz_offset_minutes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTechFeedResponse()));

    const resp = await apiService.searchTechFeed({ query: 'go', page_size: 25 });

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/jobs/tech-feed/search');
    const body = lastBody();
    expect(body.query).toBe('go');
    expect(body.page_size).toBe(25);
    expect(body.tz_offset_minutes).toBe(expectedTzOffsetMinutes());
    expect(resp.status).toBe(200);
    expect(isTechFeedCursorExpired(resp.data)).toBe(false);
  });

  test('a caller cannot override tz_offset_minutes with a stale value', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTechFeedResponse()));
    await apiService.searchTechFeed({ tz_offset_minutes: 999 });
    expect(lastBody().tz_offset_minutes).toBe(expectedTzOffsetMinutes());
  });

  test('410 cursor_expired is returned as data, never as an error or a logout', async () => {
    const sessionExpired = vi.fn();
    window.addEventListener('auth:session-expired', sessionExpired);

    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'cursor_expired', message: 'This search session expired.' }, 410),
    );

    const resp = await apiService.searchTechFeed({ cursor: 'dead-cursor' });

    expect(resp.error).toBeUndefined();
    expect(resp.status).toBe(410);
    expect(isTechFeedCursorExpired(resp.data)).toBe(true);
    if (isTechFeedCursorExpired(resp.data)) {
      expect(resp.data.message).toBe('This search session expired.');
    }
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(apiService.getToken()).toBe('test-token');

    window.removeEventListener('auth:session-expired', sessionExpired);
  });

  test('a real 401 still forces a logout - the tech feed does not weaken that', async () => {
    const sessionExpired = vi.fn();
    window.addEventListener('auth:session-expired', sessionExpired);

    fetchMock.mockResolvedValue(jsonResponse({ msg: 'Token has expired' }, 401));

    const resp = await apiService.searchTechFeed({});

    expect(resp.error).toMatch(/sign in again/i);
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    expect(apiService.getToken()).toBeNull();

    window.removeEventListener('auth:session-expired', sessionExpired);
  });

  test('a 403 upgrade_required is forwarded with its status and payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'upgrade_required', feature: 'tech_feed' }, 403),
    );

    const resp = await apiService.searchTechFeed({});

    expect(resp.status).toBe(403);
    expect(resp.error).toBe('upgrade_required');
    expect(resp.errorPayload).toMatchObject({ feature: 'tech_feed' });
  });

  test('an aborted signal cancels the request rather than surfacing a timeout', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );

    const pending = apiService.searchTechFeed({ query: 'stale' }, { signal: controller.signal });
    controller.abort();

    const resp = await pending;
    expect(resp.error).toBe('Canceled');
  });

  test('async: true follows the 202 job_id and polls to completion', async () => {
    const finished = makeTechFeedResponse({ total: 7 });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ job_id: 'job-42' }, 202))
      .mockResolvedValueOnce(jsonResponse({ status: 'completed', result: finished }, 200));

    const resp = await apiService.searchTechFeed({ query: 'go', async: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/resume/job/job-42');
    expect(resp.data && !isTechFeedCursorExpired(resp.data) ? resp.data.total : null).toBe(7);
  });
});

describe('apiService tech feed reads', () => {
  test('taxonomy and coverage are plain GETs on their own routes', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ taxonomy_version: 'v1', scopes: [], families: [] }));
    await apiService.getTechFeedTaxonomy();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/jobs/tech-feed/taxonomy');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');

    fetchMock.mockResolvedValue(jsonResponse({ coverage: {}, source_health: {} }));
    await apiService.getTechFeedCoverage();
    expect(String(fetchMock.mock.calls[1][0])).toContain('/jobs/tech-feed/coverage');
  });
});

describe('apiService tech feed feedback', () => {
  test('a dismissal posts the closed-set reason and treats 204 as success', async () => {
    fetchMock.mockResolvedValue(noContentResponse());

    const resp = await apiService.recordTechFeedFeedback({
      job_id: 'job-1',
      reason: 'irrelevant_role',
      search_id: 'search-1',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/jobs/tech-feed/feedback');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      job_id: 'job-1',
      reason: 'irrelevant_role',
      search_id: 'search-1',
    });
    // 204 carries no body. That is a success, not a parse failure.
    expect(resp.error).toBeUndefined();
    expect(resp.status).toBe(204);
  });

  test('a rejected reason comes back as a business 400, never a logout', async () => {
    const sessionExpired = vi.fn();
    window.addEventListener('auth:session-expired', sessionExpired);
    fetchMock.mockResolvedValue(jsonResponse({ error: 'reason must be one of: ...' }, 400));

    const resp = await apiService.recordTechFeedFeedback({
      job_id: 'job-1',
      reason: 'not_interested',
    });

    expect(resp.status).toBe(400);
    expect(resp.error).toMatch(/reason must be one of/);
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(apiService.getToken()).toBe('test-token');
    window.removeEventListener('auth:session-expired', sessionExpired);
  });

  test('a rate limit is reported as a rate limit', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Rate limit exceeded. Tech feed feedback is limited to 240 / 5 min.' }, 429),
    );

    const resp = await apiService.recordTechFeedFeedback({ job_id: 'j', reason: 'duplicate' });
    expect(resp.status).toBe(429);
    expect(resp.error).toMatch(/240 \/ 5 min/);
  });

  test('undo is a DELETE on the job id, url-encoded', async () => {
    fetchMock.mockResolvedValue(noContentResponse());

    await apiService.undoTechFeedFeedback('greenhouse/req 9');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/jobs/tech-feed/feedback/greenhouse%2Freq%209');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  test('the suppression set is a plain GET', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        job_ids: ['a'],
        dedupe_group_ids: [],
        employer_ids: [],
        updated_at: '2026-08-31T10:00:00Z',
      }),
    );

    const resp = await apiService.getTechFeedFeedback();

    expect(String(fetchMock.mock.calls[0][0])).toContain('/jobs/tech-feed/feedback');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    expect(resp.data?.job_ids).toEqual(['a']);
  });
});
