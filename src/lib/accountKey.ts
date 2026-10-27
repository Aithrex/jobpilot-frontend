/**
 * Which account a browser-stored preference belongs to.
 *
 * The job feed's saved titles and scan scope live in localStorage, and logout
 * clears only the token. So on a shared browser the next account to sign in
 * inherited the previous one's titles - a brand-new account with one resume
 * searched someone else's roles (reported 2026-10-26). Stored prefs are now
 * stamped with this key and ignored when it names another account.
 *
 * Derived from the JWT's `sub` (the account email) and HASHED: localStorage is
 * no place for an address, and the stamp only has to tell accounts apart.
 * Returns '' when signed out or the token is unreadable.
 */
export function currentAccountKey(): string {
  let token: string | null = null;
  try {
    token = typeof window === 'undefined' ? null : window.localStorage.getItem('auth_token');
  } catch {
    return '';
  }
  const part = token?.split('.')[1];
  if (!part) return '';
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    const sub = String(payload?.sub ?? '').trim().toLowerCase();
    return sub ? fnv1a(sub) : '';
  } catch {
    return '';
  }
}

/** True when a stored stamp names a DIFFERENT signed-in account. An unstamped
 *  value (saved before stamping existed) is accepted: it is almost always the
 *  owner's own, and the title review catches the rest. */
export function ownedByAnotherAccount(stamp: unknown): boolean {
  if (typeof stamp !== 'string' || !stamp) return false;
  const me = currentAccountKey();
  return me !== '' && stamp !== me;
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
