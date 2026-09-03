/**
 * Immutable mutation helpers for TailoredFullResume - the single home for
 * bullet/skill edits so the review flow and (eventually) the editor share
 * one implementation instead of duplicating splice logic.
 */
import type { TailoredFullResume } from '@/types/resume';

/** Same split the backend uses in claim_guard / tailor_verifier. */
export function splitSummarySentences(summary: string): string[] {
  return (summary || '')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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

export function replaceSummarySentence(
  resume: TailoredFullResume,
  sentenceIndex: number,
  text: string,
): TailoredFullResume {
  const sentences = splitSummarySentences(resume.summary || '');
  if (sentenceIndex < 0 || sentenceIndex >= sentences.length) return resume;
  const next = sentences.slice();
  next[sentenceIndex] = text.trim();
  return { ...resume, summary: next.join(' ') };
}

export function removeSummarySentence(
  resume: TailoredFullResume,
  sentenceIndex: number,
): TailoredFullResume {
  const sentences = splitSummarySentences(resume.summary || '');
  if (sentenceIndex < 0 || sentenceIndex >= sentences.length) return resume;
  const next = sentences.filter((_, i) => i !== sentenceIndex);
  return { ...resume, summary: next.join(' ') };
}

export function appendBulletOrClause(
  resume: TailoredFullResume,
  section: BulletSection,
  itemIndex: number,
  bulletIndex: number,
  clause: string,
  asNewBullet: boolean,
): TailoredFullResume {
  const items = resume[section];
  if (!items?.[itemIndex]) return resume;
  const trimmed = clause.trim();
  if (!trimmed) return resume;
  const bullets = items[itemIndex].bullets || [];
  const nextBullets = asNewBullet || bulletIndex < 0 || bulletIndex >= bullets.length
    ? [...bullets, trimmed.endsWith('.') ? trimmed : `${trimmed}.`]
    : bullets.map((b, j) =>
        j === bulletIndex
          ? `${b.replace(/\s+$/, '')} ${trimmed.endsWith('.') ? trimmed : `${trimmed}.`}`
          : b,
      );
  return {
    ...resume,
    [section]: items.map((item, i) =>
      i === itemIndex ? { ...item, bullets: nextBullets } : item,
    ),
  };
}

/** Lookup key for `_skill_headings.map` — mirrors the backend's raw variant. */
function headingKey(skill: string): string {
  return skill.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
}

/**
 * Insert `category` into `skills` at the position the base resume had it.
 *
 * `_polish_skills` prunes categories that ended up empty, so a heading the
 * skill legitimately belongs under may be missing from the tailored document.
 * Re-creating it at the end would read as an afterthought; the base order says
 * where it used to sit.
 */
function withCategoryInBaseOrder(
  skills: Record<string, string[]>,
  category: string,
  order: string[],
): Record<string, string[]> {
  const target = order.indexOf(category);
  if (target < 0) return { ...skills, [category]: [] };

  const rebuilt: Record<string, string[]> = {};
  let inserted = false;
  for (const cat of Object.keys(skills)) {
    const pos = order.indexOf(cat);
    if (!inserted && pos > target) {
      rebuilt[category] = [];
      inserted = true;
    }
    rebuilt[cat] = skills[cat];
  }
  if (!inserted) rebuilt[category] = [];
  return rebuilt;
}

export function addSkillToCategory(
  resume: TailoredFullResume,
  category: string,
  keyword: string,
): TailoredFullResume {
  let skills = { ...(resume.skills || {}) };
  if (!(category in skills)) {
    skills = withCategoryInBaseOrder(
      skills,
      category,
      resume._skill_headings?.order || [],
    );
  }
  const existing = skills[category] || [];
  if (existing.some((s) => s.toLowerCase() === keyword.toLowerCase())) {
    return resume;
  }
  // Front, not back: these come from the missing-keywords panel, so they are
  // JD-aligned by construction, and _polish_skills orders JD-aligned first.
  skills[category] = [keyword, ...existing];
  return { ...resume, skills };
}

/**
 * Pick the category a keyword belongs under.
 *
 * The backend decided this at tailor time with the whole skills section in
 * view and shipped it as `_skill_headings`, so prefer that. The similarity
 * scan below is only a fallback for keywords the map never saw: it is a Dice
 * coefficient over word sets, so a single-token keyword intersects nothing and
 * scores zero against every category.
 *
 * The final fallback is the LAST category, not the first — skill sections are
 * conventionally ordered specific-to-general, so an unplaceable item reads far
 * better under a tail heading like "Tools & Platforms" than under "Languages".
 */
export function inferSkillCategory(
  resume: TailoredFullResume,
  keyword: string,
  similarityFn: (a: string, b: string) => number,
): string {
  const categories = Object.keys(resume.skills || {});
  const mapped = resume._skill_headings?.map?.[headingKey(keyword)];
  if (mapped) return mapped;
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
    categories.find((c) => /technical|skills/i.test(c)) ??
    categories[categories.length - 1]
  );
}
