/**
 * The stage poster: one frame rendered from the real-time scene (headless
 * Chromium on a GPU, AgX tone mapping, the same camera), encoded as WebP, one
 * per theme. It is the LCP candidate on `/` and the whole picture on the auth
 * pages, which never load the 3D chunk. Re-render it whenever the scene or the
 * tokens change, so the poster and the live canvas stay identical.
 */
export const POSTER = {
  light: '/images/landing/aspirely-stage-light.webp',
  dark: '/images/landing/aspirely-stage-dark.webp',
} as const;
export const POSTER_WIDTH = 1400;
export const POSTER_HEIGHT = 1120;

/** The studio sweep the poster bakes in, drawn from tokens for the live box. */
export const SWEEP = {
  light:
    'radial-gradient(120% 95% at 50% 18%, hsl(var(--card)) 0%, hsl(var(--card)) 35%, hsl(var(--muted)) 100%)',
  dark: 'radial-gradient(120% 95% at 50% 18%, hsl(var(--surface-strong)) 0%, hsl(var(--muted)) 45%, hsl(var(--background)) 100%)',
} as const;
