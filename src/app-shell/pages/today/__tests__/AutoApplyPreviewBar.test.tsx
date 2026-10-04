/**
 * AutoApplyPreviewBar guards the "paused, not live" contract. Auto-Apply is on
 * hold, so this surface must:
 *   - always read as paused (word + icon), never live-submitting;
 *   - expose exactly ONE control, a navigational link to the full surface;
 *   - never render a submit / toggle / approve control;
 *   - tint queued chips in a neutral/muted tone (not cherry "active", not sage
 *     "verified");
 *   - never render an empty chip, even when every enrichment field is missing.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { AutoApplyPreviewBar } from '@/app-shell/pages/today/AutoApplyPreviewBar';
import { useAutoSubmit } from '@/hooks/useAutoSubmit';
import type { AutoSubmitApprovalView } from '@/types/autoSubmit';

vi.mock('@/hooks/useAutoSubmit', () => ({ useAutoSubmit: vi.fn() }));

const mockUseAutoSubmit = useAutoSubmit as unknown as Mock;

/** A minimal useAutoSubmit return; only the fields the bar reads matter. */
function hookState(over: Partial<ReturnType<typeof useAutoSubmit>>) {
  return {
    available: undefined,
    settingsLoading: false,
    pending: [],
    waiting: [],
    pendingError: false,
    ...over,
  } as unknown as ReturnType<typeof useAutoSubmit>;
}

function renderBar() {
  return render(
    <MemoryRouter>
      <AutoApplyPreviewBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAutoSubmit.mockReset();
});

describe('AutoApplyPreviewBar', () => {
  test('flag off (available false): calm paused line + single navigational CTA', () => {
    mockUseAutoSubmit.mockReturnValue(hookState({ available: false }));
    renderBar();

    const region = screen.getByRole('region', { name: /auto-apply preview \(paused\)/i });
    expect(region).toBeInTheDocument();

    // Paused wording is present (desktop + mobile layouts both render it).
    expect(screen.getAllByText(/paused - preview/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/auto-apply is paused/i).length).toBeGreaterThan(0);

    // The ONLY control is the navigational preview link.
    const links = screen.getAllByRole('link', { name: /preview auto-apply/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/app/apply/auto-apply'));

    // No live controls anywhere.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit|approve|toggle|enable|turn on/i })).toBeNull();
  });

  test('available true, empty queue: nothing-queued line, still no live control', () => {
    mockUseAutoSubmit.mockReturnValue(hookState({ available: true, pending: [], waiting: [] }));
    renderBar();

    expect(screen.getAllByText(/nothing is queued right now/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  test('available true with a queue: renders up to 3 neutral chips, no status hue', () => {
    const rows: AutoSubmitApprovalView[] = [
      { application_id: 'a', role: 'Backend Engineer', company: 'Acme', status: 'pending' },
      { application_id: 'b', role: 'Data Scientist', company: 'Globex', status: 'pending' },
      { application_id: 'c', role: 'SRE', company: 'Initech', status: 'pending' },
      { application_id: 'd', role: 'Overflow Role', company: 'Hooli', status: 'pending' },
    ];
    mockUseAutoSubmit.mockReturnValue(hookState({ available: true, pending: rows }));
    const { container } = renderBar();

    // Desktop bar shows the first three roles; the 4th is dropped (cap of 3).
    expect(screen.getAllByText(/backend engineer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sre/i).length).toBeGreaterThan(0);
    // 4th role must not appear in the (visible-at-this-width) desktop bar chips.
    const desktopBar = container.querySelector('.glass-pane.hidden') as HTMLElement | null;
    if (desktopBar) {
      expect(within(desktopBar).queryByText(/overflow role/i)).toBeNull();
    }

    // Queued chips carry a neutral/muted tone, never the cherry (primary) action
    // tone or the sage (success) verified tone. Scope the check to the chip
    // pills (the role labels' nearest rounded-full ancestor) - the icon chip's
    // bg-primary/10 tint and the CTA's bg-primary action fill are sanctioned.
    const roleLabels = screen.getAllByText(/backend engineer/i);
    const chipPills = roleLabels
      .map((n) => n.closest('.rounded-full') as HTMLElement | null)
      .filter((el): el is HTMLElement => el !== null);
    expect(chipPills.length).toBeGreaterThan(0);
    chipPills.forEach((pill) => {
      expect(pill.className).toContain('bg-muted');
      expect(pill.className).not.toMatch(/bg-primary/);
      expect(pill.className).not.toMatch(/bg-success/);
    });
  });

  test('missing all enrichment fields: chip still renders non-empty fallback text', () => {
    const rows: AutoSubmitApprovalView[] = [{ application_id: 'x', status: 'pending' }];
    mockUseAutoSubmit.mockReturnValue(hookState({ available: true, pending: rows }));
    renderBar();

    // role/title/url all absent -> 'Queued role' fallback, never a blank chip.
    expect(screen.getAllByText(/queued role/i).length).toBeGreaterThan(0);
  });

  test('pendingError: falls back to the calm paused line, no retry on Home', () => {
    mockUseAutoSubmit.mockReturnValue(
      hookState({ available: true, pendingError: true, pending: [] }),
    );
    renderBar();

    expect(screen.getAllByText(/auto-apply is paused/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /try again|retry/i })).toBeNull();
  });

  test('still resolving (available undefined): slim skeleton, no paused claim yet', () => {
    mockUseAutoSubmit.mockReturnValue(hookState({ available: undefined, settingsLoading: true }));
    renderBar();

    // The region exists but makes no "paused" claim while settings resolve.
    expect(screen.getByRole('region', { name: /auto-apply preview \(paused\)/i })).toBeInTheDocument();
    expect(screen.queryByText(/paused - preview/i)).toBeNull();
  });
});
