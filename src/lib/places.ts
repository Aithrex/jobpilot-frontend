/**
 * Places a job seeker can pick, and the one rule that says whether a posting
 * is in the picked place.
 *
 * Why it lives in the browser: the For-you board is built and stored on the
 * server for the whole country, and the server never narrowed it by state or
 * city (the `location` it was sent was not read). Filtering the stored board
 * here makes a pick instant and keeps the stored board reusable.
 *
 * Postings write places every way there is ("Toronto, ON", "Bengaluru,
 * Karnataka, India", "GB - Edinburgh", "Remote, US"). The rule reads the
 * posting's ISO country when the board knew it, then names, codes and big
 * cities. Ambiguous city names (Dublin, Cambridge, London) never decide a
 * country on their own when the line also names a US state.
 */

export interface Region {
  name: string;
  /** Short forms a posting may use ("ON", "NSW"). Matched as whole words. */
  codes?: string[];
}

export interface Country {
  code: string;
  name: string;
  /** Other names a posting may use. */
  aliases: string[];
  /** Cities that place a posting in this country without naming it. */
  cities: string[];
  /** What the second picker is called ("State", "Province"). */
  regionLabel: string;
  regions: Region[];
}

const r = (name: string, ...codes: string[]): Region => ({ name, codes });

export const ANYWHERE = 'ANY';

