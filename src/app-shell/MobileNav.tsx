import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMailboxUnread } from "@/hooks/useMailboxUnread";
import { NAV_ITEMS, navHref } from "./nav.config";

/** Shared framer layoutId so the active highlight slides between mobile tabs. */
const ACTIVE_TAB_ID = "app-shell-mobilenav-active";

/**
 * Bottom tabs: Home, Jobs, Resume, Apply. Grow + Settings live in the top bar
 * / command palette on small screens.
 */
const MOBILE_ITEMS = NAV_ITEMS.slice(0, 4);

/**
 * Bottom tab bar for small viewports (hidden >=lg, where the horizontal top
 * nav takes over). A frosted glass bar (the canonical `.glass-nav` recipe)
 * with safe-area padding. Primary destinations only; Settings + account
 * actions live in the TopBar user menu. Each tab is a >=44px target with a
 * visible focus ring and an `aria-current` active state marked by a
 * framer-motion pill that slides between tabs (honoring
 * `prefers-reduced-motion`).
 */
export function MobileNav() {
  const reduceMotion = useReducedMotion();
  const unread = useMailboxUnread();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 glass-nav pb-[env(safe-area-inset-bottom)] shadow-pop lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
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
                    "group relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 outline-none transition-colors duration-200 ease-expo focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId={ACTIVE_TAB_ID}
                        className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }
                        }
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ease-expo",
                        isActive && "bg-primary/10",
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
