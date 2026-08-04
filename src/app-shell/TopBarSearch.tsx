import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_DESTINATIONS, NAV_ALL, navHref } from './nav.config';

/**
 * The top bar's search: a REAL input with its suggestions rendered inline.
 *
 * It used to be a button dressed as a text field - clicking it threw up the
 * command-palette dialog and you retyped there. It looked like somewhere you
 * could type and it was not, which is the exact affordance mismatch worth
 * avoiding. Now the field is the field: focus it, type, and the matches drop
 * down beneath it.
 *
 * Ctrl/Cmd-K still opens the full palette for people who want it - the
 * shortcut just is not advertised in the bar any more, because a keyboard hint
 * printed inside a text input reads as part of the input.
 *
 * Suggestions are the app's own places - the six top-level destinations and
 * every sub-destination under them - read from `nav.config.ts`, the same source
 * of truth the sidebar, mobile nav and command palette use. Nothing else. When
 * a query matches none of them the answer is "no matches", not a consolation
 * action invented to fill the gap.
 */

interface Suggestion {
  key: string;
  label: string;
  /** Parent destination, shown right-aligned. Empty for top-level places. */
  parentLabel: string;
  href: string;
  icon: LucideIcon;
  /** 0 = label starts with the query, 1 = label contains it, 2 = keyword only. */
  score: number;
}

/**
 * Everything reachable: the six top-level places AND every sub-destination.
 *
 * `ALL_DESTINATIONS` is sections only, so searching it alone could never offer
 * "Grow" itself - typing "grow" returned its five children and no way to reach
 * the parent. The palette solves this with a separate "Go to" group; inline we
 * just search both sets together.
 */
const SEARCHABLE: Array<Omit<Suggestion, 'score'> & { haystack: string }> = [
  ...NAV_ALL.map((n) => ({
    key: `top:${n.to}`,
    label: n.label,
    parentLabel: '',
    href: navHref(n.to),
    icon: n.icon,
    haystack: `${n.label} ${n.hint}`.toLowerCase(),
  })),
  ...ALL_DESTINATIONS.map((d) => ({
    key: d.href,
    label: d.label,
    parentLabel: d.parentLabel,
    href: d.href,
    icon: d.icon,
    haystack: `${d.label} ${d.parentLabel} ${d.hint} ${d.keywords ?? ''}`.toLowerCase(),
  })),
];

/** Ranked matches: label hits beat parent/hint/keyword hits. */
function match(query: string): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Suggestion[] = [];
  for (const s of SEARCHABLE) {
    const label = s.label.toLowerCase();
    const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : s.haystack.includes(q) ? 2 : -1;
    if (score >= 0) scored.push({ ...s, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, 6);
}

export function TopBarSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const results = useMemo(() => match(query), [query]);
  const hasQuery = query.trim().length > 0;

  /**
   * This bar navigates, and ONLY navigates.
   *
   * It used to carry a "Search jobs for <query>" row. That row could not
   * actually search anything - it forwarded the raw string to the Jobs page -
   * so for any query the bar had failed to match it was offering a guess
   * dressed as a result: "Search jobs for werfgh" is not a search, it is a
   * shrug. Worse, when nothing matched it was the only row, which put it under
   * the Enter key and quietly navigated away on a typo.
   *
   * Job searching belongs to Jobs, which has its own field for it.
   */
  const options = hasQuery ? results : [];

  /** Nothing to navigate to: say so plainly and offer nothing else. */
  const noMatches = hasQuery && results.length === 0;
  const showList = open && hasQuery;

  // Close when focus or a click leaves the control.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // With no destination match nothing is pre-selected (-1), so Enter cannot
  // fire the trailing job search by accident. Arrow down reaches it on purpose.
  useEffect(() => {
    setActive(results.length > 0 ? 0 : -1);
  }, [query, results.length]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const run = (i: number) => {
    // i === -1 is the "nothing selected" state; Enter there is a no-op.
    if (i < 0) return;
    const opt = options[i];
    if (!opt) return;
    navigate(opt.href);
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      close();
      return;
    }
    if (!showList || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // From -1 this lands on 0, which is how the unselected state is escaped.
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(active);
    }
  };

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="topbar-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={showList ? `topbar-search-opt-${active}` : undefined}
          aria-label="Search"
          placeholder="Jump to any screen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'h-10 w-64 rounded-full border border-border/70 bg-muted/40 pl-9 pr-8 text-sm text-foreground',
            'placeholder:text-muted-foreground transition-colors',
            'hover:border-border focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/40',
            'lg:w-80 xl:w-96',
          )}
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id="topbar-search-listbox"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-float"
        >
          {/* Honest empty state. `role="presentation"` keeps it out of the
              option set, so it is never selectable and never lands under
              Enter - the whole point of the change. */}
          {noMatches && (
            <li role="presentation" className="px-2.5 py-2">
              <p className="text-sm font-medium text-foreground">
                No matches for &quot;{query.trim()}&quot;
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Try a screen name like &quot;tracker&quot;, &quot;billing&quot; or
                &quot;interview&quot;.
              </p>
            </li>
          )}

          {options.map((opt, i) => {
            const selected = i === active;
            return (
              <li
                key={opt.key}
                id={`topbar-search-opt-${i}`}
                role="option"
                aria-selected={selected}
                // `onMouseDown` not `onClick`: the input's blur would close the
                // list before a click could land on it.
                onMouseDown={(e) => {
                  e.preventDefault();
                  run(i);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                  selected ? 'bg-accent text-foreground' : 'text-muted-foreground',
                )}
              >
                <opt.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate font-medium text-foreground">{opt.label}</span>
                {opt.parentLabel && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {opt.parentLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
