import { describe, expect, test } from 'vitest';
import { ANYWHERE, inCountry, inPlace, placeSummary } from '@/lib/places';

const at = (location: string, extra: Record<string, unknown> = {}) => ({ location, ...extra });

describe('which country a posting is in', () => {
  test.each([
    ['Toronto, ON', 'CA'],
    ['Bengaluru, Karnataka, India', 'IN'],
    ['GB - Edinburgh', 'GB'],
    ['London, United Kingdom', 'GB'],
    ['Sydney, NSW, Australia', 'AU'],
    ['Singapore', 'SG'],
    ['Walldorf, Germany', 'DE'],
    ['Sao Paulo', 'BR'],
  ])('%s is in %s', (location, code) => {
    expect(inCountry(at(location), code)).toBe(true);
  });

  test('a US city that shares a name abroad stays in the US', () => {
    expect(inCountry(at('Dublin, CA'), 'IE')).toBe(false);
    expect(inCountry(at('Cambridge, MA'), 'GB')).toBe(false);
    expect(inCountry(at('Dublin, CA'), 'US')).toBe(true);
  });

  test("the board's own country code decides when it knows", () => {
    expect(inCountry(at('Remote', { country_code: 'IN' }), 'IN')).toBe(true);
    expect(inCountry(at('Remote', { country_code: 'IN' }), 'US')).toBe(false);
  });

  test('anywhere is anywhere', () => {
    expect(inCountry(at('Tokyo, Japan'), ANYWHERE)).toBe(true);
  });
});

describe('a state, province or city', () => {
  test('a US state matches its name or its code', () => {
    const tx = { country: 'US', region: 'Texas', city: '' };
    expect(inPlace(at('Austin, TX'), tx)).toBe(true);
    expect(inPlace(at('Houston, Texas, United States'), tx)).toBe(true);
    expect(inPlace(at('Seattle, WA'), tx)).toBe(false);
  });

  test('remote jobs in the country stay: someone in that state can do them', () => {
    expect(inPlace(at('Remote, US', { is_remote: true }), { country: 'US', region: 'Texas', city: '' })).toBe(true);
  });

  test('a province of Canada matches its code', () => {
    expect(inPlace(at('Toronto, ON'), { country: 'CA', region: 'Ontario', city: '' })).toBe(true);
    expect(inPlace(at('Vancouver, BC'), { country: 'CA', region: 'Ontario', city: '' })).toBe(false);
  });

  test('a city narrows inside the country, ignoring case and accents', () => {
    expect(inPlace(at('Munchen, Germany'), { country: 'DE', region: '', city: 'munchen' })).toBe(true);
    expect(inPlace(at('Berlin, Germany'), { country: 'DE', region: '', city: 'Munich' })).toBe(false);
  });

  test('the summary reads like a place', () => {
    expect(placeSummary({ country: 'US', region: '', city: '' })).toBe('United States');
    expect(placeSummary({ country: 'US', region: 'Texas', city: 'Austin' })).toBe('Austin, Texas');
    expect(placeSummary({ country: 'CA', region: 'Ontario', city: '' })).toBe('Ontario, Canada');
    expect(placeSummary({ country: ANYWHERE, region: '', city: '' })).toBe('Anywhere');
  });
});

describe('the board tags each card US or not (2026-11-16)', () => {
  test('a tagged card follows its tag', () => {
    expect(inCountry(at('Austin, TX', { geo_us: true }), 'US')).toBe(true);
    expect(inCountry(at('Austin, TX', { geo_us: true }), 'IN')).toBe(false);
    expect(inCountry(at('Bengaluru, India', { geo_us: false }), 'US')).toBe(false);
    expect(inCountry(at('Bengaluru, India', { geo_us: false }), 'IN')).toBe(true);
    expect(inCountry(at('Bengaluru, India', { geo_us: false }), ANYWHERE)).toBe(true);
  });

  test('remote only keeps remote cards', () => {
    const sel = { country: 'US', region: '', city: '', remoteOnly: true };
    expect(inPlace(at('Remote, US', { geo_us: true, is_remote: true }), sel)).toBe(true);
    expect(inPlace(at('Austin, TX', { geo_us: true, is_remote: false }), sel)).toBe(false);
  });
});
