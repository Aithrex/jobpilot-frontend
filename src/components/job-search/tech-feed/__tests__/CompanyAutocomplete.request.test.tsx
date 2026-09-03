import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CompanyAutocomplete } from '@/components/job-search/tech-feed/CompanyAutocomplete';

const search = vi.fn();
const request = vi.fn();

vi.mock('@/lib/api', () => ({
  apiService: {
    searchTechFeedCompanies: (...args: unknown[]) => search(...args),
    lookupTechFeedCompanies: async () => ({ data: { companies: [], unresolved: [] } }),
    requestTechFeedCompany: (...args: unknown[]) => request(...args),
  },
}));

describe('CompanyAutocomplete request flow', () => {
  beforeEach(() => {
    search.mockReset();
    request.mockReset();
    search.mockResolvedValue({ data: { companies: [] } });
    request.mockResolvedValue({ data: { request_id: 'creq_abc', status: 'submitted' } });
  });

  test('offers a request action when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CompanyAutocomplete values={[]} onChange={() => undefined} />);
    await user.type(screen.getByRole('combobox', { name: /search companies by name/i }), 'Zedcorp');
    expect(await screen.findByRole('button', { name: /request this company/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /request this company/i }));
    expect(screen.getByLabelText(/official careers url/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for review/i);
    expect(request).toHaveBeenCalled();
  });
});
