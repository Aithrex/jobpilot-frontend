import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { indicatorSpring } from "@/lib/motion";

export interface SubNavItem {
  /** URL segment relative to the destination (e.g. "learning"). */
  to: string;
  label: string;
  icon: LucideIcon;
}

interface SubNavProps {
  /** Accessible label for the nav landmark (e.g. "Grow sections"). */
  ariaLabel: string;
  items: SubNavItem[];
}

/**
 * Horizontal sub-navigation for an app-shell destination - a row of route
 * links styled as a segmented/underline tab strip. Each item is a >=44px
 * target with a focus-visible ring, an `aria-current` + underline-bar active
 * affordance (never color alone), and roving arrow-key operability. Scrolls
 * horizontally on small screens instead of overflowing the body.
 *
 * The active underline is a single shared element that SLIDES between tabs
 * (framer `layoutId`), matching the top bar's destination pill and the mobile
 * tab bar - so "where am I" is expressed the same way at all three levels of
 * the IA. `useId` scopes the layoutId per mounted strip, so two SubNavs can
 * never fight over one indicator. Honors `prefers-reduced-motion`.
 */
export function SubNav({ ariaLabel, items }: SubNavProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const indicatorId = `subnav-active-${useId()}`;

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;

    const links = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-subnav-link]") ?? [],
    );
    if (links.length === 0) return;

    const currentIndex = links.findIndex((el) => el === document.activeElement);
    let nextIndex = currentIndex;

    switch (key) {
      case "ArrowRight":
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % links.length;
        break;
      case "ArrowLeft":
        nextIndex = currentIndex <= 0 ? links.length - 1 : currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = links.length - 1;
        break;
    }

    event.preventDefault();
    links[nextIndex]?.focus();
  }, []);

  return (
    <nav aria-label={ariaLabel} className="border-b border-border">
      <div
        ref={listRef}
        onKeyDown={onKeyDown}
        className="scrollbar-hide -mb-px flex gap-1 overflow-x-auto"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            data-subnav-link
            className={({ isActive }) =>
              cn(
                "group interactive relative flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 text-sm font-medium",
                isActive
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:border-border hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={indicatorId}
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={indicatorSpring(reduceMotion)}
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
