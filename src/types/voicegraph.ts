// Voice Graph — the writing-capture surface.
// Shapes mirror the backend routes under /api/resume/voice-graph.

export type WritingSampleStatus = "draft" | "ready";
export type WritingSampleSource = "typed" | "voice";

export interface VoiceConsent {
  granted: boolean;
  version?: string | null;
  granted_at?: string | null;
}

export interface VoiceGraphStatus {
  enabled: boolean;
  consent: VoiceConsent;
  consent_text_version: string;
  samples: {
    ready: number;
    cap: number;
    ready_word_total: number;
    min_signal_words: number;
  };
}

/** Encouraging progress signal returned when a sample is saved. */
export interface SampleSignal {
  /** Backend-defined bucket, e.g. "empty" | "warming" | "ready". Kept loose on purpose. */
  level: string;
  ready_for_profile: boolean;
  message: string;
}

export interface WritingSample {
  sample_id: string;
  status: WritingSampleStatus;
  source: WritingSampleSource;
  prompt_id?: string | null;
  word_count: number;
  signal: SampleSignal;
  created_at: string;
  updated_at: string;
  text: string;
}

export interface WritingPrompt {
  id: string;
  text: string;
}

export interface SaveSamplePayload {
  /** Omit to create a new draft; pass to autosave/update the same sample. */
  sample_id?: string;
  text: string;
  source?: WritingSampleSource;
  prompt_id?: string | null;
  /** Marks the sample "ready" — may 403 upgrade_required / consent_required. */
  finalize?: boolean;
}
