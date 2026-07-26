import { Link } from "react-router-dom";
import { ExternalLink, LogOut, Monitor, Moon, Search, Settings, Sun } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { openCommandPalette } from "./CommandPalette";
import { DestinationNav } from "./DestinationNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "./initials";
import { navHref } from "./nav.config";

/**
 * Global sticky top bar (64px) and the app-shell's sole chrome after the
 * vertical sidebar was retired: brand mark on the left, the horizontal
 * primary destination nav next to it (>=lg), then the right cluster - command
 * palette, theme toggle, a settings gear, and the account menu. Rendered as
 * the page `<header>` landmark. No dead affordances - every control does
 * something today.
 */
export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  // Three-state cycle: light → dark → system → light. Anything unexpected in
  // storage is treated as "system" (the provider's default).
  const themeState: "light" | "dark" | "system" =
    theme === "light" || theme === "dark" ? theme : "system";
  const nextTheme =
    themeState === "light" ? "dark" : themeState === "dark" ? "system" : "light";
  const ThemeIcon =
    themeState === "light" ? Sun : themeState === "dark" ? Moon : Monitor;
  const themeToggleLabel = `Theme: ${themeState}. Switch to ${nextTheme} theme`;

  const email = user?.email;
  const name = user?.name;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 glass-nav glass-specular px-4 shadow-soft transition-colors duration-200 ease-expo sm:px-6">
      {/* Brand mark - always visible now the sidebar is gone. */}
      <Link
        to={navHref("discover")}
        aria-label="Aspirely home"
        className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <BrandMark className="h-8 w-8 rounded-lg shadow-soft" iconClassName="h-4 w-4" />
        <span className="hidden font-display text-lg font-extrabold tracking-tight text-foreground sm:inline lg:hidden xl:inline">
          Aspirely
        </span>
      </Link>

      {/* Primary destination nav (>=lg; MobileNav covers smaller widths). */}
      <DestinationNav />

      {/* Push the action cluster to the right. */}
      <div className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Command palette trigger */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          title="Search & jump (Ctrl/⌘ K)"
          className="hidden h-10 items-center gap-2 rounded-full border border-border/70 bg-muted/40 pl-3 pr-2 text-caption text-muted-foreground outline-none transition-colors duration-200 ease-expo hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search...</span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          title="Search & jump"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-200 ease-expo hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-200 ease-expo hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-accent/80"
        >
          <ThemeIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Settings gear - quick reach without opening the account menu. */}
        <Link
          to={navHref("settings")}
          aria-label="Settings"
          title="Settings"
          className="hidden h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-200 ease-expo hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-accent/80 sm:flex"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className="flex h-11 w-11 items-center justify-center rounded-full outline-none transition-colors duration-200 ease-expo hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-accent/80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(name, email)}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name || "Your account"}</p>
              {email && <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={navHref("settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app" className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Classic workspace
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => logout()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
