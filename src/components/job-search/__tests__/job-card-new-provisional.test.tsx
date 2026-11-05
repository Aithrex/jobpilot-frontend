import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { JobCard } from '@/components/job-search/JobCard';
import type { Job } from '@/types/jobs';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: { checkJobTrust: vi.fn() },
}));

const BASE: Job = {
  job_id: 'j1', title: 'Software Engineer', company: 'Globodyne', logo: '',
  location: 'Austin, TX', apply_link: 'https://example.test/apply', description: '',
  salary: '', employment_type: '', date_posted: '', is_remote: false, h1b_sponsor: false,
  match_score: 72, matched_skills: [], missing_skills: [], score_version: 'fit-v2.9',
};

const renderCard = (job: Job, isNew?: boolean) =>
  render(
    <JobCard job={job} saved={false} jobStatus={null} isNew={isNew}
      onSave={() => {}} onUnsave={() => {}} onQuickApply={() => {}} />,
  );

describe('JobCard: New badge and provisional score', () => {
  test('a card new since the last visit says New', () => {
    renderCard(BASE, true);
    expect(screen.getByTestId('job-new-badge')).toHaveTextContent('New');
  });

  test('no badge otherwise', () => {
    renderCard(BASE);
    expect(screen.queryByTestId('job-new-badge')).not.toBeInTheDocument();
  });

  test('a title-only score says it will update', () => {
    renderCard({ ...BASE, score_basis: 'title_only' });
    expect(screen.getByText('Score updates when the description arrives.')).toBeInTheDocument();
  });

  test('a fully-read score says nothing extra', () => {
    renderCard(BASE);
    expect(screen.queryByTestId('job-score-provisional')).not.toBeInTheDocument();
  });
});
