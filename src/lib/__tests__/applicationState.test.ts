/**
 * A clicked Apply is not a submitted application.
 */
import { describe, expect, test } from 'vitest';

import { applicationStateLabel } from '@/lib/applicationState';

describe('application state copy', () => {
  test('opened but unconfirmed is never "Applied"', () => {
    const state = applicationStateLabel('interested', { opened: true });
    expect(state?.label).toBe('Opened application - not confirmed');
    expect(state?.label).not.toMatch(/^Applied/);
  });

  test('applied says the user confirmed it', () => {
    expect(applicationStateLabel('applied')?.label).toBe('Applied (you confirmed)');
    // Opening it again does not demote a confirmed application.
    expect(applicationStateLabel('applied', { opened: true })?.label).toBe('Applied (you confirmed)');
  });

  test('auto-apply outcomes keep their own names', () => {
    expect(applicationStateLabel('needs_input')?.label).toBe('Needs your input');
    expect(applicationStateLabel('failed')?.label).toBe('Submission failed');
    expect(applicationStateLabel('submitted')?.label).toMatch(/Submitted/);
  });

  test('saved is pre-application; an unknown status has no label', () => {
    expect(applicationStateLabel('interested')).toMatchObject({ label: 'Saved, not applied', preApplication: true });
    expect(applicationStateLabel('mystery')).toBeNull();
    expect(applicationStateLabel(null)).toBeNull();
  });
});
