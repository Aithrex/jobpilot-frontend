/**
 * The work-authorization surface, and the one thing it must never do.
 *
 * Three contracts are defended here:
 *
 *  1. a posting that says NOTHING about sponsorship gets no badge either way.
 *     Silence is not a statement, and a feed that guesses is worse than one
 *     that is quiet;
 *  2. the employer sponsorship signal renders the mandated sentence with its
 *     source and vintage, and renders NOTHING when there is no data - not a
 *     zero, not "unknown";
 *  3. a row with no engine version stamp shows NO number. `match_score: 0` on
 *     an account with no parsed resume is the engine declining to score, and
 *     rendering it as "0% match" tells the user they are a zero.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { EmployerSponsorshipBadge } from '@/components/job-search/WorkAuthorizationSignals';
import { TechFeedJobCard } from '@/components/job-search/tech-feed/TechFeedJobCard';
import {
  partitionByAccessBarrier,
  sponsorshipStanceOf,
  statesNoSponsorship,
} from '@/lib/techFeedWorkAuth';
import { makeTechFeedJob } from '@/test/techFeedFixtures';

function renderCard(job = makeTechFeedJob()) {
  return render(<TechFeedJobCard job={job} onNotInterested={() => {}} />);
}

describe('sponsorship stance', () => {
  test('silence is never read as a refusal or an offer', () => {
    expect(sponsorshipStanceOf(makeTechFeedJob({ sponsorship: null }))).toBe('unstated');
    expect(sponsorshipStanceOf(makeTechFeedJob({ sponsorship: '' }))).toBe('unstated');
    // A token nobody has taught us is unknown, not negative.
    expect(sponsorshipStanceOf(makeTechFeedJob({ sponsorship: 'ask_recruiter' }))).toBe(
      'unstated',
    );
  });

  test('the server stance beats the legacy token', () => {
    const job = makeTechFeedJob({ sponsorship: 'available', sponsorship_stance: 'refuses' });
    expect(sponsorshipStanceOf(job)).toBe('refuses');
  });

  test('only an explicit refusal counts as a refusal', () => {
    expect(statesNoSponsorship(makeTechFeedJob({ sponsorship: 'no_sponsorship' }))).toBe(true);
    expect(statesNoSponsorship(makeTechFeedJob({ sponsorship: 'US Citizen Only' }))).toBe(true);
    expect(statesNoSponsorship(makeTechFeedJob({ sponsorship: 'available' }))).toBe(false);
  });
});

describe('job card signals', () => {
  test('a quiet posting shows neither badge', () => {
    renderCard(makeTechFeedJob({ sponsorship: null, clearance_required: null }));
    expect(screen.queryByTestId('signal-no-sponsorship')).not.toBeInTheDocument();
    expect(screen.queryByTestId('signal-clearance-required')).not.toBeInTheDocument();
  });

  test('a stated clearance requirement is shown as a requirement', () => {
    renderCard(makeTechFeedJob({ clearance_required: true }));
    expect(screen.getByTestId('signal-clearance-required')).toHaveTextContent(
      /security clearance required/i,
    );
  });

  test('a stated refusal to sponsor is attributed to the employer', () => {
    renderCard(makeTechFeedJob({ sponsorship: 'no_sponsorship' }));
    expect(screen.getByTestId('signal-no-sponsorship')).toHaveTextContent(
      /employer states no sponsorship/i,
    );
  });
});

describe('employer sponsorship signal', () => {
  test('renders nothing at all when there is no data', () => {
    const { container } = render(<EmployerSponsorshipBadge signal={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing for a zero - an absent filing is not a zero', () => {
    const { container } = render(
      <EmployerSponsorshipBadge
        signal={{ similar_role_approvals: 0, source: 'USCIS', data_vintage: 'FY2020-FY2024' }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('says the mandated sentence, in the past tense, with its provenance', () => {
    render(
      <EmployerSponsorshipBadge
        signal={{
          similar_role_approvals: 63,
          period_years: 5,
          source: 'USCIS H-1B Employer Data Hub',
          data_vintage: 'FY2020-FY2024',
          disclaimer: 'Past filings are not a prediction of any individual outcome.',
        }}
      />,
    );
    expect(screen.getByTestId('signal-employer-sponsorship')).toHaveTextContent(
      'Sponsored 63 people in similar roles in the last 5 years',
    );
  });
});

describe('the score is never invented', () => {
  test('an unstamped row reads "Not scored" and shows no percentage', () => {
    // The exact production shape: the server said `eligible`, but never
    // scored the row, so `match_score` is 0 and there is no version stamp.
    renderCard(
      makeTechFeedJob({
        match_score: 0,
        fit_score_version: null,
        fit: null,
        eligibility: 'eligible',
      }),
    );
    expect(screen.getByTestId('tech-feed-not-scored')).toBeInTheDocument();
    expect(screen.getByTestId('tech-feed-match')).not.toHaveTextContent('0%');
    expect(screen.getByTestId('tech-feed-match')).not.toHaveTextContent('% match');
  });

  test('a stamped row still shows its number', () => {
    renderCard(makeTechFeedJob({ match_score: 88, fit_score_version: 'fit-v2.0' }));
    expect(screen.getByTestId('tech-feed-match')).toHaveTextContent('88% match');
  });
});

describe('show / demote / hide', () => {
  const clean = makeTechFeedJob({ job_id: 'clean' });
  const cleared = makeTechFeedJob({ job_id: 'cleared', clearance_required: true });
  const refused = makeTechFeedJob({ job_id: 'refused', sponsorship: 'no_sponsorship' });

  test('demote keeps every posting reachable, just lower', () => {
    const result = partitionByAccessBarrier([clean, cleared, refused], {
      clearanceRoles: 'demote',
      noSponsorshipRoles: 'demote',
    });
    expect(result.primary.map((j) => j.job_id)).toEqual(['clean']);
    expect(result.demoted.map((j) => j.job_id)).toEqual(['cleared', 'refused']);
    expect(result.hiddenTotal).toBe(0);
  });

  test('hide counts exactly what it removed, per reason', () => {
    const result = partitionByAccessBarrier([clean, cleared, refused], {
      clearanceRoles: 'hide',
      noSponsorshipRoles: 'hide',
    });
    expect(result.primary.map((j) => j.job_id)).toEqual(['clean']);
    expect(result.hiddenClearance).toBe(1);
    expect(result.hiddenNoSponsorship).toBe(1);
    expect(result.hiddenTotal).toBe(2);
  });

  test('show leaves the server order alone', () => {
    const result = partitionByAccessBarrier([clean, cleared, refused], {
      clearanceRoles: 'show',
      noSponsorshipRoles: 'show',
    });
    expect(result.primary.map((j) => j.job_id)).toEqual(['clean', 'cleared', 'refused']);
    expect(result.demoted).toHaveLength(0);
  });
});
