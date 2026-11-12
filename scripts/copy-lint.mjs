#!/usr/bin/env node
/**
 * Copy lint: dash punctuation and accented letters in user-visible strings.
 *
 * House rule: a person never reads an em dash, an en dash, a spaced hyphen
 * used as punctuation (" - "), a double hyphen between words, a leading "- "
 * separator, or an accented letter ("resume", never the accented form). Those
 * read as machine-written text. Each one is rewritten by hand: a period, a
 * comma, a colon, "to" for ranges, or the house middot "·" between labels.
 * Hyphenated words ("full-time", "H-1B") are fine, and so are "·" and "→".
 *
 * Unlike the old regex sweep, this parses every file with the TypeScript
 * compiler and only looks at strings a person can read:
 *   - JSX text, and string or template literals inside JSX child expressions
 *   - copy attributes: title, aria-label, aria-description, placeholder, alt,
 *     label, description, tooltip, content, message, subtitle, heading,
 *     helperText, emptyText (and any prop whose name ends in one of those words)
 *   - toast(...), toast.success/error/info/warning/message/loading/promise,
 *     alert/confirm/prompt, setError(...)-style state setters, new Error(...)
 *   - object properties, variables, parameters and functions with copy-like
 *     names (title, description, label, message, tooltip, placeholder,
 *     subtitle, body, cta, hint, helper, empty*, error*, ...)
 * A literal whose context is neither clearly copy nor clearly code (a helper
 * that returns a label, an argument to a formatting function) is checked the
 * same way: in this codebase such strings are nearly always shown to someone.
 *
 * Never checked: comments, imports, className/class/style and other code
 * attributes, cn()/clsx() arguments, comparisons (`x === '—'`), switch cases,
 * map keys, string-search arguments (`s.split(' - ')`), console.*, regex
 * literals, type positions, URLs, CSS values, date-format strings, test ids.
 *
 * Escape hatch for a rare legitimate case, on the same line or the line above:
 *   // copy-lint-ignore: <reason>        or   {/* copy-lint-ignore: <reason> *\/}
 * A marker without a reason does not suppress anything.
 *
 * Curly quotes are reported too, so this replaces the old ASCII sweep as the
 * gate (`pnpm copy:check`); `pnpm copy:fix` can still straighten quotes.
 *
 * Run: node scripts/copy-lint.mjs [--check] [--json] [paths...]
 *   --check  exit 1 when anything is found (CI)
 *   --json   machine-readable output
 * Output: file:line:col  snippet  [kind]
 */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '__tests__', '__mocks__', '__fixtures__']);

