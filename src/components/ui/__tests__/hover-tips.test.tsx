/**
 * The app-wide hover hint: every native `title` shows in one styled tooltip.
 *
 * What matters is that it never leaves the DOM different from how React
 * wrote it, never strips a control's accessible name, and never shows two
 * tooltips (ours plus the browser's) for one element.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { HoverTips } from '@/components/ui/hover-tips';

/** jsdom has no PointerEvent, so the pointer type is set on a mouse event. */
function pointer(type: string, el: Element, pointerType: string, relatedTarget: EventTarget | null = null) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, relatedTarget });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    el.dispatchEvent(event);
  });
}
const hover = (el: Element) => pointer('pointerover', el, 'mouse');
const leave = (el: Element) => pointer('pointerout', el, 'mouse', document.body);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function mount() {
  return render(
    <>
      <HoverTips />
      <button type="button" title="Save this job for later">Save</button>
      <button type="button" title="Refresh the list" data-testid="icon-only" />
      <iframe title="Preview of resume.pdf" />
      <span data-native-title="">
        <abbr title="Applicant tracking system">ATS</abbr>
      </span>
    </>,
  );
}

describe('HoverTips', () => {
  test('shows the title in the app tooltip after a short pause, and parks the native one', () => {
    mount();
    const save = screen.getByRole('button', { name: 'Save' });

    hover(save);
    // Nothing yet: sweeping across a toolbar must not flash a hint per button.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    // The native tooltip is already out of the browser's reach.
    expect(save).not.toHaveAttribute('title');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Save this job for later');
  });

  test('leaving puts the DOM back exactly as it was', () => {
    mount();
    const save = screen.getByRole('button', { name: 'Save' });

    hover(save);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    leave(save);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(save).toHaveAttribute('title', 'Save this job for later');
    expect(save).not.toHaveAttribute('data-tip');
    expect(save).not.toHaveAttribute('aria-label');
  });

  test('an icon-only control keeps its accessible name while the hint is up', () => {
    mount();
    const icon = screen.getByTestId('icon-only');

    hover(icon);
    // Its name came from the title; it must not become a nameless button.
    expect(screen.getByRole('button', { name: 'Refresh the list' })).toBe(icon);
    leave(icon);
    expect(icon).toHaveAttribute('title', 'Refresh the list');
    expect(icon).not.toHaveAttribute('aria-label');
  });

  test('a press or Escape closes it at once', () => {
    mount();
    const save = screen.getByRole('button', { name: 'Save' });

    hover(save);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(save).toHaveAttribute('title', 'Save this job for later');

    hover(save);
    fireEvent.pointerDown(save);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('touch never opens a hint and never touches the title', () => {
    mount();
    const save = screen.getByRole('button', { name: 'Save' });

    pointer('pointerover', save, 'touch');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(save).toHaveAttribute('title', 'Save this job for later');
  });

  test('frame titles and opted-out elements are left alone', () => {
    mount();
    const frame = screen.getByTitle('Preview of resume.pdf');
    const abbr = screen.getByText('ATS');

    hover(frame);
    hover(abbr);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(frame).toHaveAttribute('title', 'Preview of resume.pdf');
    expect(abbr).toHaveAttribute('title', 'Applicant tracking system');
  });
});
