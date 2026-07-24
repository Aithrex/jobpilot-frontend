#!/usr/bin/env node
/**
 * ASCII copy sweep.
 *
 * House rule: user-facing copy never uses em/en dashes, curly quotes, or
 * accented characters. Typographic dashes and an accented "resume" are the
 * two strongest visual tells that a string was machine-written, and the
 * product's whole pitch is that a human wrote it.
 *
 * This rewrites source literals to ASCII equivalents:
 *   em dash  -> " - "   (spaced, so it reads as a break not a hyphen)
 *   en dash  -> "-"
 *   curly quotes -> straight quotes
 *   accented latin -> unaccented base letter
 *
 * Deliberately NOT touched:
 *   - the middot "·", which is the established separator in this UI
 *   - \uXXXX escape sequences already written as ASCII source
 *   - node_modules, dist, lockfiles, binary assets
 *
 * Run: node scripts/ascii-copy-sweep.mjs [--check]
 * --check exits non-zero if anything would change (for CI), without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');
const ROOT = 'src';
const EXTS = new Set(['.ts', '.tsx', '.css', '.html', '.md']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

// Order matters: longest/most-specific first.
//
// NOTE ON APOSTROPHES: a curly apostrophe inside a SINGLE-quoted JS literal
// cannot be naively straightened - 'It’s' becomes 'It's', which terminates the
// string early and is a syntax error. `fixQuotes` below rewrites the enclosing
// quotes to double quotes when that would happen. This bit me once already.
const REPLACEMENTS = [
  [/—/g, ' - '],   // em dash
  [/–/g, '-'],     // en dash
  [/‘/g, "'"],     // left single quote
  [/’/g, "'"],     // right single quote / apostrophe
  [/“/g, '"'],     // left double quote
  [/”/g, '"'],     // right double quote
  [/…/g, '...'],   // ellipsis
  [/é/g, 'e'], [/è/g, 'e'], [/ê/g, 'e'], [/ë/g, 'e'],
  [/É/g, 'E'], [/È/g, 'E'], [/Ê/g, 'E'],
  [/à/g, 'a'], [/á/g, 'a'], [/â/g, 'a'], [/ä/g, 'a'],
  [/í/g, 'i'], [/î/g, 'i'], [/ï/g, 'i'],
  [/ó/g, 'o'], [/ô/g, 'o'], [/ö/g, 'o'],
  [/ú/g, 'u'], [/ü/g, 'u'], [/ñ/g, 'n'], [/ç/g, 'c'],
];

// Collapse the artifacts a naive em-dash swap creates.
//
// These are applied ONLY to the region after the first non-whitespace character
// of a line. An earlier version ran `/ {3,}/g -> '  '` over the whole file and
// flattened the indentation of 204 files in one pass. Leading whitespace is
// never touched now.
const CLEANUPS = [
  [/ {2,}-{1} {2,}/g, ' - '],
  [/([(\[]) - /g, '$1'],
  [/ - ([)\]])/g, '$1'],
  [/ +- +\./g, '.'],
];

/** Apply cleanups to a line's content, never its indentation. */
function cleanLine(line) {
  const m = line.match(/^(\s*)([\s\S]*)$/);
  const indent = m[1];
  let body = m[2];
  for (const [re, to] of CLEANUPS) body = body.replace(re, to);
  return indent + body;
}

/**
 * Re-quote single-quoted literals that would now contain a bare apostrophe.
 * Runs BEFORE the apostrophe replacement, on the original text, so it can see
 * which literals are about to break.
 */
function fixQuotes(text) {
  return text.replace(/'([^'\n\\]*[‘’][^'\n\\]*)'/g, (whole, body) =>
    body.includes('"') ? whole : `"${body}"`
  );
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

let changedFiles = 0;
let totalSubs = 0;
const report = [];

for (const file of walk(ROOT)) {
  const original = readFileSync(file, 'utf8');
  // A file that is not valid UTF-8 would come back with U+FFFD here, and
  // writing it out would make that corruption permanent. Skip instead.
  if (original.includes('�')) {
    console.warn(`  SKIP (not valid UTF-8, would corrupt): ${file}`);
    continue;
  }
  let next = fixQuotes(original);
  let subs = 0;

  for (const [re, to] of REPLACEMENTS) {
    const hits = next.match(re);
    if (hits) {
      subs += hits.length;
      next = next.replace(re, to);
    }
  }
  if (subs > 0) next = next.split('\n').map(cleanLine).join('\n');

  if (next !== original) {
    changedFiles += 1;
    totalSubs += subs;
    report.push(`  ${String(subs).padStart(4)}  ${file}`);
    if (!CHECK_ONLY) writeFileSync(file, next, 'utf8');
  }
}

console.log(report.sort().join('\n'));
console.log(
  `\n${CHECK_ONLY ? 'WOULD CHANGE' : 'CHANGED'}: ${totalSubs} substitutions across ${changedFiles} files`
);

if (CHECK_ONLY && changedFiles > 0) process.exit(1);
