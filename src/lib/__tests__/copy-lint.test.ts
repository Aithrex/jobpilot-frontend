/**
 * The copy lint (scripts/copy-lint.mjs) is the CI gate for the house rule that
 * user-visible text carries no dash punctuation and no accented letters. The
 * first block pins what the lint does and does not flag; the last test runs it
 * over the whole of src/ and expects nothing, so a regression fails CI.
 */
import { describe, expect, it } from 'vitest';
import { formatViolation, lintSource, lintTree, nameKind } from '../../../scripts/copy-lint.mjs';

const EM = '—';
const EN = '–';

function kinds(source: string, file = 'x.tsx') {
  return lintSource(source, file).map((v) => v.kind);
}

describe('copy lint: what counts as copy', () => {
  it('flags JSX text', () => {
    expect(kinds(`export const A = () => <p>Upload your resume ${EM} we do the rest</p>;`)).toEqual(['em dash']);
    expect(kinds(`export const A = () => <p>Free - no card needed</p>;`)).toEqual(['spaced hyphen']);
    expect(kinds(`export const A = () => <p>Before &mdash; after</p>;`)).toEqual(['em dash']);
  });

  it('flags literals inside JSX child expressions, including fallbacks', () => {
    expect(kinds(`export const A = ({ v }) => <span>{v ?? '${EM}'}</span>;`)).toEqual(['em dash']);
    expect(kinds(`export const A = ({ v }) => <span>{v || '-'}</span>;`)).toEqual(['spaced hyphen']);
    expect(kinds('export const A = ({ a, b }) => <span>{`${a} - ${b}`}</span>;')).toEqual(['spaced hyphen']);
  });

  it('flags hover text, labels and placeholders', () => {
    expect(kinds(`export const A = () => <b title="Match score ${EM} fit" />;`)).toEqual(['em dash']);
    expect(kinds(`export const A = () => <b aria-label="Close - dialog" />;`)).toEqual(['spaced hyphen']);
    expect(kinds(`export const A = () => <input placeholder={'e.g. 2${EN}4 weeks'} />;`)).toEqual(['en dash']);
    expect(kinds(`export const A = () => <Empty emptyText="Nothing here - yet" />;`)).toEqual(['spaced hyphen']);
  });

  it('flags toasts, state setters, thrown errors and copy-named properties', () => {
    expect(kinds(`toast.success('Saved - nice');`, 'x.ts')).toEqual(['spaced hyphen']);
    expect(kinds(`toast('Saved ${EM} nice', { description: 'More - here' });`, 'x.ts')).toEqual(['em dash', 'spaced hyphen']);
    expect(kinds(`setError('Upload failed - retry');`, 'x.ts')).toEqual(['spaced hyphen']);
    expect(kinds(`throw new Error('Upload failed - retry');`, 'x.ts')).toEqual(['spaced hyphen']);
    expect(kinds(`const x = { title: 'A - B', id: 'a - b' };`, 'x.ts')).toEqual(['spaced hyphen']);
    expect(kinds(`const EMPTY_MESSAGE = 'None - yet';`, 'x.ts')).toEqual(['spaced hyphen']);
  });

  it('flags helpers that return display text, and accents', () => {
    expect(kinds(`function pct(v) { if (v == null) return '-'; return v + '%'; }`, 'x.ts')).toEqual(['spaced hyphen']);
    expect(kinds(`const s = 'Your résumé';`, 'x.ts')).toEqual(['accented letter', 'accented letter']);
    expect(kinds(`const s = 'Word--word';`, 'x.ts')).toEqual(['double hyphen']);
  });
});

