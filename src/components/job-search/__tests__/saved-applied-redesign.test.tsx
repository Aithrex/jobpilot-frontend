import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { ApplicationList, stageOf } from '@/components/job-search/ApplicationList';
import { SavedNextSteps, savedNote } from '@/components/job-search/SavedNextSteps';
import type { SavedJob } from '@/types/jobs';

vi.mock('@/lib/api', () => ({ apiService: {}, companyLogoSrc: () => '' }));
const toastSpy = vi.fn();
vi.mock('sonner', () => ({ toast: (...args: unknown[]) => toastSpy(...args) }));

const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

function row(id: string, status: SavedJob['status'], extra: Partial<SavedJob> = {}): SavedJob {
  return {
    _id: id,
    job_id: id,
    status,
    notes: '',
    saved_at: ago(3),
    job_data: {
      job_id: id,
      title: `Engineer ${id}`,
      company: 'Acme',
      location: 'Remote',
      logo: '',
      apply_link: `https://example.com/${id}`,
      description: '',
      salary: '',
      employment_type: '',
      date_posted: '',
      is_remote: true,
      h1b_sponsor: false,
      match_score: 70,
      matched_skills: [],
      missing_skills: [],
    },
    ...extra,
  };
}

describe('Applied list', () => {
  test('an applied row offers the next step and records it', async () => {
    const update = vi.fn(() => Promise.resolve());
    render(<ApplicationList rows={[row('a1', 'applied', { next_step: { posting_state: 'open', applied_at: ago(10) } })]} updateJobStatus={update} />);
    const item = screen.getByTestId('application-a1');
    expect(within(item).getByText('Applied 10 days ago')).toBeInTheDocument();
    expect(within(item).getByRole('list', { name: 'Stage: Applied' })).toBeInTheDocument();

    await userEvent.click(within(item).getByRole('button', { name: 'Got an interview' }));
    expect(update).toHaveBeenCalledWith('a1', 'interview');
    // The change can be undone from the toast.
    await vi.waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const [, opts] = toastSpy.mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    opts.action.onClick();
    expect(update).toHaveBeenLastCalledWith('a1', 'applied');
  });

  test('an interview row offers Got an offer; an offer row does not offer Rejected', () => {
    render(<ApplicationList rows={[row('i1', 'interview'), row('o1', 'offer')]} updateJobStatus={vi.fn()} />);
    const interview = screen.getByTestId('application-i1');
    expect(within(interview).getByRole('button', { name: 'Got an offer' })).toBeInTheDocument();
    expect(within(interview).getByRole('button', { name: 'Rejected' })).toBeInTheDocument();
    const offer = screen.getByTestId('application-o1');
    expect(within(offer).queryByRole('button', { name: 'Rejected' })).not.toBeInTheDocument();
    expect(within(offer).queryByRole('button', { name: /got an/i })).not.toBeInTheDocument();
  });

  test('a rejected row can be reopened', async () => {
    const update = vi.fn(() => Promise.resolve());
    render(<ApplicationList rows={[row('r1', 'rejected')]} updateJobStatus={update} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(update).toHaveBeenCalledWith('r1', 'applied');
  });

  test('a missing applied date is said, not guessed', () => {
    render(<ApplicationList rows={[row('a2', 'applied')]} updateJobStatus={vi.fn()} />);
    expect(screen.getByText('Applied, date not recorded')).toBeInTheDocument();
  });

  test('the tracker stage wins over a stale own status', () => {
    expect(stageOf(row('x', 'applied', { next_step: { posting_state: 'open', tracker_status: 'interview' } }))).toBe('interview');
    expect(stageOf(row('y', 'interview', { next_step: { posting_state: 'open', tracker_status: 'rejected' } }))).toBe('rejected');
  });
});

describe('Saved and Applied summaries', () => {
  test('Applied opens with a sentence that matches its groups', () => {
    render(
      <SavedNextSteps
        mode="applied"
        rows={[
          row('a1', 'applied', { next_step: { posting_state: 'open', applied_at: ago(10) } }),
          row('a2', 'applied', { next_step: { posting_state: 'open', applied_at: ago(1) } }),
          row('i1', 'interview'),
        ]}
        renderCard={() => null}
        updateJobStatus={vi.fn()}
      />,
    );
    expect(screen.getByTestId('applied-summary')).toHaveTextContent(
      '3 applications: 1 needs a follow-up, 1 in interviews, 1 waiting to hear back.',
    );
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  test('Saved puts where the user stands inside the card note', () => {
    const r = row('s1', 'interested', { saved_at: ago(1), next_step: { posting_state: 'open', tailored: true } });
    expect(savedNote(r)).toBe('Saved yesterday, resume tailored');
    render(
      <SavedNextSteps mode="saved" rows={[r]} renderCard={(x) => <div>{savedNote(x)}</div>} />,
    );
    expect(screen.getByTestId('saved-summary')).toHaveTextContent('1 saved role: 1 ready to apply.');
  });
});
