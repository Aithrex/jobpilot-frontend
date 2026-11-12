/**
 * Display-time cleanup for values that come from the backend or from scraped
 * postings. Two jobs:
 *
 * 1. Empty placeholders. Several backend records (the daily pipeline among
 *    them) use a dash to mean "no value", and an earlier copy sweep rewrote
 *    some of the frontend's comparisons against it, so "is there a salary?"
 *    quietly stopped matching and a bare dash reached the screen. Every check
 *    for "no value" goes through `isEmptyValue`, which accepts each spelling.
 *
 * 2. Ranges. "$120k – $150k" and "USD 170,000 - 210,000" read as machine
 *    output; the house style is "$120k to $150k". `rangeText` rewrites a dash
 *    between two numbers and leaves every other character alone, so a value is
 *    never changed, only its punctuation.
 */

// Whitespace and dashes only: "", "-", " - ", "--", em/en dash, minus sign.
const EMPTY_VALUE = /^[\s\u2010-\u2015\u2212-]*$/;

/** True for null, undefined, "" and dash-only placeholders. */
export function isEmptyValue(value: string | null | undefined): boolean {
  return value == null || EMPTY_VALUE.test(value);
}

/** The trimmed value, or null when it is empty or a dash placeholder. */
export function presentValue(value: string | null | undefined): string | null {
  return isEmptyValue(value) ? null : (value as string).trim();
}

// A dash (spaced hyphen, double hyphen, en or em dash) between two numbers,
// e.g. "120,000 - 150,000", "$120k – $150k", "2–4", "10:00 - 11:00".
const NUMERIC_RANGE = /(\d[\d,.:]*[kKmM]?\+?)(?:\s*[\u2013\u2014]\s*|\s+-{1,2}\s+|\s*--\s*)(?=[$\u20AC\u00A3]?\s?\d)/g;

/** Rewrite numeric ranges to "to": "$120k – $150k" becomes "$120k to $150k". */
export function rangeText(text: string): string;
export function rangeText(text: string | null | undefined): string | null | undefined;
export function rangeText(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text.replace(NUMERIC_RANGE, '$1 to ');
}

/** A salary string for display: null when empty, ranges written with "to". */
export function salaryDisplay(value: string | null | undefined): string | null {
  const present = presentValue(value);
  return present ? rangeText(present) : null;
}

/** Split a comma-separated flag list, dropping empty and dash placeholders. */
export function splitFlags(flags: string | null | undefined): string[] {
  return (flags || '')
    .split(',')
    .map((f) => f.trim())
    .filter((f) => !isEmptyValue(f));
}
