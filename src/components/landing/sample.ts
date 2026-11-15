/**
 * The ONE set of sample data every product scene on the public site draws
 * from, so the hero board, the annotated role card, the tailoring sheet and
 * the pipeline all tell the same story about the same five roles.
 *
 * EVERYTHING HERE IS FICTIONAL, and the page says so beside each scene. The
 * rules the sample obeys:
 *
 *  - no real employer, so nothing implies a partnership we do not have;
 *  - scores sit in the same bands the product uses (`job-search/fitBands.ts`:
 *    80 strong, 65 good, 50 possible) and carry the product's own band words;
 *  - a score is never written as a percentage of anything;
 *  - every role states a gap as well as a fit, because the product does;
 *  - visa signals use the product's own chip wording (`JobVisaSignals`).
 */

/** A run of text, optionally marked as evidence found in the resume. */
export type Segment = string | { mark: string };

export type VisaSignal =
  | { kind: 'sponsors'; chip: string; detail: string }
  | { kind: 'refuses'; chip: string; detail: string }
  | { kind: 'note'; chip: string; detail: string }
  | { kind: 'none' };

export interface SampleRole {
  id: string;
  title: string;
  company: string;
  monogram: string;
  /** Deterministic identity hue for the monogram tile. */
  hue: number;
  location: string;
  posted: string;
  isNew: boolean;
  score: number;
  band: 'Strong match' | 'Good match' | 'Possible match';
  level: string;
  visa: VisaSignal;
  why: Segment[];
  gap: string;
  /** What the posting asks for, and whether the resume shows it. */
  asks: ReadonlyArray<{ label: string; met: boolean }>;
}

export const SAMPLE_ROLES: readonly SampleRole[] = [
  {
    id: 'harbor',
    title: 'Data Analyst',
    company: 'Harbor Analytics',
    monogram: 'H',
    hue: 228,
    location: 'Remote, US',
    posted: '3 hours ago',
    isNew: true,
    score: 86,
    band: 'Strong match',
    level: 'Entry level',
    visa: {
      kind: 'sponsors',
      chip: 'Sponsors H-1B',
      detail: 'Public filings show approvals in similar roles. The data year is shown with the count.',
    },
    why: [
      'Your ',
      { mark: 'SQL' },
      ' and ',
      { mark: 'Tableau reporting' },
      ' work covers most of what this posting asks for.',
    ],
    gap: 'One listed tool, dbt, is not in your resume.',
    asks: [
      { label: 'SQL', met: true },
      { label: 'Tableau', met: true },
      { label: 'Reporting to stakeholders', met: true },
      { label: 'dbt', met: false },
    ],
  },
  {
    id: 'lumen',
    title: 'Product Analyst',
    company: 'Lumen Labs',
    monogram: 'L',
    hue: 262,
    location: 'Austin, TX',
    posted: '5 hours ago',
    isNew: true,
    score: 78,
    band: 'Good match',
    level: 'Mid level',
    visa: {
      kind: 'note',
      chip: 'E-Verify',
      detail: 'The posting names E-Verify, which matters for a STEM OPT extension.',
    },
    why: [
      'Your ',
      { mark: 'experiment analysis' },
      ' and ',
      { mark: 'funnel reporting' },
      ' match the core of this role.',
    ],
    gap: 'It asks for two years on a product team. Your resume shows one.',
    asks: [
      { label: 'Experiment analysis', met: true },
      { label: 'Funnel reporting', met: true },
      { label: 'SQL', met: true },
      { label: 'Two years on a product team', met: false },
    ],
  },
  {
    id: 'corvid',
    title: 'BI Engineer',
    company: 'Corvid Systems',
    monogram: 'C',
    hue: 18,
    location: 'New York, NY',
    posted: 'Yesterday',
    isNew: false,
    score: 71,
    band: 'Good match',
    level: 'Entry level',
    visa: {
      kind: 'refuses',
      chip: 'Posting says no sponsorship',
      detail: 'The posting rules sponsorship out in its own words, so it is flagged before you spend an evening on it.',
    },
    why: [
      'Your ',
      { mark: 'Tableau reporting' },
      ' and ',
      { mark: 'SQL joins' },
      ' line up with the day to day work.',
    ],
    gap: 'It expects production Python. Your resume shows none.',
    asks: [
      { label: 'Tableau reporting', met: true },
      { label: 'SQL joins', met: true },
      { label: 'Reporting to stakeholders', met: true },
      { label: 'Production Python', met: false },
    ],
  },
  {
    id: 'fernhill',
    title: 'Analytics Engineer',
    company: 'Fernhill Health',
    monogram: 'F',
    hue: 158,
    location: 'Remote, US',
    posted: '2 days ago',
    isNew: false,
    score: 64,
    band: 'Possible match',
    level: 'Mid level',
    visa: {
      kind: 'sponsors',
      chip: 'Sponsors H-1B',
      detail: 'Public filings show approvals for this employer.',
    },
    why: ['Your ', { mark: 'SQL' }, ' is a fit, but most of this role is pipeline work.'],
    gap: 'Airflow and dbt are both required and neither is in your resume.',
    asks: [
      { label: 'SQL', met: true },
      { label: 'Data modelling', met: true },
      { label: 'Airflow', met: false },
      { label: 'dbt', met: false },
    ],
  },
  {
    id: 'parallel',
    title: 'Operations Analyst',
    company: 'Parallel Freight',
    monogram: 'P',
    hue: 200,
    location: 'Chicago, IL',
    posted: '3 days ago',
    isNew: false,
    score: 58,
    band: 'Possible match',
    level: 'Entry level',
    visa: { kind: 'none' },
    why: ['Your ', { mark: 'reporting' }, ' experience transfers, in a different domain.'],
    gap: 'It asks for logistics experience you do not show.',
    asks: [
      { label: 'Reporting', met: true },
      { label: 'Excel modelling', met: true },
      { label: 'Logistics experience', met: false },
      { label: 'Carrier systems', met: false },
    ],
  },
] as const;

