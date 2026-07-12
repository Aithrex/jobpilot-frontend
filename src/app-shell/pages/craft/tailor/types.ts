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
} from '@/types/resume';

export type { TailoredFullResume, JDAnalysis, ATSScores, TailorPipelineResult };

/** Which inspector tab is active (right column). */
export type InspectorTabKey = 'jd' | 'ats' | 'regenerate' | 'cover';

/** Which resume version the left preview is showing. */
export type PreviewMode = 'tailored' | 'previous' | 'diff';

/**
 * Real tailoring phase — driven by backend job status (via pollJob's onStatus),
 * not a wall-clock timer. `submitting` = POST in flight (job not yet accepted);
 * `extracting` = job queued / first processing tick (Extract requirements);
 * `tailoring` = backend confirmed processing (Tailor → Optimize → Finalize,
 * sub-stepped by the elapsed hint only AFTER processing is confirmed).
 */
export type TailorPhase = 'submitting' | 'extracting' | 'tailoring';

/** An entry in the in-session version history stack. */
export interface VersionEntry {
  id: string;
  resume: TailoredFullResume;
  label: string;
  timestamp: number;
}
