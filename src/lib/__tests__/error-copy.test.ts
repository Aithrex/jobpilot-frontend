/**
 * One voice for errors: a person never reads a status number, a machine code
 * or a stack trace, and a sentence the server wrote for people is never
 * rewritten.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { userFacingError } from '@/lib/errorCopy';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

describe('userFacingError', () => {
  test('a sentence written for people is shown exactly as sent', () => {
    for (const sentence of [
      'That email is already registered.',
      'Invalid email or password',
      'Session expired. Please sign in again.',
      'File storage is temporarily unavailable. Please try again in a few minutes.',
    ]) {
      expect(userFacingError(sentence, 400)).toBe(sentence);
    }
  });

  test('known machine codes become the sentence for that code', () => {
    expect(userFacingError('resume_not_parsed', 409)).toMatch(/still reading this resume/i);
    expect(userFacingError('daily_quota_exceeded', 429)).toMatch(/today's limit/i);
    expect(userFacingError('UPGRADE_REQUIRED', 403)).toMatch(/paid plan/i);
  });

  test.each([
    ['HTTP 502', 502],
    ['Bad Gateway', 502],
    ['internal server error', 500],
    ['some_unknown_code', 500],
    ['KeyError: "resume"', 500],
    ['Traceback (most recent call last): File "app.py"', 500],
    ['<html><body>502</body></html>', 502],
    ['{"detail":"boom"}', 500],
  ])('%s never reaches the screen', (raw, status) => {
    const shown = userFacingError(raw, status);
    expect(shown).toBe('Something went wrong on our side. Please try again in a moment.');
    expect(shown).not.toMatch(/\d{3}|_|Error:|Traceback|</);
  });

  test('a bare status still says what to do', () => {
    expect(userFacingError('', 404)).toMatch(/could not find that/i);
    expect(userFacingError(undefined, 403)).toMatch(/do not have permission/i);
    expect(userFacingError('HTTP 429', 429)).toMatch(/wait a moment/i);
    expect(userFacingError('HTTP 413', 413)).toMatch(/too large/i);
    expect(userFacingError(null)).toBe('Something went wrong. Please try again.');
  });

  test("the browser's wording for a request that never left is replaced", () => {
    expect(userFacingError('Failed to fetch')).toBe('Something went wrong. Please try again.');
    expect(userFacingError('NetworkError when attempting to fetch resource.')).not.toMatch(/NetworkError/);
  });

  test('every message ends as a sentence, with no exclamation mark', () => {
    for (const status of [400, 401, 403, 404, 408, 409, 413, 422, 429, 500, 503, 504, undefined]) {
      const shown = userFacingError('', status);
      expect(shown).toMatch(/\.$/);
      expect(shown).not.toMatch(/!/);
    }
  });
});

describe('notifyError', () => {
  beforeEach(() => toastError.mockClear());

  test('a title that says what failed, with the reason under it', async () => {
    const { notifyError } = await import('@/lib/notify');

    notifyError("Couldn't save your profile", 'HTTP 500', 500);
    expect(toastError).toHaveBeenCalledWith("Couldn't save your profile", {
      description: 'Something went wrong on our side. Please try again in a moment.',
    });
  });

  test('no reason, or a reason that only repeats the title, shows the title alone', async () => {
    const { notifyError } = await import('@/lib/notify');

    notifyError("Couldn't copy");
    expect(toastError).toHaveBeenLastCalledWith("Couldn't copy", undefined);
    notifyError("Couldn't copy", "couldn't copy");
    expect(toastError).toHaveBeenLastCalledWith("Couldn't copy", undefined);
  });
});
