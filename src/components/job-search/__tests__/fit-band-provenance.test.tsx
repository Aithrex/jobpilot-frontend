/**
 * One engine's numbers may only wear that engine's words.
 *
 * `fitBands.ts` copies its cut-offs verbatim from
 * `shared/python/services/fit_score.py::BANDS`, and its "Good match" copy
 * asserts "This is the bar Auto-Apply uses to queue a role". Those words were
 * being applied to whatever integer arrived as `match_score` - and three
 * different backend engines wrote that key. `JobCard` is rendered by
 * `JobSearchPanel`, `WorkdayJobsPanel` AND `CombinedJobsPanel`, so on identical
 * (resume, posting) pairs the same card said 66 in one tab and 98 in another,
 * and an account with NO parsed resume got a green "Strong match" (100) on a
 * posting the platform itself rated "unlikely match" (20).
 *
 * The engines are consolidated server-side. This is the client-side guard that
 * keeps them honest: a row with no `score_version` / `fit.score_version` stamp
 * gets NO band words, because we cannot say what its number means.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { JobCard } from '@/components/job-search/JobCard';
import {
  AUTO_APPLY_GATE,
  fitBand,
  fitBandOf,
  isFitScored,
} from '@/components/job-search/fitBands';
import type { Job } from '@/types/jobs';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: { checkJobTrust: vi.fn() },
}));

const BASE: Job = {
  job_id: 'j1',
  title: 'Software Engineer',
  company: 'Globodyne',
  logo: '',
  location: 'Austin, TX',
  apply_link: 'https://example.test/apply',
  description: 'Build backend services.',
  salary: '',
  employment_type: '',
  date_posted: '',
  is_remote: false,
  h1b_sponsor: false,
  match_score: 0,
  matched_skills: [],
  missing_skills: [],
};

function scoredRow(score: number, shape: 'nested' | 'flat' = 'nested'): Job {
  return shape === 'nested'
    ? { ...BASE, match_score: score, fit: { score_version: 'fit-v2.0' } as Job['fit'] }
    : { ...BASE, match_score: score, score_version: 'fit-v2.0' };
}

function renderCard(job: Job) {
  return render(
    <JobCard
      job={job}
      saved={false}
      jobStatus={null}
      onSave={() => {}}
      onUnsave={() => {}}
      onQuickApply={() => {}}
    />,
  );
}

// ---------------------------------------------------------------------------
// The predicate
// ---------------------------------------------------------------------------
describe('isFitScored', () => {
  test('accepts the nested stamp written by the feed and /api/jobs/search', () => {
    expect(isFitScored({ match_score: 74, fit: { score_version: 'fit-v2.0' } })).toBe(true);
  });

  test('accepts the flat stamp written by the career-portal scans', () => {
    expect(isFitScored({ match_score: 74, score_version: 'fit-v2.0' })).toBe(true);
  });

  test('rejects a bare number from an unknown engine', () => {
    expect(isFitScored({ match_score: 100 })).toBe(false);
  });

  test('rejects an empty or missing stamp', () => {
    expect(isFitScored({ match_score: 74, score_version: '' })).toBe(false);
    expect(isFitScored({ match_score: 74, score_version: '   ' })).toBe(false);
    expect(isFitScored({ match_score: 74, fit: null })).toBe(false);
    expect(isFitScored(null)).toBe(false);
    expect(isFitScored(undefined)).toBe(false);
  });
});

describe('fitBandOf', () => {
  test('agrees with fitBand once provenance is proven', () => {
    for (const score of [95, 80, 79, 65, 64, 50, 49, 35, 34, 1]) {
      expect(fitBandOf(scoredRow(score)).key).toBe(fitBand(score).key);
    }
  });

  test('an unstamped row is never given a band, however high the number', () => {
    expect(fitBandOf({ ...BASE, match_score: 100 }).key).toBe('unscored');
    expect(fitBandOf({ ...BASE, match_score: 87 }).key).toBe('unscored');
  });

  test('the auto-apply gate is still the engine cut-off', () => {
    expect(AUTO_APPLY_GATE).toBe(65);
    expect(fitBandOf(scoredRow(AUTO_APPLY_GATE)).key).toBe('good');
    expect(fitBandOf(scoredRow(AUTO_APPLY_GATE - 1)).key).toBe('possible');
  });
});

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------
describe('JobCard fit verdict', () => {
  test('a fit_score row shows the number and the band words', () => {
    renderCard(scoredRow(74));
    expect(screen.getByText('Good match')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /74 out of 100\. Good match\./ }))
      .toBeInTheDocument();
  });

  test('a flat-stamped career-portal row is treated identically', () => {
    renderCard(scoredRow(88, 'flat'));
    expect(screen.getByText('Strong match')).toBeInTheDocument();
  });

  test('THE REGRESSION: an unstamped 100 is "Not scored", not "Strong match"', () => {
    renderCard({ ...BASE, match_score: 100 });
    expect(screen.getByText('Not scored')).toBeInTheDocument();
    expect(screen.queryByText('Strong match')).not.toBeInTheDocument();
    // The dial refuses to draw the number too.
    expect(screen.getByRole('img', { name: /not scored against your resume/i }))
      .toBeInTheDocument();
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });

  test('the honest no-resume payload (0, no stamp) reads "Not scored"', () => {
    renderCard({ ...BASE, match_score: 0 });
    expect(screen.getByText('Not scored')).toBeInTheDocument();
  });

  test('a genuine low fit score still gets its real verdict', () => {
    renderCard(scoredRow(20));
    expect(screen.getByText('Unlikely match')).toBeInTheDocument();
    expect(screen.queryByText('Not scored')).not.toBeInTheDocument();
  });

  test('Why this score opens a scrollable panel with the full receipts', async () => {
    renderCard({
      ...scoredRow(50),
      matched_skills: ['typescript', 'react', 'postgresql'],
      missing_skills: [
        'python', 'java', 'fastapi', 'flask', 'django',
        'spring boot', 'reactive spring', 'react native',
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: /why this score/i }));
    expect(await screen.findByText(/asked for, not evidenced \(8\)/i)).toBeInTheDocument();
    expect(screen.getByText(/scored 0-100 against the requirements/i)).toBeInTheDocument();
    const scroller = screen.getByText(/asked for, not evidenced \(8\)/i).closest('.overflow-y-auto');
    expect(scroller).toBeTruthy();
  });
});
