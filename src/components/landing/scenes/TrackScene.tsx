import { useEffect, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Mail, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from '../_shared';
import { SAMPLE_ROLES, type SampleRole } from '../sample';
import { Monogram } from './parts';

/**
 * TRACK: the tracker, at the one moment that explains why it exists. A reply
 * lands in Gmail and the right application moves by itself.
 *
 * The role the visitor carried through the tour is the one that moves. The
 * scene plays once when it opens, and Replay runs it again. Nothing loops.
 *
 * It claims only what the product does: applications in one pipeline, and,
 * for people who connect Gmail, mail about an application moving its card.
 * It shows no rates or outcomes.
 */

const COLUMNS = ['Saved', 'Applied', 'Interview', 'Offer'] as const;
type Column = (typeof COLUMNS)[number];

interface Card {
  role: SampleRole;
  column: Column;
  note: string;
  focus: boolean;
}

function cards(focus: SampleRole, moved: boolean): Card[] {
  const others = SAMPLE_ROLES.filter((r) => r.id !== focus.id).slice(0, 3);
  return [
    { role: others[0], column: 'Saved', note: 'Saved yesterday', focus: false },
    { role: others[1], column: 'Saved', note: 'Saved 2 days ago', focus: false },
    { role: others[2], column: 'Applied', note: 'Applied 3 days ago', focus: false },
    {
      role: focus,
      column: moved ? 'Interview' : 'Applied',
      note: moved ? 'Next: confirm a time' : 'Applied just now',
      focus: true,
    },
  ];
}

export interface TrackSceneProps {
  role: SampleRole;
  run: boolean;
  onRestart: () => void;
  /** Opens the page's file picker: the tour ends on the real thing. */
  onTry?: () => void;
}

export function TrackScene({ role, run, onRestart, onTry }: TrackSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const [moved, setMoved] = useState(reduce);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    if (reduce || !run) return;
    setMoved(false);
    const id = window.setTimeout(() => setMoved(true), 1400);
    return () => window.clearTimeout(id);
  }, [run, reduce, replay, role.id]);

  const all = cards(role, moved);

  return (
    <div>
      {/* The mail strip keeps its height in both states, so the board below it
          never jumps when the reply arrives. */}
      <div className="flex min-h-[3.5rem] items-center justify-between gap-4 border-b border-border px-5 py-3 sm:px-7">
        <p className="flex min-w-0 items-center gap-2.5 text-[0.875rem]" aria-live="polite">
          <span
            aria-hidden
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-300',
              moved
                ? 'bg-primary text-primary-foreground'
                : 'bg-[hsl(var(--band))] text-muted-foreground',
            )}
          >
            <Mail className="h-3.5 w-3.5" />
          </span>
          <motion.span
            key={moved ? 'after' : 'before'}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="min-w-0 text-ink-muted"
          >
            {moved ? (
              <>
                <span className="font-semibold text-foreground">
                  Interview invitation from {role.company}.
                </span>{' '}
                Moved to Interview.
              </>
            ) : (
              'Gmail connected. Watching for replies to your applications.'
            )}
          </motion.span>
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!reduce && (
            <button
              type="button"
              onClick={() => setReplay((n) => n + 1)}
              className="focus-ring-visible pub-mini-btn"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Replay
            </button>
          )}
          <button type="button" onClick={onRestart} className="focus-ring-visible pub-mini-btn">
            Start over
          </button>
          {onTry && (
            <button
              type="button"
              onClick={onTry}
              className="focus-ring-visible pub-mini-btn pub-mini-btn-solid"
            >
              Try it with my resume
            </button>
          )}
        </div>
      </div>

      <LayoutGroup>
        <div
          aria-hidden
          className="grid grid-cols-2 gap-px bg-[hsl(var(--border))] lg:grid-cols-4"
        >
          {COLUMNS.map((column) => {
            const mine = all.filter((c) => c.column === column);
            return (
              <div key={column} className="min-h-[12rem] bg-card p-3.5 sm:p-4 lg:min-h-[29rem]">
                <p className="flex items-center justify-between text-[0.8125rem] font-semibold text-foreground">
                  {column}
                  <span className="tabular-nums text-muted-foreground">{mine.length}</span>
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {mine.map((card) => {
                    const lit = card.focus && moved;
                    return (
                      <motion.div
                        key={card.role.id}
                        layoutId={`track-${card.role.id}`}
                        layout={!reduce}
                        transition={{ duration: 0.7, ease: EASE }}
                        className={cn(
                          'rounded-xl border p-2.5',
                          lit
                            ? 'border-primary/40 bg-[hsl(var(--tint))]'
                            : card.focus
                              ? 'border-[hsl(var(--input)/0.6)] bg-card'
                              : 'border-border bg-[hsl(var(--band))]',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Monogram role={card.role} size={30} />
                          <div className="min-w-0">
                            <p className="truncate text-[0.8125rem] font-semibold text-foreground">
                              {card.role.title}
                            </p>
                            <p className="truncate text-[0.75rem] text-muted-foreground">
                              {card.role.company}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            'mt-2 text-[0.75rem]',
                            lit ? 'font-semibold text-[hsl(var(--tint-ink))]' : 'text-muted-foreground',
                          )}
                        >
                          {card.note}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>
      <p className="sr-only">
        A sample pipeline with four stages: Saved, Applied, Interview and Offer. When a reply
        arrives in a connected Gmail inbox, the matching application moves to the next stage.
      </p>
    </div>
  );
}
