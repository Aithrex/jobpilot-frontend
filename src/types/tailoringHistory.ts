import type { TailoringRecord } from './resume';

export type HistoryPreset = 'week' | 'month' | 'highAts' | 'needsWork' | 'multiVersion' | 'offers' | 'interviewing' | 'pending';

export interface TailoringHistoryQuery {
  q?: string;
  company?: string;
  role?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  ats_min?: number;
  multi_version?: boolean;
  preset?: HistoryPreset;
  sort?: 'newest' | 'oldest' | 'ats';
}

export interface TailoringHistoryPage {
  records: TailoringRecord[];
  total: number;
  next_cursor: string | null;
  summary?: { total: number; presets: Record<HistoryPreset, number> };
}

export interface TailoringHistoryRequest extends TailoringHistoryQuery {
  page_size?: number;
  cursor?: string;
}
