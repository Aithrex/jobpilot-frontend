/**
 * KpiRow's `orientation` prop is presentational only: it swaps the wrapper's
 * grid class and nothing else. The loading-skeleton branch and the data branch
 * MUST read the same wrapper class so there is no layout shift when data lands.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { KpiRow } from '@/app-shell/pages/today/KpiCards';
import type { DashboardOverview } from '@/types/overview';

test('Home labels tracked roles honestly and includes every open stage like the tracker', () => {
  const overview = {
    applications: { total: 685, active: 500, interviewing: 0, offers: 0, by_status: { draft: 100, interested: 85, applied: 500 } },
  } as DashboardOverview;
  render(<KpiRow loading={false} overview={overview} readiness={null} applicationsToday={null} funnel={null} />);
  expect(screen.queryByText('Applications sent')).not.toBeInTheDocument();
  const tracked = screen.getByText('Tracked roles').parentElement!.parentElement!;
  const open = screen.getByText('Open roles').parentElement!.parentElement!;
  expect(within(tracked).getByText('685')).toBeInTheDocument();
  expect(within(open).getByText('685')).toBeInTheDocument();
  expect(screen.getByText(/Includes saved roles and drafts/)).toBeInTheDocument();
});

/** The grid wrapper is the single top-level child of KpiRow's render. */
function wrapperClass(container: HTMLElement): string {
  const el = container.firstElementChild as HTMLElement | null;
  return el?.className ?? '';
}

describe('KpiRow orientation', () => {
  test('rail: loading and loaded branches share the xl:grid-cols-1 wrapper', () => {
    const loading = render(
      <KpiRow orientation="rail" loading overview={null} readiness={null} applicationsToday={null} funnel={null} />,
    );
    const loaded = render(
      <KpiRow orientation="rail" loading={false} overview={null} readiness={null} applicationsToday={null} funnel={null} />,
    );

    expect(wrapperClass(loading.container)).toContain('xl:grid-cols-1');
    expect(wrapperClass(loaded.container)).toContain('xl:grid-cols-1');
    // Same wrapper in both branches -> no loading->loaded layout shift.
    expect(wrapperClass(loading.container)).toBe(wrapperClass(loaded.container));
  });

  test('default (orientation omitted): the 4-up grid wrapper', () => {
    const loading = render(
      <KpiRow loading overview={null} readiness={null} applicationsToday={null} funnel={null} />,
    );
    const loaded = render(
      <KpiRow loading={false} overview={null} readiness={null} applicationsToday={null} funnel={null} />,
    );

    expect(wrapperClass(loading.container)).toContain('lg:grid-cols-4');
    expect(wrapperClass(loaded.container)).toContain('lg:grid-cols-4');
    expect(wrapperClass(loading.container)).toBe(wrapperClass(loaded.container));
  });
});
