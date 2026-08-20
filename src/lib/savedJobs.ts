/** Pipeline statuses that belong on Jobs → Applied rather than Saved. */
export const APPLIED_PIPELINE_STATUSES = new Set([
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export function isAppliedSavedJob(row: { status?: string }): boolean {
  return APPLIED_PIPELINE_STATUSES.has((row.status || '').toLowerCase());
}
