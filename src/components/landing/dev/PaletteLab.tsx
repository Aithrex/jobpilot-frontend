import { useEffect, useState } from 'react';
import './palette-lab.css';

/**
 * DEVELOPMENT ONLY: a small picker for comparing accent palettes on the real
 * page. `LandingExperience` mounts it under `vite dev` and never in tests or
 * in a production build, so it is not part of the product.
 *
 * It sets `data-palette` on the public surface root; the alternative values
 * live in `palette-lab.css`. "Cobalt" is the shipped palette and sets
 * nothing.
 */

const DEFAULT = 'cobalt';

const PALETTES = [
  { id: 'cobalt', name: 'Cobalt', swatch: 'hsl(228 70% 49%)' },
  { id: 'evergreen', name: 'Evergreen', swatch: 'hsl(161 84% 21%)' },
  { id: 'daybreak', name: 'Daybreak', swatch: 'hsl(47 100% 62%)' },
  { id: 'plum', name: 'Plum', swatch: 'hsl(322 62% 34%)' },
  { id: 'poppy', name: 'Poppy', swatch: 'hsl(6 78% 47%)' },
] as const;

// v2: the default moved from evergreen to cobalt, so an older stored choice
// must not carry over.
const KEY = 'aspirely-palette-lab-v2';

export default function PaletteLab() {
  const [active, setActive] = useState<string>(() => {
    try {
      return localStorage.getItem(KEY) ?? DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.surface-lumen, .surface-nocturne').forEach((el) => {
      if (active === DEFAULT) delete el.dataset.palette;
      else el.dataset.palette = active;
    });
    try {
      localStorage.setItem(KEY, active);
    } catch {
      /* private mode: the choice simply does not persist */
    }
  }, [active]);

  return (
    <div className="palette-lab" role="group" aria-label="Palette preview, development only">
      Palette
      {PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          title={p.name}
          aria-label={p.name}
          aria-pressed={active === p.id}
          onClick={() => setActive(p.id)}
          style={{ background: p.swatch }}
        />
      ))}
      <span data-name>{PALETTES.find((p) => p.id === active)?.name}</span>
    </div>
  );
}
