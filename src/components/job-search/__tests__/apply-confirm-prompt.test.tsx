import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { JobCard } from '@/components/job-search/JobCard';
import type { Job } from '@/types/jobs';

vi.mock('@/lib/api', () => ({
  apiService: {},
  companyLogoSrc: () => '',
}));

const JOB: Job = {
  job_id: 'j1',
  title: 'Platform Engineer',
  company: 'Acme',
  logo: '',
  location: 'Remote',
  apply_link: 'https://example.com/apply',
  description: 'Build platforms.',
  salary: '',
  employment_type: '',
  date_posted: '',
  is_remote: true,
  h1b_sponsor: false,
  match_score: 70,
  matched_skills: [],
  missing_skills: [],
};

describe('JobCard apply confirmation', () => {
  test('asks if the user applied instead of showing Apply after the posting opened', async () => {
    const onApplied = vi.fn();
    const onNotYet = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved
        jobStatus="interested"
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        applyConfirmPending
        onConfirmApplied={onApplied}
        onConfirmNotYet={onNotYet}
      />,
    );
    expect(screen.getByRole('group', { name: /did you apply for platform engineer/i }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^apply$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /yes, i applied/i }));
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  test('Not yet leaves the listing without marking applied', async () => {
    const onApplied = vi.fn();
    const onNotYet = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved
        jobStatus="interested"
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        applyConfirmPending
        onConfirmApplied={onApplied}
        onConfirmNotYet={onNotYet}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /not yet/i }));
    expect(onNotYet).toHaveBeenCalledTimes(1);
    expect(onApplied).not.toHaveBeenCalled();
  });
});
