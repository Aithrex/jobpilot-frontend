import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Moon, Plane, RefreshCw, Search, Send, Sun, Wand2 } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem,
  CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { NAV_ALL, navHref } from './nav.config';

/** Fire from anywhere (e.g. the TopBar button) to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('jobpilot:cmdk'));
}

const JUMP = [
  { label: 'Browse jobs', to: 'jobs/for-you', icon: Search },
  { label: 'Career portals', to: 'jobs/portals', icon: Building2 },
  { label: 'Tailor a resume', to: 'resume/tailor', icon: Wand2 },
  { label: 'Auto-Apply', to: 'apply/auto-apply', icon: Send },
  { label: 'Visa timeline', to: 'settings/visa', icon: Plane },
];

/**
 * Global ⌘K / Ctrl-K command palette: fuzzy-jump to any destination, search the
 * job feed, or run a quick action. Mounted once in the app shell.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const jobs = useCombinedJobsCtx();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvent = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('jobpilot:cmdk', onEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('jobpilot:cmdk', onEvent);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const runJobSearch = () => {
    jobs.setSearch(query.trim());
    jobs.ensureStarted();
    go(navHref('jobs/for-you'));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <CommandInput
        placeholder="Search jobs, jump to a page, run an action..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {query.trim() && (
          <>
            <CommandGroup heading="Jobs">
              <CommandItem value={`search jobs ${query}`} onSelect={runJobSearch}>
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Search jobs for "{query.trim()}"
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Jump to">
          {JUMP.map((j) => (
            <CommandItem key={j.to} value={j.label} onSelect={() => go(navHref(j.to))}>
              <j.icon className="mr-2 h-4 w-4" aria-hidden />
              {j.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Navigate">
          {NAV_ALL.map((n) => (
            <CommandItem key={n.to} value={`${n.label} ${n.hint}`} onSelect={() => go(navHref(n.to))}>
              <n.icon className="mr-2 h-4 w-4" aria-hidden />
              {n.label}
              <CommandShortcut>{n.hint}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="sync job feed refresh"
            onSelect={() => { jobs.ensureStarted(); jobs.sync(true); setOpen(false); }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Sync job feed now
          </CommandItem>
          <CommandItem
            value="theme dark light mode"
            onSelect={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Sun className="mr-2 h-4 w-4" aria-hidden /> : <Moon className="mr-2 h-4 w-4" aria-hidden />}
            Switch to {isDark ? 'light' : 'dark'} mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
