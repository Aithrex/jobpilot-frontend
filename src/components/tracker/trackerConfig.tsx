/**
 * Static shape of the application tracker: what the stages are, how they group
 * into sections, how the applied-date presets resolve, and the one wording the
 * "Did you apply?" question is allowed to use.
 *
 * Colour lives here but is used in exactly one place — the section header dot.
 * Rows never paint their status, because the section they sit under already
 * says it. The only exception is `Closed`, which merges three statuses and so
 * has to label its rows.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Bookmark,
  CircleOff,
  Ghost,
  MessagesSquare,
  PenLine,
  Send,
  Trophy,
  XCircle,
} from 'lucide-react';

import type { ApplicationStatus } from '@/types/resume';
import { localDayISO, startOfLocalMonthISO } from '@/lib/applicationDates';

export interface StatusMeta {
  key: ApplicationStatus;
  label: string;
  /** Section-header dot. */
  dot: string;
  /** Text tone for the inline label rows carry inside a merged section. */
  tone: string;
  Icon: LucideIcon;
}

export const STATUSES: StatusMeta[] = [
  { key: 'saved', label: 'Saved', dot: 'bg-info', tone: 'text-info', Icon: Bookmark },
  { key: 'draft', label: 'Draft', dot: 'bg-muted-foreground/40', tone: 'text-muted-foreground', Icon: PenLine },
  { key: 'applied', label: 'Applied', dot: 'bg-primary', tone: 'text-primary', Icon: Send },
  { key: 'interviewing', label: 'Interviewing', dot: 'bg-[hsl(var(--brand-to))]', tone: 'text-[hsl(var(--brand-to))]', Icon: MessagesSquare },
  { key: 'offer', label: 'Offer', dot: 'bg-success', tone: 'text-success', Icon: Trophy },
  { key: 'rejected', label: 'Rejected', dot: 'bg-destructive/70', tone: 'text-destructive', Icon: XCircle },
  { key: 'ghosted', label: 'Ghosted', dot: 'bg-warning', tone: 'text-warning', Icon: Ghost },
  { key: 'withdrawn', label: 'Withdrawn', dot: 'bg-muted-foreground/30', tone: 'text-muted-foreground', Icon: CircleOff },
];

const STATUS_LOOKUP: Record<string, StatusMeta> = STATUSES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<string, StatusMeta>,
);

/**
 * Some backend services emit "interview" where the tracker uses "interviewing",
 * and migrated rows carry other legacy values. Without this the renderer reads
 * `.dot` off undefined and takes the page down.
 */
const STATUS_ALIASES: Record<string, string> = {
  interview: 'interviewing',
  interested: 'saved',
  in_review: 'applied',
  in_progress: 'applied',
};

export function statusMeta(status?: string | null): StatusMeta {
  const key = (status || 'draft').toLowerCase();
  return STATUS_LOOKUP[key] || STATUS_LOOKUP[STATUS_ALIASES[key] || 'draft'] || STATUSES[0];
}

/** The canonical stage of a record, with aliases already resolved. */
export function statusKeyOf(status?: string | null): ApplicationStatus {
  return statusMeta(status).key;
}

// ─── Sections ─────────────────────────────────────────────────────────────

export interface StageSection {
  id: string;
  label: string;
  statuses: ApplicationStatus[];
  /** Terminal stages open collapsed: they are history, not work in hand. */
  defaultOpen: boolean;
  dot: string;
}

/**
 * Five live stages plus one merged terminal section. An application walks a
 * single road; rejected, withdrawn and ghosted are all the same thing from the
 * pipeline's point of view — it stopped — so they share a section and
 * distinguish themselves with a per-row label.
 */
export const STAGE_SECTIONS: StageSection[] = [
  { id: 'saved', label: 'Saved', statuses: ['saved'], defaultOpen: true, dot: 'bg-info' },
  { id: 'draft', label: 'Draft', statuses: ['draft'], defaultOpen: true, dot: 'bg-muted-foreground/40' },
  { id: 'applied', label: 'Applied', statuses: ['applied'], defaultOpen: true, dot: 'bg-primary' },
  { id: 'interviewing', label: 'Interviewing', statuses: ['interviewing'], defaultOpen: true, dot: 'bg-[hsl(var(--brand-to))]' },
  { id: 'offer', label: 'Offer', statuses: ['offer'], defaultOpen: true, dot: 'bg-success' },
  {
    id: 'closed',
    label: 'Closed',
    statuses: ['rejected', 'withdrawn', 'ghosted'],
    defaultOpen: false,
    dot: 'bg-muted-foreground/30',
  },
];

/** Sections whose rows need to say which status they are. */
export const MERGED_SECTION_IDS = new Set(
  STAGE_SECTIONS.filter((s) => s.statuses.length > 1).map((s) => s.id),
);

/** The section a status belongs to, so a drop target knows what to write. */
export const SECTION_OF_STATUS: Record<string, string> = STAGE_SECTIONS.reduce(
  (acc, section) => {
    for (const s of section.statuses) acc[s] = section.id;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Dropping onto a merged section has to pick one concrete status; `rejected`
 * is both the common case and the only one of the three the backend reacts to
 * (it generates the reframe).
 */
export function statusForSection(sectionId: string): ApplicationStatus {
  const section = STAGE_SECTIONS.find((s) => s.id === sectionId);
  return (section?.statuses[0] || 'draft') as ApplicationStatus;
}

// ─── Applied-date presets ─────────────────────────────────────────────────

export type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

/** Inclusive [from, to] civil-day bounds for a preset, or null for "any". */
export function presetRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  const today = localDayISO();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    // Inclusive of today, so "last 7 days" is today plus the previous six.
    case '7d':
      return { from: localDayISO(-6), to: today };
    case '30d':
      return { from: localDayISO(-29), to: today };
    case 'month':
      return { from: startOfLocalMonthISO(), to: today };
    case 'custom': {
      if (!customFrom && !customTo) return null;
      // A half-open custom range still filters, using the open end as unbounded.
      return { from: customFrom || '0000-01-01', to: customTo || '9999-12-31' };
    }
    default:
      return null;
  }
}

// ─── The apply question ───────────────────────────────────────────────────

/**
 * The product asks "did you apply?" on five surfaces — the job card, the
 * confirm dialog, the post-tailor outcome dialog, batch tailoring, and here —
 * and until now each invented its own buttons, including three different words
 * for the same dismissal ("Not yet", "Dismiss", "Reopen"). The tracker uses
 * this and only this; the other four can be pulled onto it from one place.
 */
export const APPLY_PROMPT = {
  question: 'Did you apply?',
  confirm: 'Yes, I applied',
  save: 'Save for later',
  dismiss: 'Not yet',
} as const;
