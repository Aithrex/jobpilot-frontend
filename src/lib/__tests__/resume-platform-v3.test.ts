/**
 * Resume Platform v3 contract tests for the apiService layer.
 *
 * Verifies the FE side of the v3 deltas at the network seam (global fetch
 * mocked; the real apiService methods run):
 *  - upload failures map to user-safe copy (503 storage_unavailable,
 *    413 file_too_large) and never look like auth errors;
 *  - tailor job results carry the worker-persisted record_id, and
 *    save-record echoes it back (idempotent settle, no duplicate records);
 *  - PUT /resume/active sends {resume_id} (s3_key form retired);
 *  - the bounded-refinement 409 version_limit_reached surfaces as the
 *    canonical user-facing message / structured errorPayload.
 */
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService, VERSION_LIMIT_MESSAGE } from '@/lib/api';
import type { JDAnalysis, TailoredFullResume } from '@/types/resume';

const jd = { job_title: 'Engineer' } as JDAnalysis;
const resume = { summary: 'x' } as TailoredFullResume;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob([]),
    headers: { get: () => '' },
  };
}

let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gmail outcome review transport', () => {
  test('loads the complete review queue beyond the first 100 items', async () => {
    const suggestions = Array.from({ length: 105 }, (_, index) => ({ suggestion_id: `review-${index}` }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { suggestions: suggestions.slice(0, 100), total: 105, has_more: true, offset: 0 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { suggestions: suggestions.slice(100), total: 105, has_more: false, offset: 100 }));
    const response = await apiService.listGmailSuggestions(true);
    expect(response.data?.suggestions).toEqual(suggestions);
    expect(response.data?.total).toBe(105);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url), 'https://example.com'));
    expect(urls.map((url) => url.searchParams.get('offset'))).toEqual(['0', '100']);
    expect(urls.every((url) => url.searchParams.get('include_resolved') === 'true')).toBe(true);
  });

  test('a failed later review page never returns a partial queue as complete', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { suggestions: [{ suggestion_id: 'first' }], total: 2, has_more: true, offset: 0 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'Review unavailable' }));
    const response = await apiService.listGmailSuggestions();
    expect(response.data).toBeUndefined();
    expect(response.error).toBeTruthy();
  });

  test('a repeated review page stops safely instead of looping or duplicating rows', async () => {
    const page = { suggestions: [{ suggestion_id: 'first' }], total: 2, has_more: true, offset: 0 };
    fetchMock.mockResolvedValue(jsonResponse(200, page));
    const response = await apiService.listGmailSuggestions();
    expect(response.data).toBeUndefined();
    expect(response.error).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('sends the explicitly selected application and outcome together', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { suggestion: { suggestion_id: 'review' } }));
    await apiService.applyGmailSuggestion('review', 'application-1', 'rejected');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/resume/gmail/suggestions/review/apply');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ record_id: 'application-1', status: 'rejected' });
  });

  test('does not send a status override for an existing known-outcome suggestion', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { suggestion: { suggestion_id: 'known' } }));
    await apiService.applyGmailSuggestion('known', 'application-1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ record_id: 'application-1' });
  });
});

describe('tailoring history pagination', () => {
  test('on-demand history returns one page without following its cursor', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [{ record_id: 'r1' }], total: 1000, next_cursor: 'next' }));
    const response = await apiService.getTailoringHistoryPage({ q: 'C++ & SQL', company: 'A+B', sort: 'ats', multi_version: true });
    expect(response.data?.total).toBe(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://example.com');
    expect(url.pathname).toContain('/resume/tailoring-history');
    expect(url.searchParams.get('q')).toBe('C++ & SQL');
    expect(url.searchParams.get('company')).toBe('A+B');
    expect(url.searchParams.get('sort')).toBe('ats');
    expect(url.searchParams.get('multi_version')).toBe('true');
    expect(url.searchParams.get('page_size')).toBe('50');
  });

  test('empty history finishes after one request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [], next_offset: null }));
    expect((await apiService.listTailoringRecords()).data?.records).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('accepts an older backend response during deployment', async () => {
    const record = { record_id: 'legacy', versions: [{ version_id: 'v1' }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [record] }));
    expect((await apiService.listTailoringRecords()).data?.records).toEqual([record]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('loads every page and preserves version metadata', async () => {
    const first = { record_id: 'r1', versions: [{ version_id: 'v1' }] };
    const second = { record_id: 'r2', versions: [{ version_id: 'v2' }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [first], next_offset: 1 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [second], next_offset: null }));
    expect((await apiService.listTailoringRecords()).data?.records).toEqual([first, second]);
    expect(String(fetchMock.mock.calls[0][0])).toContain('page_size=50&offset=0');
    expect(String(fetchMock.mock.calls[1][0])).toContain('page_size=50&offset=1');
  });

  test('a later page failure does not return an incomplete history as success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [{ record_id: 'r1' }], next_offset: 1 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'History unavailable' }));
    const response = await apiService.listTailoringRecords();
    expect(response.error).toBeTruthy();
    expect(response.data).toBeUndefined();
  });

  test('rejects a cursor that cannot advance', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [], next_offset: 0 }));
    expect((await apiService.listTailoringRecords()).error).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('drains every slim tracker page instead of showing a capped total', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [{ record_id: 'r1' }], next_offset: 1, total: 2 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [{ record_id: 'r2' }], next_offset: null, total: 2 }));
    const response = await apiService.listTailoringRecords({ view: 'list' });
    expect(response.data?.records.map((r) => r.record_id)).toEqual(['r1', 'r2']);
    for (const [url] of fetchMock.mock.calls) expect(String(url)).toContain('view=list');
    expect(String(fetchMock.mock.calls[1][0])).toContain('offset=1');
  });

  test('a failed tracker page cannot be presented as a complete list', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records: [{ record_id: 'r1' }], next_offset: 1, total: 2 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'Unavailable' }));
    const response = await apiService.listTailoringRecords({ view: 'list' });
    expect(response.error).toBeTruthy();
    expect(response.data).toBeUndefined();
  });
});

