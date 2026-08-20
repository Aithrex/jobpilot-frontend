import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearActiveTailorSession,
  getActiveTailorSession,
  roleLabel,
  setActiveTailorSession,
} from '@/lib/activeTailorSession';

describe('activeTailorSession', () => {
  beforeEach(() => {
    clearActiveTailorSession();
  });

  test('stores and merges a session for the same source job', () => {
    setActiveTailorSession({
      sourceJobId: 'j1',
      title: 'SWE',
      company: 'Acme',
      status: 'handed_off',
    });
    setActiveTailorSession({
      sourceJobId: 'j1',
      backendJobId: 'bj-1',
      status: 'running',
    });
    const s = getActiveTailorSession();
    expect(s?.sourceJobId).toBe('j1');
    expect(s?.title).toBe('SWE');
    expect(s?.backendJobId).toBe('bj-1');
    expect(s?.status).toBe('running');
    expect(roleLabel(s!)).toBe('SWE @ Acme');
  });

  test('clear removes the session', () => {
    setActiveTailorSession({ sourceJobId: 'j1', status: 'ready' });
    clearActiveTailorSession();
    expect(getActiveTailorSession()).toBeNull();
  });
});
