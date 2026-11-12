#!/usr/bin/env node
/**
 * Third-party license notices for /licenses.
 *
 * Walks the PRODUCTION dependency closure (package.json `dependencies`, then
 * each package's own `dependencies` and installed `optionalDependencies`;
 * never devDependencies, and never peers, which the host provides and lists
 * itself when it ships them) through node_modules, reads each
 * package's license metadata and LICENSE / NOTICE files, adds the self-hosted
 * fonts in public/fonts, and writes one JSON file the page imports:
 *
 *   src/components/legal/third-party-licenses.json
 *
 * The JSON is committed, so the page needs no build step. Rerun after any
 * dependency or font change:
 *
 *   pnpm licenses:generate            write the file
 *   pnpm licenses:generate --check    exit 1 if the committed file is stale
 *
 * License texts are copied VERBATIM. They are legal notices whose terms
 * require reproduction as written, so they are exempt from the house copy
 * rules (dashes, accents) that govern our own words.
 *
 * Resolution follows Node's algorithm (walk up looking for
 * node_modules/<name>) from each package's REAL path, which is exactly how
 * pnpm's symlinked layout resolves at runtime. No pnpm CLI is required.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'components', 'legal', 'third-party-licenses.json');
const FONT_DIR = join(ROOT, 'public', 'fonts');
const OFL_PATH = join(ROOT, 'scripts', 'licenses', 'OFL-1.1.txt');
const CHECK = process.argv.includes('--check');

/**
 * Every self-hosted font family, keyed by the file-name prefix in
 * public/fonts. A font file with no entry here fails the run: a font must not
 * ship without its notice. Copyright lines are the ones in each project's
 * OFL.txt.
 */
const FONT_REGISTRY = {
  'inter': {
    name: 'Inter',
    copyright: 'Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)',
    url: 'https://github.com/rsms/inter',
  },
  'plus-jakarta-sans': {
    name: 'Plus Jakarta Sans',
    copyright:
      'Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)',
    url: 'https://github.com/tokotype/PlusJakartaSans',
  },
  'jetbrains-mono': {
    name: 'JetBrains Mono',
    copyright:
      'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)',
    url: 'https://github.com/JetBrains/JetBrainsMono',
  },
};

const LICENSE_FILE = /^(un)?licen[cs]e([-_.].*)?$|^copying([-_.].*)?$|^notice([-_.].*)?$/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Node resolution: walk up from `fromDir` looking for node_modules/<name>. */
function findPackageDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function normalizeLicense(pkg) {
  const l = pkg.license ?? pkg.licenses;
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) {
    const types = l.map((x) => (typeof x === 'string' ? x : x?.type)).filter(Boolean);
    return types.length ? `(${types.join(' OR ')})` : 'UNKNOWN';
  }
  if (l && typeof l === 'object' && typeof l.type === 'string') return l.type;
  return 'UNKNOWN';
}

function normalizeRepository(pkg) {
  let url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!url) return typeof pkg.homepage === 'string' ? pkg.homepage : null;
  url = url.replace(/^git\+/, '').replace(/\.git$/, '');
  if (/^git:\/\//.test(url)) url = url.replace(/^git:\/\//, 'https://');
  if (/^git@github\.com:/.test(url)) url = url.replace(/^git@github\.com:/, 'https://github.com/');
  if (/^github:/.test(url)) url = `https://github.com/${url.slice('github:'.length)}`;
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) url = `https://github.com/${url}`;
  if (/^ssh:\/\/git@/.test(url)) url = url.replace(/^ssh:\/\/git@/, 'https://');
  return /^https?:\/\//.test(url) ? url : null;
}

function normalizeAuthor(pkg) {
  const a = pkg.author;
  if (!a) return null;
  if (typeof a === 'string') return a.replace(/\s*<[^>]*>/, '').replace(/\s*\([^)]*\)/, '').trim() || null;
  return typeof a.name === 'string' ? a.name : null;
}

