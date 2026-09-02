/**
 * Telemetry that carries no identity, and cannot break a user action.
 *
 * The privacy claim is enforced twice - here on the way out and again on the
 * server on the way in - because a client is easy to change and a collection
 * that has already been written to is not.
 */
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import {
  activeFilterKeys,
  flushTechFeedTelemetry,
  resetTechFeedTelemetry,
  resultBucket,
  trackCardImpressions,
  trackFilterApplied,
  trackSearch,
} from '@/lib/techFeedTelemetry';
import { DEFAULT_TECH_FEED_FILTERS } from '@/lib/techFeedUrlState';

vi.mock('@/lib/api', () => ({
  apiService: { recordTechFeedTelemetry: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
  resetTechFeedTelemetry();
  api.recordTechFeedTelemetry.mockResolvedValue(undefined);
});

describe('telemetry dimensions', () => {
  test('filter KEYS are collected and filter VALUES never are', () => {
    const keys = activeFilterKeys({
      ...DEFAULT_TECH_FEED_FILTERS,
      query: 'staff backend kubernetes',
      companyIds: ['emp_fd96667721fe'],
      countries: ['US'],
    });
    expect(keys).toContain('query');
    expect(keys).toContain('company_ids');
    expect(keys).toContain('countries');
    // The values themselves must appear nowhere.
    const blob = JSON.stringify(keys);
    expect(blob).not.toContain('kubernetes');
    expect(blob).not.toContain('emp_fd96667721fe');
    expect(blob).not.toContain('US');
  });

  test('a filter still at its default is not a filter the user applied', () => {
    const keys = activeFilterKeys(DEFAULT_TECH_FEED_FILTERS);
    expect(keys).not.toContain('employer_scope');
    expect(keys).not.toContain('sort');
  });

  test('result counts are bucketed, never exact', () => {
    expect(resultBucket(0)).toBe('0');
    expect(resultBucket(7)).toBe('1-9');
    expect(resultBucket(30)).toBe('10-49');
    expect(resultBucket(12345)).toBe('50+');
  });

  test('a zero-result search emits its own event alongside the search', async () => {
    trackSearch({ ...DEFAULT_TECH_FEED_FILTERS, query: 'nothing matches' }, 0);
    flushTechFeedTelemetry();
    const [batch] = api.recordTechFeedTelemetry.mock.calls[0];
    expect(batch.map((e: { event: string }) => e.event)).toEqual([
      'search',
      'zero_result',
    ]);
    expect(JSON.stringify(batch)).not.toContain('nothing matches');
  });
});

describe('telemetry transport', () => {
  test('events are batched rather than sent one per call', () => {
    trackCardImpressions(25, 1);
    trackCardImpressions(25, 2);
    expect(api.recordTechFeedTelemetry).not.toHaveBeenCalled();
    flushTechFeedTelemetry();
    expect(api.recordTechFeedTelemetry).toHaveBeenCalledTimes(1);
    expect(api.recordTechFeedTelemetry.mock.calls[0][0]).toHaveLength(2);
  });

  test('an empty queue sends nothing', () => {
    flushTechFeedTelemetry();
    expect(api.recordTechFeedTelemetry).not.toHaveBeenCalled();
  });

  test('a throwing transport never propagates', () => {
    api.recordTechFeedTelemetry.mockImplementation(() => {
      throw new Error('network down');
    });
    trackCardImpressions(5, 1);
    expect(() => flushTechFeedTelemetry()).not.toThrow();
  });

  test('zero impressions are not an event', () => {
    trackCardImpressions(0, 1);
    flushTechFeedTelemetry();
    expect(api.recordTechFeedTelemetry).not.toHaveBeenCalled();
  });
});

describe('filter adoption', () => {
  test('an empty key list writes NOTHING', () => {
    trackFilterApplied([]);
    flushTechFeedTelemetry();
    expect(api.recordTechFeedTelemetry).not.toHaveBeenCalled();
  });

  test('the keys are carried, and nothing else is', () => {
    trackFilterApplied(['employer_scope', 'families']);
    flushTechFeedTelemetry();
    const [batch] = api.recordTechFeedTelemetry.mock.calls[0];
    expect(batch).toHaveLength(1);
    expect(batch[0].event).toBe('filter_applied');
    expect(batch[0].dimensions).toEqual({
      filter_keys: ['employer_scope', 'families'],
    });
  });
});
