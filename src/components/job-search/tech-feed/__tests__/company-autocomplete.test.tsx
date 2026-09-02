/**
 * The company filter shows NAMES.
 *
 * It used to be a free-text chips input over `company_ids`, and the ids it
 * wanted were whichever slug the catalog handed the UI. A user typing
 * "Stripe" had no way to reach `emp_fd96667721fe`; a user who somehow had
 * that id could not tell what it named; and a saved filter rendered as hex
 * forever.
 *
 * The load-bearing assertions are the ones about what happens when the
 * lookup FAILS or returns nothing, because those are the paths where a filter
 * silently widens - and a filter that silently widens is worse than one that
 * errors.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { CompanyAutocomplete } from '@/components/job-search/tech-feed/CompanyAutocomplete';
import type { TechFeedCompany } from '@/types/techFeed';

vi.mock('@/lib/api', () => ({
  apiService: {
    searchTechFeedCompanies: vi.fn(),
    lookupTechFeedCompanies: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function company(over: Partial<TechFeedCompany> = {}): TechFeedCompany {
  return {
    employer_id: 'emp_fd96667721fe',
    display_name: 'Stripe',
    aliases: ['Stripe'],
    domain: 'stripe.com',
    categories: ['fintech'],
    cohorts: ['private_growth'],
    identity: {
      basis: 'domain',
      confidence: 0.95,
      operating_status: 'active',
      redirects_to: null,
    },
    career_source_verified: true,
    active_postings: 240,
    core_tech_postings: 180,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.searchTechFeedCompanies.mockResolvedValue({ data: { companies: [] } });
  api.lookupTechFeedCompanies.mockResolvedValue({ data: { companies: [], unresolved: [] } });
});

describe('company autocomplete', () => {
  test('typing a NAME offers the company and stores its canonical id', async () => {
    const user = userEvent.setup();
    api.searchTechFeedCompanies.mockResolvedValue({ data: { companies: [company()] } });
    const onChange = vi.fn();
    render(<CompanyAutocomplete values={[]} onChange={onChange} />);

    await user.type(screen.getByRole('combobox'), 'stri');
    const option = await screen.findByRole('option', { name: /Stripe/ });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(['emp_fd96667721fe']);
  });

  test('a stored id renders as its NAME, not as hex', async () => {
    api.lookupTechFeedCompanies.mockResolvedValue({
      data: { companies: [company()], unresolved: [] },
    });
    render(<CompanyAutocomplete values={['emp_fd96667721fe']} onChange={vi.fn()} />);
    expect(await screen.findByText('Stripe')).toBeInTheDocument();
    expect(screen.queryByText('emp_fd96667721fe')).not.toBeInTheDocument();
  });

  test('a filter saved before an acquisition names the employer that holds the jobs', async () => {
    api.lookupTechFeedCompanies.mockResolvedValue({
      data: {
        companies: [company({ requested_employer_id: 'emp_000000000001' })],
        unresolved: [],
      },
    });
    render(<CompanyAutocomplete values={['emp_000000000001']} onChange={vi.fn()} />);
    expect(await screen.findByText('Stripe')).toBeInTheDocument();
  });

  test('a LEGACY value is kept and flagged, never silently dropped', async () => {
    api.lookupTechFeedCompanies.mockResolvedValue({
      data: { companies: [], unresolved: ['stripe'] },
    });
    const onChange = vi.fn();
    render(<CompanyAutocomplete values={['stripe']} onChange={onChange} />);
    expect(await screen.findByText('stripe')).toBeInTheDocument();
    expect(await screen.findByText(/older company identifier/i)).toBeInTheDocument();
    // Silently widening the search is the failure mode a filter must not have.
    expect(onChange).not.toHaveBeenCalled();
  });

  test('a failed lookup leaves the chip in place rather than blanking it', async () => {
    api.lookupTechFeedCompanies.mockResolvedValue({ error: 'network down' });
    const onChange = vi.fn();
    render(<CompanyAutocomplete values={['emp_fd96667721fe']} onChange={onChange} />);
    expect(await screen.findByText('emp_fd96667721fe')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('a one-character query asks the server nothing', async () => {
    const user = userEvent.setup();
    render(<CompanyAutocomplete values={[]} onChange={vi.fn()} />);
    await user.type(screen.getByRole('combobox'), 'a');
    await waitFor(() => {
      expect(api.searchTechFeedCompanies).not.toHaveBeenCalled();
    });
  });

  test('the technology-only scope narrows the suggestions', async () => {
    const user = userEvent.setup();
    render(<CompanyAutocomplete values={[]} onChange={vi.fn()} technologyOnly />);
    await user.type(screen.getByRole('combobox'), 'micro');
    await waitFor(() => {
      expect(api.searchTechFeedCompanies).toHaveBeenCalledWith(
        'micro',
        expect.objectContaining({ technologyOnly: true }),
      );
    });
  });

  test('removing a chip removes exactly that id', async () => {
    const user = userEvent.setup();
    api.lookupTechFeedCompanies.mockResolvedValue({
      data: { companies: [company()], unresolved: [] },
    });
    const onChange = vi.fn();
    render(
      <CompanyAutocomplete values={['emp_fd96667721fe', 'other']} onChange={onChange} />,
    );
    await user.click(await screen.findByRole('button', { name: /Remove Stripe/i }));
    expect(onChange).toHaveBeenCalledWith(['other']);
  });
});
