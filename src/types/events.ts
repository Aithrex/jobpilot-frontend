export type LegitimacyBand = 'verified' | 'credible' | 'unvetted' | 'flagged';
export type EventRelation = 'saved' | 'registered' | 'attended' | 'won' | 'dismissed' | null;

export interface EventItem {
  event_id: string;
  source?: string;
  external_id?: string;
  type?: 'hackathon' | 'webinar' | string;
  title: string;
  org?: string;
  description?: string;
  url?: string;
  start_date?: string;
  end_date?: string | null;
  tags?: string[];
  location?: string;
  prize_pool?: string;
  thumbnail?: string;
  legitimacy_score?: number;
  legitimacy_band?: LegitimacyBand;
  vetting_signals?: {
    heuristic?: number;
    llm?: number | null;
    red_flags?: string[];
    llm_rationale?: string | null;
    [k: string]: unknown;
  };
  relation?: EventRelation;
  outcome?: string;
}

export interface PostVariant {
  angle: string;
  hook: string;
  text: string;
  hashtags: string[];
}

export interface PostDraft {
  draft_id: string;
  event_id?: string | null;
  audience: string;
  relation: string;
  variants: PostVariant[];
  created_at?: string;
}
