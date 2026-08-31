/**
 * Category placement for skills added from the missing-keywords panel.
 *
 * The backend decides where a skill belongs at tailor time and ships the
 * answer as `_skill_headings`; these cover that lookup, the fallbacks for
 * keywords the map never saw, and reviving a heading `_polish_skills` pruned.
 */
import { describe, it, expect } from 'vitest';

import { addSkillToCategory, inferSkillCategory } from '@/lib/resumeMutations';
import { similarity } from '@/lib/textDiff';
import type { TailoredFullResume } from '@/types/resume';

function resume(
  skills: Record<string, string[]>,
  headings?: TailoredFullResume['_skill_headings'],
): TailoredFullResume {
  return {
    contact: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    skills,
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    ...(headings ? { _skill_headings: headings } : {}),
  } as TailoredFullResume;
}

const SKILLS = {
  Languages: ['Python', 'TypeScript'],
  'Frameworks & Libraries': ['React'],
  'Tools & Platforms': ['Docker'],
};

describe('inferSkillCategory', () => {
  it('uses the heading the backend picked', () => {
    const r = resume(SKILLS, {
      map: { kafka: 'Tools & Platforms' },
      order: Object.keys(SKILLS),
    });
    expect(inferSkillCategory(r, 'Kafka', similarity)).toBe('Tools & Platforms');
  });

  it('matches the map regardless of casing or a trailing parenthetical', () => {
    const r = resume(SKILLS, {
      map: { 'claude api': 'Tools & Platforms' },
      order: Object.keys(SKILLS),
    });
    expect(inferSkillCategory(r, 'Claude API (Sonnet)', similarity)).toBe(
      'Tools & Platforms',
    );
  });

  it('falls back to the LAST category, not the first, for an unmapped keyword', () => {
    // A single-token keyword intersects nothing under a word-set Dice
    // coefficient, so every category scores zero and the fallback decides.
    const r = resume(SKILLS);
    expect(inferSkillCategory(r, 'Kafka', similarity)).toBe('Tools & Platforms');
  });

  it('still prefers a genuine similarity hit over the fallback', () => {
    const r = resume({ Cloud: ['Amazon EC2'], Other: ['Git'] });
    expect(inferSkillCategory(r, 'Amazon S3', similarity)).toBe('Cloud');
  });

  it('handles a resume with no skills at all', () => {
    expect(inferSkillCategory(resume({}), 'Kafka', similarity)).toBe(
      'Technical Skills',
    );
  });
});

describe('addSkillToCategory', () => {
  it('front-inserts, because these keywords are JD-aligned by construction', () => {
    const out = addSkillToCategory(resume(SKILLS), 'Languages', 'Go');
    expect(out.skills.Languages).toEqual(['Go', 'Python', 'TypeScript']);
  });

  it('is a no-op when the skill is already listed', () => {
    const r = resume(SKILLS);
    expect(addSkillToCategory(r, 'Languages', 'python')).toBe(r);
  });

  it('revives a pruned heading at its base position', () => {
    // Databases sat between Languages and Tools in the base resume, but held
    // nothing after tailoring, so polish pruned it.
    const r = resume(
      { Languages: ['Python'], 'Tools & Platforms': ['Docker'] },
      {
        map: { postgres: 'Databases' },
        order: ['Languages', 'Databases', 'Tools & Platforms'],
      },
    );
    const out = addSkillToCategory(r, 'Databases', 'Postgres');
    expect(Object.keys(out.skills)).toEqual([
      'Languages',
      'Databases',
      'Tools & Platforms',
    ]);
    expect(out.skills.Databases).toEqual(['Postgres']);
  });

  it('appends a heading the base order does not know about', () => {
    const out = addSkillToCategory(resume(SKILLS), 'AI & ML', 'Claude API');
    expect(Object.keys(out.skills).at(-1)).toBe('AI & ML');
    expect(out.skills['AI & ML']).toEqual(['Claude API']);
  });
});
