/**
 * Employer-policy explanations on the cards, the counts line and the honest
 * empty state.
 *
 *  - A legacy row (no new blocks) renders exactly as before: no employer chip,
 *    no availability line, the legacy trust badge still there.
 *  - Unknown is never rendered as direct - on JobCard AND on the tech-feed
 *    card, even when the legacy `employer_kind` says `direct_employer`.
 *  - `no_warnings_found` never renders as "Verified".
 *  - The counts line and the empty state come from the server's
 *    `policy.excluded_counts`, and the empty state never widens anything.
 */
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { EmployerFilteredEmptyState, EmployerPolicySummary } from '@/components/job-search/EmployerPolicyNotice';
import { JobCard } from '@/components/job-search/JobCard';
import { TechFeedJobCard } from '@/components/job-search/tech-feed/TechFeedJobCard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { apiService } from '@/lib/api';
import { STRICT_DIRECT_DEFAULT } from '@/lib/employerPolicy';
import { makeTechFeedJob } from '@/test/techFeedFixtures';
import type { Job } from '@/types/jobs';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    checkJobTrust: vi.fn(),
    fetchJobDescription: vi.fn(),
    recordTechFeedFeedback: vi.fn(),
    undoTechFeedFeedback: vi.fn(),
    getEmployerPreferences: vi.fn(),
    saveEmployerPreferences: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

const BASE: Job = {
  job_id: 'j1',
  title: 'Software Engineer',
  company: 'Globodyne',
  logo: '',
  location: 'Austin, TX',
  apply_link: 'https://boards.greenhouse.io/globodyne/jobs/1',
  description: '',
  salary: '',
  employment_type: '',
  date_posted: '',
  is_remote: false,
  h1b_sponsor: false,
  match_score: 0,
  matched_skills: [],
  missing_skills: [],
  source: 'greenhouse',
};

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

function renderCard(job: Job, extra: Partial<React.ComponentProps<typeof JobCard>> = {}) {
  return wrap(
    <JobCard
      job={job}
      saved={false}
      jobStatus={null}
      onSave={() => {}}
      onUnsave={() => {}}
      onQuickApply={() => {}}
      {...extra}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getEmployerPreferences.mockResolvedValue({ data: STRICT_DIRECT_DEFAULT, status: 200 });
});

describe('JobCard', () => {
  test('a legacy row renders without any employer-policy line, legacy trust badge intact', () => {
    renderCard({ ...BASE, trust_band: 'trusted', trust_score: 90 });
    expect(screen.queryByTestId('job-employer-context')).not.toBeInTheDocument();
    expect(screen.queryByText(/Employer type unverified/)).not.toBeInTheDocument();
    expect(screen.getByText('Screened')).toBeInTheDocument();
  });

  test('an unknown employer reads as unverified, never as direct', () => {
    renderCard({ ...BASE, employer_profile: { kind: 'unknown', basis: 'none' } });
    const chip = screen.getByTestId('employer-category');
    expect(chip).toHaveTextContent('Employer type unverified');
    expect(chip).not.toHaveTextContent(/direct/i);
  });

  test('shows category, relationship, availability with method and the destination host', () => {
    renderCard({
      ...BASE,
      employer_profile: { kind: 'staffing', basis: 'research_register' },
      posting_profile: { relationship: 'named_client', purpose: 'requisition' },
      availability: { state: 'unverifiable', method: 'liveness_probe', verified_at: null, age_hours: 50 },
    });
    expect(screen.getByTestId('employer-category')).toHaveTextContent('Staffing agency');
    expect(screen.getByTestId('posting-relationship')).toHaveTextContent('Client placement');
    expect(screen.getByTestId('job-availability')).toHaveTextContent("Couldn't verify (blocked) - 2d ago");
    expect(screen.getByTestId('job-destination')).toHaveTextContent('Applies on boards.greenhouse.io - found via Greenhouse');
  });

  test('no_warnings_found shows no trust line and never "Verified"; the legacy band yields to it', () => {
    renderCard({
      ...BASE,
      trust_band: 'trusted',
      employer_profile: { kind: 'operating' },
      trust: { state: 'no_warnings_found', warnings: [] },
    });
    expect(screen.queryByTestId('job-trust-line')).not.toBeInTheDocument();
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Screened')).not.toBeInTheDocument();
  });

  test('warnings render the server evidence', () => {
    renderCard({
      ...BASE,
      trust: { state: 'warnings', warnings: [{ code: 'fee', evidence: 'Asks for a training fee' }] },
    });
    expect(screen.getByTestId('job-trust-line')).toHaveTextContent('Warning signs found');
    expect(screen.getByTestId('job-trust-line')).toHaveTextContent('Asks for a training fee');
  });

  test('a confirmed application says so', () => {
    renderCard(BASE, { jobStatus: 'applied' });
    expect(screen.getByTestId('job-application-state')).toHaveTextContent('Applied (you confirmed)');
  });
});

describe('TechFeedJobCard', () => {
  test('legacy row keeps the legacy employer-kind badge and verified line', () => {
    wrap(<TechFeedJobCard job={makeTechFeedJob({ employer_kind: 'direct_employer' })} onNotInterested={() => {}} />);
    expect(screen.getByTestId('tech-feed-provenance')).toHaveTextContent('Direct employer');
    expect(screen.queryByTestId('job-employer-context')).not.toBeInTheDocument();
  });

  test('employer_profile unknown overrides a legacy direct_employer label', () => {
    wrap(
      <TechFeedJobCard
        job={makeTechFeedJob({ employer_kind: 'direct_employer', employer_profile: { kind: 'unknown' } })}
        onNotInterested={() => {}}
      />,
    );
    expect(screen.getByTestId('employer-category')).toHaveTextContent('Employer type unverified');
    expect(screen.queryByText('Direct employer')).not.toBeInTheDocument();
  });
});

describe('policy counts and empty state', () => {
  test('older backend: nothing rendered', () => {
    const { container } = wrap(
      <>
        <EmployerPolicySummary policy={undefined} />
        <EmployerFilteredEmptyState policy={undefined} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('the counts line names each exclusion and offers to show them', () => {
    wrap(
      <EmployerPolicySummary
        policy={{ excluded_counts: { staffing: 12, consultancy: 5, talent_marketplace: 3 }, unverified_shown: 2 }}
      />,
    );
    expect(screen.getByTestId('employer-policy-excluded')).toHaveTextContent(
      'Hidden by your employer filters: 12 staffing, 5 consultancy, 3 talent marketplace',
    );
    expect(screen.getByRole('button', { name: 'Show them' })).toBeInTheDocument();
    expect(screen.getByTestId('employer-policy-unverified')).toHaveTextContent(
      "2 shown from employers we couldn't verify",
    );
  });

  test('everything filtered: the empty state says so and offers the filters', () => {
    wrap(<EmployerFilteredEmptyState policy={{ excluded_counts: { staffing: 4 } }} />);
    const empty = screen.getByTestId('employer-policy-empty');
    expect(empty).toHaveTextContent('Your employer filters hid every match here');
    expect(empty).toHaveTextContent("4 staffing were hidden. We don't widen your filters for you");
    expect(screen.getByRole('button', { name: /Adjust employer filters/ })).toBeInTheDocument();
    // Rendering the empty state wrote nothing.
    expect(api.saveEmployerPreferences).not.toHaveBeenCalled();
  });
});
