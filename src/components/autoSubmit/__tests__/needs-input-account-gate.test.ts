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

describe('fill_failed — we hold the answer, the form would not take it', () => {
  // The backend names the exact field ("We have your answer for “Country”, but
  // this employer's form wouldn't accept it from us…"). Dropping that sentence
  // and falling back to generic wall copy reads as though we never had the
  // answer — which is what made the user re-answer `country` six times on the
  // same Adyen application.
  const held: NeedsInputItem = {
    kind: 'fill_failed',
    field_id: 'country',
    action: 'complete_in_browser',
    question:
      'We have your answer for “Country”, but this employer’s form wouldn’t ' +
      'accept it from us. Open the application and set that one field yourself.',
  };

  test("the backend's field-specific sentence is shown verbatim", () => {
    expect(wallHelp(held)).toBe(held.question);
  });

  test('it is a hand-off, not an answerable question', () => {
    // If this ever became answerable the user could "answer" it again and the
    // row would re-drive into the identical fill failure — the loop itself.
    expect(isBrowserWallItem(held)).toBe(true);
    expect(isAnswerableItem(held)).toBe(false);
    expect(wallNeedsUser(held)).toBe(true);
  });

  test('a legacy fill_failed row with no copy still says something useful', () => {
    const legacy: NeedsInputItem = {
      kind: 'fill_failed', field_id: 'country', action: 'complete_in_browser',
    };
    expect(wallHelp(legacy).trim().length).toBeGreaterThan(0);
  });
});
