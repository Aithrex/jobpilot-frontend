import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, RefreshCw, Search, Sun } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem,
  CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { ALL_DESTINATIONS, NAV_ALL, navHref } from './nav.config';

/**
 * Fire from anywhere (e.g. the mobile search button) to open the palette.
 *
 * This briefly took a `seed` argument, back when the desktop top bar was a
 * button dressed as a search field and had to forward the keystroke that
 * opened it. The top bar is a real input now, so nothing seeds the palette and
 * the parameter is gone.
 */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('jobpilot:cmdk'));
}

/**
 * Global Cmd-K / Ctrl-K command palette.
 *
 * This is the product's "find it without hunting" guarantee: it enumerates
 * EVERY sub-destination from `nav.config.ts` (grouped under its parent), not a
 * hand-kept shortlist that drifts. `cmdk` filters on the item's `value`, so
 * each row folds in the label, its parent, its one-line hint and a keyword
 * bag - typing "sponsorship", "cover letter" or "quota" reaches the right
 * screen even though none of those words is a nav label.
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

  // Reset the query on close so re-opening never starts mid-search.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const runJobSearch = () => {
    jobs.setSearch(query.trim());
    jobs.ensureStarted();
    go(navHref('jobs/for-you'));
  };

  /** Destinations grouped by parent, in nav order, so the list reads as the IA. */
  const grouped = useMemo(() => {
    const order: string[] = [];
    const byParent = new Map<string, typeof ALL_DESTINATIONS>();
    for (const d of ALL_DESTINATIONS) {
      if (!byParent.has(d.parent)) {
        byParent.set(d.parent, []);
        order.push(d.parent);
      }
      byParent.get(d.parent)!.push(d);
    }
    return order.map((parent) => ({
      parent,
      label: byParent.get(parent)![0].parentLabel,
      items: byParent.get(parent)!,
    }));
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <CommandInput
        placeholder="Search jobs, jump to any screen, run an action..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <span className="block text-sm font-medium text-foreground">No matches</span>
          <span className="mt-1 block text-caption text-muted-foreground">
            Try a feature name like &quot;auto-apply&quot;, &quot;billing&quot; or
            &quot;sponsorship&quot;.
          </span>
        </CommandEmpty>

        {query.trim() && (
          <>
            <CommandGroup heading="Jobs">
              <CommandItem value={`search jobs ${query}`} onSelect={runJobSearch}>
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Search jobs for &quot;{query.trim()}&quot;
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Top-level destinations first - the 6 places, then everything in them. */}
        <CommandGroup heading="Go to">
          {NAV_ALL.map((n) => (
            <CommandItem
              key={n.to}
              value={`${n.label} ${n.hint}`}
              onSelect={() => go(navHref(n.to))}
            >
              <n.icon className="mr-2 h-4 w-4" aria-hidden />
              {n.label}
              <CommandShortcut>{n.hint}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {grouped.map((group) => (
          <CommandGroup key={group.parent} heading={group.label}>
            {group.items.map((d) => (
              <CommandItem
                key={d.href}
                value={`${group.label} ${d.label} ${d.hint} ${d.keywords ?? ''}`}
                onSelect={() => go(d.href)}
              >
                <d.icon className="mr-2 h-4 w-4" aria-hidden />
                <span className="truncate">{d.label}</span>
                <CommandShortcut className="truncate">{d.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="sync job feed refresh rescan"
            onSelect={() => { jobs.ensureStarted(); jobs.sync(true); setOpen(false); }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Sync job feed now
          </CommandItem>
          <CommandItem
            value="theme dark light mode appearance"
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
