/**
 * Shared prop/model types for the Tailor page sub-components.
 *
 * The orchestrator (TailorPage) owns all data + handlers and passes typed
 * slices down; these types keep the child contracts consistent.
 */
import type {
  TailoredFullResume,
  JDAnalysis,
  ATSScores,
  TailorPipelineResult,
  BackendTailorPhase,
  MatchGaps,
} from '@/types/resume';

export type { TailoredFullResume, JDAnalysis, ATSScores, TailorPipelineResult, MatchGaps };

/** Which inspector tab is active (right column). */
export type InspectorTabKey = 'jd' | 'review' | 'ats' | 'regenerate' | 'cover';

/** Which resume version the left preview is showing. */
export type PreviewMode = 'tailored' | 'base' | 'previous' | 'diff';

/** User's decision on a flagged claim in the review queue. */
export type ReviewDecision = 'accepted' | 'edited' | 'removed' | 'restored';

/**
 * Real tailoring phase - every value is backend truth, no wall-clock guessing.
 * `submitting` = POST in flight (job not yet accepted); `queued` = job accepted,
 * waiting for a worker; the rest arrive from `job.result.progress.phase`
 * written by the backend at each real pipeline stage (with a floor of
 * `extracting_jd` as soon as status flips to processing, covering deploy skew
 * where an older backend never writes progress).
 */
export type TailorPhase = 'submitting' | 'queued' | BackendTailorPhase;

/**
 * Ordinal for monotonic phase advancement - polls can arrive out of order or
 * skip fast phases; the UI only ever steps forward.
 */
export const PHASE_ORDER: Record<TailorPhase, number> = {
  submitting: 0,
  queued: 0,
  extracting_jd: 1,
  selecting_base: 2,
  tailoring: 3,
  augmenting: 4,
  verifying: 5,
  finalizing: 6,
};

/** An entry in the in-session version history stack. */
export interface VersionEntry {
  id: string;
  resume: TailoredFullResume;
  label: string;
  timestamp: number;
}
