/**
 * Verification anchors - resolve a sidecar item's structural address
 * (experience.{i}.bullets.{j} | summary.s{k} | projects.{i}.bullets.{j})
 * against the CURRENT resume.
 *
 * Addresses are valid at delivery time; after any edit we re-anchor by the
 * verbatim `text` snapshot within the same section. An entry whose text no
 * longer exists anywhere is treated as user-edited (dropped from the
 * pending review queue - the user rewrote it themselves).
 */
import type { TailoredFullResume } from '@/types/resume';
import type { BulletSection } from '@/lib/resumeMutations';
import { splitSummarySentences } from '@/lib/resumeMutations';

export type ReviewSection = BulletSection | 'summary';

export interface ResolvedAnchor {
  section: ReviewSection;
  itemIndex: number;
  bulletIndex: number;
  /** Current text at the resolved position. */
  currentText: string;
}

export { splitSummarySentences } from '@/lib/resumeMutations';

export function parseAddress(
  address: string,
): { section: ReviewSection; itemIndex: number; bulletIndex: number } | null {
  const bullet = /^(experience|projects)\.(\d+)\.bullets\.(\d+)$/.exec(address);
  if (bullet) {
    return {
      section: bullet[1] as BulletSection,
      itemIndex: Number(bullet[2]),
      bulletIndex: Number(bullet[3]),
    };
  }
  const summary = /^summary\.s(\d+)$/.exec(address);
  if (summary) {
    return {
      section: 'summary',
      itemIndex: 0,
      bulletIndex: Number(summary[1]),
    };
  }
  return null;
}

export function isSummaryAddress(address: string): boolean {
  return /^summary\.s\d+$/.test(address);
}

/**
 * Resolve a verification entry to its current position. Fast path: the
 * original address still holds the snapshot text. Slow path: search the
 * section (then the whole resume) for the verbatim snapshot.
 */
export function resolveAnchor(
  resume: TailoredFullResume,
  address: string,
  snapshotText: string,
): ResolvedAnchor | null {
  const parsed = parseAddress(address);
  const target = snapshotText.trim();

  if (parsed?.section === 'summary') {
    const sentences = splitSummarySentences(resume.summary || '');
    const at = sentences[parsed.bulletIndex];
    if (typeof at === 'string' && at.trim() === target) {
      return { ...parsed, currentText: at };
    }
    const found = sentences.findIndex((s) => s.trim() === target);
    if (found >= 0) {
      return {
        section: 'summary',
        itemIndex: 0,
        bulletIndex: found,
        currentText: sentences[found],
      };
    }
    return null;
  }

  if (parsed) {
    const atAddress =
      resume[parsed.section]?.[parsed.itemIndex]?.bullets?.[parsed.bulletIndex];
    if (typeof atAddress === 'string' && atAddress.trim() === target) {
      return { ...parsed, currentText: atAddress };
    }
    const sections: BulletSection[] = [
      parsed.section,
      parsed.section === 'experience' ? 'projects' : 'experience',
    ];
    for (const section of sections) {
      const items = resume[section] || [];
      for (let i = 0; i < items.length; i++) {
        const bullets = items[i].bullets || [];
        for (let j = 0; j < bullets.length; j++) {
          if (bullets[j].trim() === target) {
            return { section, itemIndex: i, bulletIndex: j, currentText: bullets[j] };
          }
        }
      }
    }
  }
  return null;
}
