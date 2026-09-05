import { describe, expect, it } from 'vitest';
import type { MatchGaps } from '@/types/resume';

describe('match gap assessment states', () => {
  it('keeps already-demonstrated separate from missing tiers', () => {
    const gaps: MatchGaps = {
      already_demonstrated: [{
        item: 'REST API Development',
        why: 'Already shown on the final resume.',
        span: 'Developed REST endpoints for billing.',
        section: 'experience.0',
        match_method: 'semantic',
      }],
      defensible: [],
      learnable: [{ item: 'Kafka', why: 'Not found in resume.' }],
      stretch: [],
    };
    const demonstrated = new Set((gaps.already_demonstrated || []).map((e) => e.item));
    expect(demonstrated.has('REST API Development')).toBe(true);
    expect(gaps.learnable.some((e) => e.item === 'REST API Development')).toBe(false);
    expect(gaps.already_demonstrated?.[0].span).toContain('REST endpoints');
  });
});
