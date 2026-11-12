/**
 * Display-time mapping of backend placeholders and ranges.
 *
 * daily_pipeline_service writes "—" for a missing salary and for "no flags".
 * DailyPipelinePanel used to compare against " - " (an old sweep had rewritten
 * the literal), so the check never matched and a bare dash was rendered. These
 * helpers own that comparison now.
 */
import { describe, expect, it } from 'vitest';
import { isEmptyValue, presentValue, rangeText, salaryDisplay, splitFlags } from '@/lib/displayText';

const EM = '—';
const EN = '–';

describe('isEmptyValue', () => {
  it('treats every dash placeholder spelling as empty', () => {
    for (const v of [null, undefined, '', '  ', EM, EN, '-', ' - ', '--', ` ${EM} `]) {
      expect(isEmptyValue(v)).toBe(true);
    }
  });

  it('keeps real values', () => {
    for (const v of ['$120k', 'Remote', 'H-1B', '0', 'full-time']) {
      expect(isEmptyValue(v)).toBe(false);
    }
  });

  it('presentValue trims and returns null for placeholders', () => {
    expect(presentValue('  Austin, TX ')).toBe('Austin, TX');
    expect(presentValue(EM)).toBeNull();
  });
});

describe('salaryDisplay (DailyPipelinePanel salary)', () => {
  it('hides the backend "no salary" sentinel', () => {
    expect(salaryDisplay(EM)).toBeNull();
    expect(salaryDisplay(' - ')).toBeNull();
    expect(salaryDisplay('')).toBeNull();
    expect(salaryDisplay(undefined)).toBeNull();
  });

  it('writes ranges with "to" and changes nothing else', () => {
    expect(salaryDisplay(`$120k ${EN} $150k`)).toBe('$120k to $150k');
    expect(salaryDisplay('USD 170,000 - 210,000')).toBe('USD 170,000 to 210,000');
    expect(salaryDisplay(`$95,000${EM}$110,000 / year`)).toBe('$95,000 to $110,000 / year');
    expect(salaryDisplay('$140,000+')).toBe('$140,000+');
  });
});

describe('rangeText', () => {
  it('rewrites numeric ranges only', () => {
    expect(rangeText(`2${EN}4 weeks`)).toBe('2 to 4 weeks');
    expect(rangeText('10:00 - 11:00')).toBe('10:00 to 11:00');
    expect(rangeText('3 -- 5 years')).toBe('3 to 5 years');
  });

  it('leaves hyphenated words, codes and phone numbers alone', () => {
    for (const v of ['full-time', 'H-1B', '555-1234', 'Senior - Staff', 'COVID-19']) {
      expect(rangeText(v)).toBe(v);
    }
  });
});

describe('splitFlags (DailyPipelinePanel flags)', () => {
  it('drops the backend "no flags" sentinel', () => {
    expect(splitFlags(EM)).toEqual([]);
    expect(splitFlags(`${EM}, no-date`)).toEqual(['no-date']);
    expect(splitFlags('H1B, OPT friendly')).toEqual(['H1B', 'OPT friendly']);
    expect(splitFlags(null)).toEqual([]);
  });
});
