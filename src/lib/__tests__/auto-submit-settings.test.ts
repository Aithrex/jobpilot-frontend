/**
 * Auto-submit settings contract (defect A).
 *
 * The backend PUT /apply/auto-submit/settings reads the canonical key
 * `auto_submit_enabled` (the legacy `enabled` is only tolerated transitionally),
 * and the GET returns `auto_submit_enabled`. These assertions pin that the FE
 * PUT body serializes the canonical key so the opt-in flag actually persists.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiService } from '@/lib/api';

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

function mockFetch() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return reply({ auto_submit_enabled: true });
  }) as unknown as typeof fetch;
}

const findCall = (fragment: string) => calls.find((c) => c.url.includes(fragment));

beforeEach(() => {
  calls = [];
  localStorage.clear();
  localStorage.setItem('auth_token', 'token-123');
  mockFetch();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('updateAutoSubmitSettings', () => {
  test('serializes the canonical auto_submit_enabled key (no legacy `enabled`)', async () => {
    await apiService.updateAutoSubmitSettings(true);

    const call = findCall('/apply/auto-submit/settings')!;
    expect(call.init.method).toBe('PUT');
    const body = JSON.parse(call.init.body as string);
    expect(body).toEqual({ auto_submit_enabled: true });
    expect(body).not.toHaveProperty('enabled');
  });

  test('opting out sends auto_submit_enabled:false', async () => {
    await apiService.updateAutoSubmitSettings(false);

    const body = JSON.parse(findCall('/apply/auto-submit/settings')!.init.body as string);
    expect(body).toEqual({ auto_submit_enabled: false });
  });

  test('keeps autonomy_threshold alongside the canonical key when provided', async () => {
    await apiService.updateAutoSubmitSettings(true, 0.8);

    const body = JSON.parse(findCall('/apply/auto-submit/settings')!.init.body as string);
    expect(body).toEqual({ auto_submit_enabled: true, autonomy_threshold: 0.8 });
    expect(body).not.toHaveProperty('enabled');
  });
});
