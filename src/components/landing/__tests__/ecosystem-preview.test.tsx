/**
 * EcosystemPreview (#workspace) — the five-tab workspace preview.
 *
 * Contract under test: a REAL tablist (5 tabs, roving tabindex, arrows +
 * Home/End move focus AND selection, aria-selected), each tab swapping a
 * genuine panel (product shot or live micro-demo), micro-demos are pure
 * client state with zero backend traffic.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EcosystemPreview } from '@/components/landing/EcosystemPreview';

// Trap: the preview (and both micro-demos) must never CALL the API layer.
// (The import graph reaches lib/api via landing/_shared -> lib/guest, so a
// throwing module factory would be too strict — instead every apiService
// method throws on invocation.)
vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: new Proxy(
    {},
    {
      get: (_target, prop) => () => {
        throw new Error(
          `EcosystemPreview must never call the API layer (apiService.${String(prop)})`,
        );
      },
    },
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const TAB_LABELS = [
  'Job opportunities and saved jobs',
  'Application tracking',
  'Interview prep',
  'Skills and learning gaps',
  'Career planning',
];

describe('EcosystemPreview', () => {
  test('renders five tabs with roving tabindex, first selected', () => {
    render(<EcosystemPreview />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    tabs.forEach((tab, i) => {
      expect(tab).toHaveTextContent(TAB_LABELS[i]);
      expect(tab).toHaveAttribute('aria-selected', i === 0 ? 'true' : 'false');
      expect(tab).toHaveAttribute('tabindex', i === 0 ? '0' : '-1');
    });
    // First panel is the matches product shot.
    const panel = screen.getByRole('tabpanel', { name: TAB_LABELS[0] });
    expect(within(panel).getByRole('img')).toBeInTheDocument();
  });

  test('ArrowRight/ArrowLeft/Home/End move focus AND selection', async () => {
    const user = userEvent.setup();
    render(<EcosystemPreview />);

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    await screen.findByRole('tabpanel', { name: TAB_LABELS[1] });

    await user.keyboard('{End}');
    expect(tabs[4]).toHaveFocus();
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
    await screen.findByRole('tabpanel', { name: TAB_LABELS[4] });

    // ArrowRight wraps from the last tab to the first.
    await user.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft wraps back to the last.
    await user.keyboard('{ArrowLeft}');
    expect(tabs[4]).toHaveFocus();

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  test('the interview prep tab hosts a LIVE micro-demo (fictional, interactive)', async () => {
    const user = userEvent.setup();
    render(<EcosystemPreview />);

    await user.click(screen.getByRole('tab', { name: 'Interview prep' }));
    const panel = await screen.findByRole('tabpanel', { name: 'Interview prep' });
    expect(within(panel).getByText(/Live micro-demo, fictional data/)).toBeInTheDocument();

    // Selecting another question swaps the answer shape (pure client state).
    const questions = within(panel).getByRole('group', { name: 'Sample interview questions' });
    const second = within(questions).getAllByRole('button')[1];
    await user.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(
      await within(panel).findByText(/design system work three teams consumed/),
    ).toBeInTheDocument();
  });

  test('the skills gap tab hosts the second micro-demo with a selectable plan', async () => {
    const user = userEvent.setup();
    render(<EcosystemPreview />);

    await user.click(screen.getByRole('tab', { name: 'Skills and learning gaps' }));
    const panel = await screen.findByRole('tabpanel', { name: 'Skills and learning gaps' });
    expect(within(panel).getByText(/Live micro-demo, fictional data/)).toBeInTheDocument();

    const gaps = within(panel).getByRole('group', { name: 'Sample skill gaps' });
    await user.click(within(gaps).getByRole('button', { name: /AWS fundamentals/ }));
    expect(
      await within(panel).findByText('Deploy a static site end to end'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(panel).queryByText('Schema basics with one guided build')).not.toBeInTheDocument(),
    );
  });
});
