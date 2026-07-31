/**
 * Immutable mutation helpers for TailoredFullResume - the single home for
 * bullet/skill edits so the review flow and (eventually) the editor share
 * one implementation instead of duplicating splice logic.
 */
import type { TailoredFullResume } from '@/types/resume';

export type BulletSection = 'experience' | 'projects';

export function replaceBulletText(
  resume: TailoredFullResume,
  section: BulletSection,
  itemIndex: number,
  bulletIndex: number,
  text: string,
): TailoredFullResume {
  const items = resume[section];
  if (items?.[itemIndex]?.bullets?.[bulletIndex] === undefined) return resume;
  return {
    ...resume,
    [section]: items.map((item, i) =>
      i === itemIndex
        ? {
            ...item,
            bullets: item.bullets.map((b, j) => (j === bulletIndex ? text : b)),
          }
        : item,
    ),
  };
}

export function removeBulletAt(
  resume: TailoredFullResume,
  section: BulletSection,
  itemIndex: number,
  bulletIndex: number,
): TailoredFullResume {
  const items = resume[section];
  if (!items?.[itemIndex]) return resume;
  return {
    ...resume,
    [section]: items.map((item, i) =>
      i === itemIndex
        ? { ...item, bullets: item.bullets.filter((_, j) => j !== bulletIndex) }
        : item,
    ),
  };
}

export function addSkillToCategory(
  resume: TailoredFullResume,
  category: string,
  keyword: string,
): TailoredFullResume {
  const skills = { ...(resume.skills || {}) };
  const existing = skills[category] || [];
  if (existing.some((s) => s.toLowerCase() === keyword.toLowerCase())) {
    return resume;
  }
  skills[category] = [...existing, keyword];
  return { ...resume, skills };
}

/**
 * Pick the most fitting existing category for a keyword by token overlap
 * with each category's current contents (falls back to common defaults).
 */
export function inferSkillCategory(
  resume: TailoredFullResume,
  keyword: string,
  similarityFn: (a: string, b: string) => number,
): string {
  const categories = Object.keys(resume.skills || {});
  if (categories.length === 0) return 'Technical Skills';
  let best = '';
  let bestScore = 0;
  for (const cat of categories) {
    const contents = `${cat} ${(resume.skills[cat] || []).join(' ')}`;
    const score = similarityFn(keyword, contents);
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  if (best) return best;
  return (
    categories.find((c) => /technical|skills/i.test(c)) ?? categories[0]
  );
}
