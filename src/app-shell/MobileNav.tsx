import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, navHref } from "./nav.config";

/**
 * Bottom tab bar for small viewports (hidden ≥lg, where the Sidebar takes
 * over). Primary destinations only; Settings + account actions live in the
 * TopBar user menu. Each tab is a ≥44px target with a visible focus ring and a
 * non-color-only active indicator.
 */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const { icon: Icon, label } = item;
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={navHref(item.to)}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        isActive && "bg-primary/10",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
