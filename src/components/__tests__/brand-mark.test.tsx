import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { BrandMark } from '@/components/BrandMark';

/**
 * The logo drifted twice: first in COLOUR (five hand-rolled copies, one of them
 * invisible in dark mode), then in SHAPE (same gradient, but the glyph filled
 * 50-67% of the tile and the radius was 8px / --radius / 12px / 5px depending
 * on where you looked). Both times it was reported as "the header one and the
 * footer one are different".
 *
 * Colour is now structurally safe - there is one gradient token. Geometry is
 * not: it is safe only as long as call sites keep passing nothing but `size`.
 * So these tests guard the two ways it can regress - the component deriving
 * geometry incorrectly, and a call site going around it.
 */

const tile = (el: HTMLElement) => el.querySelector('span[aria-hidden="true"]') as HTMLElement;

describe('BrandMark geometry', () => {
  test('every property scales from `size`, so the mark is one shape at any size', () => {
    const shape = (size: number) => {
      const { container, unmount } = render(<BrandMark size={size} />);
      const t = tile(container);
      const svg = t.querySelector('svg') as SVGElement;
      const px = (v: string) => parseFloat(v);
      const out = {
        radiusRatio: +(px(t.style.borderRadius) / px(t.style.width)).toFixed(3),
        glyphRatio: +(px(svg.style.width) / px(t.style.width)).toFixed(3),
      };
      unmount();
      return out;
    };

    // Exact, not approximate: geometry is derived, never rounded, so any drift
    // at all means a size is being special-cased again. This caught a real one
    // - rounding the radius made the 18px mark 28% round instead of 25%.
    const sizes = [18, 24, 28, 32, 36, 48];
    const shapes = sizes.map(shape);
    for (const s of shapes) {
      expect(Math.abs(s.radiusRatio - shapes[3].radiusRatio)).toBeLessThan(0.001);
      expect(Math.abs(s.glyphRatio - shapes[3].glyphRatio)).toBeLessThan(0.001);
    }
  });

  test('the default size is the one every real placement uses', () => {
    const { container } = render(<BrandMark />);
    expect(tile(container).style.width).toBe('32px');
  });

  test('the glyph colour comes from the gradient utility, not a literal', () => {
    const { container } = render(<BrandMark />);
    const t = tile(container);
    expect(t.className).toContain('brand-mark-gradient');
    // A literal here is what made the mark invisible in dark mode, and it is
    // separately rejected inside the landing illustrations.
    expect(t.className).not.toMatch(/text-(white|black)/);
  });
});

describe('BrandMark call sites', () => {
  const SRC = join(process.cwd(), 'src');

  const tsxFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return tsxFiles(full);
      return full.endsWith('.tsx') ? [full] : [];
    });

  const usages = tsxFiles(SRC)
    .filter((f) => !f.includes('__tests__') && !f.endsWith('BrandMark.tsx'))
    .flatMap((file) => {
      const src = readFileSync(file, 'utf8');
      return [...src.matchAll(/<BrandMark\b[^/>]*\/?>/g)].map((m) => ({
        file: file.slice(SRC.length + 1).replace(/\\/g, '/'),
        tag: m[0].replace(/\s+/g, ' '),
      }));
    });

  test('no call site hands the mark its own geometry', () => {
    // `h-8 w-8`, `rounded-lg`, `iconClassName="h-4 w-4"` - this is exactly how
    // the five copies drifted apart while all still "using BrandMark".
    const offenders = usages.filter((u) => /\b(h-|w-|rounded-|iconClassName)/.test(u.tag));
    expect(offenders).toEqual([]);
  });

  test('only the mock product window scales the mark down', () => {
    const sized = usages.filter((u) => /size=/.test(u.tag));
    expect(sized.map((u) => u.file)).toEqual(['components/landing/workspace/MacWindow.tsx']);
  });

  test('the mark carries no elevation of its own', () => {
    // Two of five instances had `shadow-soft`, so the same logo sat flat in the
    // footer and raised in the top bar.
    const offenders = usages.filter((u) => /shadow-/.test(u.tag));
    expect(offenders).toEqual([]);
  });
});