describe('copy lint: what it leaves alone', () => {
  it('ignores comments, imports, class names and styles', () => {
    expect(kinds(`// Upload ${EM} later\n/* a - b */\nexport const A = 1;`, 'x.ts')).toEqual([]);
    expect(kinds(`import x from './a - b';\nexport const A = 1;`, 'x.ts')).toEqual([]);
    expect(kinds(`export const A = () => <div className="a - b" style={{ width: 'calc(100% - 2rem)' }} />;`)).toEqual([]);
    expect(kinds(`const c = cn('p-2', on && 'a - b');`, 'x.ts')).toEqual([]);
  });

  it('ignores comparisons, map keys, search arguments and slugs', () => {
    expect(kinds(`if (salary === '${EM}' || s !== ' - ') {}`, 'x.ts')).toEqual([]);
    expect(kinds(`switch (v) { case '${EM}': break; }`, 'x.ts')).toEqual([]);
    expect(kinds(`const parts = s.split(' - '); const t = s.replace('${EM}', ', ');`, 'x.ts')).toEqual([]);
    expect(kinds(`const slug = s.replace(/\\s+/g, '-'); const k = parts.join('-');`, 'x.ts')).toEqual([]);
    expect(kinds(`const v = MAP['a - b'];`, 'x.ts')).toEqual([]);
  });

  it('ignores types, regexes, URLs, date formats, console and hyphenated words', () => {
    expect(kinds(`type R = 'a - b' | '${EM}';`, 'x.ts')).toEqual([]);
    expect(kinds(`const re = /\\s[${EM}${EN}]\\s/;`, 'x.ts')).toEqual([]);
    expect(kinds(`const label = 'https://example.com/a--b';`, 'x.ts')).toEqual([]);
    expect(kinds(`const d = format(date, 'MMM d - h:mm a');`, 'x.ts')).toEqual([]);
    expect(kinds(`console.warn('x ${EM} y');`, 'x.ts')).toEqual([]);
    expect(kinds(`export const A = () => <p>Full-time, H-1B, one-click, 2-4 years</p>;`)).toEqual([]);
    expect(kinds(`export const A = () => <p>Remote · Senior Engineer → Staff</p>;`)).toEqual([]);
    expect(kinds('export const A = ({ a, b }) => <p>Showing {a}-{b} of 9</p>;')).toEqual([]);
  });

  it('honors copy-lint-ignore only when a reason is given', () => {
    expect(kinds(`// copy-lint-ignore: minus sign in a stepper\nconst label = ' - ';`, 'x.ts')).toEqual([]);
    expect(kinds(`// copy-lint-ignore:\nconst label = ' - ';`, 'x.ts')).toEqual(['spaced hyphen']);
  });

  it('classifies names', () => {
    expect(nameKind('emptyStateTitle')).toBe('copy');
    expect(nameKind('aria-label')).toBe('copy');
    expect(nameKind('className')).toBe('code');
    expect(nameKind('data-testid')).toBe('code');
    expect(nameKind('labelId')).toBe('code');
    expect(nameKind('salary')).toBeNull();
  });

  it('reports file:line:col and a snippet', () => {
    const [v] = lintSource(`const a = 1;\nconst title = 'Before - after';`, 'src/x.ts');
    expect(formatViolation(v)).toBe('src/x.ts:2:23  Before - after  [spaced hyphen]');
  });
});

describe('copy lint: extension JS and HTML pages', () => {
  it('checks extension scripts like TS', () => {
    expect(kinds(`flash('Saved ${EM} nice');`, 'extension/content.js')).toEqual(['em dash']);
  });

  it('checks HTML text and copy attributes, not styles, scripts or comments', () => {
    const html = `<style>a{content:'${EM}'}</style><!-- a ${EM} b --><h1 title="A - B">Policy ${EM} Assistant</h1><script>x='${EM}'</script>`;
    expect(kinds(html, 'public/x.html')).toEqual(['spaced hyphen', 'em dash']);
  });
});

describe('copy lint: src/, extension/ and public/', () => {
  it('finds no dash punctuation or accented letters in user-visible strings', () => {
    const found = lintTree().map(formatViolation);
    expect(found, `Rewrite these by hand (see scripts/copy-lint.mjs):\n${found.join('\n')}`).toEqual([]);
  });
});
