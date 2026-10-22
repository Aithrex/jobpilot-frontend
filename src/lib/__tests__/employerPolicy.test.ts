/**
 * The direct-employer policy guards and labels (employer-policy-1.0.0).
 *
 * The two rules under test everywhere below:
 *  - UNKNOWN IS NEVER DIRECT: only `kind: "operating"` reads "Direct employer";
 *  - NO WARNINGS IS NOT VERIFIED: `no_warnings_found` renders nothing, or at
 *    most "No warning signs found (automated check)".
 * And legacy rows - no blocks at all - produce no labels, so they render as
 * they did before.
 */
import { describe, expect, test } from 'vitest';

import {
  STRICT_DIRECT_DEFAULT,
  activeExclusionKeys,
  applicationDestinationHost,
  availabilityLineOf,
  employerCategoryOf,
  excludedBreakdown,
  hasEmployerPolicyFields,
  mergePolicies,
  policyOf,
  postingRelationshipLabels,
  preferencesOf,
  preferencesSummary,
  presetFor,
  relativeAge,
  trustLineOf,
  withExclusion,
  withStrictDirect,
} from '@/lib/employerPolicy';
import type { EmployerPolicyRowFields } from '@/types/employerPolicy';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe('legacy rows', () => {
  test('a row without any block carries no policy fields and no labels', () => {
    const row: EmployerPolicyRowFields = {};
    expect(hasEmployerPolicyFields(row)).toBe(false);
    expect(employerCategoryOf(row)).toBeNull();
    expect(postingRelationshipLabels(row)).toEqual([]);
    expect(availabilityLineOf(row)).toBeNull();
    expect(trustLineOf(row, { showClean: true })).toBeNull();
  });

  test('a null or non-object block is treated as absent', () => {
    const row = { employer_profile: null, trust: 'warnings' } as unknown as EmployerPolicyRowFields;
    expect(hasEmployerPolicyFields(row)).toBe(false);
  });
});

describe('employer category - unknown is never direct', () => {
  test.each([
    ['operating', 'Direct employer'],
    ['staffing', 'Staffing agency'],
    ['consultancy', 'Consultancy'],
    ['talent_marketplace', 'Talent marketplace'],
    ['mixed', 'Mixed business'],
    ['unknown', 'Employer type unverified'],
  ])('%s -> %s', (kind, label) => {
    const cat = employerCategoryOf({ employer_profile: { kind } as EmployerPolicyRowFields['employer_profile'] });
    expect(cat?.label).toBe(label);
  });

  test.each([
    ['a missing kind', {}],
    ['an out-of-enum kind', { kind: 'direct_employer' }],
    ['a non-string kind', { kind: 7 }],
  ])('%s reads as unverified, never as direct', (_name, profile) => {
    const cat = employerCategoryOf({ employer_profile: profile as never });
    expect(cat?.kind).toBe('unknown');
    expect(cat?.label).toBe('Employer type unverified');
    expect(cat?.label).not.toMatch(/direct/i);
  });

  test('the classification basis is explained, and a name rule says it is weak', () => {
    const cat = employerCategoryOf({ employer_profile: { kind: 'staffing', basis: 'name_rule' } });
    expect(cat?.basis).toMatch(/weakest evidence/);
  });
});

describe('posting relationship and purpose', () => {
  test('an own role says nothing extra', () => {
    expect(
      postingRelationshipLabels({ posting_profile: { relationship: 'own_role', purpose: 'requisition' } }),
    ).toEqual([]);
  });

  test('placements, gig work and talent pools are named', () => {
    expect(
      postingRelationshipLabels({ posting_profile: { relationship: 'named_client', purpose: 'requisition' } }),
    ).toEqual(['Client placement']);
    expect(
      postingRelationshipLabels({ posting_profile: { relationship: 'freelance_task', purpose: 'talent_community' } }),
    ).toEqual(['Task/gig contract', 'Talent community']);
  });
});

describe('availability', () => {
  test('verified open states time and method', () => {
    const row = {
      availability: { state: 'verified_open', method: 'listing_seen', verified_at: hoursAgo(3) },
    } as EmployerPolicyRowFields;
    expect(availabilityLineOf(row, { now: NOW, onEmployerBoard: true })?.text).toBe(
      "Seen on employer's board 3h ago",
    );
    // Without proof the board is the employer's, it is not called theirs.
    expect(availabilityLineOf(row, { now: NOW })?.text).toBe('Seen on the source board 3h ago');
  });

  test('a blocked check is unverifiable, never closed', () => {
    const line = availabilityLineOf(
      { availability: { state: 'unverifiable', method: 'liveness_probe', verified_at: hoursAgo(49) } },
      { now: NOW },
    );
    expect(line?.text).toBe("Couldn't verify (blocked) - 2d ago");
    expect(line?.text).not.toMatch(/closed/i);
  });

  test('falls back to age_hours when the stamp is missing', () => {
    expect(relativeAge(null, 5, NOW)).toBe('5h ago');
    expect(relativeAge(null, null, NOW)).toBeNull();
  });

  test('an unknown state is stated as not yet checked', () => {
    expect(
      availabilityLineOf({ availability: { state: 'bogus', method: 'none', verified_at: null } as never })?.text,
    ).toBe('Not yet checked whether this is still open');
  });
});

