const HIDDEN_JOBS_KEY = 'aspirely.hidden-jobs';

function readIds(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HIDDEN_JOBS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    sessionStorage.setItem(HIDDEN_JOBS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota */
  }
}

export function loadHiddenJobIds(): Set<string> {
  return new Set(readIds());
}

export function persistHiddenJobId(jobId: string): Set<string> {
  const ids = readIds();
  if (!ids.includes(jobId)) ids.push(jobId);
  writeIds(ids);
  return new Set(ids);
}
