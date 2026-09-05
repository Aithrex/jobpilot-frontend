/**
 * ATS score helpers - keeps v1/v2/v3/v4 narrowing out of components.
 *
 * v2 = the honest deterministic rubric (schema_version 2): rubric
 * sub-scores + vendor_compat checklists. v1 = stored records from before
 * the cutover (fake per-vendor scanner scores). schema_version 3 =
 * evidence-led document_assessment (overall null). schema_version 4 =
 * assessment-v2 (overall always null — never coerce to 0).
 */
import type { AssessmentV2Result, ATSScores } from '@/types/resume';

export function isAtsV2(s: ATSScores | null | undefined): boolean {
  return !!s && (s.schema_version === 2 || typeof s.hard_skill_match === 'number');
}

/** True for assessment-v2 (schema_version 4 / assessment-v2 rubric). */
export function isAssessmentV2(
  s: ATSScores | AssessmentV2Result | { schema_version?: number; assessment_version?: string } | null | undefined,
): boolean {
  return !!s && (
    s.schema_version === 4
    || s.assessment_version === 'assessment-v2'
  );
}

/**
 * Safe overall reader for full scores, lossy record summaries, or null.
 * Returns undefined when overall is missing or explicitly null — never 0.
 */
export function atsOverall(
  s: ATSScores | { overall?: number | null } | null | undefined,
): number | undefined {
  return typeof s?.overall === 'number' ? s.overall : undefined;
}

/** Whether a payload carries a numeric overall suitable for rings/sort meters. */
export function hasNumericAtsOverall(
  s: ATSScores | { overall?: number | null } | null | undefined,
): boolean {
  return typeof s?.overall === 'number';
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
