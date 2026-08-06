import { describe, expect, test } from 'vitest';
import { PLAN_LABEL, PLAN_ORDER, AUTO_APPLY_SUBMIT_LIMITS } from '@/lib/entitlements';
import { capabilityById } from '@/lib/capabilities';
import {
  PRICE_POLICY_TODO,
  PRICE_TODO,
  PRICING_PUBLISHED,
  PUBLIC_PLANS,
  PUBLIC_PLAN_ORDER,
} from '@/lib/pricing';

/**
 * These are the tests that keep the public pricing page honest a year from
 * now. The failure mode they exist to catch is mundane and very likely:
 * someone types a price into the marketing config because a launch date moved,
 * and nothing stops them. Here, that is a red build.
 */

const MONEY = /[$€£₹]|\b\d+\.\d{2}\b|\/\s*mo\b|per month/i;

describe('public pricing config', () => {
  test('plan names come from entitlements, never retyped', () => {
    for (const plan of PUBLIC_PLANS) {
      expect(plan.label).toBe(PLAN_LABEL[plan.id]);
    }
  });

  test('plan order matches the entitlements contract', () => {
    expect(PUBLIC_PLAN_ORDER).toEqual(PLAN_ORDER);
    expect(PUBLIC_PLANS.map((p) => p.id)).toEqual(PLAN_ORDER);
  });

  test('no price is published, and every price decision is still null', () => {
    expect(PRICING_PUBLISHED).toBe(false);
    for (const value of Object.values(PRICE_TODO)) {
      expect(value).toBeNull();
    }
    for (const value of Object.values(PRICE_POLICY_TODO)) {
      expect(value).toBeNull();
    }
  });

  test('while unpublished, only the free plan carries a CTA and it is account creation', () => {
    const withCta = PUBLIC_PLANS.filter((p) => p.cta !== null);
    expect(withCta).toHaveLength(1);
    expect(withCta[0].id).toBe('free');
    expect(withCta[0].cta?.to).toBe('/register');
  });

  test('no plan line contains a currency symbol, a decimal amount or a per-month string', () => {
    for (const plan of PUBLIC_PLANS) {
      expect(plan.audience).not.toMatch(MONEY);
      for (const line of plan.includes) {
        expect(line.outcome).not.toMatch(MONEY);
        if (line.kind === 'limit') expect(line.value).not.toMatch(MONEY);
      }
    }
  });

  test('every capability line names a capability the registry actually knows', () => {
    for (const plan of PUBLIC_PLANS) {
      for (const line of plan.includes) {
        if (line.kind === 'capability') {
          expect(capabilityById(line.capabilityId)).toBeDefined();
        }
      }
    }
  });

  test('every non-capability line carries its own evidence, so a claim cannot arrive unsourced', () => {
    for (const plan of PUBLIC_PLANS) {
      for (const line of plan.includes) {
        if (line.kind === 'limit') expect(line.source.length).toBeGreaterThan(0);
        if (line.kind === 'text') expect(line.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  test('auto-apply limits mirror entitlements rather than being a second copy', () => {
    for (const plan of PUBLIC_PLANS) {
      const line = plan.includes.find(
        (l) => l.kind === 'limit' && /assisted applications/i.test(l.outcome),
      );
      if (!line || line.kind !== 'limit') continue;
      const limit = AUTO_APPLY_SUBMIT_LIMITS[plan.id];
      if (limit == null) {
        expect(line.value).toMatch(/no monthly cap/i);
      } else {
        expect(line.value).toContain(String(limit));
      }
    }
  });
});
