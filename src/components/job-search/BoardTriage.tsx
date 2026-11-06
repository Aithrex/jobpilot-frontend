import { useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion';
import { BookmarkPlus, CircleOff, Keyboard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** How far a card must travel before a swipe counts. */
const SWIPE_COMMIT_PX = 110;

/** True on touch-first devices, where swipe triage is offered. */
export function useCoarsePointer(): boolean {
  const query = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const on = () => setCoarse(mql.matches);
    mql.addEventListener?.('change', on);
    return () => mql.removeEventListener?.('change', on);
  }, []);
  return coarse;
}

/**
 * Swipe a card right to save it, left for "not interested". Touch only; a
 * mouse never drags a card. The colour and words behind the card say what
 * letting go will do before it happens, and the action has an Undo toast.
 */
export function SwipeableCard({
  enabled,
  onSwipeRight,
  onSwipeLeft,
  children,
}: {
  enabled: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const saveOpacity = useTransform(x, [0, SWIPE_COMMIT_PX], [0, 1]);
  const hideOpacity = useTransform(x, [-SWIPE_COMMIT_PX, 0], [1, 0]);

  if (!enabled) return <>{children}</>;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_COMMIT_PX) onSwipeRight();
    else if (info.offset.x < -SWIPE_COMMIT_PX) onSwipeLeft();
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <motion.div
        aria-hidden
        style={{ opacity: saveOpacity }}
        className="swipe-hint-save pointer-events-none absolute inset-0 flex items-center rounded-xl pl-5 text-xs font-semibold"
      >
        <BookmarkPlus className="mr-1.5 h-4 w-4" /> Save
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: hideOpacity }}
        className="swipe-hint-hide pointer-events-none absolute inset-0 flex items-center justify-end rounded-xl pr-5 text-xs font-semibold"
      >
        Not interested <CircleOff className="ml-1.5 h-4 w-4" />
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragTransition={reduce ? { bounceStiffness: 900, bounceDamping: 60 } : { bounceStiffness: 500, bounceDamping: 32 }}
        style={{ x }}
        onDragEnd={onDragEnd}
        className="relative flex h-full min-h-0 flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['J / K', 'Next / previous job'],
  ['Enter or O', 'Open quick look'],
  ['S', 'Save or unsave'],
  ['X', 'Not interested (hide)'],
  ['A', 'Mark as applied'],
  ['C', 'Add to compare'],
  ['Esc', 'Close quick look'],
  ['?', 'Show these shortcuts'],
];

/** The shortcut list, from a small button or the ? key. */
export function ShortcutsButton({ open, onOpenChange, className }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'press hidden h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex',
            className,
          )}
          aria-label="Keyboard shortcuts"
          data-testid="board-shortcuts"
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden /> Shortcuts
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-semibold text-foreground">Keyboard shortcuts</p>
        <dl className="space-y-1.5">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-[12px]">
              <dt className="text-muted-foreground">{what}</dt>
              <dd>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-semibold text-foreground">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
