import { afterEach, describe, expect, it } from 'vitest';
import { currentAccountKey, ownedByAnotherAccount } from '@/lib/accountKey';

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const signIn = (sub: string) =>
  localStorage.setItem('auth_token', `${b64url({ alg: 'HS256' })}.${b64url({ sub })}.sig`);

afterEach(() => localStorage.clear());

describe('account key for browser-stored prefs', () => {
  it('is stable per account, differs between accounts, and never holds the email', () => {
    signIn('tej@example.com');
    const tej = currentAccountKey();
    expect(tej).toBeTruthy();
    expect(tej).not.toContain('tej');
    signIn('TEJ@example.com ');
    expect(currentAccountKey()).toBe(tej);
    signIn('bhavya@example.com');
    expect(currentAccountKey()).not.toBe(tej);
  });

  it('is empty when signed out or the token is unreadable', () => {
    expect(currentAccountKey()).toBe('');
    localStorage.setItem('auth_token', 'not-a-jwt');
    expect(currentAccountKey()).toBe('');
  });

  it('only a stamp naming a different signed-in account is foreign', () => {
    signIn('tej@example.com');
    const tej = currentAccountKey();
    expect(ownedByAnotherAccount(tej)).toBe(false);
    expect(ownedByAnotherAccount(undefined)).toBe(false); // saved before stamping
    signIn('bhavya@example.com');
    expect(ownedByAnotherAccount(tej)).toBe(true);
    localStorage.removeItem('auth_token');
    expect(ownedByAnotherAccount(tej)).toBe(false); // signed out: nothing to protect
  });
});
