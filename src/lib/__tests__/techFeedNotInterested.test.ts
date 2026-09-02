/**
 * The suppression cache, on its own.
 *
 * The panel tests cover the user-visible behaviour; these cover the rules the
 * cache follows when the server and the browser disagree, because that is
 * where a caching bug turns into "the job I dismissed came back" or, worse,
 * "a job I never dismissed vanished".
 */
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import {
  NOT_INTERESTED_KEY,
  SUPPRESSING_REASONS,
  loadNotInterestedIds,
  reasonHidesJob,
  reconcileNotInterested,
  recordNotInterested,
  undoNotInterested,
} from '@/lib/techFeedNotInterested';

vi.mock('@/lib/api', () => ({
  apiService: {
    getTechFeedFeedback: vi.fn(),
    recordTechFeedFeedback: vi.fn(),
    undoTechFeedFeedback: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function seed(records: unknown[]) {
  window.localStorage.setItem(NOT_INTERESTED_KEY, JSON.stringify(records));
}

function cached(): Array<Record<string, unknown>> {
  return JSON.parse(window.localStorage.getItem(NOT_INTERESTED_KEY) || '[]');
}

function serverSet(jobIds: string[]) {
  return {
    data: { job_ids: jobIds, dedupe_group_ids: [], employer_ids: [], updated_at: null },
    status: 200,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  api.getTechFeedFeedback.mockResolvedValue(serverSet([]));
  api.recordTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
  api.undoTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
});

describe('which reasons hide anything', () => {
  test('exactly three of the six suppress', () => {
    expect([...SUPPRESSING_REASONS].sort()).toEqual([
      'duplicate',
      'irrelevant_role',
      'not_interested',
    ]);
  });

  test('the data-quality three do not', () => {
    expect(reasonHidesJob('wrong_company')).toBe(false);
    expect(reasonHidesJob('stale_job')).toBe(false);
    expect(reasonHidesJob('incorrect_metadata')).toBe(false);
  });

  test('an id the server suppressed with an unknown reason still hides', () => {
    expect(reasonHidesJob(null)).toBe(true);
  });
});

describe('reconciliation', () => {
  test('a data-quality report is never counted as a hidden job', () => {
    seed([{ job_id: 'a', reason: 'wrong_company', at: 'x', synced: true }]);
    expect(loadNotInterestedIds().size).toBe(0);
  });

  test('server ids win on a browser with an empty cache', async () => {
    const ids = await reconcileNotInterested();
    expect(ids.size).toBe(0);

    api.getTechFeedFeedback.mockResolvedValue(serverSet(['a', 'b']));
    expect([...(await reconcileNotInterested())].sort()).toEqual(['a', 'b']);
  });

  test('a suppression the server no longer lists is dropped', async () => {
    seed([{ job_id: 'a', reason: 'duplicate', at: 'x', synced: true }]);
    api.getTechFeedFeedback.mockResolvedValue(serverSet([]));

    expect((await reconcileNotInterested()).size).toBe(0);
    expect(cached()).toHaveLength(0);
  });

  test('an unacknowledged local write survives reconciliation', async () => {
    // Written while offline / in flight: the server has not seen it yet, so
    // its absence from the GET says nothing about it.
    seed([{ job_id: 'a', reason: 'not_interested', at: 'x', synced: false }]);
    api.getTechFeedFeedback.mockResolvedValue(serverSet([]));

    expect([...(await reconcileNotInterested())]).toEqual(['a']);
  });

  test('data-quality records are left alone by reconciliation', async () => {
    seed([{ job_id: 'a', reason: 'stale_job', at: 'x', synced: true }]);
    api.getTechFeedFeedback.mockResolvedValue(serverSet([]));

    await reconcileNotInterested();
    expect(cached()).toHaveLength(1);
    expect(cached()[0]).toMatchObject({ job_id: 'a', reason: 'stale_job' });
  });

  test('a record from the old local-only vocabulary is dropped, not reinterpreted', async () => {
    // "staffing_agency" was a browser-only reason that never existed on the
    // server. Mapping it onto one of the six would attribute a reason the user
    // never chose, so it is simply forgotten.
    seed([{ job_id: 'a', reason: 'staffing_agency', at: 'x', synced: true }]);

    expect(loadNotInterestedIds().size).toBe(0);
    await reconcileNotInterested();
    expect(cached()).toHaveLength(0);
  });

  test('a failed GET leaves the cache exactly as it was', async () => {
    seed([{ job_id: 'a', reason: 'not_interested', at: 'x', synced: true }]);
    api.getTechFeedFeedback.mockResolvedValue({ error: 'Network error' });

    expect([...(await reconcileNotInterested())]).toEqual(['a']);
    expect(cached()).toHaveLength(1);
  });
});

describe('writes', () => {
  test('a suppressing reason reports that it hides the posting', async () => {
    const outcome = await recordNotInterested('a', 'not_interested', { employerName: 'Northwind' });

    expect(outcome).toMatchObject({ ok: true, hidden: true });
    expect(api.recordTechFeedFeedback).toHaveBeenCalledWith({
      job_id: 'a',
      reason: 'not_interested',
    });
    expect(cached()[0]).toMatchObject({ job_id: 'a', reason: 'not_interested', synced: true });
  });

  test('a data-quality reason is recorded but reports that it hides nothing', async () => {
    const outcome = await recordNotInterested('a', 'incorrect_metadata');

    expect(outcome).toMatchObject({ ok: true, hidden: false });
    expect(loadNotInterestedIds().size).toBe(0);
  });

  test('the optional context rides along only when it exists', async () => {
    await recordNotInterested('a', 'duplicate', {
      dedupeGroupId: 'g-1',
      employerId: 'e-1',
      searchId: 's-1',
    });

    expect(api.recordTechFeedFeedback).toHaveBeenCalledWith({
      job_id: 'a',
      reason: 'duplicate',
      dedupe_group_id: 'g-1',
      employer_id: 'e-1',
      search_id: 's-1',
    });
  });

  test('a refused write rolls the optimistic record back', async () => {
    api.recordTechFeedFeedback.mockResolvedValue({ error: 'Rate limit exceeded', status: 429 });

    const outcome = await recordNotInterested('a', 'not_interested');

    expect(outcome).toMatchObject({ ok: false, hidden: false, error: 'Rate limit exceeded' });
    expect(cached()).toHaveLength(0);
  });

  test('undo deletes and clears the cache entry', async () => {
    await recordNotInterested('a', 'not_interested');
    const outcome = await undoNotInterested('a');

    expect(outcome.ok).toBe(true);
    expect(api.undoTechFeedFeedback).toHaveBeenCalledWith('a');
    expect(cached()).toHaveLength(0);
  });

  test('a failed undo restores the record rather than claiming the job is back', async () => {
    await recordNotInterested('a', 'not_interested');
    api.undoTechFeedFeedback.mockResolvedValue({ error: 'Failed to remove feedback', status: 500 });

    const outcome = await undoNotInterested('a');

    expect(outcome.ok).toBe(false);
    expect(cached()).toHaveLength(1);
    expect(loadNotInterestedIds().has('a')).toBe(true);
  });
});
