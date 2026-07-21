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
 * ResumeParser `NavTab` union - ResumeParser passes its real items/rooms in,
 * so labels/icons remain a single source of truth there.
 */
export type MobileNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  hint?: string;
};

/**
 * A top-level "room": the primary bottom-bar destination. Its `tabs` are the
 * leaf keys that live inside it; `tabs[0]` is the room's default sub-tab and the
 * grouped "More" sheet lists all of them (looked up from `items`).
 */
export type MobileNavRoom = {
  key: string;
  label: string;
  icon: React.ReactNode;
  tabs: string[];
};

type MobileBottomNavProps = {
  /** Full leaf-item list - the source of truth for labels/icons in the sheet. */
  items: MobileNavItem[];
  /** The 5 rooms shown as the primary bottom-bar destinations. */
  rooms: MobileNavRoom[];
  /** Currently active leaf tab key. */
  activeKey: string;
  /** Called when the user taps any nav entry (a room default or a leaf tab). */
  onSelect: (key: string) => void;
};

export default function MobileBottomNav({
  items,
  rooms,
  activeKey,
  onSelect,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const byKey = new Map(items.map((item) => [item.key, item]));

  const handleSelect = (key: string) => {
    onSelect(key);
    setMoreOpen(false);
  };

  // The active room = the one whose tabs contains the active leaf key. Configure
  // surfaces (billing/profile/...) belong to no room, so nothing highlights then.
  const activeRoomKey = rooms.find((room) => room.tabs.includes(activeKey))?.key;

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden border-t border-border bg-background/90 supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {rooms.map((room) => {
            const active = room.key === activeRoomKey;
            return (
              <button
                key={room.key}
                type="button"
                onClick={() => handleSelect(room.tabs[0])}
                aria-current={active ? "page" : undefined}
                aria-label={room.label}
                className={`group relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 transition-colors focus-visible:outline-none ${
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                }`}
              >
                {/* Non-color-only active affordance: a short indicator bar. */}
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  {room.icon}
                </span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                  {room.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Browse all sections"
            aria-haspopup="dialog"
            className="group relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-muted-foreground transition-colors focus-visible:outline-none active:text-foreground"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors">
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
            {rooms.map((room) => {
              const roomItems = room.tabs
                .map((key) => byKey.get(key))
                .filter((item): item is MobileNavItem => Boolean(item));
              if (roomItems.length === 0) return null;

              return (
                <div key={room.key}>
                  <p className="overline mb-2 flex items-center gap-1.5 px-1">
                    <span className="text-muted-foreground" aria-hidden="true">
                      {room.icon}
                    </span>
                    {room.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {roomItems.map((item) => {
                      const active = item.key === activeKey;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSelect(item.key)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-border bg-muted/40 text-muted-foreground active:text-foreground"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-background text-primary"
                                : "text-muted-foreground"
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
                                <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            {item.hint && (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
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
