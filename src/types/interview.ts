export interface CoachStats {
  count: number;
  avg_score?: number;
  dimension_avg?: Record<string, number | null>;
  weakest_dimensions?: string[];
  top_weak_spots?: { tag: string; count: number }[];
  by_category?: Record<string, number>;
}

export interface CoachDrill {
  title: string;
  why: string;
}

export interface CoachSummary {
  stats: CoachStats;
  narrative: string | null;
  drills: CoachDrill[];
  trend: { at: string; score: number; category?: string }[];
}

export interface InterviewAttempt {
  attempt_id: string;
  role?: string;
  role_family?: string;
  category?: string;
  question?: string;
  score?: number;
  dimensions?: Record<string, number>;
  weak_spot_tags?: string[];
  answered_at?: string;
}

export interface InterviewFit {
  fit_score?: number;
  verdict?: string;
  focus_areas?: string[];
  likely_questions?: string[];
}

export interface SalaryEstimate {
  role_family?: string;
  level?: string;
  location?: string;
  basis?: string;
  confidence?: string;
  estimate?: {
    currency?: string;
    low?: number;
    median?: number;
    high?: number;
    percentiles?: { p25?: number; p50?: number; p75?: number; p90?: number };
    notes?: string;
  };
}
