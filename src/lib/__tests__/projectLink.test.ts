import { describe, expect, it } from 'vitest';
import { isProjectLink, projectLinkDisplay, projectLinkHref } from '@/lib/projectLink';

describe('projectLink', () => {
  it('accepts repo and demo links with or without a scheme', () => {
    expect(isProjectLink('github.com/priya/notes-qa-bot')).toBe(true);
    expect(isProjectLink('https://campus-events.vercel.app')).toBe(true);
    expect(isProjectLink('http://www.example.dev/demo/')).toBe(true);
  });

  it('rejects anything that is not an http link', () => {
    expect(isProjectLink('')).toBe(false);
    expect(isProjectLink('my cool repo')).toBe(false);
    expect(isProjectLink('priya@example.com')).toBe(false);
    expect(isProjectLink('javascript:alert(1)')).toBe(false);
    expect(isProjectLink('mailto:priya@example.com')).toBe(false);
    expect(isProjectLink('notes-bot')).toBe(false);
  });

  it('builds an https href only for a valid link', () => {
    expect(projectLinkHref('github.com/priya/x')).toBe('https://github.com/priya/x');
    expect(projectLinkHref('http://x.dev/a')).toBe('http://x.dev/a');
    expect(projectLinkHref('javascript:alert(1)')).toBeNull();
  });

  it('displays the link the way the PDF prints it', () => {
    expect(projectLinkDisplay('https://www.github.com/priya/x/')).toBe('github.com/priya/x');
    expect(projectLinkDisplay(undefined)).toBe('');
  });
});
