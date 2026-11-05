import { beforeEach, describe, expect, test } from 'vitest';
import {
  BOARD_IMPRESSIONS_KEY,
  IMPRESSION_TTL_MS,
  MAX_IMPRESSION_IDS,
  PASSED_OVER_VISITS,
  clearImpression,
  isPassedOverIn,
  loadImpressions,
  recordFirstPageImpressions,
} from '@/lib/boardImpressions';

/** A new page session: the per-visit guard lives in sessionStorage. */
const newVisit = () => sessionStorage.clear();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('board impressions', () => {
  test('counts once per visit, however often the first page renders', () => {
    expect(recordFirstPageImpressions(['a', 'b'])).toBe(true);
    expect(recordFirstPageImpressions(['a', 'b'])).toBe(false);
    expect(recordFirstPageImpressions(['a', 'c'])).toBe(false);
    const store = loadImpressions();
    expect(store.a.n).toBe(1);
    expect(store.c).toBeUndefined();
  });

  test(`passed over after ${PASSED_OVER_VISITS} visits with no action`, () => {
    for (let visit = 1; visit <= PASSED_OVER_VISITS; visit += 1) {
      newVisit();
      recordFirstPageImpressions(['a', 'b']);
      expect(isPassedOverIn(loadImpressions(), 'a')).toBe(visit >= PASSED_OVER_VISITS);
    }
    expect(isPassedOverIn(loadImpressions(), 'never-shown')).toBe(false);
  });

  test('an action clears the count', () => {
    for (let visit = 0; visit < PASSED_OVER_VISITS; visit += 1) {
      newVisit();
      recordFirstPageImpressions(['a', 'b']);
    }
    clearImpression('a');
    const store = loadImpressions();
    expect(isPassedOverIn(store, 'a')).toBe(false);
    expect(isPassedOverIn(store, 'b')).toBe(true);
  });

  test('a card already acted on is cleared instead of counted', () => {
    for (let visit = 0; visit < PASSED_OVER_VISITS; visit += 1) {
      newVisit();
      recordFirstPageImpressions(['saved']);
    }
    newVisit();
    recordFirstPageImpressions(['saved'], { acted: (id) => id === 'saved' });
    expect(loadImpressions().saved).toBeUndefined();
  });

  test('entries older than 14 days are dropped', () => {
    const now = Date.now();
    recordFirstPageImpressions(['old'], { now: now - IMPRESSION_TTL_MS - 1000 });
    newVisit();
    recordFirstPageImpressions(['recent'], { now });
    const store = loadImpressions(now);
    expect(store.old).toBeUndefined();
    expect(store.recent.n).toBe(1);
  });

  test(`keeps at most ${MAX_IMPRESSION_IDS} cards, the most recently shown`, () => {
    const now = Date.now();
    const seeded = Object.fromEntries(
      Array.from({ length: MAX_IMPRESSION_IDS }, (_, i) => [`seed${i}`, { n: 1, t: now - 60_000 - i }]),
    );
    localStorage.setItem(BOARD_IMPRESSIONS_KEY, JSON.stringify(seeded));
    recordFirstPageImpressions(['latest'], { now });
    const store = loadImpressions(now);
    expect(Object.keys(store)).toHaveLength(MAX_IMPRESSION_IDS);
    expect(store.latest.n).toBe(1);
    // The oldest seed made room.
    expect(store[`seed${MAX_IMPRESSION_IDS - 1}`]).toBeUndefined();
  });

  test('corrupt storage reads as empty and never throws', () => {
    localStorage.setItem(BOARD_IMPRESSIONS_KEY, '{not json');
    expect(loadImpressions()).toEqual({});
    localStorage.setItem(BOARD_IMPRESSIONS_KEY, JSON.stringify({ a: { n: 'x' } }));
    expect(loadImpressions()).toEqual({});
    expect(() => recordFirstPageImpressions(['a'])).not.toThrow();
  });
});
