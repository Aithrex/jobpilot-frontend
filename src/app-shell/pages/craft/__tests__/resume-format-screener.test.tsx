import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResumeFormatControls } from '../tailor/ResumeFormatControls';
import { ScreenerPanel } from '../tailor/ScreenerPanel';
import {
  DEFAULT_FORMAT,
  formatOf,
  loadSavedFormat,
  normalizeFormat,
  sameFormat,
  saveFormat,
} from '@/lib/resumeFormat';
import type { ScreenerReport, TailoredFullResume } from '@/types/resume';

describe('resume format helpers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps known values and falls back to the default for the rest', () => {
    expect(normalizeFormat({ page_length: 'two', density: 'roomy', accent: 'navy', extra: 1 })).toEqual({
      ...DEFAULT_FORMAT,
      page_length: 'two',
      accent: 'navy',
    });
    expect(normalizeFormat(null)).toEqual(DEFAULT_FORMAT);
  });

  it('reads the format a tailored resume carries', () => {
    const r = { tailoring_preferences: { page_length: 'two', locked_fact_ids: ['x'] } } as unknown as TailoredFullResume;
    expect(formatOf(r).page_length).toBe('two');
    expect(sameFormat(formatOf(null), DEFAULT_FORMAT)).toBe(true);
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSavedFormat()).toEqual(DEFAULT_FORMAT);
    expect(() => saveFormat({ ...DEFAULT_FORMAT, page_length: 'two' })).not.toThrow();
  });
});

describe('ResumeFormatControls', () => {
  it('changes one choice at a time and ignores re-clicking the active one', async () => {
    const onChange = vi.fn();
    render(<ResumeFormatControls value={DEFAULT_FORMAT} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '2 pages' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FORMAT, page_length: 'two' });
    onChange.mockClear();
    await userEvent.click(screen.getByRole('radio', { name: '1 page' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains what two pages do and is inert while busy', () => {
    render(<ResumeFormatControls value={{ ...DEFAULT_FORMAT, page_length: 'two' }} onChange={() => {}} busy />);
    expect(screen.getByText(/Nothing is added to fill the space/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Fitting your resume');
    expect(screen.getByRole('radio', { name: 'Comfortable' })).toBeDisabled();
  });
});

const REPORT: ScreenerReport = {
  version: 'screener-1.0',
  status: 'ok',
  parse: { status: 'ok', pages: 1, chars: 2400, checks: [{ id: 'name', label: 'Name readable', ok: true }] },
  criteria: [
    { id: 'C1', term: 'Python', kind: 'must', visibility: 'in_context', where: 'Backend Intern, Ledgerline', dates: '2025',
      span: 'Built Python services for payment reconciliation.', recency_rank: 0, lost_in_render: false,
      evidence: 'proven', source_line: '', verdict: 'meets' },
    { id: 'C2', term: 'PostgreSQL', kind: 'must', visibility: 'not_visible', where: '', dates: '', span: '',
      recency_rank: null, lost_in_render: false, evidence: 'proven',
      source_line: 'Wrote month-end SQL reports against PostgreSQL.', verdict: 'not_met' },
    { id: 'C3', term: 'Kubernetes', kind: 'must', visibility: 'not_visible', where: '', dates: '', span: '',
      recency_rank: null, lost_in_render: false, evidence: 'gap', source_line: '', verdict: 'not_met' },
    { id: 'C4', term: 'Docker', kind: 'nice', visibility: 'listed_only', where: 'Skills / summary', dates: '', span: '',
      recency_rank: null, lost_in_render: false, evidence: 'listed', source_line: '', verdict: 'weak' },
  ],
  summary: { must_total: 3, must_visible: 1, must_in_context: 1, nice_total: 1, nice_visible: 1, grade: 'D',
    grade_basis: '2 of 3 must-haves cannot be found on the page.' },
  gaps: [{ criterion: 'C3', term: 'Kubernetes', kind: 'must', adjacent: false,
    question: 'Have you used Kubernetes? If yes, tell us in which job or project and we will show it.' }],
  warnings: [],
  lens: { name: 'hackerrank-intern-rubric', source: '', signals: {
    projects_total: 1, projects_without_link: ['Notes Bot'], estimated_link_deduction: [3, 5], tutorial_projects: [],
    ai_fluency_band: 'built', ai_fluency_points: '4-7', linkedin_bonus: 1, portfolio_bonus: 0,
    notes: ['1 project has no link.'] } },
};

describe('ScreenerPanel', () => {
  it('shows the grade, where each requirement is, and asks about real gaps', () => {
    render(<ScreenerPanel report={REPORT} />);
    expect(screen.getByLabelText('Grade D')).toHaveTextContent('D');
    expect(screen.getByText('1 of 3 must-haves on the page')).toBeInTheDocument();
    expect(screen.getByText(/Shown in Backend Intern, Ledgerline/)).toBeInTheDocument();
    expect(screen.getByText(/Your original resume proves it/)).toBeInTheDocument();
    expect(screen.getByText(/Have you used Kubernetes\?/)).toBeInTheDocument();
    expect(screen.getByText(/Only in your skills list/)).toBeInTheDocument();
    expect(screen.getByText(/1 project has no link/)).toBeInTheDocument();
    expect(screen.getByText(/Show the ones you have in a job or project line/)).toBeInTheDocument();
  });

  it('has a clear empty state', () => {
    render(<ScreenerPanel report={null} />);
    expect(screen.getByText('No screener view yet')).toBeInTheDocument();
  });
});
