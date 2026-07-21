/**
 * Derived reads over DashboardCtx - the small "ranker inputs" shared by the
 * hero and several widgets so the logic stays in one honest place.
 */
import type { SavedJob } from '@/types/jobs';
import type { DashboardCtx } from './types';

/** Saved jobs the user marked interested but hasn't submitted yet. */
export function readyToSubmit(ctx: DashboardCtx): SavedJob[] {
  return ctx.savedJobs.filter((j) => j.status === 'interested');
}

/** Saved jobs that carry a match score, strongest first. */
export function scoredMatches(ctx: DashboardCtx): SavedJob[] {
  return [...ctx.savedJobs]
    .filter((j) => typeof j.job_data?.match_score === 'number' && j.job_data.match_score > 0)
    .sort((a, b) => (b.job_data.match_score || 0) - (a.job_data.match_score || 0));
}

export function topMatch(ctx: DashboardCtx): SavedJob | null {
  return scoredMatches(ctx)[0] ?? null;
}

/** Saved companies with a real H-1B sponsorship track record. */
export function strongSponsors(ctx: DashboardCtx): SavedJob[] {
  return ctx.savedJobs.filter((j) => {
    const s = j.job_data?.sponsorship;
    return !!s && (s.band === 'strong' || s.band === 'moderate');
  });
}

/** The user has told us they're on an F-1/OPT track. */
export function isVisaUser(ctx: DashboardCtx): boolean {
  return !!ctx.optClock?.has_profile;
}

export function totalApplications(ctx: DashboardCtx): number {
  return ctx.overview?.applications.total ?? ctx.streak?.total_applications ?? 0;
}

export function hasBaseResume(ctx: DashboardCtx): boolean {
  return !!ctx.overview?.resume.has_base;
}