export const COUNTRIES: Country[] = [
  {
    code: 'US', name: 'United States', aliases: ['united states', 'usa', 'u.s.', 'us'], cities: [], regionLabel: 'State',
    regions: [
      r('Alabama', 'AL'), r('Alaska', 'AK'), r('Arizona', 'AZ'), r('Arkansas', 'AR'), r('California', 'CA'),
      r('Colorado', 'CO'), r('Connecticut', 'CT'), r('Delaware', 'DE'), r('District of Columbia', 'DC'),
      r('Florida', 'FL'), r('Georgia', 'GA'), r('Hawaii', 'HI'), r('Idaho', 'ID'), r('Illinois', 'IL'),
      r('Indiana', 'IN'), r('Iowa', 'IA'), r('Kansas', 'KS'), r('Kentucky', 'KY'), r('Louisiana', 'LA'),
      r('Maine', 'ME'), r('Maryland', 'MD'), r('Massachusetts', 'MA'), r('Michigan', 'MI'), r('Minnesota', 'MN'),
      r('Mississippi', 'MS'), r('Missouri', 'MO'), r('Montana', 'MT'), r('Nebraska', 'NE'), r('Nevada', 'NV'),
      r('New Hampshire', 'NH'), r('New Jersey', 'NJ'), r('New Mexico', 'NM'), r('New York', 'NY'),
      r('North Carolina', 'NC'), r('North Dakota', 'ND'), r('Ohio', 'OH'), r('Oklahoma', 'OK'), r('Oregon', 'OR'),
      r('Pennsylvania', 'PA'), r('Rhode Island', 'RI'), r('South Carolina', 'SC'), r('South Dakota', 'SD'),
      r('Tennessee', 'TN'), r('Texas', 'TX'), r('Utah', 'UT'), r('Vermont', 'VT'), r('Virginia', 'VA'),
      r('Washington', 'WA'), r('West Virginia', 'WV'), r('Wisconsin', 'WI'), r('Wyoming', 'WY'),
    ],
  },
  {
    code: 'CA', name: 'Canada', aliases: ['canada'], regionLabel: 'Province',
    cities: ['toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton', 'waterloo', 'mississauga', 'kitchener', 'halifax', 'winnipeg', 'victoria'],
    regions: [
      r('Alberta', 'AB'), r('British Columbia', 'BC'), r('Manitoba', 'MB'), r('New Brunswick', 'NB'),
      r('Newfoundland and Labrador', 'NL'), r('Nova Scotia', 'NS'), r('Ontario', 'ON'), r('Prince Edward Island', 'PE'),
      r('Quebec', 'QC'), r('Saskatchewan', 'SK'),
    ],
  },
  {
    code: 'IN', name: 'India', aliases: ['india'], regionLabel: 'State',
    cities: ['bengaluru', 'bangalore', 'hyderabad', 'pune', 'chennai', 'mumbai', 'gurgaon', 'gurugram', 'noida', 'new delhi', 'kolkata', 'ahmedabad', 'kochi', 'trivandrum', 'coimbatore', 'jaipur', 'chandigarh'],
    regions: [
      r('Andhra Pradesh'), r('Delhi'), r('Gujarat'), r('Haryana'), r('Karnataka'), r('Kerala'), r('Madhya Pradesh'),
      r('Maharashtra'), r('Punjab'), r('Rajasthan'), r('Tamil Nadu'), r('Telangana'), r('Uttar Pradesh'), r('West Bengal'),
    ],
  },
  {
    code: 'GB', name: 'United Kingdom', aliases: ['united kingdom', 'uk', 'u.k.', 'great britain', 'england', 'scotland', 'wales', 'northern ireland', 'gb'],
    cities: ['manchester', 'edinburgh', 'glasgow', 'bristol', 'leeds', 'belfast', 'cardiff', 'reading', 'oxford'],
    regionLabel: 'Nation', regions: [r('England'), r('Scotland'), r('Wales'), r('Northern Ireland')],
  },
  {
    code: 'DE', name: 'Germany', aliases: ['germany', 'deutschland'], regionLabel: 'State',
    cities: ['berlin', 'munich', 'munchen', 'hamburg', 'frankfurt', 'cologne', 'stuttgart', 'dusseldorf', 'walldorf'],
    regions: [r('Baden-Wurttemberg'), r('Bavaria', 'Bayern'), r('Berlin'), r('Hamburg'), r('Hesse', 'Hessen'), r('Lower Saxony'), r('North Rhine-Westphalia', 'NRW'), r('Saxony')],
  },
  { code: 'IE', name: 'Ireland', aliases: ['ireland'], cities: ['cork', 'galway', 'limerick'], regionLabel: 'County', regions: [r('Dublin'), r('Cork'), r('Galway'), r('Limerick')] },
  { code: 'NL', name: 'Netherlands', aliases: ['netherlands', 'the netherlands', 'holland'], cities: ['amsterdam', 'rotterdam', 'utrecht', 'eindhoven', 'the hague'], regionLabel: 'Province', regions: [r('North Holland', 'Noord-Holland'), r('South Holland', 'Zuid-Holland'), r('Utrecht'), r('North Brabant', 'Noord-Brabant')] },
  { code: 'SG', name: 'Singapore', aliases: ['singapore'], cities: [], regionLabel: 'Area', regions: [] },
  {
    code: 'AU', name: 'Australia', aliases: ['australia'], regionLabel: 'State',
    cities: ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra'],
    regions: [r('New South Wales', 'NSW'), r('Victoria', 'VIC'), r('Queensland', 'QLD'), r('Western Australia', 'WA'), r('South Australia', 'SA'), r('Australian Capital Territory', 'ACT'), r('Tasmania', 'TAS')],
  },
  { code: 'FR', name: 'France', aliases: ['france'], cities: ['lyon', 'toulouse', 'nice', 'grenoble'], regionLabel: 'Region', regions: [r('Ile-de-France'), r('Auvergne-Rhone-Alpes'), r('Occitanie')] },
  { code: 'ES', name: 'Spain', aliases: ['spain', 'espana'], cities: ['madrid', 'barcelona', 'valencia', 'malaga'], regionLabel: 'Region', regions: [r('Madrid'), r('Catalonia', 'Cataluna'), r('Valencia')] },
  { code: 'PL', name: 'Poland', aliases: ['poland', 'polska'], cities: ['warsaw', 'krakow', 'wroclaw', 'gdansk', 'poznan'], regionLabel: 'Region', regions: [] },
  { code: 'IL', name: 'Israel', aliases: ['israel'], cities: ['tel aviv', 'haifa', 'herzliya', 'jerusalem'], regionLabel: 'District', regions: [] },
  { code: 'JP', name: 'Japan', aliases: ['japan'], cities: ['tokyo', 'osaka', 'yokohama', 'kyoto'], regionLabel: 'Prefecture', regions: [] },
  { code: 'MX', name: 'Mexico', aliases: ['mexico'], cities: ['mexico city', 'guadalajara', 'monterrey'], regionLabel: 'State', regions: [] },
  { code: 'BR', name: 'Brazil', aliases: ['brazil', 'brasil'], cities: ['sao paulo', 'rio de janeiro', 'belo horizonte'], regionLabel: 'State', regions: [] },
  { code: 'AE', name: 'United Arab Emirates', aliases: ['united arab emirates', 'uae'], cities: ['dubai', 'abu dhabi'], regionLabel: 'Emirate', regions: [r('Dubai'), r('Abu Dhabi')] },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string): Country | undefined {
  return BY_CODE.get(code);
}

