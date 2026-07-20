import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '@/lib/api';
import { LIGHT_SURFACE } from '@/components/landing/LandingExperience';
import { GuestProgressRail } from '@/components/guest/GuestProgressRail';
import { GuestResultsDashboard } from '@/components/guest/GuestResultsDashboard';
import { GuestCompletedState } from '@/components/guest/GuestCompletedState';
import ApplicationsTab from '@/components/resume/ApplicationsTab';
import type { GuestJobMatch, GuestTailorResult } from '@/types/guest';
import type { TailoredFullResume } from '@/types/resume';

/**
 * DEV-ONLY screenshot harness (/__shots/:name) for the landing's product
 * images: the REAL implemented components fed entirely FICTIONAL data (no
 * real resume, person, employer relationship, or application). The route is
 * registered only when import.meta.env.DEV — this chunk never ships.
 *
 * names: matches | compare | pipeline
 *
 * NOTE: the pipeline shot monkey-patches apiService's application-read
 * methods for this tab session so ApplicationsTab renders fixture data —
 * reload before using the real app again in the same tab.
 */

const MATCHES: GuestJobMatch[] = [
  {
    match_id: 'shot-1',
    title: 'Senior Full Stack Engineer',
    company: 'Northwind Systems',
    location: 'Chicago, IL',
    source: 'greenhouse',
    match_score: 58,
    matched_skills: ['python', 'react', 'aws', 'typescript', 'ci/cd'],
    gaps: ['go', 'kubernetes'],
    why: 'Estimated match because this posting mentions python, react and aws from your resume.',
    sponsorship: {
      signal: 'strong',
      note: 'Signals from public filings: this employer has recent H-1B filing activity. Not a guarantee of sponsorship.',
    },
  },
  {
    match_id: 'shot-2',
    title: 'Software Engineer, Platform',
    company: 'Juniper Financial',
    location: 'New York, NY',
    source: 'workday',
    match_score: 52,
    matched_skills: ['java', 'aws', 'sql', 'docker'],
    gaps: ['react', 'typescript'],
    why: 'Estimated match because this posting mentions java, aws and sql from your resume.',
    sponsorship: {
      signal: 'moderate',
      note: 'Signals from public filings: some recent filing activity. Not a guarantee of sponsorship.',
    },
  },
  {
    match_id: 'shot-3',
    title: 'Backend Engineer, Care Platform',
    company: 'Beacon Health Labs',
    location: 'Remote, US',
    source: 'lever',
    match_score: 49,
    matched_skills: ['python', 'sql', 'docker'],
    gaps: ['java', 'go'],
    why: 'Estimated match because this posting mentions python, sql and docker from your resume.',
    sponsorship: null,
  },
  {
    match_id: 'shot-4',
    title: 'Full Stack Developer',
    company: 'Orchard Robotics',
    location: 'Austin, TX',
    source: 'ashby',
    match_score: 46,
    matched_skills: ['react', 'typescript', 'python'],
    gaps: ['aws', 'kubernetes'],
    why: 'Estimated match because this posting mentions react, typescript and python from your resume.',
    sponsorship: null,
  },
  {
    match_id: 'shot-5',
    title: 'Software Engineer II',
    company: 'Latitude Media Group',
    location: 'Seattle, WA',
    source: 'greenhouse',
    match_score: 43,
    matched_skills: ['javascript', 'react', 'sql'],
    gaps: ['python', 'docker'],
    why: 'Estimated match because this posting mentions javascript, react and sql from your resume.',
    sponsorship: null,
  },
];

const ORIGINAL_RESUME: Record<string, unknown> = {
  contact: { name: 'Avery Kim' },
  summary:
    'Full stack engineer with 7 years of experience building customer-facing products and the services behind them.',
  skills: {
    Languages: ['Python', 'Java', 'TypeScript'],
    'Cloud & DevOps': ['AWS', 'CI/CD', 'Docker'],
    Frontend: ['React'],
  },
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Meridian Grove Tech',
      dates: 'Apr 2022 - Present',
      bullets: [
        'Lead full stack engineer for a customer onboarding product: Go and Python services on AWS, React front end.',
        'Rebuilt the release pipeline with CI/CD gates and contract testing, taking deploys from weekly to daily.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'Halstead Labs',
      dates: 'Jul 2019 - Mar 2022',
      bullets: [
        'Built Java and Python microservices for payments reconciliation on AWS.',
        'Introduced automated testing across three teams and cut escaped defects by a third.',
      ],
    },
  ],
};

