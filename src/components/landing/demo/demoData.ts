/**
 * Fictional data for the landing's interactive product preview.
 *
 * HARD CONTRACT: everything in this file is invented and clearly labeled as
 * such in the UI ("Interactive preview" + "fictional data"). None of it may
 * ever be sent to the backend, count against any quota, or be presented as a
 * real employer, candidate, or outcome. Companies are fictional by design;
 * sponsorship lines use the same precise public-filings language as the real
 * product (signals, never guarantees).
 */

/** One evidence link: a phrase from the sample resume mapped to the phrase in
 * the job post it satisfies. Rendered with an animated connector. */
export interface DemoEvidence {
  resume: string;
  posting: string;
}

/** A resume line split into parts so the tailored view can highlight exactly
 * what changed. `added: true` marks tailored phrasing (never new facts). */
export type DemoLine = ReadonlyArray<{ text: string; added?: boolean }>;

export interface DemoJob {
  id: string;
  title: string;
  company: string;
  monogram: string;
  location: string;
  /** Estimated match score (fictional, labeled an estimate). */
  score: number;
  skills: readonly string[];
  why: string;
  sponsorship: string;
  evidence: readonly DemoEvidence[];
  /** Estimated keyword coverage before/after tailoring (fictional). */
  coverage: { original: number; tailored: number };
  tailoredSummary: DemoLine;
  tailoredBullets: readonly DemoLine[];
}

/** The fictional sample resume the preview "uploads" — no name on purpose:
 * real names are never identity in Aspirely, and the demo doesn't need one. */
export const DEMO_RESUME = {
  label: 'Sample resume · fictional',
  summary:
    'Frontend engineer, five years. React, TypeScript, design systems, charting, and accessibility work.',
  bullets: [
    'Built dashboard features in React and TypeScript for internal teams',
    'Maintained design system components used by three product teams',
    'Improved page performance and accessibility across the web app',
  ],
} as const;

export const DEMO_JOBS: readonly DemoJob[] = [
  {
    id: 'lumenary',
    title: 'Senior Frontend Engineer',
    company: 'Lumenary',
    monogram: 'L',
    location: 'Remote (US)',
    score: 92,
    skills: ['React', 'TypeScript', 'Design systems', 'Accessibility'],
    why: 'Four of the five core requirements appear directly in the sample resume: React, TypeScript, design systems, and accessibility. The seniority level also lines up with five years of experience.',
    sponsorship:
      'Public filings show this employer has sponsored work visas in the last three years. A signal, not a guarantee.',
    evidence: [
      { resume: 'Design system components', posting: 'Owns the component library' },
      { resume: 'React and TypeScript dashboards', posting: 'Ships React features weekly' },
      { resume: 'Accessibility improvements', posting: 'WCAG 2.1 AA required' },
    ],
    coverage: { original: 58, tailored: 88 },
    tailoredSummary: [
      { text: 'Frontend engineer, five years. ' },
      { text: 'Design-system ownership and WCAG 2.1 AA accessibility work', added: true },
      { text: ' in React and TypeScript.' },
    ],
    tailoredBullets: [
      [
        { text: 'Maintained ' },
        { text: 'component-library', added: true },
        { text: ' design system pieces used by three product teams' },
      ],
      [
        { text: 'Built dashboard features in React and TypeScript, ' },
        { text: 'shipped on a weekly release cadence', added: true },
      ],
      [
        { text: 'Improved accessibility across the web app ' },
        { text: 'toward WCAG 2.1 AA', added: true },
      ],
    ],
  },
  {
    id: 'harborview',
    title: 'Product Engineer',
    company: 'Harborview Analytics',
    monogram: 'H',
    location: 'New York, NY · Hybrid',
    score: 84,
    skills: ['React', 'TypeScript', 'Charting', 'Performance'],
    why: "Strong overlap on React and TypeScript, and the charting work maps straight onto Harborview's dashboard products. Performance experience closes the gap on their latency requirement.",
    sponsorship:
      'No sponsorship filings found for this employer in public data. Worth confirming before applying if sponsorship matters to you.',
    evidence: [
      { resume: 'Charting in dashboards', posting: 'Data-heavy product surfaces' },
      { resume: 'Performance improvements', posting: 'Sub-second dashboard loads' },
      { resume: 'React and TypeScript', posting: 'React + TypeScript stack' },
    ],
    coverage: { original: 52, tailored: 83 },
    tailoredSummary: [
      { text: 'Frontend engineer, five years. ' },
      { text: 'Data-heavy React dashboards with charting and performance tuning', added: true },
      { text: ' in TypeScript.' },
    ],
    tailoredBullets: [
      [
        { text: 'Built ' },
        { text: 'data-heavy', added: true },
        { text: ' dashboard features in React and TypeScript for internal teams' },
      ],
      [
        { text: 'Improved page performance across the web app, ' },
        { text: 'targeting fast dashboard loads', added: true },
      ],
      [{ text: 'Maintained design system components used by three product teams' }],
    ],
  },
  {
    id: 'cobaltgrid',
    title: 'UI Engineer, Platform',
    company: 'Cobalt Grid',
    monogram: 'C',
    location: 'Austin, TX',
    score: 76,
    skills: ['TypeScript', 'Design systems', 'Testing'],
    why: 'Design-system experience is the anchor here. The posting is platform-focused, so the product-feature work counts for less, which is why the estimate sits lower.',
    sponsorship:
      'Public filings show occasional sponsorship, mostly for senior roles. A signal, not a guarantee.',
    evidence: [
      { resume: 'Design system for three teams', posting: 'Platform components at scale' },
      { resume: 'TypeScript across the stack', posting: 'Strict TypeScript codebase' },
    ],
    coverage: { original: 47, tailored: 79 },
    tailoredSummary: [
      { text: 'Frontend engineer, five years. ' },
      { text: 'Platform-minded design-system work', added: true },
      { text: ' in strict TypeScript.' },
    ],
    tailoredBullets: [
      [
        { text: 'Maintained design system components ' },
        { text: 'consumed as a shared platform', added: true },
        { text: ' by three product teams' },
      ],
      [
        { text: 'Built dashboard features in ' },
        { text: 'strictly typed', added: true },
        { text: ' TypeScript and React' },
      ],
      [{ text: 'Improved page performance and accessibility across the web app' }],
    ],
  },
] as const;
