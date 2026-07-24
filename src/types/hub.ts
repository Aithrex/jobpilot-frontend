// Sprint-based Learning Hub — shared types (mirror the /api/resume/hub/* API).
// Drive UI off array lengths (season_length), never a hardcoded 14, so future
// 30/60/90-day seasons work unchanged.

export type DayState =
  | "completed"
  | "current"
  | "unlocking_soon"
  | "available_tomorrow"
  | "locked"
  | "coming_soon";

export interface HubResource {
  label: string;
  url: string;
}

export interface HubTicket {
  ticket_number: string; // e.g. "API-204"
  sprint_label: string; // e.g. "Sprint 5"
  title: string;
  business_context: string;
  sprint_objective: string;
  priority: "Low" | "Medium" | "High" | "Critical" | string;
  difficulty: string;
  estimated_time: string;
  acceptance_criteria: string[];
  deliverables: string[];
  helpful_resources: HubResource[];
  challenge_type: string;
}

export interface HubDay {
  day: number;
  key: string;
  objective: string;
  theme: string;
  state: DayState;
  published?: boolean;
  completed_at?: string | null;
  unlock_at?: string | null;
  seconds_remaining?: number | null;
  ticket?: HubTicket | null;
}

export interface HubAchievement {
  id: string;
  title: string;
  description: string;
  tier: string;
  xp_bonus: number;
  unlocked: boolean;
  unlocked_at?: string | null;
}

export interface HubPath {
  status: "ready";
  path_key: string;
  career_path: string;
  role: string;
  difficulty: string;
  difficulty_label: string;
  season_id: string;
  season_length: number;
  curriculum_version: number;
  is_preview: boolean;
  published_through_day: number;
  current_day: number;
  days: HubDay[];
  xp: number;
  level: number;
  next_level_xp: number;
  current_streak: number;
  longest_streak: number;
}

/** GET /hub/path may return a non-ready status while generating. */
export interface HubPathPending {
  status: "generating" | "absent" | "failed";
  path_key?: string;
  job_id?: string;
}

export interface HubReward {
  xp: number;
  xp_gained: number;
  level: number;
  leveled_up: boolean;
  streak_current: number;
  streak_longest: number;
  completed_count: number;
  achievement_unlocked?: HubAchievement | null;
}

export interface HubSubmitResult {
  verified: boolean;
  day?: HubDay;
  reward?: HubReward;
  xp?: number;
  level?: number;
  xp_gained?: number;
  leveled_up?: boolean;
  achievement_unlocked?: HubAchievement | null;
  path?: HubPath;
  message?: string;
}

export interface HubAnalytics {
  career_path: string;
  difficulty: string;
  current_day: number;
  total_days: number;
  overall_progress: number;
  completion_pct: number;
  completed_count: number;
  tasks_completed: number;
  projects_built: number;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  learning_hours: number;
  estimated_completion_date?: string | null;
  challenge_history: { day: number; key: string; title: string; completed_at: string; xp: number }[];
  recent_activity: { ts: string; type: string; label: string }[];
}

export interface MentorMessage {
  role: "user" | "mentor";
  content: string;
  ts: number;
  followups?: string[];
}

export interface MentorAnswer {
  answer: string;
  followups: string[];
}

export interface HubRoleOption {
  key: string;
  label: string;
}

export interface HubRolesResponse {
  roles: HubRoleOption[];
  difficulties: HubRoleOption[];
  is_admin: boolean;
}

/** Admin-only preview override; absent/ignored for non-admins. */
export interface HubPathParams {
  role?: string;
  difficulty?: string;
}
