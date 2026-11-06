import { useCallback, useId, type KeyboardEvent } from "react";
import { LayoutGroup } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PillThumb,
  PillTrack,
  pillItemClass,
  useScrollActivePill,
} from "@/components/ui/pill-switch";

export interface SubNavItem {
  /** URL segment relative to the destination (e.g. "learning"). */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Small count beside the label. Shown only when above zero: it counts
   *  what needs action (Saved: still to apply; Applied: follow-ups due). */
  badge?: number;
  /** What the count is of, shown beside it from `sm` up ("to apply"). */
  badgeText?: string;
  /** Hover / screen-reader sentence for the count. */
  badgeTitle?: string;
}

interface SubNavProps {
  /** Accessible label for the nav landmark (e.g. "Grow sections"). */
  ariaLabel: string;
  items: SubNavItem[];
  className?: string;
}

/**
 * Horizontal sub-navigation: outer capsule + sliding inner pill, with
 * overflow scroll on narrow widths. `useId` scopes the layoutId per mounted
 * strip. Honors `prefers-reduced-motion` via the shared thumb spring.
 */
export function SubNav({ ariaLabel, items, className }: SubNavProps) {
  const { pathname } = useLocation();
  const trackRef = useScrollActivePill(pathname);
  const indicatorId = `subnav-active-${useId()}`;

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;

    const links = Array.from(
      trackRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-subnav-link]") ?? [],
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
  }, [trackRef]);

  return (
    <nav aria-label={ariaLabel} className={className}>
      <LayoutGroup id={indicatorId}>
      <PillTrack
        trackRef={trackRef}
        onKeyDown={onKeyDown}
        className="w-full max-w-full"
      >
        {items.map(({ to, label, icon: Icon, badge, badgeText, badgeTitle }) => (
          <NavLink
            key={to}
            to={to}
            data-subnav-link
            title={badge ? badgeTitle : undefined}
            aria-label={badge ? (badgeTitle ? `${label}. ${badgeTitle}` : `${label} ${badge}`) : undefined}
            className={({ isActive }) => pillItemClass(isActive, "md")}
          >
            {({ isActive }) => (
              <>
                {isActive && <PillThumb layoutId={indicatorId} />}
                <Icon
                  className={cn("relative z-10 h-4 w-4 shrink-0", isActive && "text-primary")}
                  aria-hidden="true"
                />
                <span className="relative z-10">
                  {label}
                  {!!badge && badge > 0 && (
                    <span
                      className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px align-middle text-[10px] font-semibold tabular-nums leading-4 text-primary"
                      data-testid={`subnav-badge-${to}`}
                    >
                      {badge}
                      {badgeText && <span className="hidden font-medium sm:inline">{badgeText}</span>}
                    </span>
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </PillTrack>
      </LayoutGroup>
    </nav>
  );
}