export function countryName(code: string): string {
  if (code === ANYWHERE) return 'Anywhere';
  return BY_CODE.get(code)?.name ?? code;
}

/** "Austin, Texas" or "Toronto, Ontario, Canada", for the search bar. */
export function placeSummary(sel: PlaceSelection): string {
  const country = sel.country === ANYWHERE ? '' : sel.country === 'US' ? '' : countryName(sel.country);
  const parts = [sel.city.trim(), sel.region, country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return sel.country === ANYWHERE ? 'Anywhere' : countryName(sel.country);
}

export interface PlaceSelection {
  /** ISO code, or ANYWHERE. */
  country: string;
  /** A region name from the country's list, or ''. */
  region: string;
  city: string;
  /** Only jobs that can be done remotely. */
  remoteOnly?: boolean;
}

/** A posting the stored board tagged (`geo_us`, server `us_geo` rule). */
type Placed = {
  location?: string | null;
  country_code?: string | null;
  is_remote?: boolean | null;
  /** True: the server's US rule kept it. False: elsewhere. Absent: an older or
   *  US-only source, which only ever held US postings. */
  geo_us?: boolean | null;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const wordIn = (hay: string, needle: string) => {
  const n = norm(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${n}($|[^a-z0-9])`).test(hay);
};

/** A US state written the way postings write it: ", TX" or "Texas". */
function namesUsState(raw: string): boolean {
  const us = BY_CODE.get('US')!;
  if (/\b(?:united states|usa)\b/i.test(raw)) return true;
  return us.regions.some(
    (st) => (st.codes ?? []).some((c) => new RegExp(`(^|[,\\s(-])${c}($|[\\s,)\\d-])`).test(raw)) || wordIn(norm(raw), st.name),
  );
}

/** Is this posting in the country? Unknown stays out unless nothing contradicts US. */
export function inCountry(job: Placed, code: string): boolean {
  if (code === ANYWHERE) return true;
  // The board's tag is the server's stricter US rule; trust it when present.
  if (job.geo_us === true) return code === 'US';
  if (job.geo_us === false && code === 'US') return false;
  const iso = (job.country_code || '').toUpperCase();
  if (iso) return iso === code;
  const raw = job.location || '';
  const hay = norm(raw);
  const country = BY_CODE.get(code);
  if (!country) return false;
  if (code === 'US') {
    // Untagged (a board stored before tagging): the server kept US rows, so
    // a row that names another country is the only thing to drop here.
    return !COUNTRIES.some((c) => c.code !== 'US' && c.aliases.some((a) => a.length > 2 && wordIn(hay, a)));
  }
  if (country.aliases.some((a) => wordIn(hay, a))) return true;
  if (namesUsState(raw)) return false;
  if (country.cities.some((city) => wordIn(hay, city))) return true;
  return country.regions.some((reg) => wordIn(hay, reg.name));
}

/** Is this posting in the picked place? Remote postings in the country stay
 *  when a region is picked: someone there can do them. */
export function inPlace(job: Placed, sel: PlaceSelection): boolean {
  if (!inCountry(job, sel.country)) return false;
  const raw = job.location || '';
  if (sel.remoteOnly && !(job.is_remote || /\bremote\b/i.test(raw))) return false;
  const hay = norm(raw);
  if (sel.region) {
    const country = BY_CODE.get(sel.country);
    const region = country?.regions.find((x) => x.name === sel.region);
    const named =
      !!region &&
      (wordIn(hay, region.name) ||
        (region.codes ?? []).some((c) =>
          c.length <= 3
            ? new RegExp(`(^|[,\\s(-])${c}($|[\\s,)\\d-])`).test(raw)
            : wordIn(hay, c),
        ));
    if (!named && !(job.is_remote || /\bremote\b/i.test(raw))) return false;
  }
  if (sel.city.trim()) {
    if (!hay.includes(norm(sel.city.trim())) && !(job.is_remote || /\bremote\b/i.test(raw))) return false;
  }
  return true;
}
