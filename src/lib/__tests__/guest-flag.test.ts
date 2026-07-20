/**
 * VITE_GUEST_ONBOARDING build-flag semantics — the production feature gate.
 *
 * Contract: "false"/"0"/"off" is the explicit frontend kill switch; any other
 * set value is ON; UNSET (or empty) is ON so a production build PROBES the
 * backend instead of silently hiding a backend-enabled feature. The backend's
 * 503/404 stays the authoritative runtime fallback (covered by the landing
 * flow suite). The resolver deliberately never consults DEV/PROD, so these
 * assertions hold identically in a production bundle.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ apiService: {} }));

import {
  isGuestOnboardingBuildEnabled,
  isGuestOnboardingEnabled,
  markGuestOnboardingUnavailable,
} from '@/lib/guest';

afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});

describe('VITE_GUEST_ONBOARDING build flag', () => {
  test.each([
    ['false', false],
    ['0', false],
    ['off', false],
  ])('explicit kill switch: %s → disabled', (raw, expected) => {
    vi.stubEnv('VITE_GUEST_ONBOARDING', raw);
    expect(isGuestOnboardingBuildEnabled()).toBe(expected);
  });

  test.each([['true'], ['1'], ['on'], ['yes']])('set truthy value %s → enabled', (raw) => {
    vi.stubEnv('VITE_GUEST_ONBOARDING', raw);
    expect(isGuestOnboardingBuildEnabled()).toBe(true);
  });

  test('unset → enabled, so a production build probes the backend', () => {
    vi.stubEnv('VITE_GUEST_ONBOARDING', undefined);
    expect(isGuestOnboardingBuildEnabled()).toBe(true);
  });

  test('empty string → enabled (same as unset)', () => {
    vi.stubEnv('VITE_GUEST_ONBOARDING', '');
    expect(isGuestOnboardingBuildEnabled()).toBe(true);
  });

  test('runtime 503/404 marker disables the session even when the build flag allows probing', () => {
    vi.stubEnv('VITE_GUEST_ONBOARDING', undefined);
    expect(isGuestOnboardingEnabled()).toBe(true);
    markGuestOnboardingUnavailable();
    expect(isGuestOnboardingEnabled()).toBe(false);
    // Build kill switch still wins outright.
    vi.stubEnv('VITE_GUEST_ONBOARDING', 'true');
    expect(isGuestOnboardingEnabled()).toBe(false);
  });
});
