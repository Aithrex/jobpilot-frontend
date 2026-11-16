/**
 * One look for every hover hint in the app.
 *
 * About a hundred elements carry a native `title`. The browser shows those after a
 * long pause, in the system font, unstyled, cut off at the window edge, never
 * on keyboard focus, and differently in every browser. Beside the rest of the
 * interface they read as unfinished.
 *
 * Mounted once at the app root, this shows the same text in the app's own
 * tooltip: a short delay, the app's type, wrapped to a readable width, kept
 * inside the viewport, and shown on keyboard focus as well as on hover. No
 * call site changes: anything with a `title` gets it.
 *
 * How it stays honest with the DOM:
 *   - While a hint is showing, the element's `title` is parked in `data-tip`
 *     so the browser does not draw a second, native tooltip. It is put back
 *     the moment the hint closes.
 *   - An icon-only control whose NAME came from its `title` keeps that name
 *     while parked, through a temporary `aria-label`.
 *   - `iframe` titles are accessible names, not hints, and are left alone.
 *     So is anything inside `[data-native-title]`.
 *   - Touch has no hover; nothing is shown and nothing is touched.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Pause before the first hint, so sweeping the pointer across a toolbar
 *  does not flash one per button. */
const SHOW_DELAY_MS = 350;
/** After one hint closes, the next opens at once for this long (scanning). */
const WARM_MS = 400;
const GAP = 8;
const EDGE = 8;

interface Tip {
  text: string;
  rect: DOMRect;
}

function tipTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const el = node.closest<HTMLElement>('[title], [data-tip]');
  if (!el || el.matches('iframe, [data-native-title], [data-native-title] *')) return null;
  return el;
}

/** Move `title` out of the browser's reach while our hint is up. */
function park(el: HTMLElement): string {
  const title = el.getAttribute('title');
  if (title) {
    el.setAttribute('data-tip', title);
    el.removeAttribute('title');
    // The title may have been the control's only accessible name.
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !el.textContent?.trim()) {
      el.setAttribute('aria-label', title);
      el.setAttribute('data-tip-named', '');
    }
  }
  return el.getAttribute('data-tip') ?? '';
}

/** Put the DOM back exactly as it was. */
function restore(el: HTMLElement): void {
  const parked = el.getAttribute('data-tip');
  if (parked === null) return;
  // A re-render may have written a fresh title meanwhile; that one wins.
  if (!el.hasAttribute('title')) el.setAttribute('title', parked);
  el.removeAttribute('data-tip');
  if (el.hasAttribute('data-tip-named')) {
    el.removeAttribute('data-tip-named');
    el.removeAttribute('aria-label');
  }
}

export function HoverTips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastClosedRef = useRef(0);

  const close = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (targetRef.current) {
      restore(targetRef.current);
      targetRef.current = null;
      lastClosedRef.current = Date.now();
    }
    setTip(null);
    setPlace(null);
  }, []);

  const open = useCallback(
    (el: HTMLElement) => {
      if (targetRef.current === el) return;
      close();
      const text = park(el).trim();
      if (!text) {
        restore(el);
        return;
      }
      targetRef.current = el;
      const show = () => {
        if (targetRef.current !== el || !el.isConnected) return;
        setTip({ text, rect: el.getBoundingClientRect() });
      };
      const warm = Date.now() - lastClosedRef.current < WARM_MS;
      if (warm) show();
      else timerRef.current = window.setTimeout(show, SHOW_DELAY_MS);
    },
    [close],
  );

  useEffect(() => {
    const onOver = (e: PointerEvent) => {
      // Touch and pen have no hover. A browser that reports no pointer type
      // at all is treated as a mouse.
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = tipTarget(e.target);
      if (el) open(el);
      else if (targetRef.current) close();
    };
    const onOut = (e: PointerEvent) => {
      const current = targetRef.current;
      if (!current) return;
      const next = e.relatedTarget;
      if (next instanceof Node && current.contains(next)) return;
      close();
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = tipTarget(e.target);
      // Keyboard focus only: a click also focuses, and must not open a hint.
      if (el && el === e.target && el.matches(':focus-visible')) open(el);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', close, true);
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', close, true);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('blur', close);
      close();
    };
  }, [open, close]);

  // Measure, then place: above the element when there is room, else below,
  // and never past either edge of the window.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return;
    const { width, height } = box.getBoundingClientRect();
    const { rect } = tip;
    const below = rect.top < height + GAP + EDGE;
    const top = below ? rect.bottom + GAP : rect.top - height - GAP;
    const centred = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(EDGE, Math.min(centred, window.innerWidth - width - EDGE));
    setPlace({ left, top, below });
  }, [tip]);

  if (!tip || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={boxRef}
      role="tooltip"
      className="hover-tip"
      data-placed={place ? 'true' : undefined}
      data-side={place?.below ? 'bottom' : 'top'}
      style={{ left: place?.left ?? 0, top: place?.top ?? 0 }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
