/**
 * Tiny word-level diff utilities - no dependency.
 *
 * Powers the inline bullet diff (lightly-edited bullets render as one row
 * with word-level highlights instead of a remove+add pair) and similarity
 * matching for "restore original" / skill-category inference.
 */

export type DiffSeg = { type: 'same' | 'added' | 'removed'; text: string };

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

/**
 * Word-token LCS diff. O(n·m) with n,m ≤ ~80 words per bullet - negligible.
 * Adjacent segments of the same type are merged.
 */
export function wordDiff(a: string, b: string): DiffSeg[] {
  const aw = tokenize(a);
  const bw = tokenize(b);
  const n = aw.length;
  const m = bw.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aw[i] === bw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segs: DiffSeg[] = [];
  const push = (type: DiffSeg['type'], text: string) => {
    const last = segs[segs.length - 1];
    if (last && last.type === type) last.text += ` ${text}`;
    else segs.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aw[i] === bw[j]) {
      push('same', aw[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', aw[i]);
      i++;
    } else {
      push('added', bw[j]);
      j++;
    }
  }
  while (i < n) push('removed', aw[i++]);
  while (j < m) push('added', bw[j++]);
  return segs;
}

/** Dice coefficient over lowercased word sets: 2|A∩B| / (|A|+|B|). */
export function similarity(a: string, b: string): number {
  const setA = new Set(tokenize(a.toLowerCase()));
  const setB = new Set(tokenize(b.toLowerCase()));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  return (2 * inter) / (setA.size + setB.size);
}

/**
 * Greedy best-match pairing of removed×added bullets above the threshold.
 * 0.5 default: augmenter-style edits (metric injection, keyword swaps) keep
 * most tokens so lightly-edited bullets pair; full rewrites stay add+remove.
 */
export function pairBullets(
  removed: string[],
  added: string[],
  threshold = 0.5,
): { edited: Array<[string, string]>; removed: string[]; added: string[] } {
  const pairs: Array<{ r: number; a: number; score: number }> = [];
  removed.forEach((r, ri) => {
    added.forEach((a, ai) => {
      const score = similarity(r, a);
      if (score >= threshold) pairs.push({ r: ri, a: ai, score });
    });
  });
  pairs.sort((x, y) => y.score - x.score);

  const usedR = new Set<number>();
  const usedA = new Set<number>();
  const edited: Array<[string, string]> = [];
  for (const p of pairs) {
    if (usedR.has(p.r) || usedA.has(p.a)) continue;
    usedR.add(p.r);
    usedA.add(p.a);
    edited.push([removed[p.r], added[p.a]]);
  }
  return {
    edited,
    removed: removed.filter((_, i) => !usedR.has(i)),
    added: added.filter((_, i) => !usedA.has(i)),
  };
}

/** Best-matching string from `candidates` above `threshold`, or null. */
export function bestMatch(
  target: string,
  candidates: string[],
  threshold = 0.5,
): string | null {
  let best: string | null = null;
  let bestScore = threshold;
  for (const c of candidates) {
    const score = similarity(target, c);
    if (score >= bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}
