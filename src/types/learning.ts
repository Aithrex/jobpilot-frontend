export interface LearningModule {
  week: number;
  title: string;
  objective?: string;
  concepts?: string[];
  practice_task?: string;
  resource_queries?: string[];
  checkpoint?: string;
  inferred_skill?: string;
}

export interface LearningCapstone {
  title: string;
  description: string;
}

export interface LearningPath {
  path_id: string;
  topic: string;
  title: string;
  summary?: string;
  target_role?: string | null;
  modules: LearningModule[];
  target_skills?: string[];
  capstone?: LearningCapstone | null;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface LearningPathSummary extends LearningPath {
  completed_count: number;
  total_modules: number;
  xp_earned: number;
  percent: number;
}

export interface LearningProgress {
  completed_step_ids: string[];
  acquired_skills: string[];
  xp_earned: number;
  quiz_results: unknown[];
}

export interface UnlockedJob {
  id: string;
  title?: string;
  company?: string;
  url?: string;
  status?: string;
}

export interface ModuleCompletionResult {
  earned_skill: string | null;
  staged_for_resume: boolean;
  unlocked_jobs: UnlockedJob[];
  xp_earned: number;
}

// ── Cross-user market TREND signal ──────────────────────────────
// GET /resume/learning/trends?window=90 → trend_signal_service.trending_for_user.
// Deterministic (no LLM): market demand × user gap × learnability, tilted by the
// user's real application outcomes. Numbers are COUNTED backend-side.

/** One trending learning topic ranked against the cross-user JD market. */
export interface LearningTrend {
  /** The skill/topic (already cleared the integrity reject vocabulary). */
  skill: string;
  /** Share of in-window role JDs (across all users) that ask for it, 0..1. */
  market_pct: number;
  /** Distinct JDs (in-window, cross-user) that asked for it. */
  market_count: number;
  /** Whether the user already demonstrates this skill. */
  user_has: boolean;
  /** Deterministic learnability weight, 0..1 (concrete tools rank above broad fields). */
  learnability: number;
  /** How many of the user's rejected/ghosted JDs wanted this skill. */
  outcome_pressure: number;
  /** Composite ranking score = market_pct × gap × learnability × (1 + outcome boost). */
  score: number;
  /** Topic string the UI POSTs to /learning/plan to build a plan. */
  plan_topic: string;
  /** Saved jobs whose JD calls for this skill (bounded to 5). */
  unlocked: UnlockedJob[];
  /** Convenience count of `unlocked`. */
  unlocks_jobs: number;
}

export interface LearningTrendsResult {
  /** Normalized role family the trends were computed for. */
  role: string;
  /** Trailing-day window (30 or 90). */
  window: number;
  /** JD sample size for this role/window. */
  market_size: number;
  /** True when we fell back to the generic 'other' bucket for lack of role signal. */
  degraded: boolean;
  items: LearningTrend[];
  /** Present (with empty items) when there isn't enough cross-user signal yet. */
  note?: string;
  generated_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

// ── §6.6 Learning loop: "Your edge" ─────────────────────────────
// Find trending market gaps → pick one + depth → an adaptive practical
// plan → per-task GitHub sync + verify → share the verified win.

/** A single trending, closeable differentiator vs. the market. */
export interface Differentiator {
  gap: string;
  why_recruiters_care: string;
  /** How often this shows up in the user's target market, 0..1. */
  market_frequency: number;
  closeable_in_days: number;
  is_it_actually_scarce: 'yes' | 'no';
}

export interface DifferentiatorsResult {
  differentiators: Differentiator[];
  /** Honest note when the model found <2 real gaps. */
  note?: string;
}

/** Depth of hand-holding for the generated plan. */
export type EdgeLevel = 'auto' | 'guided' | 'advanced';
export type EdgeDuration = 7 | 14;

export type EdgeProofType = 'github_repo' | 'github_pr' | 'deployed_url' | 'writeup';

export interface EdgeTask {
  task_ref: string;
  day: number;
  task_no: number;
  brief: string;
  acceptance_criteria: string[];
  proof_type: EdgeProofType;
  constraints: string[];
  /** Guided extras. */
  scaffold_hint?: string;
  sub_steps?: string[];
  /** Advanced extra. */
  stretch?: string;
}

export interface EdgePath {
  title: string;
  summary: string;
  level: string;
  duration_days: number;
  tasks: EdgeTask[];
}

export interface EdgePlan {
  path_id: string;
  path: EdgePath;
}

/** Body for POST /learning/plan when generating from a picked differentiator. */
export interface EdgePlanRequest {
  differentiator: Pick<Differentiator, 'gap' | 'why_recruiters_care' | 'market_frequency'>;
  days: EdgeDuration;
  level: EdgeLevel;
}

export interface EdgeGithubSync {
  repo_url?: string;
  created: boolean;
  push_instructions: string[];
}

export type EdgeVerifyStatus = 'verified' | 'needs_work' | 'unverifiable';

export interface EdgeVerifyRequest {
  url?: string;
  text?: string;
  type: EdgeProofType;
}

export interface EdgeVerifyResult {
  status: EdgeVerifyStatus;
  details: string;
  specifics: string[];
  post_draft_available?: boolean;
}

export interface EdgePostVariant {
  angle: string;
  hook: string;
  text: string;
  hashtags: string[];
}

export interface EdgePostDraft {
  draft_id: string;
  variants: EdgePostVariant[];
}

/** Result of publishing a win post (manual copy or auto-schedule). */
export interface EdgePublishResult {
  mode?: 'manual' | 'auto';
  status?: string;
  post_url?: string | null;
  post_id?: string | null;
  /** When mode=auto: the 30-minute hold. */
  schedule_id?: string;
  scheduled_for?: string;
  holds_until?: string;
}