const TAILORED_RESUME = {
  contact: { name: 'Avery Kim', email: '', phone: '', linkedin: '', github: '' },
  summary:
    'Full stack engineer building React and TypeScript frontends paired with Python services on AWS. Shipped a rewrite that reduced onboarding drop-off by 18% and established testing practices that cut defects by a third.',
  skills: {
    'Frontend & Web': ['React', 'TypeScript'],
    'Backend & APIs': ['Python', 'Java', 'REST API design'],
    'Cloud & DevOps': ['AWS', 'CI/CD', 'Docker', 'Contract testing'],
  },
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Meridian Grove Tech',
      location: '',
      dates: 'April 2022 - Present',
      type: '',
      bullets: [
        'Reduced onboarding drop-off 18% by shipping a TypeScript rewrite of the onboarding flow with server-driven validation.',
        'Led full stack development of a customer onboarding product with Python services on AWS and a React frontend.',
        'Rebuilt the release pipeline with CI/CD gates and contract testing, taking deploys from weekly to daily.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'Halstead Labs',
      location: '',
      dates: 'July 2019 - March 2022',
      type: '',
      bullets: [
        'Built Java and Python microservices for payments reconciliation on AWS.',
        'Introduced automated testing across three teams, cutting escaped defects by a third.',
      ],
    },
  ],
  education: [],
  certifications: [],
  projects: [],
  target_role: 'Senior Full Stack Engineer',
} as TailoredFullResume;

const TAILORED: GuestTailorResult = {
  tailored_resume: TAILORED_RESUME,
  record_id: 'shot-record',
  download: { token: 'shot', formats: ['pdf', 'docx'] },
};

const PIPELINE_RECORDS = [
  ['Senior Full Stack Engineer', 'Northwind Systems', 'applied', 82],
  ['Software Engineer, Platform', 'Juniper Financial', 'interviewing', 78],
  ['Backend Engineer, Care Platform', 'Beacon Health Labs', 'applied', 74],
  ['Full Stack Developer', 'Orchard Robotics', 'offer', 80],
  ['Software Engineer II', 'Latitude Media Group', 'draft', 71],
  ['Platform Engineer', 'Harborlight Software', 'interviewing', 76],
].map(([title, company, status, score], i) => ({
  record_id: `shot-${i}`,
  user_email: 'sample@example.com',
  jd_analysis: { job_title: title as string, company: company as string },
  ats_scores: { overall: score as number },
  created_at: new Date(Date.now() - (i + 2) * 86400000).toISOString(),
  application: {
    status: status as string,
    applied_at: status === 'draft' ? null : new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  },
}));

function patchForPipeline() {
  Object.assign(apiService, {
    listTailoringRecords: async () => ({ data: { records: PIPELINE_RECORDS } }),
    getFunnelAnalytics: async () => ({
      data: {
        ok: true,
        counts: { draft: 1, applied: 2, interviewing: 2, offer: 1, rejected: 0 },
        conversions: { applied_to_interview: 50, interview_to_offer: 50 },
        insight: 'Half of your applications reached an interview this month. Keep the follow-ups going.',
      },
    }),
    getStaleApplications: async () => ({ data: { stale_applications: [] } }),
    updateApplication: async () => ({ error: 'read-only harness' }),
  });
}

export default function ShotsPage() {
  const { name } = useParams();
  const [selected, setSelected] = useState<string | null>('shot-1');
  const pipelinePatched = useMemo(() => {
    if (name === 'pipeline') {
      patchForPipeline();
      return true;
    }
    return false;
  }, [name]);

  if (name === 'pipeline' && pipelinePatched) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground" style={LIGHT_SURFACE}>
        <div className="mx-auto max-w-6xl">
          <ApplicationsTab embedded />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground" style={LIGHT_SURFACE}>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-float">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Aspirely · guest workspace
          </span>
          <GuestProgressRail step={name === 'compare' ? 'tailor' : 'matches'} />
        </div>
        <div className="p-6">
          {name === 'compare' ? (
            <GuestCompletedState
              activeMatch={MATCHES[0]}
              tailored={TAILORED}
              parsedResume={ORIGINAL_RESUME}
              downloading={null}
              onDownload={() => {}}
              onBack={() => {}}
            />
          ) : (
            <GuestResultsDashboard
              matches={MATCHES}
              state="ready"
              error={null}
              cta={null}
              tailoredMatchId={null}
              remaining={1}
              selectedMatchId={selected}
              onSelect={(id) => setSelected(id || null)}
              onTailor={() => {}}
              onViewTailored={() => {}}
              onRetry={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
