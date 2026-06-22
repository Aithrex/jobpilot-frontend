export interface DashboardOverview {
  applications: {
    total: number;
    by_status: Record<string, number>;
    active: number;
    interviewing: number;
    offers: number;
    stale: number;
    interview_prep_count: number;
  };
  resume: { has_base: boolean; tailored_count: number };
  jobs: { saved: number };
  learning: {
    active_paths: number;
    modules_completed: number;
    earned_skills: string[];
    earned_skills_count: number;
    in_progress: { path_id: string; title: string; percent: number }[];
  };
  interview: {
    attempts: number;
    avg_score: number | null;
    weakest: string | null;
    top_weak_spots: { tag: string; count: number }[];
  };
  events: { saved: number; registered: number; attended: number; won: number; upcoming_verified: number };
  skills: { have_count: number; top_gaps: { skill: string; count: number }[] };
  momentum: { tailors_today: number; tailor_limit: number | null; tailors_remaining: number | null };
}
