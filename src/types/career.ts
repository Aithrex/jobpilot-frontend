export type ReadinessBand = 'starting' | 'building' | 'ready' | 'standout';

export interface ReadinessDimension {
  key: string;
  label: string;
  score: number;
  summary: string;
}

export interface ReadinessNextStep {
  dimension: string;
  label: string;
  description: string;
  /** A workspace NavTab id to deep-link the user to (e.g. "learning", "jobs"). */
  cta_tab: string;
}

export interface BuildStep {
  key: string;
  label: string;
  description: string;
  cta_tab: string;
  done: boolean;
}

export interface CareerReadiness {
  overall: number;
  band: ReadinessBand;
  level: string;
  target_role: string | null;
  intensity: string | null;
  experience_level: string | null;
  onboarding_complete: boolean;
  dimensions: ReadinessDimension[];
  next_step: ReadinessNextStep;
  build_plan: BuildStep[];
  /** Things the user has *built* — surfaced to recognize the hard work. */
  highlights: string[];
  computed_at: string;
}

export interface LinkedinSection {
  name: string;
  status: 'good' | 'improve' | 'missing';
  tip: string;
}

export interface LinkedinAudit {
  linkedin_url: string;
  score: number;
  headline: string;
  about: string;
  sections: LinkedinSection[];
  target_role: string;
}

export interface GithubRepo {
  name: string;
  stars: number;
  language: string | null;
  description: string;
  url: string;
  topics: string[];
}

export interface ConnectStatus {
  github: { connected: boolean; login?: string };
  linkedin: { connected: boolean; name?: string };
}

export interface GithubProfile {
  username: string;
  name: string | null;
  avatar_url: string | null;
  html_url: string | null;
  bio: string;
  public_repos: number;
  followers: number;
  original_repos: number;
  total_stars: number;
  top_languages: string[];
  top_repos: GithubRepo[];
  active_recently: boolean;
  last_active_months: number | null;
  proof_score: number;
  reasons: string[];
  fetched_at?: string;
}
