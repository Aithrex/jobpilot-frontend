/**
 * Pipeline Intelligence — funnel conversion, ghosted applications, and the
 * (privacy-noised) cohort comparison. Backend: /api/resume/pipeline/*.
 */

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface PipelineFunnel {
  stages: FunnelStage[];
  conversion: {
    applied_to_interview: number;
    interview_to_offer: number;
    applied_to_offer: number;
  };
  untracked_stages: string[];
}

export interface PipelineGhost {
  application_id: string;
  company: string;
  role: string;
  days_since_last_event: number;
}

export interface PipelineGhosts {
  ghosts: PipelineGhost[];
}

export interface PipelineCohort {
  your_callback_rate: number;
  cohort_callback_rate?: number;
  sample_size?: number;
  strongest_predictor?: string;
  /** Whether the comparison numbers are differentially-noised for privacy. */
  noised: boolean;
  /** True when there isn't enough data to compare honestly. */
  insufficient?: boolean;
  reason?: string;
}
