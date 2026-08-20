import { LayoutGroup } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMailboxUnread } from "@/hooks/useMailboxUnread";
import {
  PillThumb,
  PillTrack,
  pillItemClass,
  useScrollActivePill,
} from "@/components/ui/pill-switch";
import { NAV_ITEMS, navHref } from "./nav.config";

/** Shared framer layoutId so the active pill slides between destinations. */
const ACTIVE_PILL_ID = "app-shell-topnav-active";

/**
 * Horizontal primary destination nav for the app-shell top bar (replaces the
 * old vertical sidebar). Capsule track + sliding inner pill (Instagram-style),
 * horizontally scrollable when destinations overflow. Hidden below `lg`, where
 * the bottom MobileNav takes over.
 */
export function DestinationNav() {
  const unread = useMailboxUnread();
  const { pathname } = useLocation();
  const trackRef = useScrollActivePill(pathname);

  return (
    <nav aria-label="Primary" className="hidden min-w-0 max-w-full lg:block">
      <LayoutGroup id={ACTIVE_PILL_ID}>
      <PillTrack trackRef={trackRef} className="max-w-full">
        <ul className="flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const { icon: Icon, label } = item;
            const badge = item.to === "apply" && unread > 0 ? unread : 0;
            return (
              <li key={item.to} className="flex shrink-0">
                <NavLink
                  to={navHref(item.to)}
                  title={item.hint}
                  className={({ isActive }) => pillItemClass(isActive, "md")}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <PillThumb layoutId={ACTIVE_PILL_ID} />}
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
      </PillTrack>
      </LayoutGroup>
    </nav>
  );
}
