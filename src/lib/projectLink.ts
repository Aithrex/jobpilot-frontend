/**
 * Project links: display text and a safe href for a project's repo or demo URL.
 *
 * The backend attaches only links the uploaded résumé contains
 * (`services/project_links.py`); a user may also type one in the editor.
 * Screeners read these links — HackerRank's published intern rubric deducts
 * 3-5 points for every project without one.
 */

const SCHEME = /^https?:\/\//i;
const HOST = /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:\/\S*)?$/i;

/** Text without scheme, `www.` or trailing slash: `github.com/you/repo`. */
export function projectLinkDisplay(url: string | undefined | null): string {
  return String(url ?? '')
    .trim()
    .replace(SCHEME, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

/** True for an http(s) URL or a bare `host.tld/path`. Rejects emails, spaces and other schemes. */
export function isProjectLink(url: string | undefined | null): boolean {
  const raw = String(url ?? '').trim();
  if (!raw || /\s/.test(raw)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !SCHEME.test(raw)) return false; // javascript:, mailto:, ...
  const rest = raw.replace(SCHEME, '');
  if (rest.split('/')[0].includes('@')) return false;
  return HOST.test(rest);
}

/** An https href for a valid link, or null — never a non-http scheme. */
export function projectLinkHref(url: string | undefined | null): string | null {
  if (!isProjectLink(url)) return null;
  const raw = String(url).trim();
  return SCHEME.test(raw) ? raw : `https://${raw}`;
}
