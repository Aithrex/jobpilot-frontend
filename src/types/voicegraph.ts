// Voice Graph - the writing-capture surface.
// Shapes mirror the backend routes under /api/resume/voice-graph.

export type WritingSampleStatus = 'draft' | 'ready';
export type WritingSampleSource = 'typed' | 'voice';

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
  /** Marks the sample "ready" - may 403 upgrade_required / consent_required. */
  finalize?: boolean;
}

/* ─────────────────────────── Knowledge graph (GET /graph) ─────────────────────────── */

export interface GraphNode {
  node_id: string;
  /** e.g. "skill" | "role" | "company" | "project" | "achievement". Kept loose. */
  type: string;
  label: string;
  canonical_label: string;
  confidence: number;
  /** True once the user has confirmed the fact - rendered brighter. */
  user_confirmed: boolean;
}

export interface GraphEdge {
  edge_id: string;
  src_id: string;
  dst_id: string;
  rel: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ─────────────────────────── Voice profile (GET /voice) ─────────────────────────── */

/** Quantitative style signals. Loose - the backend may add more keys over time. */
export interface VoiceFeatures {
  sent_len_mean?: number;
  passive_rate?: number;
  hedge_rate?: number;
  contraction_rate?: number;
  concreteness_index?: number;
  [key: string]: number | undefined;
}

export interface VerbCount {
  verb: string;
  count: number;
}

/** The computed profile once enough writing exists. */
export interface VoiceProfileReady {
  insufficient?: false;
  version: string | number;
  features: VoiceFeatures;
  verb_inventory: VerbCount[];
  anti_patterns: string[];
  computed_at: string;
  /** Plain-English sentences a person recognizes as true about themselves. */
  description: string[];
}

/** Returned while there isn't yet enough writing to profile a voice. */
export interface VoiceProfileInsufficient {
  insufficient: true;
  word_count: number;
  needed: number;
  message: string;
}

export type VoiceProfile = VoiceProfileReady | VoiceProfileInsufficient;

/* ─────────────────────────── Authored resume (POST /resume/raw, GET /resume[/id]) ─────────────────────────── */

/** Where a single resume bullet came from - always verbatim from the user's writing. */
export interface Provenance {
  bullet: string;
  /** "verbatim" for raw resumes. */
  mode: string;
  /** "writing_sample". */
  source: string;
  source_id: string;
  char_start: number;
  char_end: number;
}

export interface AuthoredContact {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  [key: string]: unknown;
}

export interface AuthoredExperienceItem {
  title?: string;
  company?: string;
  dates?: string;
  bullets?: string[];
}

export interface AuthoredProjectItem {
  name?: string;
  description?: string;
  bullets?: string[];
  [key: string]: unknown;
}

export interface AuthoredStructured {
  contact?: AuthoredContact;
  summary?: string;
  skills?: Record<string, string[] | string> | string[];
  experience?: AuthoredExperienceItem[];
  education?: unknown[];
  projects?: AuthoredProjectItem[];
  [key: string]: unknown;
}

/** Summary row in the prior-resume list (GET /resume). */
export interface AuthoredResume {
  resume_id: string;
  mode: string;
  voice_distance: number;
  created_at: string;
  bullet_count: number;
}

/** Full authored resume (POST /resume/raw and GET /resume/<id>). */
export interface AuthoredResumeDetail {
  resume_id: string;
  mode: string;
  structured: AuthoredStructured;
  provenance: Provenance[];
  voice_distance: number;
  style_profile_version?: string | number;
}
