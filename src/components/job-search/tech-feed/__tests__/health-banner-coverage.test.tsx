/**
 * The coverage banner tells the truth about its own age.
 *
 * The measured numbers are not computed per request - measuring them reads
 * five collections and classifies 23,782 employers - so they come from a
 * stored snapshot. A figure rendered without its age could be a week old and
 * look current, which is exactly the claim the coverage work exists to stop
 * making.
 *
 * Three states, and they must be distinguishable:
 *   measured and fresh    -> the share, quietly
 *   measured and stale    -> the share, with its age, presented as history
 *   never measured        -> "unknown", which is NOT zero
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { TechFeedHealthBanner } from '@/components/job-search/tech-feed/TechFeedHealthBanner';
import type { TechFeedCoverage, TechFeedMeasuredCoverage } from '@/types/techFeed';

function coverage(measured?: Partial<TechFeedMeasuredCoverage>): TechFeedCoverage {
  return {
    as_of: '2026-09-02T18:00:00Z',
    active_postings: 238172,
    known_employers: 2144,
    known_employers_legacy: 8801,
    postings_with_canonical_employer: 174009,
    owner_verified_sources: 2393,
    measured: measured
      ? ({
          available: true,
          technology_employer_denominator: 2624,
          covered_technology_employers: 875,
          employer_coverage_pct: 0.3335,
          candidate_technology_employers: 1749,
          covered_career_sources: 2393,
          ownership_verified_unvalidated_sources: 182,
          employers_yielding_postings: 849,
          tier_a: { total: 105, covered: 30, accountable: { total: 94, covered: 30, pct: 0.319 } },
          by_cohort: { public_tech: { employers: 1859, covered: 379, covered_pct: 0.204, core_postings: 9000 } },
          measured_at: '2026-09-02T18:00:00Z',
          age_hours: 2,
          stale: false,
          stale_after_hours: 72,
          ...measured,
        } as TechFeedMeasuredCoverage)
      : undefined,
  };
}

const HEALTHY = {
  sources: [],
  warnings: [],
  ingest_runner: { healthy: true, last_heartbeat_at: '2026-09-02T18:00:00Z', minutes_ago: 1 },
};

describe('health banner coverage', () => {
  test('a fresh measurement shows the share of the technology denominator', () => {
    render(
      <TechFeedHealthBanner coverage={coverage({})} sourceHealth={HEALTHY} warnings={[]} />,
    );
    const line = screen.getByTestId('tech-feed-employer-coverage');
    expect(line).toHaveTextContent('33.4%');
    expect(line).toHaveTextContent('2,624');
  });

  test('a STALE measurement is labelled with its age, not silently shown', () => {
    render(
      <TechFeedHealthBanner
        coverage={coverage({ stale: true, age_hours: 200 })}
        sourceHealth={HEALTHY}
        warnings={[]}
      />,
    );
    expect(screen.getByTestId('tech-feed-employer-coverage')).toHaveTextContent(
      /measured 8 days ago/i,
    );
  });

  test('a stale measurement does NOT turn the banner into an alert', () => {
    // The crawl may be perfectly healthy while nobody re-ran the report.
    // Conflating the two trains the user to ignore the red banner.
    render(
      <TechFeedHealthBanner
        coverage={coverage({ stale: true, age_hours: 200 })}
        sourceHealth={HEALTHY}
        warnings={[]}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('the four counts are four different units in the detail panel', async () => {
    const user = userEvent.setup();
    render(
      <TechFeedHealthBanner coverage={coverage({})} sourceHealth={HEALTHY} warnings={[]} />,
    );
    await user.click(screen.getByRole('button', { name: /why/i }));
    const detail = await screen.findByTestId('tech-feed-coverage-detail');
    expect(detail).toHaveTextContent(/Of those, covered:/);
    expect(detail).toHaveTextContent(/Career sources covered \(boards, not employers\)/);
    expect(detail).toHaveTextContent(/Owner-verified, content not yet confirmed/);
    expect(detail).toHaveTextContent(/Employers actually yielding postings/);
  });

  test('Tier-A is reported against the set the target was SET against', async () => {
    const user = userEvent.setup();
    render(
      <TechFeedHealthBanner coverage={coverage({})} sourceHealth={HEALTHY} warnings={[]} />,
    );
    await user.click(screen.getByRole('button', { name: /why/i }));
    // 94, the accountable batch - not 105, which is what the registry grew to.
    expect(await screen.findByTestId('tech-feed-coverage-detail')).toHaveTextContent(
      /Strategic employers covered:\s*30\s*of\s*94/,
    );
  });

  test('an unmeasured index says UNKNOWN, which is not zero', async () => {
    const user = userEvent.setup();
    const cov = coverage();
    cov.measured = { available: false, detail: 'no measurement stored' };
    render(<TechFeedHealthBanner coverage={cov} sourceHealth={HEALTHY} warnings={['x']} />);
    await user.click(screen.getByRole('button', { name: /why/i }));
    expect(await screen.findByTestId('tech-feed-coverage-unmeasured')).toHaveTextContent(
      /not the same as zero/i,
    );
    expect(screen.queryByTestId('tech-feed-employer-coverage')).not.toBeInTheDocument();
  });

  test('the legacy employer slug count never replaces the canonical one', () => {
    render(
      <TechFeedHealthBanner coverage={coverage({})} sourceHealth={HEALTHY} warnings={[]} />,
    );
    // 2,144 canonical employers, not the 8,801 name-derived slugs.
    expect(screen.getByText(/2,144 employers/)).toBeInTheDocument();
  });
});
