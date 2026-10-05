import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TailoredPage from '../TailoredPage';
import { apiService } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiService: {
  getTailoringHistoryPage: vi.fn(), listTailoringRecords: vi.fn(), getTailoringRecord: vi.fn(),
} }));
vi.mock('@/components/resume/ResumeDashboard', () => ({ formatDate: (date: string) => date }));

const getPage = vi.mocked(apiService.getTailoringHistoryPage);
const record = (id: string) => ({
  record_id: id, user_email: 'owner@example.com', created_at: '2026-01-01T00:00:00Z',
  jd_analysis: { job_title: `Engineer ${id}`, company: 'Acme', required_skills: ['Python'] },
  versions: [],
});
const result = (ids: string[], next: string | null = null, total = 500) => ({ data: {
  records: ids.map(record), total, next_cursor: next,
  summary: { total: 500, presets: { week: 12, month: 50, highAts: 80, needsWork: 3, multiVersion: 9, offers: 2, interviewing: 4, pending: 1 } },
} });
const mount = () => render(<MemoryRouter><TailoredPage /></MemoryRouter>);

beforeEach(() => {
  vi.resetAllMocks();
  getPage.mockResolvedValue(result(['first'], 'cursor-1'));
});

describe('on-demand tailored history', () => {
  test('loads one page, shows server counts, and waits for Load more', async () => {
    mount();
    await screen.findByText('Engineer first · Acme');
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(apiService.listTailoringRecords).not.toHaveBeenCalled();
    expect(screen.getByText('500 matching sessions · 1 loaded')).toBeInTheDocument();
    getPage.mockResolvedValueOnce(result(['second']));
    fireEvent.click(screen.getByRole('button', { name: 'Load more resumes' }));
    await screen.findByText('Engineer second · Acme');
    expect(screen.getByText('Engineer first · Acme')).toBeInTheDocument();
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-1' }));
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Load more resumes' })).toBeNull();
  });

  test('searches remotely, replaces loaded pages and retains filters on zero matches', async () => {
    mount();
    await screen.findByText('Engineer first · Acme');
    getPage.mockResolvedValueOnce(result(['outside-first-page'], null, 1));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search tailored resumes' }), { target: { value: 'Rust' } });
    await screen.findByText('Engineer outside-first-page · Acme');
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Rust' }));
    expect(getPage.mock.lastCall?.[0]).not.toHaveProperty('cursor');
    expect(screen.queryByText('Engineer first · Acme')).toBeNull();
    getPage.mockResolvedValueOnce(result([], null, 0));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search tailored resumes' }), { target: { value: 'missing' } });
    await screen.findByText('No matches for the current filters.');
    expect(screen.getByRole('textbox', { name: 'Search tailored resumes' })).toHaveValue('missing');
    expect(screen.queryByText('No tailored resumes yet')).toBeNull();
  });

  test('sends company, sort and preset filters to the server', async () => {
    mount();
    await screen.findByText('Engineer first · Acme');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Remote Corp' } });
    await waitFor(() => expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ company: 'Remote Corp' })));
    fireEvent.click(screen.getByRole('button', { name: 'Oldest' }));
    await waitFor(() => expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'oldest' })));
    fireEvent.click(screen.getByRole('button', { name: /Needs work 3/ }));
    await waitFor(() => expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ preset: 'needsWork', sort: 'ats' })));
  });

  test('a failed later page keeps existing rows and retries the same cursor', async () => {
    mount();
    await screen.findByText('Engineer first · Acme');
    getPage.mockResolvedValueOnce({ error: 'Temporarily unavailable' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more resumes' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Engineer first · Acme')).toBeInTheDocument();
    getPage.mockResolvedValueOnce(result(['second']));
    fireEvent.click(screen.getByRole('button', { name: 'Try loading more again' }));
    await screen.findByText('Engineer second · Acme');
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-1' }));
  });

  test('ignores a stale first-page response after filters change', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void;
    getPage.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    mount();
    getPage.mockResolvedValueOnce(result(['new'], null, 1));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search tailored resumes' }), { target: { value: 'new' } });
    await screen.findByText('Engineer new · Acme');
    await act(async () => resolveOld(result(['obsolete'])));
    expect(screen.queryByText('Engineer obsolete · Acme')).toBeNull();
    expect(screen.getByText('Engineer new · Acme')).toBeInTheDocument();
  });

  test('ignores an old Load more response after changing filters', async () => {
    mount();
    await screen.findByText('Engineer first · Acme');
    let resolveMore!: (value: ReturnType<typeof result>) => void;
    getPage.mockReturnValueOnce(new Promise(resolve => { resolveMore = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Load more resumes' }));
    getPage.mockResolvedValueOnce(result(['filtered'], null, 1));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search tailored resumes' }), { target: { value: 'filtered' } });
    await screen.findByText('Engineer filtered · Acme');
    await act(async () => resolveMore(result(['obsolete'])));
    expect(screen.queryByText('Engineer obsolete · Acme')).toBeNull();
    expect(screen.queryByText('Engineer first · Acme')).toBeNull();
  });
});
