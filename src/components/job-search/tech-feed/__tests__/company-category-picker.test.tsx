/**
 * Categories come from the canonical facet, with counts.
 *
 * The filter used to accept any string. Anything outside the registry's
 * vocabulary matched nothing, silently, and the user got an empty page with a
 * chip that looked applied.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { CompanyCategoryPicker } from '@/components/job-search/tech-feed/CompanyCategoryPicker';

vi.mock('@/lib/api', () => ({
  apiService: { getTechFeedCompanyCategories: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;

const CATEGORIES = [
  { value: 'software_saas', label: 'Software Saas', employers: 138 },
  { value: 'fintech', label: 'Fintech', employers: 123 },
  { value: 'other', label: 'Not yet categorised', employers: 2475 },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.getTechFeedCompanyCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
});

describe('company category picker', () => {
  test('renders the canonical categories with their employer counts', async () => {
    render(<CompanyCategoryPicker values={[]} onChange={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Fintech 123/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Software Saas 138/ })).toBeInTheDocument();
  });

  test('`other` is shown LAST and named for what it is', async () => {
    render(<CompanyCategoryPicker values={[]} onChange={vi.fn()} />);
    const buttons = await screen.findAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveTextContent('Not yet categorised');
  });

  test('selecting toggles the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CompanyCategoryPicker values={[]} onChange={onChange} />);
    await user.click(await screen.findByRole('button', { name: /Fintech/ }));
    expect(onChange).toHaveBeenCalledWith(['fintech']);
  });

  test('an unavailable facet says so rather than rendering an empty list', async () => {
    api.getTechFeedCompanyCategories.mockResolvedValue({ error: 'down' });
    render(<CompanyCategoryPicker values={[]} onChange={vi.fn()} />);
    expect(await screen.findByText(/unavailable right now/i)).toBeInTheDocument();
  });

  test('an empty facet is distinguishable from a failed one', async () => {
    api.getTechFeedCompanyCategories.mockResolvedValue({ data: { categories: [] } });
    render(<CompanyCategoryPicker values={[]} onChange={vi.fn()} />);
    expect(await screen.findByText(/no employer categories have been recorded/i))
      .toBeInTheDocument();
  });
});
