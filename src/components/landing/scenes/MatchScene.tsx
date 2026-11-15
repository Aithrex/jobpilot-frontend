import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Bookmark, Check, Minus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, Mark } from '../_shared';
import { SAMPLE_ROLES } from '../sample';
import { FitRing, Monogram, VisaChip } from './parts';

/**
 * MATCH: the sample "For you" board, as a working control.
 *
 * The list is a real vertical tablist (arrow keys move through it) and the
 * selected role's reading shows beside it: why it fits, what the posting asks
 * for that the resume does not show, and the sponsorship evidence.
 *
 * The two buttons under the reading are real and do something in the demo:
 * "Tailor resume" carries the selected role into the next step of the tour,
 * and "Save" toggles. Neither touches the network.
 */

export interface MatchSceneProps {
  selected: number;
  onSelect: (index: number) => void;
  saved: ReadonlySet<string>;
  onToggleSave: (roleId: string) => void;
  onTailor: () => void;
  /** The scene is on screen: rings draw and the highlighter runs. */
  run: boolean;
  /** Draw attention to "Tailor resume" until the visitor takes over. */
  nudge: boolean;
}

export function MatchScene({
  selected,
  onSelect,
  saved,
  onToggleSave,
  onTailor,
  run,
  nudge,
}: MatchSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  /** Arms the highlighter a beat after a role opens. */
  const [marked, setMarked] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setMarked(true);
      return;
    }
    setMarked(false);
    if (!run) return;
    const id = window.setTimeout(() => setMarked(true), 320);
    return () => window.clearTimeout(id);
  }, [selected, reduce, run]);

  const role = SAMPLE_ROLES[selected];
  const tabId = (i: number) => `${uid}-role-${i}`;
  const panelId = `${uid}-reading`;
  const isSaved = saved.has(role.id);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = SAMPLE_ROLES.length - 1;
    let next = i;
    if (e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    onSelect(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div className="grid lg:min-h-[32.5rem] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {/* THE LIST */}
      <LayoutGroup id={uid}>
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Sample roles"
          className="flex flex-col p-2 sm:p-3"
        >
          {SAMPLE_ROLES.map((r, i) => {
            const isSel = i === selected;
            return (
              <button
                key={r.id}
                id={tabId(i)}
                type="button"
                role="tab"
                aria-selected={isSel}
                aria-controls={panelId}
                tabIndex={isSel ? 0 : -1}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  'group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-xl px-3 py-3 text-left sm:px-4 sm:py-3.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  !isSel && 'transition-colors duration-200 hover:bg-[hsl(var(--band)/0.7)]',
                  // The fourth and fifth roles are depth: on a phone the list
                  // would otherwise push the reading off the screen.
                  i >= 3 && 'hidden lg:grid',
                )}
              >
                {isSel && (
                  <motion.span
                    layoutId="selected-role"
                    aria-hidden
                    className="absolute inset-0 rounded-xl bg-[hsl(var(--band))] ring-1 ring-inset ring-border"
                    transition={reduce ? { duration: 0 } : { duration: 0.42, ease: EASE }}
                  />
                )}
                <span className="relative">
                  <Monogram role={r} />
                </span>
                <span className="relative min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[0.9375rem] font-semibold text-foreground">
                      {r.title}
                    </span>
                    {r.isNew && (
                      <span className="pub-tint shrink-0 rounded-[0.3125rem] px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none">
                        New
                      </span>
                    )}
                    {saved.has(r.id) && (
                      <Bookmark
                        aria-label="Saved"
                        className="h-3.5 w-3.5 shrink-0 fill-current text-primary"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.8125rem] text-muted-foreground">
                    {r.company} · {r.location} · {r.posted}
                  </span>
                  <span className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                    <span className="pub-chip">{r.level}</span>
                    <VisaChip role={r} />
                  </span>
                </span>
                <span className="relative flex items-center gap-2.5">
                  <span className="hidden text-right text-[0.8125rem] font-semibold text-ink-muted xl:block">
                    {r.band}
                  </span>
                  <FitRing score={r.score} draw={run} />
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      {/* THE READING */}
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(selected)}
        className="border-t border-border bg-[hsl(var(--band))] p-5 sm:p-7 lg:border-l lg:border-t-0"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={role.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex h-full flex-col"
          >
            <div className="flex items-start gap-3.5">
              <FitRing score={role.score} size={58} draw={run} />
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-semibold leading-tight text-foreground">
                  {role.band}
                </p>
                <p className="mt-1 text-[0.875rem] leading-snug text-ink-muted">
                  {role.title} at {role.company}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[0.8125rem] text-muted-foreground">
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  Posted {role.posted.toLowerCase()} on the employer's careers page
                </p>
              </div>
            </div>

            <p className="mt-6 text-[0.8125rem] font-semibold text-muted-foreground">Why it fits</p>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground">
              {role.why.map((seg, i) =>
                typeof seg === 'string' ? (
                  <span key={i}>{seg}</span>
                ) : (
                  <Mark key={i} on={marked} delay={i * 110}>
                    {seg.mark}
                  </Mark>
                ),
              )}{' '}
              <span className="text-ink-muted">{role.gap}</span>
            </p>

            {/* What the posting asks for, set against the resume. The product
                states the gap as plainly as the fit. */}
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {role.asks.map((ask) => (
                <li key={ask.label} className="flex items-center gap-2 text-[0.8125rem]">
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded-full',
                      ask.met
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-[hsl(var(--input))] text-muted-foreground',
                    )}
                  >
                    {ask.met ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    ) : (
                      <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                    )}
                  </span>
                  <span className={ask.met ? 'text-foreground' : 'text-muted-foreground'}>
                    {ask.label}
                    <span className="sr-only">
                      {ask.met ? ', in your resume' : ', not in your resume'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {role.visa.kind !== 'none' && (
              <div className="mt-5 border-t border-border pt-4">
                <VisaChip role={role} />
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {role.visa.detail}
                </p>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <button
                type="button"
                onClick={onTailor}
                className={cn(
                  'focus-ring-visible pub-mini-btn pub-mini-btn-solid',
                  nudge && 'pub-nudge',
                )}
              >
                <Wand2 aria-hidden className="h-3.5 w-3.5" />
                Tailor resume
              </button>
              <button
                type="button"
                aria-pressed={isSaved}
                onClick={() => onToggleSave(role.id)}
                className="focus-ring-visible pub-mini-btn"
              >
                <Bookmark aria-hidden className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
