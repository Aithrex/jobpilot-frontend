/**
 * Compact monogram for avatar chips — first letters of up to two name/email
 * segments. Shared by the TopBar account menu and the Sidebar account row so
 * the two renderings of the same user never disagree.
 */
export function initials(name?: string, email?: string): string {
  const source = (name && name.trim()) || email || "";
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}
