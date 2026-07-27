import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { openCommandPalette } from "./CommandPalette";
import { NAV_ALL, NAV_SECTIONS, appPath, navHref } from "./nav.config";

/**
 * Mobile "everything else" drawer.
 *
 * The bottom tab bar can only hold four destinations, which used to leave Grow
 * and Settings reachable ONLY through the top-bar account menu - i.e. hunting.
 * This sheet enumerates the full IA (every destination and every section under
 * it) with its one-line hint, so a phone user can see the whole product at
 * once. It is a plain list of links: keyboard/screen-reader operable for free,
 * every row a >=44px target, and Radix owns focus trap + Escape.
 */
export function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-container border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-h2 text-foreground">
            Everything in Aspirely
          </SheetTitle>
          <SheetDescription className="text-caption">
            Every screen, one tap away.
          </SheetDescription>
        </SheetHeader>

        <button
          type="button"
          onClick={() => {
            close();
            openCommandPalette();
          }}
          className="focus-ring-visible mt-4 flex min-h-11 w-full items-center gap-2 rounded-control border border-border bg-muted/40 px-3 text-left text-caption text-muted-foreground transition-colors duration-200 ease-expo hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          Search everything
        </button>

        <nav aria-label="All destinations" className="mt-5 space-y-6">
          {NAV_ALL.map((dest) => {
            const sections = NAV_SECTIONS[dest.to] ?? [];
            const DestIcon = dest.icon;
            return (
              <section key={dest.to} aria-labelledby={`more-${dest.to}`}>
                <Link
                  id={`more-${dest.to}`}
                  to={navHref(dest.to)}
                  onClick={close}
                  className="focus-ring-visible flex min-h-11 items-center gap-2 rounded-control px-1 text-sm font-semibold text-foreground transition-colors duration-200 ease-expo hover:text-primary"
                >
                  <DestIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {dest.label}
                </Link>

                {sections.length > 0 && (
                  <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {sections.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <li key={section.to}>
                          <Link
                            to={appPath(dest.to, section.to)}
                            onClick={close}
                            className="focus-ring-visible flex min-h-11 items-start gap-2.5 rounded-control px-2 py-2 transition-colors duration-200 ease-expo hover:bg-accent active:bg-accent/70"
                          >
                            <SectionIcon
                              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {section.label}
                              </span>
                              <span className="block text-caption text-muted-foreground">
                                {section.hint}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