/** Test files and test-only fixtures are not rendered to users. */
export function isScannable(path) {
  const p = path.split(sep).join('/');
  if (!SOURCE_EXTS.has(extname(p))) return false;
  if (p.endsWith('.d.ts')) return false;
  if (extname(p) === '.js' && !/(^|\/)extension\//.test(p)) return false; // only the extension ships hand-written JS
  if (/\.(test|spec)\.[tj]sx?$/.test(p)) return false;
  if (/(^|\/)src\/test\//.test(p)) return false;
  return !p.split('/').some((seg) => SKIP_DIRS.has(seg));
}

// ---------------------------------------------------------------------------
// What a violation looks like in a piece of text.
//
// Template substitutions are replaced by PLACEHOLDER before matching, so
// `${min} - ${max}` is checked as "\u0001 - \u0001" and a hyphen between two
// values counts as punctuation.
// ---------------------------------------------------------------------------
const PLACEHOLDER = '\u0001';

const TYPOGRAPHIC_RULES = [
  { kind: 'em dash', re: /\u2014/g },
  { kind: 'en dash', re: /\u2013/g },
  { kind: 'dash', re: /[\u2012\u2015\u2E3A\u2E3B]/g },
  { kind: 'accented letter', re: /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]/g },
  { kind: 'curly quote', re: /[\u2018\u2019\u201C\u201D]/g },
];

const ASCII_RULES = [
  // A hyphen standing alone between spaces, at the start of a line followed
  // by a space ("- item"), at the end after a space ("Engineer -"), or as the
  // whole string ("-", an empty-value placeholder).
  { kind: 'spaced hyphen', re: /(?:^|(?<=\s))-(?=\s|$)/g },
  // "--" between words, or standing alone.
  { kind: 'double hyphen', re: /(?<=^|[\s\w\u0001)])-{2,}(?=$|[\s\w\u0001(])/g },
];

/** Strings that are code, not copy, whatever their context. */
function looksLikeCode(text) {
  const t = text.trim();
  if (!t) return true;
  if (/^(https?:|mailto:|tel:|data:|blob:|wss?:)/i.test(t)) return true;
  if (/^(\.{0,2}\/)[\w\-./:?=&%#\u0001]*$/.test(t)) return true; // paths, routes
  if (/\b(calc|var|min|max|clamp)\(/.test(t)) return true; // CSS values
  if (/^--[a-z]/.test(t)) return true; // CSS custom property / CLI flag
  if (/^[a-z0-9]+(-[a-z0-9]+)*--[a-z0-9-]+$/.test(t)) return true; // BEM class name
  return false;
}

/** Date-fns style format patterns, e.g. "MMM d - h:mm a". */
function looksLikeDateFormat(text) {
  return /^[yMdHhmsaEo\s,.:/'\-]+$/.test(text) && /(yy|MM|dd|HH|hh|mm|ss)/.test(text);
}

/** JSX text keeps HTML entities as written; decode the dash ones. */
function decodeEntities(text) {
  return text
    .replace(/&mdash;|&#8212;|&#x2014;/gi, (m) => '\u2014'.padEnd(m.length, ' '))
    .replace(/&ndash;|&#8211;|&#x2013;/gi, (m) => '\u2013'.padEnd(m.length, ' '));
}

/** Violations in one piece of text. `text` is already known to be copy. */
export function findInText(text) {
  if (looksLikeCode(text)) return [];
  const hits = [];
  for (const { kind, re } of TYPOGRAPHIC_RULES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) hits.push({ kind, index: m.index });
  }
  if (!looksLikeDateFormat(text)) {
    for (const { kind, re } of ASCII_RULES) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        const at = m.index + m[0].indexOf('-');
        hits.push({ kind, index: at });
      }
    }
  }
  // One report per kind per literal position is enough.
  const seen = new Set();
  return hits
    .sort((a, b) => a.index - b.index)
    .filter((h) => {
      const k = `${h.kind}@${h.index}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// ---------------------------------------------------------------------------
// Names: is this identifier the name of a piece of copy, or of code?
// ---------------------------------------------------------------------------
const COPY_WORDS = new Set([
  'title', 'subtitle', 'heading', 'headline', 'subheading', 'label', 'labels', 'description', 'desc',
  'message', 'messages', 'msg', 'tooltip', 'tip', 'placeholder', 'body', 'cta', 'hint', 'helper',
  'caption', 'text', 'copy', 'summary', 'blurb', 'tagline', 'empty', 'error', 'errors', 'alt',
  'content', 'detail', 'details', 'reason', 'explanation', 'explain', 'subject', 'banner', 'toast',
  'warning', 'notice', 'note', 'notes', 'lede', 'intro', 'kicker', 'eyebrow', 'prompt', 'question',
  'answer', 'status', 'display', 'describe', 'humanize', 'pretty', 'format', 'phrase', 'sentence',
  'line', 'lines', 'aria', 'confirm', 'success', 'failure', 'fallback', 'tooltip', 'legend', 'quote',
  'testimonial', 'bullet', 'bullets', 'paragraph', 'blurb', 'why', 'action', 'button', 'link',
]);

const CODE_WORDS = new Set([
  'id', 'ids', 'key', 'keys', 'class', 'classname', 'classes', 'style', 'styles', 'url', 'urls', 'href',
  'src', 'path', 'paths', 'route', 'regex', 're', 'pattern', 'icon', 'color', 'colour', 'tone', 'variant',
  'type', 'kind', 'slug', 'ref', 'code', 'codes', 'name' /* handled below */, 'testid', 'selector',
  'event', 'storage', 'query', 'param', 'params', 'header', 'headers', 'method', 'mime', 'ext',
  'locale', 'tz', 'timezone', 'size', 'width', 'height', 'gradient', 'bg', 'ring', 'border', 'shadow',
]);

function words(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** 'copy' | 'code' | null (neutral, keep looking further out). */
export function nameKind(name) {
  if (!name) return null;
  if (/^(className|class|style|key|id|htmlFor|href|src|to|rel|target|role|type|variant|size|as|d|viewBox|fill|stroke|transform|points|width|height|x|y|cx|cy|r|lang|dir|method|action|accept|autoComplete|inputMode|pattern|form|encType)$/.test(name)) {
    return 'code';
  }
  if (/^data-/.test(name) || /^test[-_]?id$/i.test(name) || /testid$/i.test(name)) return 'code';
  if (/^aria-(label|description|valuetext|roledescription|placeholder)$/.test(name)) return 'copy';
  if (/^aria-/.test(name)) return 'code';
  const ws = words(name);
  if (ws.length === 0) return null;
  const last = ws[ws.length - 1];
  if (CODE_WORDS.has(last) && last !== 'name') return 'code';
  if (ws.some((w) => COPY_WORDS.has(w))) return 'copy';
  return null;
}

// ---------------------------------------------------------------------------
// Context: walk outward from a literal until something decides.
// ---------------------------------------------------------------------------
const CLASS_HELPERS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge', 'classNames', 'classnames', 'tv']);
const COPY_CALLS = new Set(['toast', 'alert', 'confirm', 'prompt', 'announce']);
const CODE_CALLS = new Set([
  'RegExp', 'require', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
  'closest', 'matches', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'CustomEvent', 'Event',
  'getItem', 'setItem', 'removeItem', 'getAttribute', 'setAttribute', 'hasAttribute', 'removeAttribute',
  'format', 'formatInTimeZone', 'parse', 'parseISO', 'useQuery', 'useMutation', 'invalidateQueries',
  'setQueryData', 'getQueryData', 'fetch', 'postMessage', 'createElement', 'matchMedia', 'track',
  'trackEvent', 'logEvent', 'capture', 'addAction', 'addError', 'Symbol', 'atob', 'btoa',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'Date', 'Intl', 'DateTimeFormat', 'NumberFormat',
  'toLocaleDateString', 'toLocaleTimeString', 'toLocaleString', 'localeCompare', 'navigate', 'Blob', 'File',
]);
// Methods whose FIRST argument is something to search for, not text to show.
const SEARCH_METHODS = new Set([
  'replace', 'replaceAll', 'split', 'includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf',
  'match', 'matchAll', 'search', 'has', 'get', 'delete', 'set', 'add', 'test', 'exec', 'getAll',
  'append', 'padStart', 'padEnd', 'trimStart', 'on', 'off', 'emit', 'once',
]);

function calleeInfo(expr) {
  if (ts.isIdentifier(expr)) return { name: expr.text, object: null };
  if (ts.isPropertyAccessExpression(expr)) {
    const obj = expr.expression;
    let objectName = null;
    if (ts.isIdentifier(obj)) objectName = obj.text;
    else if (ts.isPropertyAccessExpression(obj)) objectName = obj.name.text;
    return { name: expr.name.text, object: objectName };
  }
  if (expr.kind === ts.SyntaxKind.ImportKeyword) return { name: 'import', object: null };
  return { name: null, object: null };
}

function decideCall(node, child) {
  const { name, object } = calleeInfo(node.expression);
  const argIndex = node.arguments ? node.arguments.indexOf(child) : -1;
  if (argIndex < 0) return 'continue';
  if (name === 'import' || name === 'require') return 'ignore';
  if (object === 'console') return 'ignore';
  if (object === 'toast' || (name && COPY_CALLS.has(name))) return 'copy';
  if (name && CLASS_HELPERS.has(name)) return 'ignore';
  if (name && CODE_CALLS.has(name)) return 'ignore';
  if (object === 'JSON' || object === 'Object' || object === 'Reflect' || object === 'localStorage' || object === 'sessionStorage' || object === 'document' || object === 'history' || object === 'searchParams' || object === 'params' || object === 'url') {
    return 'ignore';
  }
  if (name && SEARCH_METHODS.has(name) && argIndex === 0 && object !== null) return 'ignore';
  // Slug building: s.replace(/\s+/g, '-'), parts.join('-').
  if ((name === 'replace' || name === 'replaceAll' || name === 'join') && ts.isStringLiteralLike(child) && !/\s/.test(child.text)) {
    return 'ignore';
  }
  if (name && /^set[A-Z]/.test(name)) {
    const kind = nameKind(name.slice(3));
    if (kind === 'copy') return 'copy';
    return 'unknown';
  }
  if (name && /Error$/.test(name) && ts.isNewExpression(node)) return 'copy';
  return 'continue';
}

function propertyNameText(nameNode) {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) return nameNode.text;
  return null;
}

function bindingNameText(nameNode) {
  return nameNode && ts.isIdentifier(nameNode) ? nameNode.text : null;
}

function fromName(name) {
  const kind = nameKind(name);
  if (kind === 'copy') return 'copy';
  if (kind === 'code') return 'ignore';
  return null;
}

/** Name of the function a `return` belongs to, or null for anonymous ones. */
function functionName(fn) {
  if (ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn)) {
    return propertyNameText(fn.name);
  }
  return null;
}

export function classify(lit) {
  let child = lit;
  let node = lit.parent;
  while (node) {
    if (ts.isTypeNode(node) && !ts.isExpressionWithTypeArguments(node)) return 'ignore';
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ImportEqualsDeclaration:
      case ts.SyntaxKind.ExternalModuleReference:
      case ts.SyntaxKind.TaggedTemplateExpression:
      case ts.SyntaxKind.Decorator:
      case ts.SyntaxKind.ComputedPropertyName:
      case ts.SyntaxKind.LiteralType:
        return 'ignore';
      case ts.SyntaxKind.JsxAttribute: {
        const name = node.name.getText();
        const kind = nameKind(name);
        if (kind === 'copy') return 'copy';
        if (kind === 'code') return 'ignore';
        return 'unknown';
      }
      case ts.SyntaxKind.JsxExpression:
        if (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) return 'copy';
        break;
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression: {
        const d = decideCall(node, child);
        if (d !== 'continue') return d;
        break;
      }
      case ts.SyntaxKind.BinaryExpression: {
        const op = node.operatorToken.kind;
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          op === ts.SyntaxKind.EqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsToken ||
          op === ts.SyntaxKind.InKeyword ||
          op === ts.SyntaxKind.InstanceOfKeyword ||
          op === ts.SyntaxKind.LessThanToken ||
          op === ts.SyntaxKind.GreaterThanToken
        ) {
          return 'ignore';
        }
        if (op === ts.SyntaxKind.EqualsToken && child === node.right) {
          // x.title = '...'
          const left = node.left;
          const n = ts.isPropertyAccessExpression(left) ? left.name.text : ts.isIdentifier(left) ? left.text : null;
          return fromName(n) ?? 'unknown';
        }
        break;
      }
      case ts.SyntaxKind.CaseClause:
        if (child === node.expression) return 'ignore';
        return 'unknown';
      case ts.SyntaxKind.ElementAccessExpression:
        if (child === node.argumentExpression) return 'ignore';
        break;
      case ts.SyntaxKind.ConditionalExpression:
        if (child === node.condition) return 'ignore';
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        return 'unknown';
      case ts.SyntaxKind.PropertyAssignment: {
        if (child === node.name) return 'ignore';
        const d = fromName(propertyNameText(node.name));
        if (d) return d;
        break;
      }
      case ts.SyntaxKind.PropertyDeclaration:
      case ts.SyntaxKind.VariableDeclaration:
      case ts.SyntaxKind.Parameter:
      case ts.SyntaxKind.BindingElement: {
        if (child === node.name) return 'ignore';
        const n = ts.isPropertyDeclaration(node) ? propertyNameText(node.name) : bindingNameText(node.name) ?? (ts.isBindingElement(node) ? propertyNameText(node.propertyName) : null);
        const d = fromName(n);
        if (d) return d;
        // An anonymous object or array of copy stays neutral; a scalar
        // assigned to a neutral name is unknown.
        return 'unknown';
      }
      case ts.SyntaxKind.EnumMember:
      case ts.SyntaxKind.ExportAssignment:
        return 'unknown';
      case ts.SyntaxKind.ThrowStatement:
        return 'copy';
      case ts.SyntaxKind.ReturnStatement: {
        let fn = node.parent;
        while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
        if (!fn) return 'unknown';
        const n = functionName(fn);
        if (n) return fromName(n) ?? 'unknown';
        child = fn;
        node = fn.parent;
        continue;
      }
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        break;
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.GetAccessor:
        return fromName(functionName(node)) ?? 'unknown';
      default:
        if (ts.isStatement(node) || ts.isSourceFile(node) || ts.isBlock(node)) return 'unknown';
    }
    child = node;
    node = node.parent;
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Scanning a file.
// ---------------------------------------------------------------------------
function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { text: node.text, parts: [{ text: node.text, node }] };
  }
  if (ts.isTemplateExpression(node)) {
    const parts = [{ text: node.head.text, node: node.head }];
    for (const span of node.templateSpans) parts.push({ text: span.literal.text, node: span.literal });
    return { text: parts.map((p) => p.text).join(PLACEHOLDER), parts };
  }
  return null;
}

function ignoredLines(sourceText) {
  const out = new Set();
  const lines = sourceText.split('\n');
  lines.forEach((line, i) => {
    if (/copy-lint-ignore:\s*\S/.test(line)) {
      out.add(i);
      out.add(i + 1);
    }
  });
  return out;
}

function snippetAround(text, index) {
  const flat = text.replace(new RegExp(PLACEHOLDER, 'g'), '${...}');
  const shift = flat.slice(0, index + 1).length - text.slice(0, index + 1).length;
  const at = index + shift;
  const start = Math.max(0, at - 40);
  const end = Math.min(flat.length, at + 40);
  const body = flat.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '...' : ''}${body}${end < flat.length ? '...' : ''}`;
}

/**
 * Map an index in the joined literal text back to a source offset. Each part
 * starts one character after its opening quote, backtick or "}". Escapes can
 * shift this by a few columns, which is close enough to find the spot.
 */
function positionOf(sf, entry, index) {
  let offset = index;
  for (const part of entry.parts) {
    if (offset <= part.text.length) return part.node.getStart(sf) + 1 + offset;
    offset -= part.text.length + 1;
  }
  return entry.parts[0].node.getStart(sf);
}

/**
 * `{from}-{to}`: a bare "-" glued between two expressions renders as "1-25",
 * a hyphenated range, not dash punctuation.
 */
function isGluedHyphen(node) {
  if (node.text !== '-') return false;
  const siblings = node.parent && node.parent.children;
  if (!siblings) return false;
  const i = siblings.indexOf(node);
  return i > 0 && i < siblings.length - 1 && !ts.isJsxText(siblings[i - 1]) && !ts.isJsxText(siblings[i + 1]);
}

/**
 * HTML pages (public/*.html, the extension popup): text between tags and the
 * copy attributes. Styles, scripts and comments are blanked first, keeping
 * offsets so line:col stay right.
 */
const HTML_COPY_ATTR = /\s(title|alt|aria-label|aria-description|placeholder|content|label)\s*=\s*"([^"]*)"/gi;
export function lintHtml(sourceText, fileName = 'file.html') {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const body = sourceText.replace(/<(style|script)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, blank);
  const ignore = ignoredLines(sourceText);
  const lineStarts = [0];
  for (let i = 0; i < sourceText.length; i++) if (sourceText[i] === '\n') lineStarts.push(i + 1);
  const pos = (offset) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return { line: lo, col: offset - lineStarts[lo] };
  };
  const out = [];
  const check = (text, start) => {
    const decoded = decodeEntities(text);
    if (!decoded.trim()) return;
    for (const hit of findInText(decoded)) {
      const { line, col } = pos(start + hit.index);
      if (ignore.has(line)) continue;
      out.push({ file: fileName, line: line + 1, col: col + 1, kind: hit.kind, snippet: snippetAround(decoded, hit.index) });
    }
  };
  for (const m of body.matchAll(/>([^<]+)</g)) check(m[1], m.index + 1);
  for (const tag of body.matchAll(/<[a-zA-Z][^>]*>/g)) {
    for (const a of tag[0].matchAll(HTML_COPY_ATTR)) check(a[2], tag.index + a.index + a[0].indexOf('"') + 1);
  }
  return out.sort((x, y) => x.line - y.line || x.col - y.col);
}

export function lintSource(sourceText, fileName = 'file.tsx') {
  if (fileName.endsWith('.html')) return lintHtml(sourceText, fileName);
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : fileName.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, kind);
  const ignore = ignoredLines(sourceText);
  const out = [];

  const report = (pos, kindName, snippet) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(pos);
    if (ignore.has(line)) return;
    out.push({ file: fileName, line: line + 1, col: character + 1, kind: kindName, snippet });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = decodeEntities(node.text);
      if (text.trim() && !isGluedHyphen(node)) {
        for (const hit of findInText(text)) {
          report(node.pos + hit.index, hit.kind, snippetAround(text, hit.index));
        }
      }
      return;
    }
    if (ts.isTemplateExpression(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const entry = literalText(node);
      if (entry && entry.text) {
        if (classify(node) !== 'ignore') {
          for (const hit of findInText(entry.text)) {
            report(positionOf(sf, entry, hit.index), hit.kind, snippetAround(entry.text, hit.index));
          }
        }
      }
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) visit(span.expression);
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (isScannable(p)) out.push(p);
  }
  return out;
}

/** Lint a directory tree (default: src/ of this repo). Paths are repo-relative with forward slashes. */
export function lintTree(roots = ['src', 'extension', 'public'].map((d) => join(REPO_ROOT, d))) {
  const files = [];
  for (const root of roots) {
    const abs = resolve(root);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  const results = [];
  for (const file of files.sort()) {
    const rel = relative(REPO_ROOT, file).split(sep).join('/');
    results.push(...lintSource(readFileSync(file, 'utf8'), rel));
  }
  return results;
}

export function formatViolation(v) {
  return `${v.file}:${v.line}:${v.col}  ${v.snippet}  [${v.kind}]`;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const json = args.includes('--json');
  const paths = args.filter((a) => !a.startsWith('--'));
  const results = lintTree(paths.length ? paths : undefined);
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const v of results) console.log(formatViolation(v));
    const files = new Set(results.map((v) => v.file)).size;
    console.log(`\ncopy-lint: ${results.length} violation${results.length === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'}`);
  }
  if (check && results.length > 0) process.exit(1);
}
