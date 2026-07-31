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

export interface ResolvedAnchor {
  section: BulletSection;
  itemIndex: number;
  bulletIndex: number;
  /** Current text at the resolved position. */
  currentText: string;
}

export function parseAddress(
  address: string,
): { section: BulletSection; itemIndex: number; bulletIndex: number } | null {
  const m = /^(experience|projects)\.(\d+)\.bullets\.(\d+)$/.exec(address);
  if (!m) return null;
  return {
    section: m[1] as BulletSection,
    itemIndex: Number(m[2]),
    bulletIndex: Number(m[3]),
  };
}

export function isSummaryAddress(address: string): boolean {
  return address.startsWith('summary.');
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

  if (parsed) {
    const atAddress =
      resume[parsed.section]?.[parsed.itemIndex]?.bullets?.[parsed.bulletIndex];
    if (typeof atAddress === 'string' && atAddress.trim() === target) {
      return { ...parsed, currentText: atAddress };
    }
    // Search the original section first, then the other bullet section.
    const sections: BulletSection[] = parsed
      ? [parsed.section, parsed.section === 'experience' ? 'projects' : 'experience']
      : ['experience', 'projects'];
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
