/**
 * DemoWorkspace — the interactive fictional preview in the hero window.
 *
 * Contract under test: three selectable fictional jobs whose selection swaps
 * the evidence (why / skills / sponsorship), a tailoring preview with real
 * tab semantics for original-vs-tailored switching, a reset back to matches,
 * a "Use my resume" hand-back to the host, and ZERO backend traffic — the
 * component must not even import the API layer.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DemoWorkspace } from '@/components/landing/demo/DemoWorkspace';
import { DEMO_JOBS, DEMO_RESUME } from '@/components/landing/demo/demoData';

// Trap: if the demo (or anything it pulls in) ever touches the API layer,
// fail loudly instead of silently making network-shaped calls.
vi.mock('@/lib/api', () => {
  throw new Error('DemoWorkspace must never import the API layer');
});

function renderDemo(onUseResume = vi.fn()) {
  render(<DemoWorkspace onUseResume={onUseResume} />);
  return onUseResume;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DemoWorkspace', () => {
  test('renders three fictional matches, clearly labeled, first selected', () => {
    renderDemo();

    expect(
      screen.getByRole('region', { name: /Interactive product preview with fictional data/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Interactive preview · fictional data/i)).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Fictional job matches' });
    const jobButtons = within(group).getAllByRole('button');
    expect(jobButtons).toHaveLength(3);
    expect(jobButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(jobButtons[1]).toHaveAttribute('aria-pressed', 'false');

    // First job's evidence is shown by default.
    expect(screen.getByText(DEMO_JOBS[0].why)).toBeInTheDocument();
    expect(screen.getByText(/Est\. 92% match/)).toBeInTheDocument();
  });

  test('selecting another job swaps score, why, skills, and sponsorship', async () => {
    const user = userEvent.setup();
    renderDemo();

    const group = screen.getByRole('group', { name: 'Fictional job matches' });
    await user.click(within(group).getByRole('button', { name: /Harborview Analytics/i }));

    const harborview = DEMO_JOBS[1];
    expect(await screen.findByText(harborview.why)).toBeInTheDocument();
    expect(screen.getByText(/Est\. 84% match/)).toBeInTheDocument();
    expect(screen.getByText('Charting')).toBeInTheDocument();
    expect(screen.getByText(/No sponsorship filings found/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(DEMO_JOBS[0].why)).not.toBeInTheDocument(),
    );
    expect(
      within(group).getByRole('button', { name: /Harborview Analytics/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('Preview tailoring opens the tailored view with real tabs; original-vs-tailored switch works', async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.click(screen.getByRole('button', { name: /Preview tailoring/i }));

    // Real tab semantics (Radix): a tablist with two tabs, tailored active.
    const tablist = await screen.findByRole('tablist');
    const original = within(tablist).getByRole('tab', { name: 'Original resume' });
    const tailored = within(tablist).getByRole('tab', { name: 'Tailored resume' });
    expect(tailored).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/IntegrityGuard on/i)).toBeInTheDocument();
    // Tailored copy highlights rephrased (never invented) phrasing.
    expect(screen.getByText('component-library')).toBeInTheDocument();

    await user.click(original);
    expect(await screen.findByText(DEMO_RESUME.summary)).toBeInTheDocument();
    expect(original).toHaveAttribute('aria-selected', 'true');
  });

  test('Back to matches resets to the match list', async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.click(screen.getByRole('button', { name: /Preview tailoring/i }));
    await screen.findByRole('tablist');
    await user.click(screen.getByRole('button', { name: /Back to matches/i }));

    expect(
      await screen.findByRole('group', { name: 'Fictional job matches' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('tablist')).not.toBeInTheDocument());
  });

  test('Use my resume hands control back to the host from both views', async () => {
    const user = userEvent.setup();
    const onUseResume = renderDemo();

    await user.click(screen.getByRole('button', { name: /Use my resume/i }));
    expect(onUseResume).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Preview tailoring/i }));
    await screen.findByRole('tablist');
    await user.click(screen.getByRole('button', { name: /Use my resume/i }));
    expect(onUseResume).toHaveBeenCalledTimes(2);
  });

  test('tailoring the selected job, not always the first', async () => {
    const user = userEvent.setup();
    renderDemo();

    const group = screen.getByRole('group', { name: 'Fictional job matches' });
    await user.click(within(group).getByRole('button', { name: /Cobalt Grid/i }));
    await screen.findByText(DEMO_JOBS[2].why);
    await user.click(screen.getByRole('button', { name: /Preview tailoring/i }));

    expect(
      await screen.findByText(/Tailored preview · UI Engineer, Platform/i),
    ).toBeInTheDocument();
  });
});
