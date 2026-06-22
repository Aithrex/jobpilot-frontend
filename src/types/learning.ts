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

export interface QuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}
