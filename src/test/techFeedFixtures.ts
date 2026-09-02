/**
 * Tech feed test fixtures.
 *
 * Shaped to the real contract, including the parts the UI has to be honest
 * about: unpublished salary, unknown posting dates, variants and unknowns.
 */
import type {
  TechFeedJob,
  TechFeedSearchResponse,
  TechFeedTaxonomy,
} from '@/types/techFeed';

export function makeTechFeedJob(overrides: Partial<TechFeedJob> = {}): TechFeedJob {
  return {
    job_id: 'job-1',
    dedupe_group_id: 'group-1',
    employer_id: 'emp-1',
    employer_name: 'Northwind Systems',
    employer_tech_classification: 'software',
    employer_tech_evidence: [],
    employer_kind: 'direct_employer',
    title_raw: 'Sr. Backend Engineer (Platform)',
    normalized_title: 'Senior Backend Engineer',
    tech_scope: 'core',
    role_family: 'software_engineering',
    role_families: ['software_engineering'],
    role_specialties: ['backend'],
    occupation_codes: ['15-1252'],
    taxonomy_version: 'tax-2026.03',
    classification_confidence: 0.94,
    classification_evidence: [],
    skills_required: ['Go', 'PostgreSQL'],
    skills_preferred: ['Kubernetes'],
    seniority: 'senior',
    required_years_min: 5,
    required_years_max: 9,
    work_mode: 'remote',
    locations: [{ raw: 'Austin, TX', city: 'Austin', region: 'TX', country: 'US' }],
    remote_eligibility: 'United States',
    employment_type: 'full_time',
    salary: {
      min_annual: 170000,
      max_annual: 210000,
      currency: 'USD',
      interval: 'year',
      display: 'USD 170,000 - 210,000',
      confidence: 'high',
      published: true,
    },
    sponsorship: 'available',
    clearance_required: false,
    source: 'greenhouse',
    ats: 'greenhouse',
    source_requisition_id: 'req-9',
    canonical_url: 'https://example.com/jobs/1',
    apply_url: 'https://example.com/jobs/1/apply',
    direct_apply: true,
    posted_at: '2026-08-20T00:00:00Z',
    posted_at_confidence: 'exact',
    days_ago: 4,
    first_seen_at: '2026-08-20T00:00:00Z',
    first_seen_days_ago: 4,
    last_seen_at: '2026-08-30T00:00:00Z',
    last_verified_at: '2026-08-30T00:00:00Z',
    valid_through: null,
    match_score: 88,
    fit_score_version: 'fit-3',
    fit: null,
    rank_score: 0.91,
    why_matched: ['Go and PostgreSQL are on your resume'],
    hard_constraint_mismatches: [],
    source_variants: [],
    location_variants: [],
    duplicate_count: 0,
    ...overrides,
  };
}

export function makeTechFeedResponse(
  overrides: Partial<TechFeedSearchResponse> = {},
): TechFeedSearchResponse {
  return {
    search_id: 'search-1',
    jobs: [makeTechFeedJob()],
    next_cursor: null,
    has_more: false,
    total: 1,
    facets: {},
    applied_filters: {},
    taxonomy_version: 'tax-2026.03',
    fit_score_version: 'fit-3',
    feed_version: 'feed-1',
    inventory_watermark: '2026-08-31T06:00:00Z',
    coverage: {
      as_of: '2026-08-31T06:00:00Z',
      active_postings: 412_000,
      responding_endpoints: 8_100,
      owner_verified_sources: 1_092,
      harvested_companies: 80_400,
      known_employers: 21_400,
    },
    source_health: {
      sources: [],
      ingest_runner: { last_heartbeat_at: '2026-08-31T05:55:00Z', minutes_ago: 5, healthy: true },
      warnings: [],
    },
    warnings: [],
    diagnostics: {},
    ...overrides,
  };
}

export const TECH_FEED_TAXONOMY: TechFeedTaxonomy = {
  taxonomy_version: 'tax-2026.03',
  scopes: ['core', 'adjacent'],
  families: [
    {
      key: 'software_engineering',
      label: 'Software engineering',
      scope: 'core',
      specialties: [
        { key: 'backend', label: 'Backend', occupation_codes: ['15-1252'] },
        { key: 'frontend', label: 'Frontend', occupation_codes: ['15-1254'] },
      ],
    },
    {
      key: 'data',
      label: 'Data and analytics',
      scope: 'core',
      specialties: [{ key: 'data_engineering', label: 'Data engineering', occupation_codes: [] }],
    },
  ],
};