describe('trust line - no warnings is not verified', () => {
  test('no_warnings_found renders nothing by default', () => {
    expect(trustLineOf({ trust: { state: 'no_warnings_found', warnings: [] } })).toBeNull();
  });

  test('with showClean it is the automated-check wording, never "verified"', () => {
    const line = trustLineOf({ trust: { state: 'no_warnings_found', warnings: [] } }, { showClean: true });
    expect(line?.title).toBe('No warning signs found (automated check)');
    expect(line?.title).not.toMatch(/verified/i);
  });

  test('warnings carry the server evidence verbatim', () => {
    const line = trustLineOf({
      trust: {
        state: 'warnings',
        warnings: [{ code: 'payment_request', evidence: 'Asks for a $50 training fee', source: 'rule' }],
      },
    });
    expect(line?.tone).toBe('caution');
    expect(line?.items).toEqual(['Asks for a $50 training fee']);
  });

  test('an unrecognised state is dropped, not guessed', () => {
    expect(trustLineOf({ trust: { state: 'verified', warnings: [] } as never })).toBeNull();
  });
});

describe('application destination', () => {
  test('prefers the canonical apply URL, then the apply link', () => {
    expect(
      applicationDestinationHost({
        canonical_apply_url: 'https://boards.greenhouse.io/acme/jobs/1',
        apply_link: 'https://www.jobboard.example/x',
      }),
    ).toBe('boards.greenhouse.io');
    expect(applicationDestinationHost({ apply_link: 'https://www.acme.com/careers/1' })).toBe('acme.com');
    expect(applicationDestinationHost({ apply_link: 'javascript:alert(1)' })).toBeNull();
  });
});

describe('policy block and counts', () => {
  test('older backend: no block, no counts', () => {
    expect(policyOf(undefined)).toBeNull();
    expect(excludedBreakdown(null)).toEqual({ total: 0, parts: [], text: '' });
  });

  test('counts read in contract order, zeros and junk dropped', () => {
    const policy = policyOf({
      preset: 'strict_direct',
      excluded_counts: { consultancy: 5, staffing: 12, talent_marketplace: 3, task_gig: 0, client_placement: -2, talent_community: 'x' },
      unverified_shown: 4,
    });
    const breakdown = excludedBreakdown(policy);
    expect(breakdown.text).toBe('12 staffing, 5 consultancy, 3 talent marketplace');
    expect(breakdown.total).toBe(20);
    expect(policy?.unverified_shown).toBe(4);
  });

  test('merging the three For-you scans sums their counts', () => {
    const merged = mergePolicies([
      { excluded_counts: { staffing: 2 }, unverified_shown: 1 },
      null,
      { excluded_counts: { staffing: 3, consultancy: 1 }, unverified_shown: 2 },
    ]);
    expect(excludedBreakdown(merged).text).toBe('5 staffing, 1 consultancy');
    expect(merged?.unverified_shown).toBe(3);
    expect(mergePolicies([null, undefined])).toBeNull();
  });
});

describe('preferences', () => {
  test('the documented default is strict_direct with unknown shown', () => {
    expect(STRICT_DIRECT_DEFAULT.preset).toBe('strict_direct');
    expect(STRICT_DIRECT_DEFAULT.exclude.unknown_business_model).toBe(false);
    expect(activeExclusionKeys(STRICT_DIRECT_DEFAULT)).toHaveLength(6);
  });

  test('a missing exclusion key is NOT excluded, and set_by is kept', () => {
    const prefs = preferencesOf({ preset: 'custom', exclude: { staffing: true }, set_by: 'user' });
    expect(prefs?.exclude.staffing).toBe(true);
    expect(prefs?.exclude.consultancy).toBe(false);
    expect(prefs?.set_by).toBe('user');
    expect(preferencesOf({ preset: 'off' })).toBeNull();
  });

  test('turning one exclusion off leaves the preset as custom', () => {
    const next = withExclusion(STRICT_DIRECT_DEFAULT, 'consultancy', false);
    expect(next.preset).toBe('custom');
    expect(next.set_by).toBe('user');
    expect(preferencesSummary(next)).toBe('5 employer types hidden');
  });

  test('the strict preset toggles the six business-model keys and leaves unknown alone', () => {
    const withUnknown = withExclusion(STRICT_DIRECT_DEFAULT, 'unknown_business_model', true);
    const off = withStrictDirect(withUnknown, false);
    expect(off.exclude.unknown_business_model).toBe(true);
    expect(off.preset).toBe('custom');
    const allOff = withExclusion(off, 'unknown_business_model', false);
    expect(allOff.preset).toBe('off');
    expect(preferencesSummary(allOff)).toBe('All employer types');
    expect(presetFor(withStrictDirect(allOff, true).exclude)).toBe('strict_direct');
  });
});
