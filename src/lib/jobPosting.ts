import type { Job } from '@/types/jobs';

/** Career-page URL for a listing, or a Google fallback when the feed has no link. */
export function postingUrl(job: Pick<Job, 'apply_link' | 'title' | 'company'>): string {
  if (job.apply_link) return job.apply_link;
  const q = encodeURIComponent(`${job.title} ${job.company} apply`);
  return `https://www.google.com/search?q=${q}`;
}

/** Open the posting in a new tab. Call synchronously from a click handler. */
export function openJobPosting(job: Pick<Job, 'apply_link' | 'title' | 'company'>): void {
  window.open(postingUrl(job), '_blank', 'noopener,noreferrer');
}
