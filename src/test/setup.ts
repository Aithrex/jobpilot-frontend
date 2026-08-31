/**
 * Global Vitest setup: jest-dom matchers + the browser API polyfills jsdom
 * lacks (matchMedia, IntersectionObserver, ResizeObserver, scrollTo,
 * scrollIntoView, requestIdleCallback). Everything here is deterministic  - 
 * no network, no real timers hidden inside polyfills.
 */
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';
import { afterEach } from 'vitest';

// Real framer-motion transitions run in jsdom (0.2-0.5s), so async queries
// need a little more headroom than RTL's 1s default.
configure({ asyncUtilTimeout: 5000 });

// ── matchMedia ───────────────────────────────────────────────────
// Mutable reduced-motion flag so individual tests can flip
// `(prefers-reduced-motion: reduce)` and notify live listeners (framer-motion
// subscribes to `change` events on the MediaQueryList).
type MqListener = (ev: { matches: boolean; media: string }) => void;
const mqListeners = new Set<MqListener>();
let reducedMotion = false;

function makeMediaQueryList(query: string): MediaQueryList {
  const isReduceQuery = query.includes('prefers-reduced-motion');
  const mql = {
    get matches() {
      return isReduceQuery ? reducedMotion : false;
    },
    media: query,
    onchange: null,
    addListener: (cb: MqListener) => {
      if (isReduceQuery) mqListeners.add(cb);
    },
    removeListener: (cb: MqListener) => {
      mqListeners.delete(cb);
    },
    addEventListener: (_type: string, cb: MqListener) => {
      if (isReduceQuery) mqListeners.add(cb);
    },
    removeEventListener: (_type: string, cb: MqListener) => {
      mqListeners.delete(cb);
    },
    dispatchEvent: () => false,
  };
  return mql as unknown as MediaQueryList;
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => makeMediaQueryList(query),
});

/** Test helper: flip prefers-reduced-motion and notify subscribed listeners. */
export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
  const ev = { matches: value, media: '(prefers-reduced-motion: reduce)' };
  mqListeners.forEach((cb) => cb(ev));
}

afterEach(() => {
  // Never leak a reduced-motion preference into the next test.
  if (reducedMotion) setReducedMotion(false);
});

// ── IntersectionObserver / ResizeObserver ────────────────────────
class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: NoopIntersectionObserver,
});

class NoopResizeObserver {
  constructor(_cb: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: NoopResizeObserver,
});

// ── Scrolling ────────────────────────────────────────────────────
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  configurable: true,
  value: () => {},
});
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
} else {
  HTMLElement.prototype.scrollIntoView = () => {};
}

// ── Pointer capture ──────────────────────────────────────────────
// jsdom implements no part of the Pointer Capture API. Radix calls
// `hasPointerCapture` on pointerdown in Select (and Slider, and Toast swipe),
// so without these a component throws for an environment reason rather than a
// product one. Defined on Element, not HTMLElement: the failing call lands on
// an HTMLUnknownElement in some Radix trees.
for (const name of [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
] as const) {
  Object.defineProperty(Element.prototype, name, {
    writable: true,
    configurable: true,
    value: name === 'hasPointerCapture' ? () => false : () => undefined,
  });
}

// ── requestIdleCallback ──────────────────────────────────────────
Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  configurable: true,
  value: (cb: IdleRequestCallback): number =>
    window.setTimeout(
      () => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline),
      0,
    ),
});
Object.defineProperty(window, 'cancelIdleCallback', {
  writable: true,
  configurable: true,
  value: (id: number) => window.clearTimeout(id),
});

// ── Web Storage ──────────────────────────────────────────────────
// Node 22+ ships its OWN experimental `localStorage`/`sessionStorage` global,
// and on Node 25 it is live by default. When it exists it shadows jsdom's
// implementation, and without a `--localstorage-file` it is an inert object
// with no Storage methods at all - so every `localStorage.clear()` in a test
// throws "not a function" before a single assertion runs. Replace it with a
// real in-memory Storage whenever the environment's copy is not usable. A
// no-op on Node versions that leave jsdom's Storage alone.
function installMemoryStorage(key: 'localStorage' | 'sessionStorage'): void {
  const existing = (globalThis as Record<string, unknown>)[key] as Storage | undefined;
  if (existing && typeof existing.clear === 'function') return;

  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    getItem: (k: string) => (map.has(String(k)) ? (map.get(String(k)) as string) : null),
    setItem: (k: string, v: string) => void map.set(String(k), String(v)),
    removeItem: (k: string) => void map.delete(String(k)),
    clear: () => map.clear(),
  };

  for (const target of [globalThis, window] as Array<typeof globalThis | Window>) {
    Object.defineProperty(target, key, {
      writable: true,
      configurable: true,
      value: storage,
    });
  }
}
installMemoryStorage('localStorage');
installMemoryStorage('sessionStorage');

// ── Object URLs ──────────────────────────────────────────────────
// jsdom implements neither `URL.createObjectURL` nor `revokeObjectURL`, so any
// component that turns a Blob into a src (the resume file preview, download
// buttons) throws a TypeError in tests for an environment reason rather than a
// product one. Hand back a unique, inert URL and track revocation so tests can
// assert cleanup if they care.
if (typeof URL.createObjectURL !== 'function') {
  let n = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: () => `blob:jsdom/${++n}`,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: () => undefined,
  });
}

// ── crypto tolerance ─────────────────────────────────────────────
// jsdom exposes crypto.getRandomValues but not always crypto.subtle. Code
// paths that need hashing are stubbed at the module level in tests; this
// just guarantees `crypto.subtle` access never throws a ReferenceError.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    writable: true,
    configurable: true,
    value: {},
  });
}
