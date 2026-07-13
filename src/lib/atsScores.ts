/**
 * ATS score helpers — keeps v1/v2 narrowing out of components.
 *
 * v2 = the honest deterministic rubric (schema_version 2): rubric
 * sub-scores + vendor_compat checklists. v1 = stored records from before
 * the cutover (fake per-vendor scanner scores). Old records keep the v1
 * shape forever, so every reader must branch through these helpers.
 */
import type { ATSScores } from '@/types/resume';

export function isAtsV2(s: ATSScores | null | undefined): boolean {
  return !!s && (s.schema_version === 2 || typeof s.hard_skill_match === 'number');
}

/** Safe overall reader for full scores, lossy record summaries, or null. */
export function atsOverall(
  s: ATSScores | { overall?: number } | null | undefined,
): number | undefined {
  return typeof s?.overall === 'number' ? s.overall : undefined;
}

/** The v2 rubric rows in display order: [key, label, weightPct]. */
export const ATS_V2_RUBRIC: Array<{
  key: 'hard_skill_match' | 'title_alignment' | 'quantified_impact' | 'ats_parseability'
    | 'section_completeness' | 'recency_relevance' | 'readability';
  label: string;
  weight: number;
}> = [
  { key: 'hard_skill_match', label: 'Hard Skill Match', weight: 30 },
  { key: 'title_alignment', label: 'Title Alignment', weight: 15 },
  { key: 'quantified_impact', label: 'Quantified Impact', weight: 15 },
  { key: 'ats_parseability', label: 'ATS Parseability', weight: 15 },
  { key: 'section_completeness', label: 'Section Completeness', weight: 10 },
  { key: 'recency_relevance', label: 'Recency & Relevance', weight: 8 },
  { key: 'readability', label: 'Readability', weight: 7 },
];

export const VENDOR_LABELS: Record<string, string> = {
  workday: 'Workday',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  icims: 'iCIMS',
  taleo: 'Taleo',
  smartrecruiters: 'SmartRecruiters',
};
