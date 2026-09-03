import { describe, expect, it } from 'vitest';

import {
  parseAddress,
  resolveAnchor,
  splitSummarySentences,
} from '@/lib/reviewAnchors';
import {
  removeSummarySentence,
  replaceSummarySentence,
} from '@/lib/resumeMutations';
import type { TailoredFullResume } from '@/types/resume';

function resume(summary: string): TailoredFullResume {
  return {
    contact: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary,
    skills: {},
    experience: [],
    education: [],
    certifications: [],
    projects: [],
  };
}

describe('parseAddress', () => {
  it('parses summary.s{k}', () => {
    expect(parseAddress('summary.s0')).toEqual({
      section: 'summary',
      itemIndex: 0,
      bulletIndex: 0,
    });
    expect(parseAddress('summary.s2')).toEqual({
      section: 'summary',
      itemIndex: 0,
      bulletIndex: 2,
    });
  });

  it('still parses experience and project bullets', () => {
    expect(parseAddress('experience.1.bullets.2')?.section).toBe('experience');
    expect(parseAddress('projects.0.bullets.0')?.section).toBe('projects');
  });
});

describe('summary anchors', () => {
  const text =
    'Backend engineer with 4 years in payments. Built APIs in Python. Mentored two juniors.';

  it('resolves summary.s1 to the second sentence', () => {
    const sentences = splitSummarySentences(text);
    expect(sentences).toHaveLength(3);
    const found = resolveAnchor(resume(text), 'summary.s1', sentences[1]);
    expect(found).toEqual({
      section: 'summary',
      itemIndex: 0,
      bulletIndex: 1,
      currentText: sentences[1],
    });
  });

  it('replace and remove keep the rest of the summary', () => {
    const sentences = splitSummarySentences(text);
    const edited = replaceSummarySentence(resume(text), 1, 'Shipped APIs in Go.');
    expect(edited.summary).toContain('Shipped APIs in Go.');
    expect(edited.summary).toContain(sentences[0]);
    const removed = removeSummarySentence(resume(text), 0);
    expect(removed.summary).not.toContain(sentences[0]);
    expect(removed.summary).toContain(sentences[1]);
  });
});
