import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { initials } from "./initials";
import { NAV_ITEMS, NAV_SECONDARY, navHref, type NavItem } from "./nav.config";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/** Shared framer layoutId so the active pill slides between primary + secondary. */
const ACTIVE_PILL_ID = "app-shell-sidebar-active";

/**
 * Desktop navigation rail for the app shell. A frosted glass rail (semi-opaque
 * sidebar token + `backdrop-blur-xl`) that reads clean in both themes. Expanded
 * ≈ 240px, collapsed ≈ 68px with icon-only items that surface their label as a
 * tooltip. Every control is a ≥44px target with a visible focus-visible ring;
 * the active item is marked with `aria-current` plus a framer-motion pill that
 * slides between items (honoring `prefers-reduced-motion`).
 */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/70 text-sidebar-foreground backdrop-blur-xl transition-[width] duration-200 ease-expo supports-[backdrop-filter]:bg-sidebar/60 lg:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
      data-themed-surface
    >
      {/* Brand */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border/70", collapsed ? "justify-center px-2" : "px-4")}>
        <NavLink
          to={navHref("today")}
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
          aria-label="Aspirely home"
        >
          <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-soft">
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="font-display text-lg font-extrabold tracking-tight text-sidebar-foreground">
              Aspirely
            </span>
          )}
        </NavLink>
      </div>

      {/* Primary destinations */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} collapsed={collapsed} reduceMotion={!!reduceMotion} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Secondary + collapse control */}
      <div className="border-t border-sidebar-border/70 px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_SECONDARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} collapsed={collapsed} reduceMotion={!!reduceMotion} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className={cn(
            "mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors duration-200 ease-expo",
            "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            "active:bg-sidebar-accent/80",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Account */}
      <AccountRow collapsed={collapsed} />
    </aside>
  );
}

/** Signed-in affordance pinned to the foot of the rail — links to Settings › Profile. */
function AccountRow({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const name = user?.name;
  const email = user?.email;

  const row = (
    <NavLink
      to={`${navHref("settings")}/profile`}
      aria-label="Account settings"
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-lg px-2 outline-none transition-colors duration-200 ease-expo",
        "hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:bg-sidebar-accent/80",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-xs font-bold text-sidebar-primary">
        {initials(name, email)}
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-sidebar-foreground">
            {name || email || "Your account"}
          </span>
          {name && email ? (
            <span className="block truncate text-xs text-sidebar-foreground/60">{email}</span>
          ) : null}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="border-t border-sidebar-border/70 p-2">
      {collapsed ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          <TooltipContent side="right">
            <span className="block font-medium">{name || "Your account"}</span>
            {email ? <span className="block text-xs text-muted-foreground">{email}</span> : null}
          </TooltipContent>
        </Tooltip>
      ) : (
        row
      )}
    </div>
  );
}

function SidebarLink({
  item,
  collapsed,
  reduceMotion,
}: {
  item: NavItem;
  collapsed: boolean;
  reduceMotion: boolean;
}) {
  const { icon: Icon, label } = item;

  const link = (
    <NavLink
      to={navHref(item.to)}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors duration-200 ease-expo",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isActive
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/60",
          collapsed && "justify-center px-0",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Animated active pill — a single element shared via layoutId slides
              behind whichever item is active. Reduced motion → instant. */}
          {isActive && (
            <motion.span
              layoutId={ACTIVE_PILL_ID}
              className="absolute inset-0 z-0 rounded-lg bg-sidebar-accent shadow-soft ring-1 ring-sidebar-border/60"
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }
              }
              aria-hidden="true"
            />
          )}
          <Icon
            className={cn("relative z-10 h-5 w-5 shrink-0", isActive && "text-sidebar-primary")}
            aria-hidden="true"
          />
          {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  // Collapsed rail: surface the label (and its one-line promise) as a side tooltip.
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{item.hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}