describe('upload error surfaces', () => {
  test('503 storage_unavailable maps to user-safe copy (not a logout)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, { error: 'storage_unavailable' }),
    );
    const res = await apiService.uploadResumeForParser(
      new File(['pdf-bytes'], 'resume.pdf', { type: 'application/pdf' }),
    );
    expect(res.error).toBe(
      'File storage is temporarily unavailable. Please try again in a few minutes.',
    );
    expect(res.error).not.toMatch(/session expired/i);
  });

  test('413 file_too_large maps to user-safe copy', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(413, { error: 'file_too_large' }),
    );
    const res = await apiService.uploadResumeForParser(
      new File(['pdf-bytes'], 'resume.pdf', { type: 'application/pdf' }),
    );
    expect(res.error).toBe('File too large. The maximum size is 5 MB.');
  });
});

describe('tailor record_id echo (worker-persisted records)', () => {
  test('tailor job result carries record_id and save-record echoes it', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/resume/tailor-with-jd')) {
        return jsonResponse(202, { job_id: 'job-1' });
      }
      if (u.includes('/resume/job/job-1')) {
        return jsonResponse(200, {
          status: 'completed',
          result: {
            jd_analysis: jd,
            tailored_resume: resume,
            record_id: 'rec-42',
            base_selection: {
              resume_id: 'ra-backend',
              filename: 'backend.pdf',
              mode: 'pinned',
              reason: 'Using backend.pdf (the resume you chose).',
            },
          },
        });
      }
      if (u.includes('/resume/save-record')) {
        return jsonResponse(200, { record_id: 'rec-42', updated: true });
      }
      throw new Error(`unexpected fetch: ${u}`);
    });

    const tailor = await apiService.tailorResumeWithJDText(
      'A job description',
      undefined,
      undefined,
      undefined,
      undefined,
      { resume_id: 'ra-backend' },
    );
    expect(tailor.error).toBeUndefined();
    expect(tailor.data?.record_id).toBe('rec-42');
    expect(tailor.data?.base_selection?.filename).toBe('backend.pdf');

    const postCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/resume/tailor-with-jd'),
    );
    expect(postCall).toBeDefined();
    const postBody = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(postBody.resume_id).toBe('ra-backend');
    expect(postBody.job_description).toBe('A job description');

    const save = await apiService.saveTailoringRecord({
      record_id: tailor.data!.record_id,
      ats_scores: { overall: 82 },
    });
    expect(save.data?.record_id).toBe('rec-42');

    // The echoed record_id MUST ride in the save-record request body - that
    // is what makes the backend settle idempotent instead of duplicating.
    const saveCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/resume/save-record'),
    );
    expect(saveCall).toBeDefined();
    const body = JSON.parse((saveCall![1] as RequestInit).body as string);
    expect(body.record_id).toBe('rec-42');
  });
});

describe('PUT /resume/active (v3 body)', () => {
  test('sends {resume_id}, never s3_key', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { message: 'Active resume updated', resume_id: 'ra-1' }),
    );
    const res = await apiService.setActiveResume('ra-1');
    expect(res.error).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/resume/active');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      resume_id: 'ra-1',
    });
  });

  test('forwards 409 resume_not_parsed as structured payload', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { error: 'resume_not_parsed' }),
    );
    const res = await apiService.setActiveResume('ra-2');
    expect(res.status).toBe(409);
    expect((res.errorPayload as { error?: string })?.error).toBe(
      'resume_not_parsed',
    );
  });
});

describe('409 version_limit_reached (bounded refinement)', () => {
  test('downloadTailoredResume maps the 409 to the canonical message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { error: 'version_limit_reached', limit: 5 }),
    );
    const r = await apiService.downloadTailoredResume(resume, jd, 'pdf', {
      recordId: 'rec-42',
    });
    expect(r.error).toBe(VERSION_LIMIT_MESSAGE);
  });

  test('regenerateResume names the record and forwards the structured 409', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { error: 'version_limit_reached', limit: 5 }),
    );
    const r = await apiService.regenerateResume(
      resume,
      jd,
      'Tighten the summary',
      undefined,
      'rec-42',
    );
    expect(r.status).toBe(409);
    expect((r.errorPayload as { error?: string })?.error).toBe(
      'version_limit_reached',
    );
    // The record_id must be in the submit body so the backend can refuse
    // BEFORE spending an LLM call.
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.record_id).toBe('rec-42');
  });
});
