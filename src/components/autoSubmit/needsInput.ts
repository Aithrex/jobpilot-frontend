/**
 * `needs_input` item classification + control inference.
 *
 * Kept as a PURE, dependency-free module because it is the single place that
 * encodes what the backend actually sends. The backend funnels two completely
 * different situations into one `needs_input` list (see `NeedsInputItem`), and
 * conflating them is what produced the product's worst UX bug: a question the
 * user could have typed in one box sent them off to the employer's portal.
 *
 * Contract: AUTOAPPLY_REPAIR_SPEC §3, `auto_apply_service._needs_item` (:388),
 * `auto_apply_service._park_verify` (:1545-1581), and
 * `auto_submit_service._fold_needs_input` (:570-596).
 */

import type { NeedsInputItem, NeedsInputAnswerValue } from "@/types/autoSubmit";

/** The control we render for one answerable question. */
export type NeedsInputControl =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "date"
  | "number"
  | "textarea"
  | "boolean"
  | "options";

function lower(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/**
 * TRUE when the item is a wall on the employer's site (captcha, email/SMS
 * verification, forced password reset, login/account gate) rather than a
 * question. Nothing can be typed for these - the only honest UI is a hand-off
 * to the user's own logged-in browser.
 *
 * Signals, strongest first:
 *   1. `action === "complete_in_browser"` - set explicitly by `_park_verify`.
 *   2. `kind`/`field_id` prefixed `oracle_` - the same writer's wall labels
 *      (`oracle_verify` | `oracle_captcha` | `oracle_reset`).
 *   3. `kind === "account"` - `_fold_needs_input`'s synthetic ATS account gate.
 */
export function isBrowserWallItem(item: NeedsInputItem): boolean {
  if (lower(item.action) === "complete_in_browser") return true;
  const kind = lower(item.kind);
  const fieldId = lower(item.field_id);
  if (kind.startsWith("oracle_") || fieldId.startsWith("oracle_")) return true;
  if (kind === "account" || fieldId === "ats_account") return true;
  return false;
}

/**
 * TRUE when the user can answer the item right here. Requires a `field_id`
 * because that is the key the answer is submitted under - an item without one
 * cannot be sent, so we show it as context instead of a dead input.
 */
export function isAnswerableItem(item: NeedsInputItem): boolean {
  return !isBrowserWallItem(item) && !!(item.field_id || "").trim();
}

/** Human label for a wall, used for the hand-off card's heading. */
export function wallLabel(item: NeedsInputItem): string {
  const kind = lower(item.kind).replace(/^oracle_/, "");
  if (kind === "captcha") return "Human check required";
  if (kind === "reset") return "Password reset required";
  if (kind === "account") return "Employer account required";
  if (kind === "verify") return "Verification required";
  return "Finish on the employer's site";
}

/** What the user actually has to go do. Never implies JobPilot failed. */
export function wallHelp(item: NeedsInputItem): string {
  const kind = lower(item.kind).replace(/^oracle_/, "");
  if (kind === "captcha") {
    return "This employer showed a human-verification challenge. We can't solve those for you - open the site, clear the check, and we'll pick the application back up.";
  }
  if (kind === "reset") {
    return "The employer's site is forcing a password reset before it will continue. Reset it there and we'll resume automatically.";
  }
  if (kind === "account") {
    return "This employer requires an account before it accepts an application. Sign in or create one on their career site and we'll resume automatically.";
  }
  if (kind === "verify") {
    return "The employer sent a confirmation link or code. Open it (usually in your email) and we'll resume automatically - we also re-check on our own in the background.";
  }
  return "A step on the employer's site needs a person. Once it's cleared we'll resume automatically.";
}

const DATE_RE =
  /\b(date|dob|birth|graduation|graduated|start[_ ]?(date|on)|available(_from| from)?)\b/;
const NUMBER_RE =
  /\b(how many|number of|years?[_ ]of|[_ ]years\b|^years|salary|compensation|expected pay|gpa|notice period)\b/;
const ESSAY_RE =
  /\b(why|describe|tell us|explain|elaborate|cover letter|in your own words|what makes|summar(y|ise|ize))\b/;
const YES_NO_RE =
  /^(are|is|was|were|do|does|did|have|has|had|will|would|can|could|may|should|must)\b/;

/**
 * Pick a control for a question.
 *
 * ORDER MATTERS. Anything the backend states explicitly (`options`,
 * `value_type`) wins outright; the heuristics below are only a stopgap for
 * today's payload, which carries nothing but `{question, kind, field_id}`.
 * When the backend starts echoing the question-bank metadata, steps 1-2 take
 * over and the heuristics stop firing - no further FE change needed.
 */
export function inferControl(item: NeedsInputItem): NeedsInputControl {
  // 1. Explicit options always win.
  if (Array.isArray(item.options) && item.options.length > 0) return "options";

  // 2. Explicit value_type from the question bank.
  switch (lower(item.value_type)) {
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "url":
      return "url";
    case "date":
      return "date";
    case "number":
    case "years":
    case "money":
      return "number";
    case "boolean":
      return "boolean";
    case "essay":
      return "textarea";
    case "text":
      return "text";
    default:
      break;
  }

  // 3. Heuristics over the field id + prompt.
  const question = (item.question || "").trim();
  const haystack = `${lower(item.field_id)} ${lower(question)}`;

  if (DATE_RE.test(haystack)) return "date";
  if (NUMBER_RE.test(haystack)) return "number";
  // A legal attestation is a declaration the user must make themselves; these
  // are Yes/No in every ATS we support. Nothing is ever preselected (safety
  // rule 1: never fabricate a legal attestation).
  if (lower(item.kind) === "legal_attestation") return "boolean";
  if (YES_NO_RE.test(lower(question)) && question.endsWith("?")) return "boolean";
  if (ESSAY_RE.test(lower(question)) || question.length > 140) return "textarea";
  return "text";
}

/** A stable, DOM-safe id fragment for labelling controls. */
export function controlId(applicationId: string, fieldId: string): string {
  const safe = `${applicationId}-${fieldId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `needs-input-${safe}`;
}

/** The prompt to show. Falls back to the field id so a row is never blank. */
export function itemLabel(item: NeedsInputItem): string {
  const q = (item.question || "").trim();
  if (q) return q;
  const f = (item.field_id || "").trim();
  if (f) return f.replace(/[_-]+/g, " ");
  return "Additional information";
}

/**
 * Coerce one typed control value into what the backend stores.
 *
 * THE serialization seam. Booleans stay booleans (the question bank stores
 * `previous_employee` &co. as booleans) and clean numerics become numbers;
 * everything else is a trimmed string. If the backend turns out to want
 * strings across the board, this function is the one-line change.
 */
export function serializeAnswer(
  control: NeedsInputControl,
  raw: NeedsInputAnswerValue,
): NeedsInputAnswerValue {
  if (control === "boolean") return raw === true || raw === "true";
  if (control === "number") {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : String(raw).trim();
  }
  return typeof raw === "string" ? raw.trim() : raw;
}

/** A value counts as filled when it is set - INCLUDING a boolean `false`. */
export function isFilled(v: NeedsInputAnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}
