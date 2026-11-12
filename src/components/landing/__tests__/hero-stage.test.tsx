/**
 * The 3D hero stage: the poster is the experience, the canvas is optional.
 * These lock the gating rules from docs/design/2026-11-11-3d-web-principles.md
 * (section 5.3) so a refactor cannot start loading WebGL for a visitor who
 * asked for less motion, or ship a stage with no accessible name.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setReducedMotion } from '@/test/setup';
import { canUse3D } from '@/components/landing/three/canUse3D';
import { HeroStage, STAGE_LABEL } from '@/components/landing/three/HeroStage';
import { parseTriplet, readStagePalette } from '@/components/landing/three/palette';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canUse3D', () => {
  test('never with a reduced-motion preference, even when WebGL2 works', () => {
    setReducedMotion(true);
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    expect(canUse3D()).toBe(false);
    // It decided before it ever touched WebGL.
    expect(getContext).not.toHaveBeenCalled();
  });

  test('never when a WebGL2 context fails the performance-caveat probe', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(canUse3D()).toBe(false);
  });

  test('yes when motion is allowed and WebGL2 is real', () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    expect(canUse3D()).toBe(true);
    expect(getContext).toHaveBeenCalledWith('webgl2', { failIfMajorPerformanceCaveat: true });
  });
});

describe('HeroStage', () => {
  test('renders the theme poster with explicit dimensions and the stage description', () => {
    render(<HeroStage theme="dark" />);
    const poster = screen.getByRole('img', { name: STAGE_LABEL });
    expect(poster).toHaveAttribute('src', '/images/landing/aspirely-stage-dark.webp');
    expect(poster).toHaveAttribute('width', '1400');
    expect(poster).toHaveAttribute('height', '1120');
    // Without a canvas there is no motion, so no pause control either.
    expect(screen.queryByRole('button', { name: /animation/i })).toBeNull();
    expect(screen.getByText(/fictional, not real results/i)).toBeInTheDocument();
  });

  test('the stage label carries no dash punctuation', () => {
    expect(STAGE_LABEL).not.toMatch(/[–—]| - |--/);
  });
});

describe('palette', () => {
  test('parses token triplets into setHSL components', () => {
    expect(parseTriplet('302 38% 36%')).toEqual([302 / 360, 0.38, 0.36]);
  });

  test('falls back to the light tokens when CSS variables cannot be read', () => {
    const p = readStagePalette(null, 'light');
    expect(p.accent).toBe('302 38% 36%');
    expect(p.theme).toBe('light');
  });
});
