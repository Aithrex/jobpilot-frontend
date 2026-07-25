import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMailboxUnread } from "@/hooks/useMailboxUnread";
import { NAV_ITEMS, navHref } from "./nav.config";

/** Shared framer layoutId so the active pill slides between destinations. */
const ACTIVE_PILL_ID = "app-shell-topnav-active";

/**
 * Horizontal primary destination nav for the app-shell top bar (replaces the
 * old vertical sidebar). A row of route links over the glass top bar: each is
 * a >=44px target with a focus-visible ring, an `aria-current` active state,
 * and a framer-motion pill that slides between items via a shared `layoutId`
 * (honoring `prefers-reduced-motion`). Hidden below `lg`, where the bottom
 * MobileNav takes over. Scrolls horizontally on narrow desktop widths instead
 * of overflowing the bar.
 */
export function DestinationNav() {
  const reduceMotion = useReducedMotion();
  const unread = useMailboxUnread();

  return (
    <nav aria-label="Primary" className="hidden min-w-0 lg:block">
      <ul className="scrollbar-hide flex items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const { icon: Icon, label } = item;
          const badge = item.to === "applications" && unread > 0 ? unread : 0;
          return (
            <li key={item.to} className="shrink-0">
              <NavLink
                to={navHref(item.to)}
                title={item.hint}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-h-[44px] items-center gap-2 rounded-full px-3.5 text-sm font-medium outline-none transition-colors duration-200 ease-expo",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Single shared element slides behind the active item. */}
                    {isActive && (
                      <motion.span
                        layoutId={ACTIVE_PILL_ID}
                        className="absolute inset-0 z-0 rounded-full bg-accent shadow-soft ring-1 ring-border/60"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }
                        }
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn("relative z-10 h-4 w-4 shrink-0", isActive && "text-primary")}
                      aria-hidden="true"
                    />
                    <span className="relative z-10 whitespace-nowrap">{label}</span>
                    {badge > 0 && (
                      <span
                        className="relative z-10 ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                        aria-label={`${badge} unread`}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
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
