/**
 * The tech feed panel: request contract, honest states, facets, a11y.
 *
 * The load-bearing assertions here are the HONESTY ones. A posting whose pay
 * or publish date the index could not read must render as unknown - never as a
 * plausible-looking number or date.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TechFeedPanel } from '@/components/job-search/tech-feed/TechFeedPanel';
import {
  TECH_FEED_TAXONOMY,
  makeTechFeedJob,
  makeTechFeedResponse,
} from '@/test/techFeedFixtures';

vi.mock('@/lib/api', () => ({
  apiService: {
    searchTechFeed: vi.fn(),
    getTechFeedTaxonomy: vi.fn(),
    getTechFeedCoverage: vi.fn(),
    getWorkdayCatalog: vi.fn(),
    getTechFeedFeedback: vi.fn(),
    recordTechFeedFeedback: vi.fn(),
    undoTechFeedFeedback: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function renderPanel(entry = '/app/jobs/portals') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <TechFeedPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastSearchBody(): Record<string, unknown> {
  const calls = api.searchTechFeed.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  api.getTechFeedTaxonomy.mockResolvedValue({ data: TECH_FEED_TAXONOMY, status: 200 });
  api.getWorkdayCatalog.mockResolvedValue({ data: { total: 0, industries: [] }, status: 200 });
  api.searchTechFeed.mockResolvedValue({ data: makeTechFeedResponse(), status: 200 });
  api.getTechFeedFeedback.mockResolvedValue({
    data: { job_ids: [], dedupe_group_ids: [], employer_ids: [], updated_at: null },
    status: 200,
  });
  api.recordTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
  api.undoTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
});

describe('TechFeedPanel request contract', () => {
  test('the first page sends the default filters plus page size and personalization', async () => {
    renderPanel();
    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());

    expect(lastSearchBody()).toEqual({
      tech_scope: ['core'],
      posted_within_days: 30,
      page_size: 25,
      personalize: true,
    });
    // The signal is forwarded so a stale search can be cancelled.
    expect(api.searchTechFeed.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test('filters arriving in the URL are sent on the wire', async () => {
    renderPanel('/app/jobs/portals?q=golang&seniority=staff&unknown_salary=0&min_salary=180000');
    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());

    expect(lastSearchBody()).toMatchObject({
      query: 'golang',
      seniority: ['staff'],
      include_unknown_salary: false,
      min_salary: 180000,
    });
  });

  test('turning off "include jobs without published salary" changes the request', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());

    await user.click(
      screen.getByRole('switch', { name: 'Include jobs without published salary' }),
    );

    await waitFor(() => expect(lastSearchBody()).toMatchObject({ include_unknown_salary: false }));
  });

  test('picking a role family from the tree filters the request', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());

    const tree = await screen.findByRole('tree', { name: /role families/i });
    await user.click(within(tree).getByText('Software engineering'));

    await waitFor(() =>
      expect(lastSearchBody()).toMatchObject({ role_families: ['software_engineering'] }),
    );
  });

  test('sorting is part of the request, not a client-side reshuffle', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Newest' }));
    await waitFor(() => expect(lastSearchBody()).toMatchObject({ sort: 'newest' }));
  });
});

describe('TechFeedPanel unknown data is never invented', () => {
  test('an unpublished salary says so instead of showing a number', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [
          makeTechFeedJob({
            job_id: 'no-pay',
            salary: {
              min_annual: null,
              max_annual: null,
              currency: null,
              interval: null,
              display: null,
              confidence: null,
              published: false,
            },
          }),
        ],
      }),
      status: 200,
    });

    renderPanel();

    const salary = await screen.findByTestId('tech-feed-salary');
    expect(salary).toHaveTextContent('Salary not published');
    expect(salary.textContent).not.toMatch(/\d/);
  });

  test('an unknown posting date falls back to first-seen and says the date is unknown', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [
          makeTechFeedJob({
            job_id: 'no-date',
            posted_at: null,
            posted_at_confidence: 'unknown',
            days_ago: null,
            first_seen_days_ago: 12,
          }),
        ],
      }),
      status: 200,
    });

    renderPanel();

    const posted = await screen.findByTestId('tech-feed-posted');
    expect(posted).toHaveTextContent('First seen 12 days ago');
    expect(posted).toHaveTextContent('Posting date not stated by the employer.');
    expect(posted.textContent).not.toMatch(/^Posted /);
  });

  test('a relative posting age is hedged, not rendered as a date', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [
          makeTechFeedJob({
            job_id: 'relative',
            posted_at: null,
            posted_at_confidence: 'relative',
            days_ago: 3,
          }),
        ],
      }),
      status: 200,
    });

    renderPanel();

    const posted = await screen.findByTestId('tech-feed-posted');
    expect(posted).toHaveTextContent('Posted about 3 days ago');
    expect(posted).toHaveTextContent('The source gave a relative age, not a date.');
  });

  test('missing sponsorship data reads as "not stated"', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [makeTechFeedJob({ job_id: 'no-sponsor', sponsorship: null })],
      }),
      status: 200,
    });

    renderPanel();
    expect(await screen.findByTestId('tech-feed-sponsorship')).toHaveTextContent(
      'Sponsorship not stated',
    );
  });

  test('hard constraint mismatches render as "Important unknowns", not rejections', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [
          makeTechFeedJob({
            job_id: 'unknowns',
            hard_constraint_mismatches: ['Work authorization requirements were not stated'],
          }),
        ],
      }),
      status: 200,
    });

    renderPanel();
    const unknowns = await screen.findByTestId('tech-feed-unknowns');
    expect(unknowns).toHaveTextContent('Important unknowns');
    expect(unknowns).toHaveTextContent('Work authorization requirements were not stated');
  });

  test('provenance and duplicate variants are on the face of the card', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        jobs: [
          makeTechFeedJob({
            job_id: 'variants',
            employer_kind: 'staffing',
            source: 'lever',
            ats: 'lever',
            location_variants: [
              { location: 'Denver, CO', job_id: 'v1', url: 'https://x/1' },
              { location: 'Remote', job_id: 'v2', url: 'https://x/2' },
              { location: 'Boston, MA', job_id: 'v3', url: 'https://x/3' },
            ],
            source_variants: [
              {
                job_id: 'v4',
                source: 'greenhouse',
                ats: 'greenhouse',
                location: 'Remote',
                url: 'https://x/4',
                days_ago: 2,
              },
            ],
          }),
        ],
      }),
      status: 200,
    });

    renderPanel();

    const provenance = await screen.findByTestId('tech-feed-provenance');
    expect(provenance).toHaveTextContent('Staffing agency');
    expect(provenance).toHaveTextContent('Via Lever');

    const variants = screen.getByTestId('tech-feed-variants');
    expect(variants).toHaveTextContent('Also in 3 other locations');
    expect(variants).toHaveTextContent('Also on Greenhouse');
  });
});

describe('TechFeedPanel states', () => {
  test('loading shows skeletons, not an empty result claim', async () => {
    api.searchTechFeed.mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(await screen.findByTestId('tech-feed-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('tech-feed-empty')).not.toBeInTheDocument();
  });

  test('a stale source and a dead ingest heartbeat are visible, not hidden', async () => {
    const user = userEvent.setup();
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        warnings: ['Two shards timed out; results are partial.'],
        source_health: {
          sources: [
            {
              source: 'greenhouse',
              shards: 4,
              last_success_at: '2026-08-29T00:00:00Z',
              crawl_lag_minutes: 2880,
              stale: true,
              retry_count: 3,
            },
          ],
          ingest_runner: { last_heartbeat_at: '2026-08-28T00:00:00Z', healthy: false },
          warnings: [],
        },
      }),
      status: 200,
    });

    renderPanel();

    const banner = await screen.findByTestId('tech-feed-health-banner');
    expect(banner).toHaveTextContent('These results may be incomplete');

    await user.click(within(banner).getByRole('button', { name: /why/i }));
    expect(await screen.findByTestId('tech-feed-ingest-down')).toHaveTextContent(
      /has not checked in/i,
    );
    expect(screen.getByTestId('tech-feed-stale-sources')).toHaveTextContent('greenhouse');
    expect(banner).toHaveTextContent('Two shards timed out; results are partial.');
  });

  test('a healthy index does not shout', async () => {
    renderPanel();
    const banner = await screen.findByTestId('tech-feed-health-banner');
    expect(banner).toHaveTextContent('Index is up to date');
    expect(banner).not.toHaveAttribute('role', 'alert');
  });

  test('zero results offer one-click broadening derived from the set filters', async () => {
    const user = userEvent.setup();
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({ jobs: [], total: 0 }),
      status: 200,
    });

    renderPanel('/app/jobs/portals?unknown_salary=0&min_salary=250000');

    const empty = await screen.findByTestId('tech-feed-empty');
    expect(empty).toHaveTextContent('No jobs match these filters');
    expect(within(empty).getByRole('button', { name: 'Widen to 90 days' })).toBeInTheDocument();
    expect(
      within(empty).getByRole('button', { name: 'Include adjacent technical roles' }),
    ).toBeInTheDocument();
    expect(
      within(empty).getByRole('button', { name: 'Include jobs without published salary' }),
    ).toBeInTheDocument();

    await user.click(within(empty).getByRole('button', { name: 'Remove the salary floor' }));
    await waitFor(() => expect(lastSearchBody()).not.toHaveProperty('min_salary'));
  });

  test('a failed search reports the failure and offers a retry', async () => {
    const user = userEvent.setup();
    api.searchTechFeed.mockResolvedValue({ error: 'Service unavailable', status: 503 });

    renderPanel();

    const alert = await screen.findByTestId('tech-feed-error');
    expect(alert).toHaveTextContent('Service unavailable');

    api.searchTechFeed.mockResolvedValue({ data: makeTechFeedResponse(), status: 200 });
    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('tech-feed-job-card')).toBeInTheDocument();
  });

  test('a 403 upgrade_required surfaces as a real message, not a silent empty feed', async () => {
    api.searchTechFeed.mockResolvedValue({
      error: 'upgrade_required',
      status: 403,
      errorPayload: { error: 'upgrade_required' },
    });

    renderPanel();
    expect(await screen.findByTestId('tech-feed-error')).toHaveTextContent('upgrade_required');
  });
});

describe('TechFeedPanel facets', () => {
  test('facet counts are clickable filters', async () => {
    const user = userEvent.setup();
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        facets: {
          seniority: [
            { value: 'staff', count: 12 },
            { value: 'senior', count: 40 },
          ],
          ats: [{ value: 'greenhouse', count: 55 }],
        },
      }),
      status: 200,
    });

    renderPanel();

    const facets = await screen.findByTestId('tech-feed-facets');
    const staff = within(facets).getByRole('button', { name: 'Staff, 12 postings' });
    expect(staff).toHaveAttribute('aria-pressed', 'false');

    await user.click(staff);
    await waitFor(() => expect(lastSearchBody()).toMatchObject({ seniority: ['staff'] }));
  });

  test('a facet with no request field is a count, not a fake control', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({ facets: { ats: [{ value: 'greenhouse', count: 55 }] } }),
      status: 200,
    });

    renderPanel();
    const facets = await screen.findByTestId('tech-feed-facets');
    expect(within(facets).queryByRole('button', { name: /Greenhouse/ })).not.toBeInTheDocument();
    expect(facets).toHaveTextContent('Greenhouse');
  });
});

describe('TechFeedPanel not-interested feedback', () => {
  test('a dismissal with a reason hides the card, posts it, and caches it', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Not interested' }));

    await waitFor(() => expect(screen.queryByTestId('tech-feed-job-card')).not.toBeInTheDocument());

    // The server is the source of truth; localStorage is the cache under it.
    expect(api.recordTechFeedFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: 'job-1', reason: 'not_interested' }),
    );
    const stored = JSON.parse(
      window.localStorage.getItem('aspirely.techFeed.notInterested') || '[]',
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ job_id: 'job-1', reason: 'not_interested' });
  });
});

describe('TechFeedPanel accessibility', () => {
  test('the result count is announced politely', async () => {
    renderPanel();
    const status = await screen.findByTestId('tech-feed-result-count');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('role', 'status');
    await waitFor(() => expect(status).toHaveTextContent('1 job matches these filters'));
  });

  test('the role tree exposes tree semantics and is keyboard navigable', async () => {
    const user = userEvent.setup();
    renderPanel();

    const tree = await screen.findByRole('tree', { name: /role families/i });
    expect(tree).toHaveAttribute('aria-multiselectable', 'true');

    const items = within(tree).getAllByRole('treeitem');
    expect(items[0]).toHaveAttribute('aria-level', '1');
    expect(items[0]).toHaveAttribute('aria-expanded', 'false');
    expect(items[0]).toHaveAttribute('tabindex', '0');

    items[0].focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(within(tree).getAllByRole('treeitem')[0]).toHaveAttribute('aria-expanded', 'true'),
    );

    const expanded = within(tree).getAllByRole('treeitem');
    expect(expanded[1]).toHaveAttribute('aria-level', '2');

    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    await waitFor(() => expect(lastSearchBody()).toMatchObject({ role_specialties: ['backend'] }));
  });

  test('facet toggles carry pressed state and results are a labelled list', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({ facets: { work_mode: [{ value: 'remote', count: 9 }] } }),
      status: 200,
    });
    renderPanel();

    expect(await screen.findByRole('list', { name: 'Search results' })).toBeInTheDocument();
    const facets = screen.getByTestId('tech-feed-facets');
    expect(within(facets).getByRole('button', { name: 'Remote, 9 postings' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('the mobile filter rail opens as a labelled sheet', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByTestId('tech-feed-job-card');

    await user.click(screen.getByRole('button', { name: /^Filters/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(dialog).getByTestId('tech-feed-filters')).toBeInTheDocument();
  });
});

describe('a filter the server did not apply is not shown as applied', () => {
  test('an unapplied filter is pulled out of "Server applied" and labelled', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        applied_filters: { tech_scope: ['core'], radius_km: 50 },
        unapplied_filters: [
          { filter: 'radius_km', reason: 'needs geocoded coordinates' },
        ],
      }),
      status: 200,
    });
    renderPanel();

    const unapplied = await screen.findByTestId('tech-feed-unapplied-filters');
    expect(within(unapplied).getByText('radius km')).toBeInTheDocument();
    expect(within(unapplied).getByTitle('needs geocoded coordinates')).toBeInTheDocument();

    // and it must NOT also appear in the applied row, which is the whole point
    const applied = screen.getByTestId('tech-feed-applied-filters');
    expect(within(applied).queryByText(/radius km: 50/)).not.toBeInTheDocument();
  });

  test('no unapplied filters means no "Not applied" row at all', async () => {
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({ applied_filters: { tech_scope: ['core'] } }),
      status: 200,
    });
    renderPanel();

    await screen.findByTestId('tech-feed-applied-filters');
    expect(screen.queryByTestId('tech-feed-unapplied-filters')).not.toBeInTheDocument();
  });

  test('a PARTIAL filter keeps its applied chip and gains a caveat', async () => {
    // A partial filter did narrow the results. Moving it to "Not applied"
    // would replace one wrong claim with the opposite one.
    api.searchTechFeed.mockResolvedValue({
      data: makeTechFeedResponse({
        applied_filters: { tech_scope: ['core'], employment_types: ['contract'] },
        unapplied_filters: [
          {
            filter: 'employment_types',
            reason: 'the rest are kept, not excluded',
            status: 'partial',
          },
        ],
      }),
      status: 200,
    });
    renderPanel();

    const applied = await screen.findByTestId('tech-feed-applied-filters');
    expect(within(applied).getByTitle('the rest are kept, not excluded')).toBeInTheDocument();
    expect(screen.queryByTestId('tech-feed-unapplied-filters')).not.toBeInTheDocument();
    expect(screen.getByTestId('tech-feed-partial-filters')).toBeInTheDocument();
  });

  test('a response from an older backend, with no field at all, still renders', async () => {
    const body = makeTechFeedResponse({ applied_filters: { tech_scope: ['core'] } });
    delete (body as { unapplied_filters?: unknown }).unapplied_filters;
    api.searchTechFeed.mockResolvedValue({ data: body, status: 200 });
    renderPanel();

    await screen.findByTestId('tech-feed-applied-filters');
    expect(screen.queryByTestId('tech-feed-unapplied-filters')).not.toBeInTheDocument();
  });
});

describe('the coverage banner does not promise coverage it does not have', () => {
  test('it reports owner-verified career pages, not endpoints that answered', async () => {
    renderPanel();
    const badge = await screen.findByTestId('tech-feed-owner-verified');
    expect(badge).toHaveTextContent('1,092 career pages owner-verified');
  });

  test('a backend that sends no owner-verified figure shows no claim', async () => {
    const body = makeTechFeedResponse();
    delete (body.coverage as { owner_verified_sources?: number }).owner_verified_sources;
    api.searchTechFeed.mockResolvedValue({ data: body, status: 200 });
    renderPanel();

    await waitFor(() => expect(api.searchTechFeed).toHaveBeenCalled());
    expect(screen.queryByTestId('tech-feed-owner-verified')).not.toBeInTheDocument();
  });

  test('employers is phrased as the ones we hold postings FROM', async () => {
    // It used to read "across N employers" where N was every company ever
    // harvested (~80,000). We do not have postings across 80,000 employers.
    renderPanel();
    expect(await screen.findByText(/active postings from/)).toBeInTheDocument();
  });
});
