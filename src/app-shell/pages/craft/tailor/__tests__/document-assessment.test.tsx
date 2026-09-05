import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AtsScorePanel } from '../AtsScorePanel';
import type { ATSScores, DocumentAssessment } from '@/types/resume';
import { replaceBulletText, removeBulletAt, removeSummarySentence } from '@/lib/resumeMutations';
import type { TailoredFullResume } from '@/types/resume';

vi.mock('@/lib/api', () => ({ apiService: {} }));

const assessment: DocumentAssessment = {
  version: 'evidence-v1', content_hash: 'hash', jd_hash: 'jd', ready: false,
  source_status: 'source_linked', analysis_completeness: 'complete',
  artifact: { format: 'pdf', status: 'unchecked', issues: [], content_hash: 'hash' },
  requirements: [{ id: 'r', text: 'Reconciliation', priority: 'required', state: 'related', visible: false, locations: [] }],
  reader_review: { status: 'unverified', findings: [], reason: 'Reader review unavailable.' }, questions: [],
};

describe('evidence review', () => {
  it('separates coverage, reader feedback and export without inventing scores', () => {
    render(<AtsScorePanel scores={{ overall: null, document_assessment: assessment } as ATSScores} />);
    expect(screen.getByText('Job requirement coverage')).toBeInTheDocument();
    expect(screen.getByText('Reader feedback')).toBeInTheDocument();
    expect(screen.getByText('Document checks')).toBeInTheDocument();
    expect(screen.queryByText('Overall ATS Score')).not.toBeInTheDocument();
    expect(screen.getByText('Reader review unavailable.')).toBeInTheDocument();
  });
  it('marks old coverage and feedback stale after edits', () => {
    render(<AtsScorePanel scores={{ overall: null, document_assessment: assessment } as ATSScores} stale />);
    expect(screen.getByText(/Previous feedback is out of date/)).toBeInTheDocument();
    expect(screen.queryByText('Related experience')).not.toBeInTheDocument();
  });
  it('keeps fresh reader feedback visible when source links still need verification', () => {
    const fresh = { ...assessment, source_status: 'stale', requirements: [],
      reader_review: { status: 'passed', findings: [{ kind: 'clarity', quote: 'Current wording', explanation: 'The current work is clear.' }] } };
    render(<AtsScorePanel scores={{ overall: null, document_assessment: fresh } as ATSScores} />);
    expect(screen.getByText('The current work is clear.')).toBeInTheDocument();
    expect(screen.getByText(/Source evidence links need rechecking/)).toBeInTheDocument();
  });
});

function resume(): TailoredFullResume {
  return { summary: 'First sentence. Second sentence.', skills: {}, projects: [], education: [], certifications: [],
    contact: { name: 'Alex', email: '', phone: '', linkedin: '', github: '' },
    experience: [{ title: 'Analyst', company: 'Acme', location: '', dates: '', type: '', bullets: ['Original first.', 'Original second.'] }],
    document_assessment: assessment,
    tailoring_run: { policy_version: 'evidence-v1', source_hash: 'source', jd_hash: 'jd', content_hash: 'hash',
      provenance: [{ fact_id: 'a', entity: 'experience.0', text: 'Original first.', state: 'supported_explicit' },
                   { fact_id: 'b', entity: 'experience.0', text: 'Original second.', state: 'supported_explicit' }] } };
}

it('locks manual wording and invalidates the review', () => {
  const next = replaceBulletText(resume(), 'experience', 0, 0, 'My wording.');
  expect(next.tailoring_preferences?.locked_text?.a).toBe('My wording.');
  expect(next.document_assessment).toBeUndefined();
});

it('keeps source ids aligned after deleting an earlier bullet', () => {
  const removed = removeBulletAt(resume(), 'experience', 0, 0);
  const edited = replaceBulletText(removed, 'experience', 0, 0, 'My second.');
  expect(edited.tailoring_preferences?.omitted_fact_ids).toEqual(['a']);
  expect(edited.tailoring_preferences?.locked_text?.b).toBe('My second.');
});

it('preserves summary shortening during refinement', () => {
  const next = removeSummarySentence(resume(), 1);
  expect(next.summary).toBe('First sentence.');
  expect(next.tailoring_preferences?.summary_locked).toBe(true);
});
