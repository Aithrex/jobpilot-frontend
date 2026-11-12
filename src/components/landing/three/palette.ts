/**
 * The 3D stage's colours, read from the SAME semantic tokens the DOM uses, on
 * the element the stage is mounted in, so the scene follows whichever public
 * surface (light or dark) owns the page. No hex lives in the scene code.
 *
 * Values are the raw `H S% L%` triplets from index.css; the scene converts
 * them with THREE.Color#setHSL, which treats them as sRGB exactly like CSS
 * does. AgX tone mapping then shifts them slightly, which is expected for a
 * physically lit object; flat UI never goes through the 3D pipeline.
 */
export interface StagePalette {
  theme: 'light' | 'dark';
  paper: string;
  paperInk: string;
  paperLine: string;
  card: string;
  cardLine: string;
  accent: string;
  onAccent: string;
  tile: string;
  shadow: string;
}

type Triplet = string;

function read(style: CSSStyleDeclaration, name: string, fallback: Triplet): Triplet {
  const v = style.getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Fallbacks are only used where CSS variables cannot be read (jsdom, a
 * detached node); they mirror the light tokens so a test render is sane.
 */
export function readStagePalette(el: Element | null, theme: 'light' | 'dark'): StagePalette {
  const style = el ? getComputedStyle(el) : null;
  const get = (name: string, fallback: Triplet) => (style ? read(style, name, fallback) : fallback);
  const light = theme === 'light';
  return {
    theme,
    // Paper reads as paper in both themes: white on light, the light ink
    // (a soft off-white) on dark, where the studio is dimmer.
    paper: light ? get('--card', '0 0% 100%') : get('--foreground', '240 14.3% 95.9%'),
    paperInk: light ? get('--foreground', '252 11.6% 8.4%') : get('--card', '240 7.7% 10.2%'),
    paperLine: light ? get('--surface-strong', '240 12.5% 90.6%') : get('--input', '250.9 4.5% 48.4%'),
    card: light ? get('--card', '0 0% 100%') : get('--surface-strong', '240 7.4% 18.6%'),
    cardLine: light ? get('--surface-strong', '240 12.5% 90.6%') : get('--input', '250.9 4.5% 48.4%'),
    accent: get('--primary', '302 38% 36%'),
    onAccent: get('--primary-foreground', '0 0% 100%'),
    tile: light ? get('--muted', '240 14.3% 94.5%') : get('--muted-foreground', '250.9 5.8% 62.5%'),
    shadow: light ? get('--foreground', '252 11.6% 8.4%') : get('--background', '240 9.1% 6.5%'),
  };
}

/** Parse an `H S% L%` triplet into 0..1 components for THREE.Color#setHSL. */
export function parseTriplet(t: string): [number, number, number] {
  const [h, s, l] = t.replace(/%/g, '').trim().split(/\s+/).map(Number);
  return [((h || 0) % 360) / 360, (s || 0) / 100, (l || 0) / 100];
}
