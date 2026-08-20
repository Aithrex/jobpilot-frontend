/**
 * Cross-route "tailor in progress" session.
 *
 * Survives Jobs ↔ Tailor navigation so the Jobs list can show a banner while
 * a handoff is open or a backend tailor job is still running. One-shot handoff
 * (`pending_tailor_job`) is separate: that payload is consumed by Tailor; this
 * session is the durable UI signal until the run finishes or the user dismisses.
 */
export type ActiveTailorStatus = 'handed_off' | 'running' | 'ready' | 'error';

export interface ActiveTailorSession {
  sourceJobId: string;
  title?: string;
  company?: string;
  /** Async `/resume/job/<id>` once the tailor worker is submitted. */
  backendJobId?: string;
  status: ActiveTailorStatus;
  error?: string;
  updatedAt: number;
}

const KEY = 'aspirely.active-tailor-session';
const EVENT = 'aspirely:active-tailor-session';

function read(): ActiveTailorSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTailorSession;
    if (!parsed?.sourceJobId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(next: ActiveTailorSession | null): void {
  try {
    if (!next) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / privacy */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* SSR */
  }
}

export function getActiveTailorSession(): ActiveTailorSession | null {
  return read();
}

export function setActiveTailorSession(
  patch: Omit<ActiveTailorSession, 'updatedAt'> & { updatedAt?: number },
): ActiveTailorSession {
  const prev = read();
  const next: ActiveTailorSession = {
    ...(prev && prev.sourceJobId === patch.sourceJobId ? prev : {}),
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  };
  write(next);
  return next;
}

export function clearActiveTailorSession(): void {
  write(null);
}

export function subscribeActiveTailorSession(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function roleLabel(session: ActiveTailorSession): string {
  const title = (session.title || '').trim();
  const company = (session.company || '').trim();
  if (title && company) return `${title} @ ${company}`;
  return title || company || 'this role';
}
