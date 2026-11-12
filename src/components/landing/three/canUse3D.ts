/**
 * Should the landing mount its WebGL stage at all?
 *
 * The poster is the experience; the canvas is an enhancement that loads only
 * when every one of these holds (docs/design/2026-11-11-3d-web-principles.md,
 * section 5.3):
 *
 *  - the visitor has not asked for reduced motion,
 *  - the browser is not in data-saver mode,
 *  - the device is not obviously low-power (Chromium-only hints, so they can
 *    only REMOVE 3D, never require it),
 *  - a WebGL2 context can be created without a major performance caveat
 *    (software rendering returns null here, and keeps the poster).
 *
 * Any thrown error is a "no". Pure function of the environment, so it is safe
 * to call from an effect and cheap enough to call once per mount.
 */
export function canUse3D(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if (nav.connection?.saveData) return false;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false;
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency < 4) return false;
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    // Hand the probe context back immediately; browsers cap live contexts.
    (gl as WebGL2RenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Run `cb` once the page has loaded and the main thread is idle. */
export function afterLoadAndIdle(cb: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const w = window as Window & {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const idle = () => {
    if (cancelled) return;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => !cancelled && cb(), { timeout: 2500 });
    else timer = setTimeout(() => !cancelled && cb(), 300);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', idle);
    if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    if (timer) clearTimeout(timer);
  };
}
