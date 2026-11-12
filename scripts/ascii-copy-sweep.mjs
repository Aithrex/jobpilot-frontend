#!/usr/bin/env node
/**
 * ASCII copy sweep: curly quotes, ellipses and accented letters.
 *
 * House rule: user-facing copy never uses em/en dashes, curly quotes, or
 * accented characters. This script fixes the ones that have a safe mechanical
 * answer:
 *   curly quotes   -> straight quotes
 *   ellipsis       -> "..."
 *   accented latin -> unaccented base letter ("resume")
 *
 * It deliberately does NOT touch dashes any more. It used to turn every em
 * dash into " - ", which only swapped one machine tell for another; those
 * strings were later found and rewritten by hand. A dash in copy needs a
 * person to choose a period, a comma, a colon or "to", so the gate for
 * dashes is `pnpm copy:check` (scripts/copy-lint.mjs), which reports them and
 * leaves the rewrite to you.
 *
 * Also not touched:
 *   - the middot "·", which is the established separator in this UI
 *   - escape sequences already written as ASCII source
 *   - node_modules, dist, lockfiles, binary assets
 *
 * Run: node scripts/ascii-copy-sweep.mjs [--check] [paths...]
 * --check exits non-zero if anything would change, without writing.
 * Paths limit the sweep to those files or directories (default: src/).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');
const TARGETS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ROOTS = TARGETS.length ? TARGETS : ['src'];
const EXTS = new Set(['.ts', '.tsx', '.css', '.html', '.md']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

// Order matters: longest/most-specific first.
//
// NOTE ON APOSTROPHES: a curly apostrophe inside a SINGLE-quoted JS literal
// cannot be naively straightened - 'It’s' becomes 'It's', which terminates the
// string early and is a syntax error. `fixQuotes` below rewrites the enclosing
// quotes to double quotes when that would happen. This bit me once already.
const REPLACEMENTS = [
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

const files = ROOTS.flatMap((root) => (statSync(root).isDirectory() ? walk(root) : [root]));
for (const file of files) {
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
