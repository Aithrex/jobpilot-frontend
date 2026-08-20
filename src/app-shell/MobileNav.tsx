import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { indicatorSpring } from "@/lib/motion";
import { useMailboxUnread } from "@/hooks/useMailboxUnread";
import { MoreSheet } from "./MoreSheet";
import { NAV_ITEMS, navHref } from "./nav.config";

/** Shared framer layoutId so the active highlight slides between mobile tabs. */
const ACTIVE_TAB_ID = "app-shell-mobilenav-active";

/**
 * Bottom tabs: Home, Jobs, Resume, Apply + a "More" tab. Grow, Settings and
 * every sub-section live behind More (a full-IA sheet), so nothing is
 * phone-unreachable.
 */
const MOBILE_ITEMS = NAV_ITEMS.slice(0, 4);

/** Shared per-tab shell so the More button and the NavLinks are identical
 *  targets (>=44px, same paddings, same icon puck). */
const TAB_BASE =
  "group relative flex min-h-[44px] min-w-[44px] w-full flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 outline-none transition-colors duration-200 ease-expo focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Bottom tab bar for small viewports (hidden >=lg, where the horizontal top
 * nav takes over). A frosted glass bar (the canonical `.glass-nav` recipe)
 * with safe-area padding. Each tab is a >=44px target with a visible focus
 * ring and an `aria-current` active state marked by a framer-motion pill that
 * slides between tabs (honoring `prefers-reduced-motion`).
 */
export function MobileNav() {
  const reduceMotion = useReducedMotion();
  const unread = useMailboxUnread();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 glass-nav pb-[env(safe-area-inset-bottom)] shadow-pop lg:hidden"
      >
        <ul className="mx-auto mb-1 mt-1.5 flex max-w-md items-stretch justify-around rounded-full border border-border/50 bg-muted/45 p-1 backdrop-blur-md">
          {MOBILE_ITEMS.map((item) => {
            const { icon: Icon, label } = item;
            const badge = item.to === "apply" && unread > 0 ? unread : 0;
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={navHref(item.to)}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      TAB_BASE,
                      isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId={ACTIVE_TAB_ID}
                          className="liquid-glass liquid-glass-thumb absolute inset-1 z-0 overflow-hidden rounded-full"
                          transition={indicatorSpring(reduceMotion)}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ease-expo",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        {badge > 0 && (
                          <span
                            className="absolute -right-1 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground"
                            aria-label={`${badge} unread`}
                          >
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>
                      <span className="relative z-10 max-w-full truncate text-[10px] font-semibold leading-none">
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}

          {/* The 5th tab is not a route: it opens the full-IA sheet. Grow and
              Settings used to be phone-unreachable without opening the account
              menu, which is the definition of "hunting for it". */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-label="More destinations"
              className={cn(
                TAB_BASE,
                moreOpen ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ease-expo",
                  moreOpen && "bg-primary/10",
                )}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
