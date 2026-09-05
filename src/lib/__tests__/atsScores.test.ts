import { describe, expect, it } from 'vitest';
import {
  atsOverall,
  hasNumericAtsOverall,
  isAssessmentV2,
  isAtsV2,
} from '@/lib/atsScores';
import type { AssessmentV2Result, ATSScores } from '@/types/resume';

describe('atsScores helpers', () => {
  it('atsOverall never coerces null to 0', () => {
    expect(atsOverall({ overall: null })).toBeUndefined();
    expect(atsOverall({ overall: undefined })).toBeUndefined();
    expect(atsOverall(null)).toBeUndefined();
    expect(atsOverall({ overall: 72 })).toBe(72);
    expect(hasNumericAtsOverall({ overall: null })).toBe(false);
    expect(hasNumericAtsOverall({ overall: 0 })).toBe(true);
  });

  it('detects assessment-v2 by schema_version 4', () => {
    const v4: AssessmentV2Result = {
      assessment_id: 'a1',
      schema_version: 4,
      assessment_version: 'assessment-v2',
      stages: {
        processing: 'complete',
        artifact: 'passed',
        source_check: 'complete',
        reader: 'completed',
        comparison: 'unavailable',
      },
      overall: null,
    };
    expect(isAssessmentV2(v4)).toBe(true);
    expect(atsOverall(v4)).toBeUndefined();
    expect(isAtsV2(v4 as unknown as ATSScores)).toBe(false);
  });
});
