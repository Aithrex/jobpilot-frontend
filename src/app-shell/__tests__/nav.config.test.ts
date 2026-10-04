/**
 * Guards the Auto-Apply demotion in the single nav source of truth. Auto-Apply
 * is on hold, so it must NOT appear as a primary nav destination (which would
 * leak it into the Apply tab strip, the command palette, inline search, and the
 * More sheet). Its route stays reachable - that is asserted separately in the
 * routing test; here we only assert it is gone from nav.
 */
import { describe, expect, test } from 'vitest';

import { APPLY_SECTIONS, ALL_DESTINATIONS, NAV_ITEMS } from '@/app-shell/nav.config';

describe('nav.config Auto-Apply demotion', () => {
  test('APPLY_SECTIONS no longer lists an auto-apply section', () => {
    expect(APPLY_SECTIONS.some((s) => s.to === 'auto-apply')).toBe(false);
  });

  test('ALL_DESTINATIONS omits /app/apply/auto-apply (not in the palette)', () => {
    expect(ALL_DESTINATIONS.some((d) => d.href === '/app/apply/auto-apply')).toBe(false);
  });

  test('the Apply primary nav hint no longer advertises Auto-Apply', () => {
    const apply = NAV_ITEMS.find((i) => i.to === 'apply');
    expect(apply).toBeDefined();
    expect(apply?.hint).not.toMatch(/auto-apply/i);
  });
});