/**
 * THE SAMPLE RESUME. One short excerpt that every scene reads from: the tour
 * reads it, the board matches against it, tailoring reorders it and the guard
 * refuses to change it. Each line names the phrases a posting might ask for.
 */
export interface ResumeLine {
  id: string;
  text: Segment[];
}

export const RESUME_HEADER = {
  title: 'Analyst Intern',
  employer: 'Brightwater Co-op',
  dates: 'Jun 2025 to Aug 2025',
} as const;

export const RESUME_LINES: readonly ResumeLine[] = [
  {
    id: 'tableau',
    text: ['Built weekly sales ', { mark: 'reports in Tableau' }, ' for a team of 12.'],
  },
  {
    id: 'sql',
    text: [
      'Wrote ',
      { mark: 'SQL queries' },
      ' to clean and ',
      { mark: 'join order data' },
      ' from three sources.',
    ],
  },
  {
    id: 'abtest',
    text: [
      'Ran an ',
      { mark: 'A/B test' },
      ' on checkout copy and reported the ',
      { mark: 'funnel impact' },
      '.',
    ],
  },
  {
    id: 'present',
    text: [{ mark: 'Presented findings' }, ' to store managers each month.'],
  },
] as const;

/** What the product reads out of that excerpt. */
export const RESUME_READ = [
  { label: 'Role', values: ['Analyst'] },
  { label: 'Level', values: ['Entry level'] },
  { label: 'Skills', values: ['SQL', 'Tableau', 'A/B testing', 'Reporting'] },
] as const;

/**
 * How tailoring treats the excerpt for each sample role: which lines move to
 * the top, and which phrases are marked. NOTHING ELSE. There is no field here
 * for new wording, because tailoring moves emphasis and never facts.
 */
export const TAILOR_PLAN: Record<string, { lead: readonly string[]; marks: readonly string[] }> = {
  harbor: { lead: ['sql', 'tableau'], marks: ['SQL queries', 'reports in Tableau', 'Presented findings'] },
  lumen: { lead: ['abtest', 'sql'], marks: ['A/B test', 'funnel impact', 'SQL queries'] },
  corvid: { lead: ['sql', 'tableau'], marks: ['join order data', 'reports in Tableau'] },
  fernhill: { lead: ['sql'], marks: ['SQL queries', 'join order data'] },
  parallel: { lead: ['present', 'tableau'], marks: ['Presented findings', 'reports in Tableau'] },
};

/** The excerpt's lines in tailored order for a role. Same lines, new order. */
export function tailoredOrder(roleId: string): string[] {
  const lead = TAILOR_PLAN[roleId]?.lead ?? [];
  const rest = RESUME_LINES.map((l) => l.id).filter((id) => !lead.includes(id));
  return [...lead, ...rest];
}

/** How many roles the sample board says arrived since yesterday. */
export const SAMPLE_NEW_COUNT = 14;

/** Shown beside every scene that uses this data. */
export const SAMPLE_NOTE = 'Sample data. The employers and roles are fictional.';
