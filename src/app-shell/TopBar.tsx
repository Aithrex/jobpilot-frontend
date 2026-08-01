import { Link } from "react-router-dom";
import { LogOut, Search, Settings } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { openCommandPalette } from "./CommandPalette";
import { DestinationNav } from "./DestinationNav";
import { TopBarSearch } from "./TopBarSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const { user, logout } = useAuth();

  const email = user?.email;
  const name = user?.name;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 glass-nav glass-specular px-4 shadow-soft transition-colors duration-200 ease-expo sm:px-6">
      {/* Brand mark - always visible now the sidebar is gone. */}
      <Link
        to={navHref("home")}
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
        {/* A real, typable search field with inline suggestions. Ctrl/Cmd-K
            still opens the full palette; the hint is no longer printed inside
            the field, where it read as part of the input. */}
        <TopBarSearch />
        {/* Mobile keeps the palette: there is no room for an inline field with
            a dropdown on a phone. Wrapped, not passed by reference - bare
            `onClick={openCommandPalette}` hands React's MouseEvent to the
            `seed` parameter and pre-fills the search with an event object. */}
        <button
          type="button"
          onClick={() => openCommandPalette()}
          aria-label="Open command palette"
          title="Search & jump"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground interactive interactive-press hover:bg-accent hover:text-foreground sm:hidden"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Theme toggle - shared with the landing nav and the auth stage. */}
        <ThemeToggle />

        {/* No standalone settings gear: the account menu below already offers
            Settings, and two controls one click apart leading to the same route
            is a redundant target, not a shortcut. */}
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className="flex h-11 w-11 items-center justify-center rounded-full interactive interactive-press hover:bg-accent active:bg-accent/80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(name, email)}
              </span>
            </button>
          </DropdownMenuTrigger>
          {/* `align="end"` alone put the panel's right edge exactly on the
              avatar's, i.e. flush with the bar's 24px gutter. Correct, but a
              floating panel reads tighter against the window edge than in-flow
              content does. A small inward nudge gives it room without breaking
              the visual tie to the trigger it belongs to. */}
          <DropdownMenuContent align="end" alignOffset={8} className="w-56">
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
