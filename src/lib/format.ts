/**
 * Text formatting for scraped job data. Career-portal rows often arrive as
 * ALL CAPS or inconsistently cased ("SENIOR AWS DEVOPS ENGINEER"); these
 * helpers render them like a human would write them.
 */

// Tokens that have a canonical casing (acronyms, roman numerals, known brands).
const CANON: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  sre: 'SRE',
  us: 'US',
  usa: 'USA',
  uk: 'UK',
  eu: 'EU',
  h1b: 'H1B',
  h1: 'H1',
  ai: 'AI',
  ml: 'ML',
  qa: 'QA',
  ui: 'UI',
  ux: 'UX',
  ios: 'iOS',
  api: 'API',
  apis: 'APIs',
  sdk: 'SDK',
  devops: 'DevOps',
  mlops: 'MLOps',
  sql: 'SQL',
  nosql: 'NoSQL',
  etl: 'ETL',
  llm: 'LLM',
  nlp: 'NLP',
  hr: 'HR',
  it: 'IT',
  pm: 'PM',
  vp: 'VP',
  svp: 'SVP',
  cto: 'CTO',
  ceo: 'CEO',
  cfo: 'CFO',
  coo: 'COO',
  sde: 'SDE',
  saas: 'SaaS',
  paas: 'PaaS',
  iaas: 'IaaS',
  ci: 'CI',
  cd: 'CD',
  ts: 'TS',
  js: 'JS',
  css: 'CSS',
  html: 'HTML',
  php: 'PHP',
  ruby: 'Ruby',
  golang: 'Go',
  ii: 'II',
  iii: 'III',
  iv: 'IV',
  vi: 'VI',
  vii: 'VII',
  viii: 'VIII',
  ix: 'IX',
  k8s: 'K8s',
  gpu: 'GPU',
  cpu: 'CPU',
  ar: 'AR',
  vr: 'VR',
  xr: 'XR',
  b2b: 'B2B',
  b2c: 'B2C',
  crm: 'CRM',
  erp: 'ERP',
  rpa: 'RPA',
  bi: 'BI',
};

/** Fix a single token's casing (leaves separators/numbers untouched). */
function fixToken(tok: string): string {
  if (!tok) return tok;
  const lower = tok.toLowerCase();
  if (CANON[lower]) return CANON[lower];
  // No letters (numbers, punctuation) → leave as-is.
  if (!/[a-zA-Z]/.test(tok)) return tok;
  // 2-letter all-caps → likely a state/country code (TX, CA, NY, US) → keep.
  if (/^[A-Z]{2}$/.test(tok)) return tok;
  // Already intentionally mixed-case (PayPal, McKinsey, iPhone, DevOps) → keep.
  if (tok !== tok.toUpperCase() && tok !== tok.toLowerCase()) return tok;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Title-case a scraped string while preserving acronyms, state codes, and
 * already-branded casing. Splits on whitespace and on `/. , ( )` so
 * "UI/UX", "Full-Stack" and "Engineer, II" all read correctly.
 */
export function toTitleCase(input?: string | null): string {
  if (!input) return '';
  return input
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part)
        ? part
        : part
            .split(/([/\-.,()&])/)
            .map(fixToken)
            .join(''),
    )
    .join('')
    .trim();
}

/** Deterministic hue (0-359) from a string - for per-company color accents. */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Bare hostname from a URL (no protocol / www), or null. */
export function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
