/**
 * Shared class strings for the hand-rolled settings forms (Profile, Password,
 * Time zone). One label/field rhythm and one card surface, all on semantic
 * tokens so both themes stay coherent. Mirrors the `ui/input` field and the
 * card surface used by AutonomyPanel / IntegrationsPanel.
 */

/** A settings card: one surface, one padding, one internal rhythm. */
export const settingsCardCls = "rounded-xl border border-border bg-card p-5 sm:p-6";

/** Card heading (an h2 inside the Settings page, under its single h1). */
export const settingsCardTitleCls =
  "flex items-center gap-2 font-display text-title-sm text-foreground";

/** Supporting line under a card heading, kept to a readable measure. */
export const settingsCardHintCls = "mt-1 max-w-prose text-caption text-muted-foreground";

/** Field label: sits 6px above its control. */
export const settingsLabelCls = "mb-1.5 block text-label-lg text-foreground";

/** Helper or validation text under a field. */
export const settingsHelpCls = "mt-1.5 text-caption-sm text-muted-foreground";

const fieldBase =
  "w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Text input: 40px tall like `ui/input`. */
export const settingsInputCls = `${fieldBase} h-10 py-2 placeholder:text-muted-foreground`;

/** Native select: room on the right for the chevron overlay. */
export const settingsSelectCls = `${fieldBase} h-10 cursor-pointer appearance-none py-2 pr-9`;

/** Textarea: same field, natural height. */
export const settingsTextareaCls = `${fieldBase} min-h-24 py-2 leading-relaxed placeholder:text-muted-foreground`;
