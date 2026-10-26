/**
 * The job card is a working card, not a link.
 *
 * Two things are under test here:
 *
 *  1. THE FIVE FLOWS. Save, the did-you-apply confirmation, the tailor
 *     handoff, the application tracker (touched inside the `useJobSearch`
 *     handlers) and auto-apply must fire from the tech-feed card with the SAME
 *     `Job` the legacy path uses. If they do not, the feed is a dead end that
 *     quietly drops every posting a user acts on out of their tracker.
 *  2. HONESTY UNDER THE NEW FIELDS. An ineligible posting must not wear a
 *     match band that implies the candidate clears screening, and a stated
 *     hard requirement the resume is silent about must read as a requirement
 *     to check rather than as a penalty.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { NAVIGATE_TO_TAILOR_EVENT } from '@/lib/craftHandoff';
import { TechFeedJobCard } from '@/components/job-search/tech-feed/TechFeedJobCard';
import { makeTechFeedJob } from '@/test/techFeedFixtures';
import type { TechFeedJob } from '@/types/techFeed';

vi.mock('@/lib/api', () => ({
  apiService: {
    fetchJobDescription: vi.fn(),
    recordTechFeedFeedback: vi.fn(),
    undoTechFeedFeedback: vi.fn(),
    getTechFeedFeedback: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function handlers() {
  return {
    onSave: vi.fn(),
    onUnsave: vi.fn(),
    onQuickApply: vi.fn(),
    onApplyWithTailor: vi.fn(),
    onAutoApply: vi.fn(),
    onConfirmApplied: vi.fn(),
    onConfirmNotYet: vi.fn(),
    onAlreadyApplied: vi.fn(),
    onNotInterested: vi.fn(),
    onRestore: vi.fn(),
  };
}

function renderCard(
  job: TechFeedJob = makeTechFeedJob(),
  props: Partial<React.ComponentProps<typeof TechFeedJobCard>> = {},
) {
  const spies = handlers();
  render(<TechFeedJobCard job={job} {...spies} {...props} />);
  return spies;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
  api.fetchJobDescription.mockResolvedValue({ data: { ok: true, jd_text: 'Build systems.' } });
  api.recordTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
  api.undoTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
});

describe('the five flows fire from the tech-feed card', () => {
  test('save hands the adapted posting to the saved-jobs flow', async () => {
    const user = userEvent.setup();
    const spies = renderCard();

    await user.click(screen.getByRole('button', { name: /^Save / }));

    expect(spies.onSave).toHaveBeenCalledTimes(1);
    const posting = spies.onSave.mock.calls[0][0];
    expect(posting).toMatchObject({
      job_id: 'job-1',
      title: 'Senior Backend Engineer',
      company: 'Northwind Systems',
      apply_link: 'https://example.com/jobs/1/apply',
    });
  });

  test('an already-saved card unsaves by id', async () => {
    const user = userEvent.setup();
    const spies = renderCard(makeTechFeedJob(), { saved: true });

    expect(screen.getByRole('button', { name: /^Remove /})).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /^Remove / }));

    expect(spies.onUnsave).toHaveBeenCalledWith('job-1');
    expect(spies.onSave).not.toHaveBeenCalled();
  });

  test('Apply runs the quick-apply flow instead of being a bare link', async () => {
    const user = userEvent.setup();
    const spies = renderCard();

    const apply = screen.getByRole('button', { name: /^Apply/ });
    expect(apply.closest('a')).toBeNull();

    await user.click(apply);

    // quickApply opens the posting, touches the pipeline as "opened" and arms
    // the did-you-apply prompt. All of that lives in useJobSearch.
    expect(spies.onQuickApply).toHaveBeenCalledTimes(1);
    expect(spies.onQuickApply.mock.calls[0][0]).toMatchObject({ job_id: 'job-1' });
  });

  test('with no apply handler the card degrades to an honest external link', () => {
    render(
      <TechFeedJobCard
        job={makeTechFeedJob()}
        onNotInterested={vi.fn()}
        onQuickApply={undefined}
      />,
    );
    const link = screen.getByRole('link', { name: /^Apply/ });
    expect(link).toHaveAttribute('href', 'https://example.com/jobs/1/apply');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('Tailor records the tracker intent and stages the Craft handoff', async () => {
    const user = userEvent.setup();
    const navigated = vi.fn();
    window.addEventListener(NAVIGATE_TO_TAILOR_EVENT, navigated);
    const spies = renderCard();

    await user.click(screen.getByRole('button', { name: /Tailor and apply/ }));

    await waitFor(() => expect(spies.onApplyWithTailor).toHaveBeenCalledTimes(1));
    expect(spies.onApplyWithTailor.mock.calls[0][0]).toMatchObject({ job_id: 'job-1' });

    await waitFor(() => {
      const staged = JSON.parse(window.sessionStorage.getItem('pending_tailor_job') || 'null');
      expect(staged).toMatchObject({
        job_id: 'job-1',
        title: 'Senior Backend Engineer',
        company: 'Northwind Systems',
        jd_text: 'Build systems.',
      });
    });
    await waitFor(() => expect(navigated).toHaveBeenCalled());
    window.removeEventListener(NAVIGATE_TO_TAILOR_EVENT, navigated);
  });

  test('a JD that cannot be fetched hands off flagged, never silently empty', async () => {
    const user = userEvent.setup();
    api.fetchJobDescription.mockResolvedValue({ data: { ok: false } });
    renderCard();

    await user.click(screen.getByRole('button', { name: /Tailor and apply/ }));

    await waitFor(() => {
      const staged = JSON.parse(window.sessionStorage.getItem('pending_tailor_job') || 'null');
      expect(staged).toMatchObject({ jd_fetch_failed: true, jd_text: '' });
    });
  });

  test('paused submission automation stays hidden even when a handler exists', () => {
    const spies = renderCard();
    expect(screen.queryByRole('button', { name: /Auto Apply/ })).not.toBeInTheDocument();
    expect(spies.onAutoApply).not.toHaveBeenCalled();
  });

  test('historical queueing state does not expose the paused action', () => {
    renderCard(makeTechFeedJob(), { autoApplying: true });
    expect(screen.queryByRole('button', { name: /Auto Apply/ })).not.toBeInTheDocument();
  });

  test('the did-you-apply prompt answers into the tracker', async () => {
    const user = userEvent.setup();
    const spies = renderCard(makeTechFeedJob(), { applyConfirmPending: true });

    const confirm = screen.getByTestId('tech-feed-apply-confirm');
    await user.click(within(confirm).getByRole('button', { name: 'Yes, I applied' }));

    expect(spies.onConfirmApplied).toHaveBeenCalledTimes(1);
    expect(spies.onConfirmApplied.mock.calls[0][0]).toMatchObject({ job_id: 'job-1' });
  });

  test('the in-card prompt stays hidden while the page dialog asks the same question', () => {
    renderCard(makeTechFeedJob(), { applyConfirmPending: true, applyConfirmModalJobId: 'job-1' });
    expect(screen.queryByTestId('tech-feed-apply-confirm')).not.toBeInTheDocument();
  });

  test('"Not yet" leaves the posting where it is', async () => {
    const user = userEvent.setup();
    const spies = renderCard(makeTechFeedJob(), { applyConfirmPending: true });

    await user.click(screen.getByRole('button', { name: 'Not yet' }));
    expect(spies.onConfirmNotYet).toHaveBeenCalledWith('job-1');
    expect(spies.onConfirmApplied).not.toHaveBeenCalled();
  });

  test('"I already applied" files the posting under Applied without opening it', async () => {
    const user = userEvent.setup();
    const spies = renderCard();

    await user.click(screen.getByRole('button', { name: 'I already applied' }));

    expect(spies.onAlreadyApplied).toHaveBeenCalledTimes(1);
    expect(spies.onAlreadyApplied.mock.calls[0][0]).toMatchObject({ job_id: 'job-1' });
    expect(spies.onQuickApply).not.toHaveBeenCalled();
  });

  test('a posting already in the applied funnel is not asked about again', () => {
    renderCard(makeTechFeedJob(), { jobStatus: 'interview' });
    expect(screen.queryByRole('button', { name: 'I already applied' })).not.toBeInTheDocument();
  });

  test('the tracker status the card is given is stated on the card', () => {
    renderCard(makeTechFeedJob(), { jobStatus: 'applied' });
    expect(screen.getByTestId('tech-feed-job-card')).toHaveTextContent('In your tracker: Applied');
  });
});

describe('eligibility is never dressed up as a passing score', () => {
  const ineligible = makeTechFeedJob({
    job_id: 'ineligible-1',
    match_score: 82,
    eligibility: 'ineligible',
    ineligible_reasons: [
      'This posting requires a registered nurse license, which is not shown on your resume.',
    ],
  });

  test('an ineligible card shows no score and no band', () => {
    renderCard(ineligible);

    const verdict = screen.getByTestId('tech-feed-match');
    expect(verdict).toHaveTextContent('Does not meet a stated requirement');
    expect(verdict.textContent).not.toMatch(/\d+% match/);
    expect(verdict.textContent).not.toMatch(/Strong match|Good match|Possible match/);
    expect(screen.queryByText('82% match')).not.toBeInTheDocument();
  });

  test('an ineligible card is visibly distinguished and states the reason', () => {
    renderCard(ineligible);

    expect(screen.getByTestId('tech-feed-job-card')).toHaveAttribute(
      'data-eligibility',
      'ineligible',
    );
    expect(screen.getByTestId('tech-feed-ineligible')).toHaveTextContent(
      'requires a registered nurse license',
    );
  });

  test('an eligible card keeps its score and its band', () => {
    renderCard();
    const verdict = screen.getByTestId('tech-feed-match');
    expect(verdict).toHaveTextContent('88% match');
    expect(verdict).toHaveTextContent('Strong match');
  });

  test('not_scored keeps the "Not scored" treatment, not a zero', () => {
    renderCard(
      makeTechFeedJob({ eligibility: 'not_scored', match_score: 0, fit_score_version: null }),
    );

    const verdict = screen.getByTestId('tech-feed-match');
    expect(verdict).toHaveTextContent('Not scored');
    expect(verdict.textContent).not.toMatch(/0% match/);
  });

  test('a row with no fit verdict at all reads "Not scored" rather than eligible', () => {
    renderCard(makeTechFeedJob({ fit_score_version: null, fit: null, match_score: 0 }));
    expect(screen.getByTestId('tech-feed-match')).toHaveTextContent('Not scored');
  });

  test('the verdict is read from the fit block when it is not promoted to the top level', () => {
    renderCard(
      makeTechFeedJob({
        eligibility: undefined,
        fit: {
          score_version: 'fit-3',
          eligibility: 'ineligible',
          ineligible_reasons: ['This employer states it does not sponsor.'],
        },
      }),
    );
    expect(screen.getByTestId('tech-feed-match')).toHaveTextContent(
      'Does not meet a stated requirement',
    );
    expect(screen.getByTestId('tech-feed-ineligible')).toHaveTextContent('does not sponsor');
  });
});

describe('a hard requirement is a requirement, not a penalty', () => {
  const clearance = makeTechFeedJob({
    hard_constraints: [
      {
        type: 'clearance',
        status: 'unknown',
        hard_requirement: true,
        detail:
          'This posting requires an active security clearance. Your resume does not state whether you hold one.',
      },
    ],
  });

  test('it renders under "Requirements to check" and says it costs nothing', () => {
    renderCard(clearance);

    const block = screen.getByTestId('tech-feed-requirements');
    expect(block).toHaveTextContent('Requirements to check');
    expect(block).toHaveTextContent('requires an active security clearance');
    expect(block).toHaveTextContent('not counted against your score');
  });

  test('it is not presented as ineligibility and does not touch the score', () => {
    renderCard(clearance);

    expect(screen.queryByTestId('tech-feed-ineligible')).not.toBeInTheDocument();
    expect(screen.getByTestId('tech-feed-match')).toHaveTextContent('88% match');
  });

  test('a met requirement is not shown as something to check', () => {
    renderCard(
      makeTechFeedJob({
        hard_constraints: [
          {
            type: 'clearance',
            status: 'met',
            hard_requirement: true,
            detail: 'A security clearance is evidenced on your resume.',
          },
        ],
      }),
    );
    expect(screen.queryByTestId('tech-feed-requirements')).not.toBeInTheDocument();
  });
});

describe('what the index knows about the posting', () => {
  test('freshness is stated as our own observation, in hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    renderCard(makeTechFeedJob({ last_verified_at: twoHoursAgo }));

    expect(screen.getByTestId('tech-feed-verified')).toHaveTextContent('verified 2h ago');
  });

  test('an undated posting says the employer did not state a date', () => {
    renderCard(
      makeTechFeedJob({
        posted_at: null,
        posted_at_confidence: 'unknown',
        days_ago: null,
        first_seen_days_ago: 9,
      }),
    );

    const posted = screen.getByTestId('tech-feed-posted');
    expect(posted).toHaveTextContent('First seen 9 days ago');
    expect(posted).toHaveTextContent('Posting date not stated by the employer.');
    expect(posted.textContent).not.toMatch(/Posted \w+ \d/);
  });

  test('direct apply and job-board apply are told apart in words', () => {
    renderCard(makeTechFeedJob({ direct_apply: true }));
    expect(screen.getByTestId('tech-feed-direct-apply')).toHaveTextContent(
      "Apply on the employer's own board",
    );
  });

  test('a job-board listing says so instead of staying silent', () => {
    renderCard(makeTechFeedJob({ direct_apply: false }));
    expect(screen.getByTestId('tech-feed-direct-apply')).toHaveTextContent('Apply via a job board');
  });

  test('role alignment renders the engine detail verbatim under its tier', () => {
    renderCard(
      makeTechFeedJob({
        role_alignment: {
          tier: 'adjacent_specialty',
          matched: 'platform',
          detail: 'Platform engineering is adjacent to Backend',
        },
      }),
    );

    const block = screen.getByTestId('tech-feed-role-alignment');
    expect(block).toHaveTextContent('Adjacent specialty');
    expect(block).toHaveTextContent('Platform engineering is adjacent to Backend');
  });

  test('an unrelated tier is stated plainly, not hidden', () => {
    renderCard(
      makeTechFeedJob({
        role_alignment: {
          tier: 'unrelated',
          matched: null,
          detail: 'this resume is a nursing career; this is a technical role',
        },
      }),
    );

    const block = screen.getByTestId('tech-feed-role-alignment');
    expect(block).toHaveTextContent('Different field from your resume');
    expect(block).toHaveTextContent('this resume is a nursing career; this is a technical role');
  });

  test('no alignment block at all when the server sent none', () => {
    renderCard();
    expect(screen.queryByTestId('tech-feed-role-alignment')).not.toBeInTheDocument();
  });
});
