import { NavLink } from "react-router-dom";
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

/**
 * Desktop navigation rail for the app shell. Expanded ≈ 240px, collapsed ≈
 * 68px with icon-only items that surface their label as a tooltip. Every
 * control is a ≥44px target with a visible focus-visible ring and a
 * non-color-only active affordance (leading indicator bar).
 */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-expo lg:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
      data-themed-surface
    >
      {/* Brand */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-4")}>
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
              <SidebarLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Secondary + collapse control */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_SECONDARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className={cn(
            "mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
        "flex min-h-[44px] items-center gap-3 rounded-lg px-2 outline-none transition-colors",
        "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:bg-sidebar-accent/80",
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
    <div className="border-t border-sidebar-border p-2">
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

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { icon: Icon, label } = item;

  const link = (
    <NavLink
      to={navHref(item.to)}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80",
          collapsed && "justify-center px-0",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Non-color-only active affordance */}
          <span
            className={cn(
              "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} aria-hidden="true" />
          {!collapsed && <span className="truncate">{label}</span>}
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
