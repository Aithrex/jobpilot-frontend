/**
 * Global Privacy Control turns performance monitoring off for that browser:
 * `initDatadogRum` must not call `datadogRum.init` when
 * `navigator.globalPrivacyControl === true`, even with RUM configured.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const init = vi.fn();
vi.mock('@datadog/browser-rum', () => ({ datadogRum: { init } }));

function setGpc(value: boolean | undefined) {
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    configurable: true,
    get: () => value,
  });
}

beforeEach(() => {
  vi.resetModules();
  init.mockReset();
  vi.stubEnv('VITE_DD_RUM_APPLICATION_ID', 'app-id');
  vi.stubEnv('VITE_DD_RUM_CLIENT_TOKEN', 'pub-token');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setGpc(undefined);
});

describe('initDatadogRum and GPC', () => {
  test('does not load RUM when the browser sends GPC', async () => {
    setGpc(true);
    const { initDatadogRum } = await import('@/lib/datadogRum');
    initDatadogRum();
    expect(init).not.toHaveBeenCalled();
  });

  test('loads RUM, with replay off and input masked, when GPC is absent', async () => {
    setGpc(undefined);
    const { initDatadogRum } = await import('@/lib/datadogRum');
    initDatadogRum();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][0]).toMatchObject({
      sessionReplaySampleRate: 0,
      defaultPrivacyLevel: 'mask-user-input',
    });
  });

  test('an explicit false is not a GPC signal', async () => {
    setGpc(false);
    const { initDatadogRum } = await import('@/lib/datadogRum');
    initDatadogRum();
    expect(init).toHaveBeenCalledTimes(1);
  });
});
