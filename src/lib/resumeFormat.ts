/**
 * Resume format choices: length, spacing, accent and section order.
 *
 * Mirrors the backend's `services/resume_format.py`. The choices ride on the
 * tailored resume as `tailoring_preferences` and change only the layout: no
 * AI call, and a resume without them renders exactly as before.
 */
import type { TailoredFullResume } from '@/types/resume';

export type PageLength = 'one' | 'two';
export type Density = 'compact' | 'comfortable';
export type Accent = 'black' | 'navy';
export type SectionOrder = 'auto' | 'education_first' | 'experience_first';

export interface ResumeFormatPreferences {
  page_length: PageLength;
  density: Density;
  accent: Accent;
  section_order: SectionOrder;
}

export const DEFAULT_FORMAT: ResumeFormatPreferences = {
  page_length: 'one',
  density: 'compact',
  accent: 'black',
  section_order: 'auto',
};

const ALLOWED: { [K in keyof ResumeFormatPreferences]: readonly ResumeFormatPreferences[K][] } = {
  page_length: ['one', 'two'],
  density: ['compact', 'comfortable'],
  accent: ['black', 'navy'],
  section_order: ['auto', 'education_first', 'experience_first'],
};

/** Keep only known values; anything else falls back to the default. */
export function normalizeFormat(raw: unknown): ResumeFormatPreferences {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_FORMAT };
  (Object.keys(ALLOWED) as (keyof ResumeFormatPreferences)[]).forEach((key) => {
    const v = src[key];
    if (typeof v === 'string' && (ALLOWED[key] as readonly string[]).includes(v)) {
      (out as Record<string, string>)[key] = v;
    }
  });
  return out;
}

/** The format a tailored resume currently carries. */
export function formatOf(resume: TailoredFullResume | null | undefined): ResumeFormatPreferences {
  return normalizeFormat(resume?.tailoring_preferences);
}

export function sameFormat(a: ResumeFormatPreferences, b: ResumeFormatPreferences): boolean {
  return (Object.keys(DEFAULT_FORMAT) as (keyof ResumeFormatPreferences)[]).every((k) => a[k] === b[k]);
}

/** Navy is the accent the PDF prints (#004F90); shown as a swatch only. */
export const ACCENT_SWATCH: Record<Accent, string> = {
  black: 'hsl(var(--foreground))',
  navy: '#004F90',
};

const STORAGE_KEY = 'aspirely.resumeFormat';

/** The last format this browser chose, for the next tailor. A convenience only. */
export function loadSavedFormat(): ResumeFormatPreferences {
  try {
    return normalizeFormat(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_FORMAT };
  }
}

export function saveFormat(prefs: ResumeFormatPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked: the choice still applies to this session */
  }
}
