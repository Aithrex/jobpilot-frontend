/**
 * The generated dashboard's shared vocabulary (Compass §6.2).
 *
 * The dashboard is not templated — it's a set of widgets, each with a
 * `relevance(ctx) -> 0..1` scorer. Render order + prominence follow the
 * scores. This file defines the widget contract and the `DashboardCtx`:
 * everything the frontend already knows about the user, assembled once by
 * DashboardTab and threaded to every scorer and renderer.
 */
import type { ReactNode } from 'react';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness, ConnectStatus } from '@/types/career';
import type { OptClock } from '@/types/visa';
import type { PipelineFunnel } from '@/types/pipeline';
import type { SavedJob } from '@/types/jobs';
import type { PostDraft } from '@/types/events';
import type { TechChronicleItem } from '@/types/techChronicle';

/** Workspace tabs a widget/hero can deep-link into. Mirrors DashboardTab's nav. */
export type NavKey =
  | 'tailor' | 'batch' | 'jobs' | 'my-resumes' | 'tailored'
  | 'applications' | 'interview' | 'visa' | 'beta' | 'copilot' | 'profile'
  | 'learning' | 'events' | 'network' | 'billing' | 'six-seconds' | 'auto-apply';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
  total_applications: number;
  last_application_date?: string | null;
  heatmap?: { date: string; count: number }[];
}

/**
 * The user's coarse activity phase, derived from what we know. Widgets nudge
 * their own relevance by phase (a brand-new user promotes resume/onboarding;
 * an active applicant promotes pipeline + ready-to-submit; etc.).
 */
export type ActivityPhase = 'new' | 'exploring' | 'applying' | 'interviewing';

/**
 * Per-slice fetch failures. `true` = that fetch failed this load, so a widget
 * with no data for the slice should show a quiet retry, never a lying empty
 * state. (The OPT clock keeps its dedicated `optError` — its card owns it.)
 */
export interface SliceErrors {
  overview: boolean;
  streak: boolean;
  trends: boolean;
  connect: boolean;
  funnel: boolean;
  savedJobs: boolean;
  posts: boolean;
}

/** Everything the frontend knows — the single argument to every scorer. */
export interface DashboardCtx {
  /** True during the very first fetch (no data yet). */
  loading: boolean;
  overview: DashboardOverview | null;
  readiness: CareerReadiness | null;
  streak: StreakData | null;
  optClock: OptClock | null;
  optError: boolean;
  funnel: PipelineFunnel | null;
  savedJobs: SavedJob[];
  posts: PostDraft[];
  trends: TechChronicleItem[];
  /** GitHub/LinkedIn link status — null until loaded (or if the fetch failed). */
  connect: ConnectStatus | null;
  /** Which ctx slices failed to fetch this load. */
  errors: SliceErrors;
  phase: ActivityPhase;
  userName: string;
  /** Deep-link into a workspace tab. */
  navigate: (tab: NavKey) => void;
  /** Re-fetch just the OPT clock (used by the OPT widget after an edit). */
  reloadOptClock: () => void;
  /** Re-fetch everything — the retry behind WidgetError. */
  retry: () => void;
}

/**
 * A dashboard widget. `relevance` returns 0..1 — return <= 0 to hide the widget
 * entirely for this user (e.g. the OPT clock for a non-international student who
 * hasn't started a visa profile stays low, not absent). `span` is the widget's
 * natural width in the 3-column desktop grid; larger, higher-scoring widgets
 * read bigger.
 */
export interface Widget {
  key: string;
  relevance: (ctx: DashboardCtx) => number;
  span?: (ctx: DashboardCtx) => 1 | 2 | 3;
  render: (ctx: DashboardCtx) => ReactNode;
}

/** Calm, decisive settle — the one dashboard easing (matches --ease-out-expo). */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
