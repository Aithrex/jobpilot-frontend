/**
 * BaseResumePicker + banner: the user-facing half of per-job base selection.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { BaseResumePicker, AUTO_BASE } from '../BaseResumePicker';
import { BaseResumeUsedBanner } from '../BaseResumeUsedBanner';
import type { ResumeAssetRow } from '@/types/resume';

function row(over: Partial<ResumeAssetRow> & Pick<ResumeAssetRow, 'resume_id' | 'filename'>): ResumeAssetRow {
  return {
    uploaded_at: '2026-08-01T00:00:00Z',
    size_bytes: 1000,
    parse_status: 'parsed',
    is_active: false,
    ...over,
  };
}

describe('BaseResumePicker', () => {
  test('one parsed resume shows Using {filename} and no dropdown', () => {
    render(
      <BaseResumePicker
        resumes={[row({ resume_id: 'a', filename: 'only.pdf', is_active: true })]}
        value={AUTO_BASE}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/Using/)).toBeInTheDocument();
    expect(screen.getByText('only.pdf')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Base resume for this job/i)).not.toBeInTheDocument();
  });

  test('two parsed resumes default to best-match and can pin a file', async () => {
    const onChange = vi.fn();
    render(
      <BaseResumePicker
        resumes={[
          row({ resume_id: 'a', filename: 'backend.pdf', is_active: true }),
          row({ resume_id: 'b', filename: 'frontend.pdf' }),
        ]}
        value={AUTO_BASE}
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText(/Base resume for this job/i);
    expect(select).toHaveValue(AUTO_BASE);
    await userEvent.selectOptions(select, 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('pending resumes are not offered', () => {
    render(
      <BaseResumePicker
        resumes={[
          row({ resume_id: 'a', filename: 'ready.pdf', is_active: true }),
          row({ resume_id: 'p', filename: 'pending.pdf', parse_status: 'pending' }),
        ]}
        value={AUTO_BASE}
        onChange={() => {}}
      />,
    );
    // Only one parsed -> quiet Using line, no select.
    expect(screen.getByText('ready.pdf')).toBeInTheDocument();
    expect(screen.queryByText('pending.pdf')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Base resume for this job/i)).not.toBeInTheDocument();
  });
});

describe('BaseResumeUsedBanner', () => {
  test('names the file and auto-select score', () => {
    render(
      <BaseResumeUsedBanner
        selection={{
          resume_id: 'a',
          filename: 'backend.pdf',
          mode: 'auto',
          match_score: 82,
          reason: 'Best match for Senior Backend Engineer (82/100). Tailored from backend.pdf.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Tailored from backend.pdf');
    expect(screen.getByRole('status')).toHaveTextContent('82/100');
  });
});
