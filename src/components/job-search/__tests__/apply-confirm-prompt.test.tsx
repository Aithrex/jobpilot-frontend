import { render, screen, within } from '@testing-library/react';
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

  test('Apply opens a three-way choice before the posting', async () => {
    const onQuickApply = vi.fn();
    const onTailor = vi.fn();
    const onAlready = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={onQuickApply}
        onApplyWithTailor={onTailor}
        onAlreadyApplied={onAlready}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    expect(screen.getByText(/how do you want to apply/i)).toBeInTheDocument();
    expect(onQuickApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /already applied/i }));
    expect(onAlready).toHaveBeenCalledTimes(1);
    expect(onQuickApply).not.toHaveBeenCalled();
    expect(onTailor).not.toHaveBeenCalled();
  });

  test('Apply without tailoring opens the posting path', async () => {
    const onQuickApply = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={onQuickApply}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    await userEvent.click(screen.getByRole('button', { name: /apply without tailoring/i }));
    expect(onQuickApply).toHaveBeenCalledTimes(1);
  });

  test('Tailor resume from the choice dialog starts the tailor handoff', async () => {
    const onQuickApply = vi.fn();
    const onTailor = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={onQuickApply}
        onApplyWithTailor={onTailor}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^tailor resume$/i }));
    expect(onTailor).toHaveBeenCalledTimes(1);
    expect(onQuickApply).not.toHaveBeenCalled();
  });

  test('Hide removes the posting from For you', async () => {
    const onHide = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        onHide={onHide}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /hide this job/i }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  test('Tailor resume is a visible tile action', async () => {
    const onTailor = vi.fn();
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        onApplyWithTailor={onTailor}
      />,
    );
    expect(screen.getByRole('button', { name: /^tailor resume$/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^tailor resume$/i }));
    expect(onTailor).toHaveBeenCalledTimes(1);
  });

  test('Tailor resume shows a spinner while the handoff is in flight', async () => {
    const onTailor = vi.fn(() => new Promise<void>(() => {}));
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        onApplyWithTailor={onTailor}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^tailor resume$/i }));
    expect(onTailor).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /opening/i })).toBeDisabled();
  });

  test('hides the in-card Did you apply prompt while the modal is open for that job', () => {
    render(
      <JobCard
        job={JOB}
        saved
        jobStatus="interested"
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
        applyConfirmPending
        applyConfirmModalJobId={JOB.job_id}
        onConfirmApplied={() => {}}
        onConfirmNotYet={() => {}}
      />,
    );
    expect(screen.queryByRole('group', { name: /did you apply for platform engineer/i }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeInTheDocument();
  });

  test('applied roles omit Save — the Applied tab already says they applied', () => {
    render(
      <JobCard
        job={JOB}
        saved
        jobStatus="applied"
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
      />,
    );
    expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^saved$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reopen$/i })).toBeInTheDocument();
  });

  test('Save shows a spinner until the request finishes', async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={onSave}
        onUnsave={() => {}}
        onQuickApply={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    resolveSave();
    expect(await screen.findByRole('button', { name: /^save$/i })).toBeEnabled();
  });

  test('Details stays on the card even when no description is stored', () => {
    render(
      <JobCard
        job={{ ...JOB, description: '' }}
        saved
        jobStatus="interested"
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /^details$/i })).toBeInTheDocument();
  });

  test('gap count after skill chips is fully visible', () => {
    render(
      <JobCard
        job={{
          ...JOB,
          matched_skills: ['typescript', 'react', 'postgresql', 'datadog', 'observability', 'kafka', 'go'],
          missing_skills: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        }}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
      />,
    );
    expect(screen.getByText('· 8 gaps')).toBeInTheDocument();
    expect(screen.getByText('observability')).toBeInTheDocument();
  });

  test('Details expands the job description on the card', async () => {
    render(
      <JobCard
        job={JOB}
        saved={false}
        jobStatus={null}
        onSave={() => {}}
        onUnsave={() => {}}
        onQuickApply={() => {}}
      />,
    );
    expect(screen.queryByText(/build platforms/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^details$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/build platforms/i)).toBeInTheDocument();
  });
});
