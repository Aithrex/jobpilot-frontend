/**
 * The employer-account wall must stop reading like a chore we handed back.
 *
 * Backend contract: `auto_apply_service.account_gate_item` writes the copy,
 * because only the backend knows whether we can register at this vendor
 * (Workday yes; Greenhouse/Lever/Ashby have no signup flow at all). It sets
 * `action: "complete_in_browser"` ONLY when the user genuinely has to go do it.
 */
import { describe, expect, test } from 'vitest';
import {
  isAnswerableItem,
  isBrowserWallItem,
  wallHelp,
  wallLabel,
  wallNeedsUser,
} from '../needsInput';
import type { NeedsInputItem } from '@/types/autoSubmit';

const selfServed: NeedsInputItem = {
  kind: 'account',
  field_id: 'ats_account',
  question:
    "We're creating your employer account (a.b@my-private-mail.com) and signing in for you - no action needed.",
};

const unsupported: NeedsInputItem = {
  kind: 'account',
  field_id: 'ats_account',
  action: 'complete_in_browser',
  apply_url: 'https://boards.greenhouse.io/acme/jobs/1',
  question:
    "This employer's application system (greenhouse) requires an account before it accepts an application, and we can't create one there yet.",
};

describe('account gate items', () => {
  test('are still walls, never typeable', () => {
    expect(isBrowserWallItem(selfServed)).toBe(true);
    expect(isBrowserWallItem(unsupported)).toBe(true);
    expect(isAnswerableItem(selfServed)).toBe(false);
  });

  test('a self-served gate does not send the user anywhere', () => {
    expect(wallNeedsUser(selfServed)).toBe(false);
    expect(wallLabel(selfServed)).toBe('Setting up your employer account');
  });

  test('an unsupported vendor is an honest hand-off', () => {
    expect(wallNeedsUser(unsupported)).toBe(true);
    expect(wallLabel(unsupported)).toBe('Employer account required');
  });

  test("the backend's copy wins over the FE fallback", () => {
    expect(wallHelp(selfServed)).toBe(selfServed.question);
    expect(wallHelp(unsupported)).toBe(unsupported.question);
  });

  test('a legacy row with no backend copy still renders something useful', () => {
    const legacy: NeedsInputItem = { kind: 'account', field_id: 'ats_account' };
    expect(wallHelp(legacy)).toMatch(/employer requires an account/i);
  });

  test('other wall kinds are untouched', () => {
    const captcha: NeedsInputItem = { kind: 'oracle_captcha', question: 'x' };
    expect(wallNeedsUser(captcha)).toBe(true);
    expect(wallLabel(captcha)).toBe('Human check required');
    expect(wallHelp(captcha)).toMatch(/human-verification challenge/i);
  });
});