function readLicenseTexts(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => LICENSE_FILE.test(n))
    .filter((n) => {
      try {
        return statSync(join(dir, n)).isFile();
      } catch {
        return false;
      }
    })
    .sort()
    .map((n) => readFileSync(join(dir, n), 'utf8').replace(/\r\n?/g, '\n').trim())
    .filter(Boolean);
}

function collectPackages() {
  const rootPkg = readJson(join(ROOT, 'package.json'));
  const seen = new Map(); // realpath -> entry
  const queue = Object.keys(rootPkg.dependencies ?? {}).map((name) => ({ name, from: ROOT, required: true }));

  while (queue.length) {
    const { name, from, required } = queue.shift();
    const dir = findPackageDir(name, from);
    if (!dir) {
      if (required) throw new Error(`generate-licenses: cannot resolve production dependency "${name}" from ${from}`);
      continue; // an optional or peer dependency that is not installed
    }
    if (seen.has(dir)) continue;
    const pkg = readJson(join(dir, 'package.json'));
    if (!pkg.name || !pkg.version) continue;
    seen.set(dir, {
      name: pkg.name,
      version: pkg.version,
      license: normalizeLicense(pkg),
      repository: normalizeRepository(pkg),
      author: normalizeAuthor(pkg),
      texts: readLicenseTexts(dir),
    });
    for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push({ name: dep, from: dir, required: true });
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) queue.push({ name: dep, from: dir, required: false });
  }

  // One entry per name@version (pnpm can hold the same version twice under
  // different peer contexts).
  const byKey = new Map();
  for (const entry of seen.values()) byKey.set(`${entry.name}@${entry.version}`, entry);
  return [...byKey.values()].sort((a, b) =>
    a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name),
  );
}

function collectFonts() {
  const ofl = readFileSync(OFL_PATH, 'utf8').replace(/\r\n?/g, '\n').trim();
  const families = new Map();
  const files = existsSync(FONT_DIR) ? readdirSync(FONT_DIR).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f)) : [];
  for (const file of files.sort()) {
    const key = Object.keys(FONT_REGISTRY)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => file.toLowerCase().startsWith(`${prefix}-`) || file.toLowerCase().startsWith(`${prefix}.`));
    if (!key) {
      throw new Error(
        `generate-licenses: public/fonts/${file} has no entry in FONT_REGISTRY. Add its family, copyright line and source URL.`,
      );
    }
    const meta = FONT_REGISTRY[key];
    const entry = families.get(key) ?? { ...meta, license: 'OFL-1.1', files: [], text: `${meta.copyright}\n\n${ofl}` };
    entry.files.push(file);
    families.set(key, entry);
  }
  return [...families.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Identical license texts (the same Apache 2.0 file in three Datadog
 * packages, say) are stored once in `texts` and referenced by index, which
 * roughly halves the file without dropping a single notice.
 */
function dedupeTexts(packages) {
  const texts = [];
  const index = new Map();
  const refs = packages.map(({ texts: own, ...rest }) => ({
    ...rest,
    textRefs: own.map((t) => {
      if (!index.has(t)) {
        index.set(t, texts.length);
        texts.push(t);
      }
      return index.get(t);
    }),
  }));
  return { texts, packages: refs };
}

function main() {
  const collected = collectPackages();
  const fonts = collectFonts();
  const { texts, packages } = dedupeTexts(collected);
  const payload = {
    note: 'Generated by scripts/generate-licenses.mjs from production dependencies and public/fonts. Do not edit by hand.',
    fonts,
    packages,
    texts,
  };
  const next = `${JSON.stringify(payload, null, 2)}\n`;

  if (CHECK) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== next) {
      console.error(`${relative(ROOT, OUT)} is stale. Run: pnpm licenses:generate`);
      process.exit(1);
    }
    console.log(`${relative(ROOT, OUT)} is up to date (${packages.length} packages, ${fonts.length} fonts).`);
    return;
  }

  writeFileSync(OUT, next, 'utf8');
  const missing = packages.filter((p) => p.textRefs.length === 0).length;
  console.log(
    `Wrote ${relative(ROOT, OUT)}: ${packages.length} packages (${missing} without a license file), ${fonts.length} font families.`,
  );
}

main();
