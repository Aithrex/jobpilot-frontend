/**
 * Tailor-scoped presentational helpers.
 *
 * Small shared bits used across 3+ Tailor sub-components that don't belong in
 * the Today-specific `today/primitives.tsx`. Tokens only - verified light+dark.
 */

/** Score → semantic tone (text + tinted surface + ring) for the 80/60 bands. */
export interface ScoreTone {
  /** Foreground text class, e.g. `text-success`. */
  text: string;
  /** Tinted surface class, e.g. `bg-success/10`. */
  surface: string;
  /** Ring/border tint class, e.g. `border-success/25`. */
  ring: string;
  /** Solid fill class for progress bars, e.g. `bg-success`. */
  fill: string;
  /** Dot indicator fill (same hue), e.g. `bg-success`. */
  dot: string;
}

/**
 * Map an ATS-style 0-100 score to token-driven tone classes. Replaces the
 * emerald/amber/red raw-Tailwind ternaries repeated across the old TailorTab.
 * ≥80 = success, ≥60 = warning, else destructive.
 */
export function scoreTone(score: number): ScoreTone {
  if (score >= 80) {
    return {
      text: 'text-success',
      surface: 'bg-success/10',
      ring: 'border-success/25',
      fill: 'bg-success',
      dot: 'bg-success',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-warning',
      surface: 'bg-warning/10',
      ring: 'border-warning/25',
      fill: 'bg-warning',
      dot: 'bg-warning',
    };
  }
  return {
    text: 'text-destructive',
    surface: 'bg-destructive/10',
    ring: 'border-destructive/25',
    fill: 'bg-destructive',
    dot: 'bg-destructive',
  };
}

/** Short qualitative label for a score (used on badges). */
export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Weak';
}
