import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Structural shapes mirroring ResumeParser's nav config. We intentionally keep
 * these generic (string keys) so this component stays decoupled from the
 * ResumeParser `NavTab` union — ResumeParser passes its real items/sections in,
 * so labels/icons remain a single source of truth there.
 */
export type MobileNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  hint?: string;
};

export type MobileNavSection = {
  label: string;
  items: string[];
};

type MobileBottomNavProps = {
  /** Full nav item list (same array the sidebar renders). */
  items: MobileNavItem[];
  /** Optional grouping; used to organize the "More" sheet. */
  sections?: MobileNavSection[];
  /** Currently active tab key. */
  activeKey: string;
  /** Called when the user taps any nav entry. */
  onSelect: (key: string) => void;
  /**
   * Keys to surface as the primary (always-visible) bottom-bar items. The
   * component picks the first 4 that actually exist in `items`.
   */
  primaryKeys?: string[];
};

const DEFAULT_PRIMARY_KEYS = ["dashboard", "jobs", "tailor", "interview"];

export default function MobileBottomNav({
  items,
  sections,
  activeKey,
  onSelect,
  primaryKeys = DEFAULT_PRIMARY_KEYS,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const byKey = new Map(items.map((item) => [item.key, item]));

  // Resolve up to 4 primary items that actually exist, in the requested order.
  const primaryItems = primaryKeys
    .map((key) => byKey.get(key))
    .filter((item): item is MobileNavItem => Boolean(item))
    .slice(0, 4);

  const handleSelect = (key: string) => {
    onSelect(key);
    setMoreOpen(false);
  };

  const isMoreActive =
    !primaryItems.some((item) => item.key === activeKey);

  // Build the grouped list for the "More" sheet. Fall back to a single flat
  // group when no sections are provided.
  const resolvedSections: MobileNavSection[] =
    sections && sections.length > 0
      ? sections
      : [{ label: "All", items: items.map((item) => item.key) }];

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden border-t border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/90 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {primaryItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item.key)}
                aria-current={active ? "page" : undefined}
                aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
                className={`group relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors focus-visible:outline-none ${
                  active
                    ? "text-primary"
                    : "text-gray-500 dark:text-gray-400 active:text-gray-900 dark:active:text-white"
                }`}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  {item.icon}
                  {item.badge && !active && (
                    <span
                      className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More sections"
            aria-haspopup="dialog"
            className={`group relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors focus-visible:outline-none ${
              isMoreActive
                ? "text-primary"
                : "text-gray-500 dark:text-gray-400 active:text-gray-900 dark:active:text-white"
            }`}
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="lg:hidden max-h-[80vh] overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>All sections</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            {resolvedSections.map((section) => {
              const sectionItems = section.items
                .map((key) => byKey.get(key))
                .filter((item): item is MobileNavItem => Boolean(item));
              if (sectionItems.length === 0) return null;

              return (
                <div key={section.label}>
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sectionItems.map((item) => {
                      const active = item.key === activeKey;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSelect(item.key)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            active
                              ? "border-primary/30 bg-primary/10 text-gray-950 dark:text-white"
                              : "border-gray-200/80 bg-gray-50/60 text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-white/80 text-primary dark:bg-white/10"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            {item.hint && (
                              <span className="mt-0.5 block truncate text-[11px] text-gray-400 dark:text-gray-500">
                                {item.hint}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
